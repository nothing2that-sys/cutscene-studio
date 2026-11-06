// Ablation set for the LLM package: one variable per condition, so a difference in the
// generated images can be tied to the added material rather than to chance.
//   c1-color : color.png + scene/people text
//   c2-text  : c1 + camera and per-person position/pose text (no light, no distance)
//   c3-light : c2 + light.png + light text
//   c4-depth : c2 + depth.png + distance text
// Usage: node scripts/llm-ablation.mjs [baseUrl] [outDir]
import {loadPlaywright} from './playwright-runtime.mjs';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const {chromium}=loadPlaywright();
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.argv[2]||'http://127.0.0.1:3001',out=path.resolve(process.argv[3]||path.join(root,'docs/review-evidence/2026-11-06-llm-ablation'));
const fixture=f=>path.join(root,'scripts/fixtures/llm-scenarios',f);
// questions: one correct answer each (all "예" when the image follows the scene).
const SCENES=[
 {id:'E1-under-light',file:fixture('e1-under-light.json'),aspect:16/9,tests:'light',conditions:['c1-color','c2-text','c3-light'],
  questions:['얼굴 아래쪽(턱 밑·코 밑)이 밝고 이마·정수리 쪽이 어두운, 아래에서 올라오는 빛인가','두 인물 모두 화면 오른쪽 면이 밝고 왼쪽 면이 어두운가','뒤 벽에 인물 그림자가 화면 왼쪽 위로 크게 드리우는가','광원(랜턴)이 화면 안에 보이지 않는가(화면 오른쪽 밖)','천장 조명처럼 위에서 내리쬐는 빛으로 그리지 않았는가'],
  verify:j=>{const people=j.labels.filter(l=>l.kind==='person');return [
   ['광원이 화면 밖',!j.lighting.source.inFrame,JSON.stringify(j.lighting.source.xy)],
   ['광원이 머리보다 낮음',people.every(l=>/아래에서 올려 비춤/.test(l.lightCondition.text)),people.map(l=>l.lightCondition.text).join(' / ')],
   ['인물이 빛을 받음',people.every(l=>l.directLight.litShare>.15),people.map(l=>l.directLight.litShare).join(',')],
   ['뒤 벽이 보임',j.labels.some(l=>l.kind==='wall'&&l.visible),'']];}},
 {id:'E2-depth-heights',file:fixture('e2-depth-heights.json'),aspect:16/9,tests:'depth',conditions:['c1-color','c2-text','c4-depth'],
  questions:['아이가 어른보다 카메라에 가깝게(앞에) 서 있는가','원근을 감안할 때 어른이 아이보다 실제 키가 훨씬 큰 성인으로 보이는가','아이의 발이 어른의 발보다 화면 아래쪽에 있는가','두 사람 사이에 몇 미터 이상의 거리가 느껴지는가','두 사람을 같은 거리에 나란히 선 것처럼 그리지 않았는가'],
  verify:j=>{const c=j.labels.find(l=>l.id==='e2child'),a=j.labels.find(l=>l.id==='e2adult'),h=l=>l.screen.bbox[3]-l.screen.bbox[1],ratio=h(c)/h(a),foot=l=>Math.max(l.pose.joints.ankleL.xy[1],l.pose.joints.ankleR.xy[1]);return [
   ['아이가 더 가까움',c.distanceM.median<a.distanceM.median,`${c.distanceM.median}m < ${a.distanceM.median}m`],
   ['화면 키가 비슷함(0.75~1.33배)',ratio>.75&&ratio<1.33,ratio.toFixed(2)],
   ['아이 발이 화면 아래쪽',foot(c)>foot(a),`${foot(c)} > ${foot(a)}`]];}},
];
const strip=t=>String(t||'').replace(/ ?\(pose\.png[^)]*\)/g,'');
function prompt(j,scene,cond){
 const people=j.labels.filter(l=>l.kind==='person'),lines=[`# ${j.scene.title}`,'','## 화풍 (가장 먼저 지킬 것)',j.style,'첨부 이미지는 구도·명암 참고 자료일 뿐 그림체 참고가 아닙니다. 회색 3D 렌더나 흑백 이미지의 질감을 따라 그리지 말고 위 화풍으로 그리세요.','',
  '첨부 color.png(무채색 마네킹 작업 렌더)의 카메라 구도로 아래 장면을 한 컷으로 그려 주세요.','','## 장면',scene.sourceText,'','## 인물',...people.map(l=>`- ${l.name}: ${l.notes?.description||''}`)];
 if(cond!=='c1-color')lines.push('','## 촬영 정보',`- 렌즈 약 ${j.camera.focal35mm}mm(35mm 환산), 카메라 높이 ${j.camera.heightM}m, 피치 ${j.camera.pitchDeg}°`,'','## 인물별 화면 위치와 포즈 (좌우: "화면 왼쪽/오른쪽"은 이미지 기준, "왼팔/오른팔"은 인물 자신 기준)',...people.map(l=>`- ${l.name}: ${l.pose.text}`));
 if(cond==='c3-light')lines.push('','## 조명 (light.png 첨부)','- light.png: 주광의 직사광만 표시. 흰색은 빛을 정면으로 받는 면, 검은색은 빛을 등진 면이나 그림자. 이 명암과 그림자 위치를 최종 그림에 유지하세요.',`- 광원 종류: ${j.lighting.typeText}`,`- ${strip(j.lighting.text)}. 빛 색 ${j.lighting.color}.`,...people.map(l=>`- ${l.name}: ${l.lightCondition.text}`));
 if(cond==='c4-depth'){const order=[...people].sort((a,b)=>a.distanceM.median-b.distanceM.median);lines.push('','## 거리 (depth.png 첨부)',`- depth.png: 카메라에서의 거리. 흰색일수록 가깝고 어두울수록 멂(${j.depth.depthPng.nearM}m → ${j.depth.depthPng.farM}m). 검은색은 배경.`,`- 카메라에서 가까운 순서: ${order.map(l=>`${l.name}(${l.distanceM.median}m)`).join(' → ')}`,...people.map(l=>`- ${l.name}: 카메라에서 약 ${l.distanceM.median}m`));}
 lines.push('','글자·라벨·말풍선은 그림에 넣지 마세요.');return lines.join('\n');
}
const FILES={'c1-color':['color.png'],'c2-text':['color.png'],'c3-light':['color.png','light.png'],'c4-depth':['color.png','depth.png']};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={generatedAt:new Date().toISOString(),scenes:[]};
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio&&document.getElementById('studio-example'));
 for(const sc of SCENES){
  const text=await readFile(sc.file,'utf8'),scene=JSON.parse(text);
  const r=await page.evaluate(async({text,aspect})=>{
   const S=window.__bodyV1.studio,$=id=>document.getElementById(id);
   if(!S.importText(text,'ablation',true))throw Error('import failed: '+$('studio-status').textContent);
   await new Promise(r=>setTimeout(r,2500));const sel=$('studio-aspect');sel.value=String(aspect);sel.dispatchEvent(new Event('change'));
   const pkg=await S.createShotPackage(),z=pkg.zip,files={};
   for(let i=0;i<z.length-4;i++){if(z[i]==0x50&&z[i+1]==0x4b&&z[i+2]==3&&z[i+3]==4){const sz=z[i+18]|z[i+19]<<8|z[i+20]<<16|z[i+21]<<24,nl=z[i+26]|z[i+27]<<8;const name=new TextDecoder().decode(z.subarray(i+30,i+30+nl));files[name.split('/').slice(1).join('/')]=z.slice(i+30+nl,i+30+nl+sz);i+=30+nl+sz-1;}}
   const b64=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);};
   return {json:pkg.json,files:Object.fromEntries(['color.png','light.png','depth.png'].map(n=>[n,b64(files[n])]))};
  },{text,aspect:sc.aspect});
  const checks=sc.verify(r.json).map(([name,ok,detail])=>({name,ok:!!ok,detail}));
  const dir=path.join(out,sc.id);
  await rm(dir,{recursive:true,force:true});
  for(const cond of sc.conditions){const files=FILES[cond];const d=path.join(dir,cond);await mkdir(d,{recursive:true});for(const f of files)await writeFile(path.join(d,f),Buffer.from(r.files[f],'base64'));await writeFile(path.join(d,'prompt.txt'),prompt(r.json,scene,cond));}
  await mkdir(path.join(dir,'results'),{recursive:true});
  await writeFile(path.join(dir,'questions.md'),[`# ${sc.id} 채점 질문 (모두 "예"가 정답)`,'',...sc.questions.map((q,i)=>`${i+1}. ${q}`),'',`조건: ${sc.conditions.join(', ')} · 각 3회`,'결과 파일: results/<조건>-<회차>.png  예) results/'+sc.conditions[2]+'-2.png'].join('\n'));
  report.scenes.push({id:sc.id,tests:sc.tests,conditions:sc.conditions,checks,questions:sc.questions});
  console.log(`${sc.id}: scene checks ${checks.filter(c=>c.ok).length}/${checks.length}`);for(const c of checks)console.log(`  ${c.ok?'✔':'✖'} ${c.name} ${c.detail}`);
 }
 report.pageErrors=errors;await writeFile(path.join(out,'answer-key.json'),JSON.stringify(report,null,2));
 const failed=report.scenes.flatMap(s=>s.checks).filter(c=>!c.ok).length;console.log(JSON.stringify({out,failed,pageErrors:errors}));if(failed||errors.length)process.exitCode=1;
}finally{await browser.close();}
