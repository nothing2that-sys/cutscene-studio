// Fast feature reel: real editor actions + explicitly labelled existing AI results.
// node scripts/record-demo-social.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),out=path.resolve('docs/demo/social'),raw=path.resolve('.review-tools/social-recording');
await mkdir(out,{recursive:true});await mkdir(raw,{recursive:true});
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:raw,size:{width:1920,height:1080}},acceptDownloads:true});
const page=await context.newPage(),epoch=Date.now(),clips=[],checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
const elapsed=()=> (Date.now()-epoch)/1000;
async function clip(id,title,subtitle,seconds,fn){const start=elapsed();await fn();await page.waitForTimeout(1600);clips.push({id,title,subtitle,seconds,start,end:elapsed()});await page.screenshot({path:path.join(raw,id+'.png')});}
async function load(file){await page.locator('#studio-file').setInputFiles(path.resolve(file));await page.waitForTimeout(700);}
async function download(selector,name){const pending=page.waitForEvent('download');await page.locator(selector).click();await(await pending).saveAs(path.join(out,name));}
async function pose(p){await page.locator('#quick-pose').selectOption(p);await page.locator('#quick-pose-apply').click();await page.waitForTimeout(250);}
async function showPass(pass){
 await page.locator('#studio-pass-view').scrollIntoViewIfNeeded();await page.locator('#studio-pass-view').selectOption(pass);
 await page.evaluate(()=>{document.getElementById('video-output-zoom')?.remove();const source=document.getElementById('studio-pass-image');const box=document.createElement('div');box.id='video-output-zoom';box.style.cssText='position:fixed;left:400px;top:205px;width:1152px;background:#0a101d;border:2px solid #6ae4ce;border-radius:12px;z-index:10000;box-shadow:0 10px 80px #000a;overflow:hidden';const label=document.createElement('div');label.textContent='실제 미리보기 출력 · 영상에서 확대';label.style.cssText='font:24px Malgun Gothic;color:#6ae4ce;padding:14px';const img=document.createElement('img');img.src=source.src;img.style.cssText='display:block;width:1152px;height:648px;object-fit:contain';box.append(label,img);document.body.append(box);});
}
async function hidePass(){await page.evaluate(()=>document.getElementById('video-output-zoom')?.remove());}
async function card(title,panels,note){
 const data=await Promise.all(panels.map(async p=>({...p,src:'data:image/png;base64,'+(await readFile(p.file)).toString('base64')})));
 await page.setContent(`<html lang="ko"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#0a101d;color:#f5f8ff;font:24px 'Malgun Gothic',sans-serif;padding:58px 64px}h1{font-size:48px;margin:0 0 36px;letter-spacing:-2px}h1 em{color:#6ae4ce;font-style:normal}main{display:flex;gap:20px;height:720px}figure{margin:0;flex:1;min-width:0;border:1px solid #26364d;border-radius:16px;overflow:hidden;background:#101b2b}figcaption{height:64px;padding:18px;font-size:25px;color:#78e7d6}img{width:100%;height:650px;object-fit:contain}p{color:#c2cbdd;font-size:24px;line-height:1.6;margin:26px 0}</style><h1>${title}</h1><main>${data.map(p=>`<figure><figcaption>${p.label}</figcaption><img src="${p.src}"></figure>`).join('')}</main><p>${note}</p></html>`);
 await page.waitForTimeout(200);
}
const rain='app/saved/nowhere-to-hide-rain/',ab='docs/review-evidence/2026-11-06-llm-ablation/',results=ab+'E1-under-light/results/';
try{
 await page.goto(process.argv[2]||'http://127.0.0.1:3001');await page.waitForFunction(()=>window.__bodyV1?.studio);
 await clip('scene','장면 JSON → 바로 3D','인물 · 소품 · 카메라 · 조명을 한 번에',3,async()=>{await load(rain+'scene.json');});
 const solo={version:1,units:'meters',title:'포즈 편집 데모',room:{size:[8,3,6],walls:false},camera:{position:[0,1.3,5],target:[0,.85,0],fov:38},actors:[{id:'demo',name:'포즈를 바꿔 보세요',position:[0,0,0],yaw:30,height:1.78,bodyType:'male',pose:'standing'}],props:[]};
 await page.evaluate(s=>window.__bodyV1.studio.importText(JSON.stringify(s),'demo',true),solo);await page.waitForTimeout(600);await page.locator('.layer-item[data-imported="false"]').first().click();
 await clip('presets','기본 포즈, 클릭 한 번','서기 → 무릎 꿇기 → 눕기',3,async()=>{await pose('kneeling');await page.waitForTimeout(500);await pose('lying');});
 await clip('save','마음에 드는 포즈 저장','관절 자세를 JSON 파일로 보관',2.5,async()=>{await download('#pose-reference-save','saved-pose.json');});
 const saved=JSON.parse(await readFile(path.join(out,'saved-pose.json'),'utf8'));assert.ok(saved.rotations||saved.bodyV1Pose||saved.joints);checks.push('pose JSON downloaded');
 await clip('reset','다시 기본 자세로','다른 포즈로 바꿔도 저장한 자세는 그대로',2,async()=>{await pose('standing');});
 await clip('restore','저장한 포즈, 다시 적용','JSON을 불러오면 관절 자세 복원',2.5,async()=>{await page.locator('#pose-reference-file').setInputFiles(path.join(out,'saved-pose.json'));await page.waitForTimeout(450);});
 checks.push('saved pose imported through file control');
 await clip('library','내 포즈 라이브러리','이름을 붙여 담고, 카드로 다시 적용',3.5,async()=>{await page.locator('#pose-library-open').click();await page.waitForFunction(()=>!document.querySelector('#pose-library-status').textContent.includes('여는 중'));await page.locator('#pose-library-name').fill('액션 컷 · 누운 자세');await page.locator('#pose-library-record').click();await page.waitForTimeout(500);await page.locator('#pose-library-search').fill('액션 컷');await page.waitForTimeout(300);await page.locator('.pose-card-apply').first().click();});checks.push('named library pose saved and applied');
 await page.locator('[data-edit-mode="move"]').click();
 await clip('camera','구도도 직접 잡으세요','시점 회전 → 촬영 컷 저장',3,async()=>{const box=await page.locator('canvas').first().boundingBox();await page.mouse.move(box.x+box.width*.58,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.72,box.y+box.height*.45,{steps:24});await page.mouse.up();await page.locator('#studio-shot-name').fill('액션 카메라');await page.locator('#studio-shot-add').click();});
 await load('scripts/fixtures/llm-scenarios/e2-depth-heights.json');
 await clip('depth','거리감도 전달합니다','깊이 패스 → 거리 색·링 (실제 출력 확대)',3,async()=>{await showPass('depth');await page.waitForTimeout(650);await showPass('range');});await hidePass();
 await load('scripts/fixtures/llm-scenarios/e1-under-light.json');
 await clip('light','광원 위치와 그림자까지','낮은 오른쪽 광원 → 명암 · 그림자 참조',3,async()=>{await showPass('light');});await hidePass();
 await clip('package','이미지 + 설명을 한 묶음으로','컬러 · 라벨 · 깊이 · 조명 · 포즈 ZIP',3,async()=>{await download('#studio-llm-package','feature-demo-package.zip');});checks.push('real LLM package downloaded');
 await card('거리 참조로 <em>앞뒤와 화면 크기</em> 전달',[{label:'3D 컬러 참조',file:ab+'E2-depth-heights/c4-depth/color.png'},{label:'컬러만 전달한 결과',file:results+'02_01_01.png'},{label:'깊이 + 거리 설명 전달',file:results+'02_03_01.png'}],'기존 비교 실험 · 아이/어른 화면 키 비율의 평균 오차 0.18 → 0.03 (조건별 3회, 해당 모델·장면 기준)');
 await clip('depth-result','거리 참조 → 작화 결과','기존 비교 실험 · 같은 거리 배치를 더 가깝게',4,async()=>{});
 await card('광원 참조로 <em>아래에서 비추는 빛</em> 전달',[{label:'3D 광원·그림자 참조',file:ab+'E1-under-light/c3-light/light.png'},{label:'컬러만 전달한 결과',file:results+'01_01.png'},{label:'조명 참조 + 설명 전달',file:results+'03_02.png'}],'기존 생성 예제 중 일부 성공 사례 · 조명 비교의 전체 판정은 불확실 · 매회 같은 결과를 뜻하지 않습니다.');
 await clip('light-result','빛의 방향 → 작화 결과','광원 위치 · 얼굴 명암 · 벽 그림자 전달',4,async()=>{});
 await card('구도와 포즈를 잡고, <em>작화 참조로</em>',[{label:'직접 만든 3D 참조',file:rain+'cutscene-color.png'},{label:'외부 이미지 생성 결과',file:rain+'final-comic-v1.png'}],'Cutscene Studio는 참조를 만드는 로컬 편집기입니다. 최종 작화는 외부 이미지 생성 도구에서 진행합니다.');
 await clip('final','Cutscene Studio','github.com/nothing2that-sys/cutscene-studio',3,async()=>{});
 assert.deepEqual(errors,[]);
}finally{
 const video=page.video();await context.close();if(video)await video.saveAs(path.join(raw,'source.webm'));await browser.close();
 await writeFile(path.join(out,'timeline.json'),JSON.stringify({clips,checks,pageErrors:errors,source:'.review-tools/social-recording/source.webm',targetSeconds:clips.reduce((n,c)=>n+c.seconds,0)},null,2));
}
console.log(JSON.stringify({clips:clips.length,seconds:clips.reduce((n,c)=>n+c.seconds,0),errors}));
