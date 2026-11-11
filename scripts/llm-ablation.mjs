// Ablation set for the LLM package: one variable per condition, so a difference in the
// generated images can be tied to the added material rather than to chance.
//   c1-color : color.png + scene/people text
//   c2-text  : c1 + camera and per-person position/pose text (no light, no distance)
//   c3-light : c2 + light.png + light text
//   c4-depth : c2 + depth.png + distance text
//   --set=depth (2026-11-10): depth views only, all with depth.png and the distance order
//   d1-gray  : color.png + depth.png + distance text
//   d2-range : d1 + range.png (LiDAR-style colour range with rings and labels)
//   d3-plan  : d2 + plan.png (top-down layout with camera view, people, light)
//   --set=body (2026-11-10): same scene, prompt and attachments (color + depth); only the
//   mannequin body differs
//   b1-female: everyone on the default (female) mannequin, bodyType removed
//   b2-typed : matching body types (male, male-heavy, child)
//   b3-typed-face (B1 only): b2 + the package prompt's mannequin section, incl. the faces line
//   B2 (2026-11-11): backlit sunset silhouettes, b1/b2 as above
//   --set=gaze (2026-11-11): the real package (prompt.txt + its images), gaze fields off/on
//   g1-off   : lookAt and expression removed (heads straight, no 시선/표정 lines)
//   g2-on    : lookAt and expression kept (heads turned, 시선/표정 lines)
// Usage: node scripts/llm-ablation.mjs [baseUrl] [outDir] [--set=depth|--set=body]
import {loadPlaywright} from './playwright-runtime.mjs';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const {chromium}=loadPlaywright();
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const argv=process.argv.slice(2),SET=argv.includes('--set=depth')?'depth':argv.includes('--set=body')?'body':argv.includes('--set=gaze')?'gaze':'base',pos=argv.filter(a=>!a.startsWith('--'));
const base=pos[0]||'http://127.0.0.1:3001',out=path.resolve(pos[1]||path.join(root,SET==='depth'?'docs/review-evidence/2026-11-10-depth-ablation':SET==='body'?'docs/review-evidence/2026-11-10-body-ablation':SET==='gaze'?'docs/review-evidence/2026-11-11-gaze-ablation':'docs/review-evidence/2026-11-06-llm-ablation'));
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
const DEPTH_SCENES=[
 {id:'D1-crowd',file:fixture('d1-crowd-depth.json'),aspect:16/9,tests:'depth',conditions:['d1-gray','d2-range','d3-plan'],
  questions:['다섯 사람이 모두 그려졌는가','왼쪽부터 빨강 코트 → 회색 후드 → 초록 점퍼 → 검은 정장 → 흰 원피스 순서인가(화면 가로 위치)','빨간 코트 여자가 가장 앞(가장 아래쪽 발)인가','흰 원피스 여자가 가장 뒤(가장 위쪽 발)인가','측정: 초록 점퍼 소년 ÷ 검은 정장 남자의 화면 키 비율','측정: 빨간 코트 여자 ÷ 흰 원피스 여자의 화면 키 비율'],
  verify:j=>{const L=id=>j.labels.find(l=>l.id===id),h=l=>l.screen.bbox[3]-l.screen.bbox[1],g=L('d1green'),b=L('d1black'),r=L('d1red'),w=L('d1white');return [
   ['다섯 명 모두 화면 안',['d1red','d1gray','d1green','d1black','d1white'].every(id=>L(id)?.visible),''],
   ['초록(가까움)과 검정(멂)의 화면 키가 비슷',h(g)/h(b)>.8&&h(g)/h(b)<1.45&&b.distanceM.median/g.distanceM.median>1.4,`화면 ${(h(g)/h(b)).toFixed(2)} · 거리 ${g.distanceM.median}m/${b.distanceM.median}m`],
   ['정답 비율 기록',true,`초록÷검정 ${(h(g)/h(b)).toFixed(2)} · 빨강÷흰 ${(h(r)/h(w)).toFixed(2)}`]];}},
 {id:'D2-lamp-front',file:fixture('d2-lamp-front.json'),aspect:16/9,tests:'depth',conditions:['d1-gray','d2-range','d3-plan'],
  questions:['랜턴(광원)이 맨 앞 인물보다 카메라 쪽 앞에 있는가','랜턴이 화면 왼쪽에 있는가','주황 재킷 남자가 남색 패딩 여자보다 앞인가','랜턴과 가까운 쪽(주황 재킷)이 더 밝은가','측정: 주황 재킷 남자 ÷ 남색 패딩 여자의 화면 키 비율'],
  verify:j=>{const a=j.labels.find(l=>l.id==='d2a'),b=j.labels.find(l=>l.id==='d2b'),h=l=>l.screen.bbox[3]-l.screen.bbox[1];return [
   ['광원이 인물들보다 앞',j.lighting.source?.relation==='front',j.lighting.source?.text||''],
   ['광원이 화면 안 왼쪽',j.lighting.source?.inFrame&&j.lighting.source.xy[0]<.4,JSON.stringify(j.lighting.source?.xy)],
   ['정답 비율 기록',true,`주황÷남색 ${(h(a)/h(b)).toFixed(2)}`]];}},
];
const BODY_SCENES=[
 {id:'B1-body-types',file:fixture('b1-body-types.json'),aspect:16/9,tests:'body',conditions:['b1-female','b2-typed','b3-typed-face'],
  // The only difference between b1 and b2 is the mannequin body; b3 adds prompt lines only.
  variant:(cond,scene)=>cond==='b1-female'?{...scene,actors:scene.actors.map(({bodyType,...a})=>a)}:scene,
  questions:['세 사람이 모두 그려졌는가','왼쪽 마른 남자가 남성 체형인가(가슴 볼륨·잘록한 허리·넓은 골반·둥근 엉덩이가 없음)','가운데 남자가 배가 나온 큰 체격으로 그려졌는가','오른쪽 아이가 아이 비율인가(몸에 비해 큰 머리, 짧은 팔다리)—"작은 어른"이면 아니오','뒤 벽 그림자 세 개가 모두 남성·아이 윤곽인가(그림자에 여성 마네킹의 가슴·허리·엉덩이 곡선이 없음)','측정: 오른쪽 아이 ÷ 왼쪽 마른 남자의 화면 키(머리 꼭대기~발바닥) 비율'],
  verify:j=>{const L=id=>j.labels.find(l=>l.id===id),h=l=>l.screen.bbox[3]-l.screen.bbox[1],m=L('b1man'),c=L('b1child'),hv=L('b1heavy');return [
   ['세 명 모두 화면 안',[m,c,hv].every(l=>l?.visible),''],
   ['뒤 벽이 보임',j.labels.some(l=>l.kind==='wall'&&l.visible),''],
   ['정답 비율 기록',true,`아이÷마른 남자 ${(h(c)/h(m)).toFixed(2)}`]];}},
 {id:'B2-backlit',file:fixture('b2-backlit.json'),aspect:16/9,tests:'body',conditions:['b1-female','b2-typed'],
  variant:(cond,scene)=>cond==='b1-female'?{...scene,actors:scene.actors.map(({bodyType,...a})=>a)}:scene,
  questions:['세 사람이 모두 그려졌는가','역광 실루엣인가(해가 인물 뒤, 인물 앞면이 어두움)','왼쪽 마른 남자의 윤곽이 남성형인가(잘록한 허리·넓은 골반·가슴 곡선 없음)','가운데 남자의 윤곽에 배가 나온 큰 체격이 드러나는가','오른쪽 아이의 윤곽이 아이 비율인가(큰 머리, 짧은 팔다리)','측정: 오른쪽 아이 ÷ 왼쪽 마른 남자의 화면 키 비율'],
  verify:j=>{const L=id=>j.labels.find(l=>l.id===id),h=l=>l.screen.bbox[3]-l.screen.bbox[1],m=L('b2man'),c=L('b2child'),hv=L('b2heavy');return [
   ['세 명 모두 화면 안',[m,c,hv].every(l=>l?.visible),''],
   ['역광(해가 인물 뒤, 화면 안)',j.lighting.source?.relation==='behind'||j.lighting.source?.inFrame,j.lighting.source?.text||''],
   ['정답 비율 기록',true,`아이÷마른 남자 ${(h(c)/h(m)).toFixed(2)}`]];}},
];
const GAZE_SCENES=[
 {id:'G1-gaze',file:fixture('g1-gaze.json'),aspect:16/9,tests:'gaze',conditions:['g1-off','g2-on'],
  variant:(cond,scene)=>cond==='g1-off'?{...scene,actors:scene.actors.map(({lookAt,expression,...a})=>a)}:scene,
  questions:['두 사람이 모두 그려졌는가','남자(왼쪽)의 얼굴·눈이 여자를 향하는가(카메라를 보면 아니오)','여자(오른쪽)의 얼굴·눈이 남자를 향하는가(카메라를 보면 아니오)','남자의 표정이 걱정스러운가(참고: 지시문에 표정이 있는 조건만 해당)','여자의 표정이 옅은 미소인가(참고: 지시문에 표정이 있는 조건만 해당)','좌우 배치가 맞는가(남자 왼쪽, 여자 오른쪽)'],
  verify:j=>{const L=id=>j.labels.find(l=>l.id===id),m=L('g1man'),w=L('g1woman');return [['두 명 모두 화면 안',m?.visible&&w?.visible,''],['남자가 화면 왼쪽',m.screen.bbox[0]<w.screen.bbox[0],'']];}},
];
// The package prompt's mannequin section (app/src/llm-package.js), used by b3 only.
const MANNEQUIN_LINES=['','## 마네킹을 따라 그리지 말 것','- color.png의 인물은 위치·자세용 무채색 마네킹입니다. 마네킹의 체형(가슴·엉덩이 곡선), 관절 구슬, 민머리를 그리지 마세요.','- 마네킹에는 얼굴이 없습니다. 얼굴이 보이는 인물은 아이를 포함해 모두 눈·코·입이 있는 얼굴로 그리세요.','- 벽·바닥의 그림자도 마네킹 윤곽이 아니라 최종으로 그린 인물(옷·머리·소지품)의 실루엣으로 그리세요.'];
function prompt(j,scene,cond){
 if(cond==='b3-typed-face'){const t=depthPrompt(j,scene,'d1-gray').split(String.fromCharCode(10)),i=t.findIndex(l=>l.startsWith('## 거리'));t.splice(i-1,0,...MANNEQUIN_LINES);return t.join(String.fromCharCode(10));}
 if(cond.startsWith('b'))return depthPrompt(j,scene,'d1-gray');
 if(cond.startsWith('d'))return depthPrompt(j,scene,cond);
 const people=j.labels.filter(l=>l.kind==='person'),lines=[`# ${j.scene.title}`,'','## 화풍 (가장 먼저 지킬 것)',j.style,'첨부 이미지는 구도·명암 참고 자료일 뿐 그림체 참고가 아닙니다. 회색 3D 렌더나 흑백 이미지의 질감을 따라 그리지 말고 위 화풍으로 그리세요.','',
  '첨부 color.png(무채색 마네킹 작업 렌더)의 카메라 구도로 아래 장면을 한 컷으로 그려 주세요.','','## 장면',scene.sourceText,'','## 인물',...people.map(l=>`- ${l.name}: ${l.notes?.description||''}`)];
 if(cond!=='c1-color')lines.push('','## 촬영 정보',`- 렌즈 약 ${j.camera.focal35mm}mm(35mm 환산), 카메라 높이 ${j.camera.heightM}m, 피치 ${j.camera.pitchDeg}°`,'','## 인물별 화면 위치와 포즈 (좌우: "화면 왼쪽/오른쪽"은 이미지 기준, "왼팔/오른팔"은 인물 자신 기준)',...people.map(l=>`- ${l.name}: ${l.pose.text}`));
 if(cond==='c3-light')lines.push('','## 조명 (light.png 첨부)','- light.png: 주광의 직사광만 표시. 흰색은 빛을 정면으로 받는 면, 검은색은 빛을 등진 면이나 그림자. 이 명암과 그림자 위치를 최종 그림에 유지하세요.',`- 광원 종류: ${j.lighting.typeText}`,`- ${strip(j.lighting.text)}. 빛 색 ${j.lighting.color}.`,...people.map(l=>`- ${l.name}: ${l.lightCondition.text}`));
 if(cond==='c4-depth'){const order=[...people].sort((a,b)=>a.distanceM.median-b.distanceM.median);lines.push('','## 거리 (depth.png 첨부)',`- depth.png: 카메라에서의 거리. 흰색일수록 가깝고 어두울수록 멂(${j.depth.depthPng.nearM}m → ${j.depth.depthPng.farM}m). 검은색은 배경.`,`- 카메라에서 가까운 순서: ${order.map(l=>`${l.name}(${l.distanceM.median}m)`).join(' → ')}`,...people.map(l=>`- ${l.name}: 카메라에서 약 ${l.distanceM.median}m`));}
 lines.push('','글자·라벨·말풍선은 그림에 넣지 마세요.');return lines.join('\n');
}
function depthPrompt(j,scene,cond){
 const people=j.labels.filter(l=>l.kind==='person'),order=[...people].filter(l=>l.visible).sort((a,b)=>a.distanceM.median-b.distanceM.median);
 const lines=[`# ${j.scene.title}`,'','## 화풍 (가장 먼저 지킬 것)',j.style,'첨부 이미지는 구도·거리 참고 자료일 뿐 그림체 참고가 아닙니다. 회색 3D 렌더나 색 지도·도표의 질감을 따라 그리지 말고 위 화풍으로 그리세요.','',
  '첨부 color.png(무채색 마네킹 작업 렌더)의 카메라 구도로 아래 장면을 한 컷으로 그려 주세요.','','## 장면',scene.sourceText,'','## 인물',...people.map(l=>`- ${l.name}: ${l.notes?.description||''}`),
  '','## 거리 (첨부 자료를 따르세요)',`- depth.png: 카메라에서의 거리. 흰색일수록 가깝고 어두울수록 멂(${j.depth.depthPng.nearM}m → ${j.depth.depthPng.farM}m). 검은색은 배경.`];
 if(cond!=='d1-gray')lines.push('- range.png: 거리를 색으로 표시(빨강=가까움 → 파랑=멂, 오른쪽 범례가 m). 흰 선은 카메라에서 같은 거리, 검은 윤곽은 앞의 물체가 뒤의 물체를 가리는 경계, 숫자는 인물별 거리입니다.');
 if(cond==='d3-plan')lines.push('- plan.png: 위에서 내려다본 배치도. 아래쪽 삼각형이 카메라, 위쪽이 카메라가 보는 방향, 원은 카메라에서 같은 거리입니다. 원판은 인물(화살표=바라보는 방향), 노란 표시는 광원입니다. 인물과 광원의 앞뒤·좌우 위치를 이 배치대로 지키세요.');
 lines.push(`- 카메라에서 가까운 순서: ${order.map(l=>`${l.name}(${l.distanceM.median}m)`).join(' → ')}`,'- 인물들의 화면 속 크기 비율은 color.png 그대로 두고, 멀리 있는 인물을 키우거나 가깝게 당기지 마세요.','','글자·라벨·도표·말풍선은 그림에 넣지 마세요.');
 return lines.join('\n');
}
const FILES={'g1-off':['color.png','label.png','depth.png','range.png','light.png','pose.png'],'g2-on':['color.png','label.png','depth.png','range.png','light.png','pose.png'],'b1-female':['color.png','depth.png'],'b2-typed':['color.png','depth.png'],'b3-typed-face':['color.png','depth.png'],'d1-gray':['color.png','depth.png'],'d2-range':['color.png','depth.png','range.png'],'d3-plan':['color.png','depth.png','range.png','plan.png'],'c1-color':['color.png'],'c2-text':['color.png'],'c3-light':['color.png','light.png'],'c4-depth':['color.png','depth.png']};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={generatedAt:new Date().toISOString(),scenes:[]};
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio&&document.getElementById('studio-example'));
 for(const sc of SET==='depth'?DEPTH_SCENES:SET==='body'?BODY_SCENES:SET==='gaze'?GAZE_SCENES:SCENES){
  const text=await readFile(sc.file,'utf8'),scene=JSON.parse(text);
  const build=text=>page.evaluate(async({text,aspect})=>{
   const S=window.__bodyV1.studio,$=id=>document.getElementById(id);
   if(!(await S.importText(text,'ablation',true)))throw Error('import failed: '+$('studio-status').textContent);
   await new Promise(r=>setTimeout(r,2500));const sel=$('studio-aspect');sel.value=String(aspect);sel.dispatchEvent(new Event('change'));
   const pkg=await S.createShotPackage(),z=pkg.zip,files={};
   for(let i=0;i<z.length-4;i++){if(z[i]==0x50&&z[i+1]==0x4b&&z[i+2]==3&&z[i+3]==4){const sz=z[i+18]|z[i+19]<<8|z[i+20]<<16|z[i+21]<<24,nl=z[i+26]|z[i+27]<<8;const name=new TextDecoder().decode(z.subarray(i+30,i+30+nl));files[name.split('/').slice(1).join('/')]=z.slice(i+30+nl,i+30+nl+sz);i+=30+nl+sz-1;}}
   const b64=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);};
   return {json:pkg.json,prompt:pkg.prompt,files:{...Object.fromEntries(['color.png','light.png','depth.png','range.png','label.png','pose.png'].map(n=>[n,b64(files[n])])),'plan.png':S.planPNG().split(',')[1]}};
  },{text,aspect:sc.aspect});
  // A scene with variants is built once per condition; otherwise one build serves all.
  const builds=sc.variant?{}:null;
  if(sc.variant)for(const cond of sc.conditions)builds[cond]=await build(JSON.stringify(sc.variant(cond,scene)));
  const r=sc.variant?builds[sc.conditions.at(-1)]:await build(text);
  const checks=sc.verify(r.json).map(([name,ok,detail])=>({name,ok:!!ok,detail}));
  const dir=path.join(out,sc.id);
  // Rewrite only the condition folders; results/ holds generated images and must survive.
  for(const cond of sc.conditions){await rm(path.join(dir,cond),{recursive:true,force:true});const files=FILES[cond];const d=path.join(dir,cond);await mkdir(d,{recursive:true});const rc=builds?.[cond]||r;for(const f of files)await writeFile(path.join(d,f),Buffer.from(rc.files[f],'base64'));await writeFile(path.join(d,'prompt.txt'),sc.tests==='gaze'?rc.prompt:prompt((sc.tests==='body'?r:rc).json,scene,cond));}
  await mkdir(path.join(dir,'results'),{recursive:true});
  await writeFile(path.join(dir,'questions.md'),[`# ${sc.id} 채점 질문 (모두 "예"가 정답)`,'',...sc.questions.map((q,i)=>`${i+1}. ${q}`),'',`조건: ${sc.conditions.map((c,i)=>`${String(i+1).padStart(2,'0')}=${c}`).join(', ')} · 각 3회`,'결과 파일: results/<조건번호>_<회차>.png  예) results/03_2.png = '+sc.conditions[2]+' 2회차'].join('\n'));
  report.scenes.push({id:sc.id,tests:sc.tests,conditions:sc.conditions,checks,questions:sc.questions});
  console.log(`${sc.id}: scene checks ${checks.filter(c=>c.ok).length}/${checks.length}`);for(const c of checks)console.log(`  ${c.ok?'✔':'✖'} ${c.name} ${c.detail}`);
 }
 report.pageErrors=errors;await writeFile(path.join(out,'answer-key.json'),JSON.stringify(report,null,2));
 const failed=report.scenes.flatMap(s=>s.checks).filter(c=>!c.ok).length;console.log(JSON.stringify({out,failed,pageErrors:errors}));if(failed||errors.length)process.exitCode=1;
}finally{await browser.close();}
