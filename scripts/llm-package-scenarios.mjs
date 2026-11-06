// Builds the LLM shot package for each verification scenario, checks that the passes
// agree with each other and with the scenario's intent, and writes per-scenario
// folders (zip, contact sheet, control prompt) for the GPT / Gemini comparison.
// Usage: node scripts/llm-package-scenarios.mjs [baseUrl] [outDir]
import {loadPlaywright} from './playwright-runtime.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const {chromium}=loadPlaywright();
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.argv[2]||'http://127.0.0.1:3001',out=path.resolve(process.argv[3]||path.join(root,'docs/review-evidence/2026-11-06-llm-package'));
const fixture=f=>path.join(root,'scripts/fixtures/llm-scenarios',f);
// expect: machine checks on the package. Light keys: per-person lightCondition / directLight.
const SCENARIOS=[
 {id:'S1-holiday',file:path.join(root,'app/saved/holiday-umbrella/scene.json'),aspect:16/9,shot:0,
  expect:{people:['choi-umbrella','kneeling-target','guard-left','guard-right'],nearest:'kneeling-target',sunLike:true,backToCamera:['kneeling-target'],faceCamera:['choi-umbrella']}},
 {id:'S2-queue-lamp',file:fixture('s2-queue-lamp.json'),aspect:16/9,shot:0,
  expect:{people:['q1','q2','q3','q4'],nearest:'q1',brighterThan:[['q1','q2'],['q2','q3'],['q3','q4']],shadowFrom:{q2:'맨 앞 · 노란 우비 여자'}}},
 {id:'S3-dinner-spot',file:fixture('s3-dinner-spot.json'),aspect:16/9,shot:0,
  expect:{people:['d1','d2'],inCone:{d1:['inside','edge'],d2:['inside','edge']},stance:{d1:/앉/,d2:/앉/}}},
 {id:'S4-backlight-vertical',file:fixture('s4-backlight-vertical.json'),aspect:9/16,shot:0,
  expect:{people:['b1','b2'],cameraSeesDark:['b1','b2'],rightHandScreen:{b1:'right'}}},
];
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={base,generatedAt:new Date().toISOString(),scenarios:[]};
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio&&document.getElementById('studio-example'));
 await mkdir(out,{recursive:true});
 for(const sc of SCENARIOS){
  const text=await readFile(sc.file,'utf8'),scene=JSON.parse(text);
  const result=await page.evaluate(async({text,aspect})=>{
   const S=window.__bodyV1.studio,$=id=>document.getElementById(id);
   if(!S.importText(text,'scenario',true))throw Error('scene import failed: '+$('studio-status').textContent);
   await new Promise(r=>setTimeout(r,2500));
   const sel=$('studio-aspect');sel.value=String(aspect);sel.dispatchEvent(new Event('change'));
   const t0=performance.now(),pkg=await S.createShotPackage(),packageMs=performance.now()-t0;
   const times=[];for(const only of ['label','depth','light','pose']){const t=performance.now();S.computePasses(576,Math.round(576/aspect),{commit:false,only});times.push(performance.now()-t);}
   // Unpack the stored zip in the page to build a captioned contact sheet.
   const z=pkg.zip,files={};for(let i=0;i<z.length-4;i++){if(z[i]==0x50&&z[i+1]==0x4b&&z[i+2]==3&&z[i+3]==4){const sz=z[i+18]|z[i+19]<<8|z[i+20]<<16|z[i+21]<<24,nl=z[i+26]|z[i+27]<<8;const name=new TextDecoder().decode(z.subarray(i+30,i+30+nl));files[name.split('/').slice(1).join('/')]=z.slice(i+30+nl,i+30+nl+sz);i+=30+nl+sz-1;}}
   const names=['color.png','label.png','depth.png','light.png','pose.png'],imgs=await Promise.all(names.map(n=>createImageBitmap(new Blob([files[n]],{type:'image/png'}))));
   const cw=aspect>=1?640:300,ch=Math.round(cw/aspect),cols=aspect>=1?3:5,rows=Math.ceil(names.length/cols),c=document.createElement('canvas');c.width=cols*cw;c.height=rows*(ch+24);const x=c.getContext('2d');x.fillStyle='#222';x.fillRect(0,0,c.width,c.height);x.font='16px sans-serif';
   imgs.forEach((im,i)=>{const cx=(i%cols)*cw,cy=Math.floor(i/cols)*(ch+24);x.fillStyle='#ddd';x.fillText(names[i],cx+6,cy+17);x.drawImage(im,cx,cy+24,cw,ch);});
   const b64=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);};
   return {zip:b64(z),folder:pkg.folder,json:pkg.json,prompt:pkg.prompt,contact:c.toDataURL('image/png').split(',')[1],color:b64(files['color.png']),packageMs,passMs:times,status:$('studio-status').textContent};
  },{text,aspect:sc.aspect});
  const dir=path.join(out,sc.id);await mkdir(dir,{recursive:true});
  await writeFile(path.join(dir,result.folder+'.zip'),Buffer.from(result.zip,'base64'));
  await writeFile(path.join(dir,'contact-sheet.png'),Buffer.from(result.contact,'base64'));
  await writeFile(path.join(dir,'control-color.png'),Buffer.from(result.color,'base64'));
  // Control: what a plain render + plain description gives, without the passes.
  const people=scene.actors.map(a=>`- ${a.name}${a.description?': '+a.description:''}`).join('\n');
  await writeFile(path.join(dir,'control-prompt.txt'),`첨부 이미지(무채색 마네킹 렌더)의 구도로 아래 장면을 완성된 컬러 일러스트 한 컷으로 그려 주세요.\n\n장면: ${scene.title}\n${scene.sourceText}\n\n인물:\n${people}\n\n말풍선·글자는 넣지 마세요.`);
  await writeFile(path.join(dir,'prompt.txt'),result.prompt);
  const j=result.json,label=id=>j.labels.find(l=>l.id===id),checks=[];const check=(name,ok,detail='')=>checks.push({name,ok:!!ok,detail});
  const ex=sc.expect;
  for(const id of ex.people){const l=label(id);check(`${id} 라벨이 화면에 보임`,l?.visible&&l.screen.pixelShare>0,l?.screen?.pixelShare);}
  const persons=j.labels.filter(l=>l.kind==='person'&&l.visible);
  // Passes agree: label distance order == pelvis joint distance order.
  const byLabel=[...persons].sort((a,b)=>a.distanceM.median-b.distanceM.median).map(l=>l.id),byJoint=[...persons].sort((a,b)=>a.pose.joints.pelvis.distanceM-b.pose.joints.pelvis.distanceM).map(l=>l.id);
  check('뎁스 순서 = 관절 거리 순서',byLabel.join()===byJoint.join(),byLabel.join(' → '));
  if(ex.nearest)check(`가장 가까운 인물 ${ex.nearest}`,byLabel[0]===ex.nearest,byLabel[0]);
  // Visible joints fall inside the person's label box (5% margin).
  for(const l of persons){const [x0,y0,x1,y1]=l.screen.bbox,m=.05,bad=Object.entries(l.pose.joints).filter(([k,p])=>p.visible&&k!=='headTop'&&(p.xy[0]<x0-m||p.xy[0]>x1+m||p.xy[1]<y0-m||p.xy[1]>y1+m)).map(([k])=>k);check(`${l.id} 뼈대가 라벨 영역 안`,!bad.length,bad.join(','));}
  for(const [a,b]of ex.brighterThan||[])check(`${a}가 ${b}보다 밝음`,label(a).directLight.mean>label(b).directLight.mean,`${label(a).directLight.mean} > ${label(b).directLight.mean}`);
  for(const [id,name]of Object.entries(ex.shadowFrom||{}))check(`${id}가 ${name} 그림자 안`,Object.keys(label(id).lightCondition.castShadowFrom).includes(name),JSON.stringify(label(id).lightCondition.castShadowFrom));
  for(const [id,ok]of Object.entries(ex.inCone||{}))check(`${id} 스포트 원 안`,ok.includes(label(id).lightCondition.inCone),label(id).lightCondition.inCone);
  for(const [id,re]of Object.entries(ex.stance||{}))check(`${id} 자세 판정`,re.test(label(id).pose.stance),label(id).pose.stance);
  for(const id of ex.cameraSeesDark||[])check(`${id} 카메라가 그늘진 면을 봄(역광)`,label(id).lightCondition.cameraSeesLitSide<-.3,label(id).lightCondition.cameraSeesLitSide);
  for(const [id,side]of Object.entries(ex.rightHandScreen||{})){const l=label(id),w=l.pose.joints.wristR.xy[0],p=l.pose.joints.pelvis.xy[0];check(`${id} 오른손이 화면 ${side==='right'?'오른':'왼'}쪽`,side==='right'?w>p:w<p,`wristR ${w} / pelvis ${p}`);}
  for(const id of ex.backToCamera||[])check(`${id} 카메라에 등을 보임`,label(id).pose.yawToCameraDeg>120,label(id).pose.yawToCameraDeg);
  for(const id of ex.faceCamera||[])check(`${id} 카메라 쪽을 봄`,label(id).pose.yawToCameraDeg<60,label(id).pose.yawToCameraDeg);
  if(ex.sunLike)check('조명 종류 sun',j.lighting.type==='sun',j.lighting.type);
  check('패키지 생성 5초 이내',result.packageMs<5000,Math.round(result.packageMs)+'ms');
  const entry={id:sc.id,zip:result.folder+'.zip',packageMs:Math.round(result.packageMs),passPreviewMs:result.passMs.map(Math.round),checks,failed:checks.filter(c=>!c.ok).length,lighting:j.lighting.text,people:persons.map(l=>({id:l.id,name:l.name,color:l.color,distance:l.distanceM.median,pose:l.pose.text,light:l.lightCondition?.text}))};
  report.scenarios.push(entry);console.log(`${sc.id}: ${checks.length-entry.failed}/${checks.length} checks · package ${entry.packageMs}ms · preview label/depth/light/pose ${entry.passPreviewMs.join('/')}ms`);
  for(const c of checks.filter(c=>!c.ok))console.log('  ✖',c.name,c.detail);
 }
 report.pageErrors=errors;await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 const failed=report.scenarios.reduce((n,s)=>n+s.failed,0);console.log(JSON.stringify({out,failed,pageErrors:errors}));
 if(failed||errors.length)process.exitCode=1;
}finally{await browser.close();}
