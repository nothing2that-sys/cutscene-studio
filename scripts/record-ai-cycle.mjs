// Records LIVE model calls: one-click generation, a visible scene edit, generation again.
// node scripts/record-ai-cycle.mjs http://127.0.0.1:3014
import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:3014',root=process.cwd();
const captureTag=process.env.CUTSCENE_CAPTURE_TAG||'ai-cycle-capture';
if(!/^[a-z0-9-]+$/.test(captureTag))throw Error('Invalid capture tag');
const raw=path.join(root,'.review-tools',captureTag),out=path.join(root,'docs/demo/ai-cycle');
await mkdir(raw,{recursive:true});await mkdir(out,{recursive:true});
if(!process.env.PLAYWRIGHT_BROWSERS_PATH&&existsSync(path.join(root,'.review-tools/browsers/ffmpeg-1013')))process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(root,'.review-tools/browsers');
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:process.env.CUTSCENE_BROWSER_CHANNEL||'msedge',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:raw,size:{width:1920,height:1080}},acceptDownloads:true});
const epoch=Date.now(),page=await context.newPage(),clips=[],errors=[],calls=[],jobs=[];
const elapsed=()=> (Date.now()-epoch)/1000;
page.on('pageerror',e=>errors.push(e.message));
page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/api/ai/jobs')){const input=request.postDataJSON();calls.push({at:elapsed(),...input});console.log('LIVE REQUEST',input.operation,input.provider);}});
page.on('response',async response=>{if(/\/api\/ai\/jobs\/[a-f0-9-]+$/.test(response.url())&&response.request().method()==='GET')try{const job=await response.json();if(job.status==='completed'&&!jobs.some(x=>x.id===job.id)){jobs.push(job);console.log('COMPLETED',job.operation,job.id);}}catch{}});
async function title(text,sub='실제 앱 화면 · 로그인된 Codex CLI 사용'){
  await page.evaluate(({text,sub})=>{let el=document.getElementById('cycle-caption');if(!el){el=document.createElement('div');el.id='cycle-caption';el.style.cssText='position:fixed;left:390px;right:320px;top:24px;padding:16px 24px;z-index:99999;background:#091321ed;border:1px solid #70e5d4;border-radius:12px;pointer-events:none;font:22px/1.5 "Malgun Gothic",sans-serif;color:#cbd5e1;box-shadow:0 10px 36px #0006';document.body.append(el);}el.replaceChildren();const heading=document.createElement('strong');heading.textContent=text;heading.style.cssText='display:block;font-size:30px;color:#8bf0df';const note=document.createElement('div');note.textContent=sub;el.append(heading,note);},{text,sub});
}
async function clip(id,text,seconds,fn,sub){await title(text,sub);const start=elapsed();console.log('RECORD',id);await fn();await page.waitForTimeout(700);clips.push({id,title:text,subtitle:sub,seconds,start,end:elapsed()});await page.screenshot({path:path.join(raw,id+'.png')});}
async function waitForStage(pattern){
  const began=Date.now();
  while(Date.now()-began<650000){const status=await page.locator('#ai-status').textContent();if(pattern.test(status))return;if(await page.locator('#ai-auto').isEnabled())throw Error('생성 중단: '+status);await page.waitForTimeout(1000);}
  throw Error('모델 응답 대기 시간 초과');
}
async function result(index){
  const src=await page.locator('#ai-result-image').getAttribute('src');const response=await page.request.get(base+src);assert.equal(response.status(),200);const file=path.join(out,`result-${index}.png`);await writeFile(file,await response.body());return file;
}
async function showcase(src,label){
  await page.evaluate(({src,label})=>{document.getElementById('cycle-showcase')?.remove();const box=document.createElement('div');box.id='cycle-showcase';box.style.cssText='position:fixed;left:390px;right:320px;top:170px;bottom:80px;z-index:99998;background:#0b1220;border:1px solid #36516b;border-radius:14px;padding:14px;display:flex;flex-direction:column;box-shadow:0 20px 80px #000c';const heading=document.createElement('div');heading.textContent=label;heading.style.cssText='font:22px Malgun Gothic;color:#90e9db;padding:0 8px 12px';const img=document.createElement('img');img.src=src;img.style.cssText='width:100%;height:calc(100% - 40px);object-fit:contain';box.append(heading,img);document.body.append(box);},{src,label});
}
const hide=()=>page.evaluate(()=>document.getElementById('cycle-showcase')?.remove());
let first,second,beforeCamera,afterCamera,success=false;
try{
  await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio&&document.getElementById('ai-auto'));
  await page.waitForFunction(()=>document.getElementById('ai-status')?.textContent.includes('원문을 넣고'));
  await clip('intro','소설 입력부터 작화까지, 앱 안에서 한 사이클',5,async()=>{await page.locator('#studio-ai > details > summary').click();await page.locator('#ai-connections').scrollIntoViewIfNeeded();await page.waitForTimeout(2300);},'API 키 신규 발급 없이 · 로그인된 Codex CLI로 실제 실행');
  await page.locator('#studio-ai > details > summary').click();
  await clip('request','01  소설과 인물 설정을 입력합니다',9,async()=>{
    await page.locator('#ai-story').scrollIntoViewIfNeeded();await page.locator('#ai-story').pressSequentially('서연은 오후 햇살이 드는 작은 방에서 나무 탁자 옆에 서 있었다. 그녀는 탁자 위의 파란 찻잔을 조용히 내려다보았다.',{delay:24});
    await page.locator('#ai-notes').pressSequentially('서연: 성인 여성, 검은 단발머리, 크림색 셔츠와 짙은 바지. 따뜻한 2D 웹툰 삽화. 인물과 찻잔이 함께 보이는 구도.',{delay:19});await page.waitForTimeout(1300);
  },'원문 + 인물 외형 + 화풍을 한 번에 요청');
  await clip('auto','02  “한 번에 이미지까지”를 누릅니다',3,async()=>{await page.locator('#ai-auto').click();await page.locator('#ai-status').scrollIntoViewIfNeeded();await page.waitForTimeout(1600);},'장면 JSON을 직접 옮기거나 이미지를 다시 첨부하지 않습니다');
  await clip('planning','03  소설에서 3D 장면을 자동 구성',5,async()=>{await waitForStage(/2\/3|3\/3/);await page.waitForTimeout(1200);},'실제 모델 응답 대기 · 이 구간은 영상에서 배속');
  await clip('first-wait','04  현재 장면의 참조를 보내 최종 이미지 생성',6,async()=>{await waitForStage(/이미지가 완성/);await page.locator('#ai-result-image').scrollIntoViewIfNeeded();},'컬러 · 라벨 · 깊이 · 조명 · 포즈를 자동 첨부 · 대기 구간 배속');
  first=await result(1);const firstSrc=await page.locator('#ai-result-image').getAttribute('src');
  await clip('first-result','05  첫 번째 이미지가 앱으로 돌아왔습니다',9,async()=>{await showcase(firstSrc,'방금 CLI에서 생성된 실제 결과 · 앱 표시 이미지를 확대');await page.waitForTimeout(6200);},'새 API 키 없이 실제 PNG 생성 · 저장도 바로 가능');
  await hide();
  await clip('edit-style','06  결과를 보고 화풍과 구도를 수정합니다',9,async()=>{
    await page.locator('#studio-ai > summary').click();await page.locator('#studio-style').scrollIntoViewIfNeeded();
    await page.locator('#studio-style').fill('2D 웹툰 일러스트. 선명한 검은 선화와 2~3단 셀 채색. 따뜻한 오후 분위기. 사진이나 3D 렌더 질감 없이.');await page.locator('#studio-title').click();await page.waitForTimeout(1700);
  },'같은 인물·소품을 유지하면서 편집기의 현재 값을 변경');
  beforeCamera=await page.evaluate(()=>({position:window.__bodyV1.stage.camera.position.toArray(),fov:window.__bodyV1.stage.camera.fov}));
  await clip('edit-camera','07  화면을 돌려 새 구도를 잡습니다',8,async()=>{
    await page.mouse.move(1180,330);await page.mouse.down();await page.mouse.move(1290,355,{steps:50});await page.mouse.up();await page.waitForTimeout(1200);
    await page.locator('#studio-fov').scrollIntoViewIfNeeded();const previous=Number(await page.locator('#studio-fov').inputValue());await page.locator('#studio-fov').fill(String(Math.max(28,previous-5)));await page.locator('#studio-shot-name').click();await page.waitForTimeout(1200);
  },'실제 마우스 드래그 + 화각 수정 · 장면을 새로 만들지 않습니다');
  afterCamera=await page.evaluate(()=>({position:window.__bodyV1.stage.camera.position.toArray(),fov:window.__bodyV1.stage.camera.fov}));assert.notDeepEqual(beforeCamera,afterCamera);
  await clip('continue','08  수정한 현재 구도로 이어서 생성',5,async()=>{await page.locator('#studio-ai > summary').click();await page.locator('#ai-image').scrollIntoViewIfNeeded();assert.equal(await page.locator('#ai-working-camera').isChecked(),true);await page.locator('#ai-image').click();await page.locator('#ai-status').scrollIntoViewIfNeeded();await page.waitForTimeout(1500);},'소설 재분석 없이 · 수정한 장면에서 참조를 다시 촬영');
  await clip('second-wait','09  수정한 참조로 두 번째 이미지 생성',6,async()=>{await waitForStage(/이미지가 완성/);await page.locator('#ai-result-image').scrollIntoViewIfNeeded();},'실제 CLI 이미지 생성 · 대기 구간은 배속');
  second=await result(2);const secondSrc=await page.locator('#ai-result-image').getAttribute('src');
  await clip('second-result','10  수정된 구도의 이미지까지 완성',9,async()=>{await showcase(secondSrc,'수정 후 방금 생성된 실제 결과 · 앱 표시 이미지를 확대');await page.waitForTimeout(6200);},'소설 요청 → 자동 생성 → 장면 수정 → 재생성, 한 사이클 완료');
  await hide();
  const imageCalls=calls.filter(x=>x.operation==='image');assert.equal(calls.length,3);assert.deepEqual(calls.map(x=>x.operation),['plan','image','image']);assert.notDeepEqual(imageCalls[0].shot.camera,imageCalls[1].shot.camera);
  for(const [i,call]of imageCalls.entries())await writeFile(path.join(out,`reference-${i+1}.png`),Buffer.from(call.images.find(x=>x.name==='color.png').dataUrl.split(',')[1],'base64'));
  await clip('compare','한 장면, 구도 수정 전과 후',10,async()=>{
    const srcs=await Promise.all([first,second].map(async f=>'data:image/png;base64,'+(await readFile(f)).toString('base64')));
    await page.evaluate(srcs=>{const box=document.createElement('div');box.id='cycle-showcase';box.style.cssText='position:fixed;inset:160px 60px 80px;z-index:99998;background:#0b1220;border:1px solid #36516b;border-radius:14px;padding:20px;display:flex;gap:20px';for(const [i,src]of srcs.entries()){const col=document.createElement('figure');col.style.cssText='margin:0;flex:1;min-width:0;color:#8bf0df;font:26px Malgun Gothic;display:flex;flex-direction:column';const caption=document.createElement('figcaption');caption.textContent=i?'구도·화풍 수정 후 재생성':'소설에서 한 번에 생성한 첫 결과';const img=document.createElement('img');img.src=src;img.style.cssText='width:100%;height:calc(100% - 45px);object-fit:contain;margin-top:15px';col.append(caption,img);box.append(col);}document.body.append(box);},srcs);await page.waitForTimeout(7200);
  },'같은 장면의 실제 생성 결과 두 장 · 구도 보존 정도는 생성 모델에 따라 달라집니다');
  assert.deepEqual(errors,[]);success=true;
}finally{
  const video=page.video();await context.close();if(video)await video.saveAs(path.join(raw,'source.webm'));await browser.close();
  const report={success,recordedAt:new Date().toISOString(),source:`.review-tools/${captureTag}/source.webm`,sourceElapsedSeconds:elapsed(),clips,pageErrors:errors,calls:calls.map(x=>({operation:x.operation,provider:x.provider,at:x.at,images:x.images?.length,camera:x.shot?.camera,characterNotesForwarded:x.operation==='image'?x.prompt.includes('사용자가 입력한 인물 설정'):undefined})),jobs:jobs.map(x=>({id:x.id,operation:x.operation,status:x.status,createdAt:x.createdAt})),beforeCamera,afterCamera,results:[first,second].filter(Boolean).map(x=>path.basename(x)),note:'All model calls were live. No fixture replay. Captions and result enlargements are recording annotations.'};
  await writeFile(path.join(out,'recording-report.json'),JSON.stringify(report,null,2));
}
console.log('RECORDING COMPLETE',clips.length,'clips');
