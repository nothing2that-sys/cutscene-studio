// Explicit --live uses the signed-in CLI and its usage allowance. Default uses
// deterministic HTTP fixtures while exercising real scene apply/render/capture.
import {loadPlaywright} from './playwright-runtime.mjs';
import {EXAMPLE_SCENE} from '../app/src/scene-format.js';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const base=process.argv.find(x=>x.startsWith('http'))||'http://127.0.0.1:3012',live=process.argv.includes('--live');
const out=path.join(root,'.review-tools','ai-workflow');await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:process.env.CUTSCENE_BROWSER_CHANNEL||'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[],requests=[];
page.on('pageerror',error=>errors.push(error.message));
const png=await readFile(path.join(root,'.review-tools/ai-probe/headless-cup.png')).catch(()=>Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0XkAAAAASUVORK5CYII=','base64'));
let count=0,mocked=new Map();
if(!live)await page.route('**/api/ai/**',async route=>{
  const url=new URL(route.request().url()),method=route.request().method();
  const json=body=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  if(url.pathname.endsWith('/capabilities'))return json({providers:[{id:'codex-cli',name:'Codex CLI',plan:true,image:true,available:true,reason:'test fixture'},{id:'openai',name:'OpenAI API',plan:false,image:false,available:false,reason:'OPENAI_API_KEY 서버 설정 필요',models:{plan:'test',image:'test'}},{id:'gemini',name:'Gemini API',plan:false,image:false,available:false,reason:'GEMINI_API_KEY 서버 설정 필요',models:{plan:'test',image:'test'}}]});
  if(method==='POST'){
    const input=route.request().postDataJSON();requests.push(input);const id=`00000000-0000-0000-0000-${String(++count).padStart(12,'0')}`;
    mocked.set(id,{id,status:'completed',operation:input.operation,provider:input.provider,createdAt:new Date().toISOString(),result:input.operation==='plan'?{scene:EXAMPLE_SCENE}:{imageUrl:`/api/ai/jobs/${id}/image`,filename:'result.png'}});return json({id,status:'running'});
  }
  if(url.pathname.endsWith('/image'))return route.fulfill({contentType:'image/png',body:png});
  return json(mocked.get(url.pathname.split('/').at(-1)));
});
const waitStatus=pattern=>page.waitForFunction(source=>new RegExp(source).test(document.getElementById('ai-status')?.textContent),pattern.source,{timeout:650000});
try{
  await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio&&document.getElementById('ai-auto'));
  await waitStatus(/원문을 넣고/);
  if(!live){await page.locator('#ai-plan').click();await waitStatus(/소설 원문을 입력/);assert.equal(requests.length,0,'blank form must not send the existing example scene');}
  await page.locator('#ai-story').fill('서연은 작은 방의 탁자 옆에 서서 파란 찻잔을 내려다보았다. 창문 너머에서 따뜻한 오후 햇살이 들어왔다.');
  await page.locator('#ai-notes').fill('서연은 검은 단발머리에 크림색 셔츠를 입은 성인이다. 2D 웹툰 삽화. 찻잔과 인물의 관계가 잘 보이게.');
  await page.locator('#ai-plan').click();await waitStatus(/장면을 구성했습니다/);
  const initial=await page.evaluate(()=>window.__bodyV1.studio.snapshot());
  // A real edit between planning and generating; verify capture uses it.
  const editedCamera=await page.evaluate(()=>{const boundary=window.__bodyV1,s=boundary.studio,state=s.snapshot();state.document.style='2D 웹툰, 검은 선화와 셀 채색';s.restore(state);const cam=boundary.viewPerformance.snapshotCamera()||{position:boundary.stage.camera.position.toArray(),target:boundary.stage.controls.target.toArray(),fov:boundary.stage.camera.fov};cam.position[0]+=.7;boundary.viewPerformance.setWorkingCamera(cam);return cam.position;});
  await page.locator('#ai-image').click();await waitStatus(/이미지가 완성/);
  await page.locator('#ai-result-image').waitFor({state:'visible'});
  assert.equal(await page.locator('#ai-result-image').evaluate(img=>img.complete&&img.naturalWidth>0),true);
  const imageUrl=await page.locator('#ai-result-image').getAttribute('src');
  const generated=await page.evaluate(async url=>{const response=await fetch(url);return {status:response.status,bytes:[...new Uint8Array(await response.arrayBuffer())]};},imageUrl);assert.equal(generated.status,200);await writeFile(path.join(out,live?'live-result.png':'fixture-result.png'),Buffer.from(generated.bytes));
  await page.locator('#studio-ai').screenshot({path:path.join(out,live?'live-ui.png':'fixture-ui.png')});
  if(!live){
    assert.equal(requests.length,2);assert.equal(requests[1].images.length,5);assert.match(requests[1].prompt,/2D 웹툰, 검은 선화/);assert.match(requests[1].prompt,/검은 단발머리에 크림색 셔츠/,'character notes reach the final image request even when absent from the scene proposal');assert.ok(requests[1].shot.camera.position.every((x,i)=>Math.abs(x-editedCamera[i])<.011),'capture uses the edited working camera');
    await page.locator('#ai-auto').click();await waitStatus(/이미지가 완성/);assert.equal(requests.length,4);assert.deepEqual(requests.map(x=>x.operation),['plan','image','plan','image']);
    await page.reload();await waitStatus(/최근 생성 이미지/);assert.equal(await page.locator('#ai-result-image').isVisible(),true);
    await page.locator('#studio-ai > details > summary').click();await page.locator('#ai-image-provider').selectOption('openai');await page.locator('#ai-auto').click();await waitStatus(/OPENAI_API_KEY/);assert.equal(requests.length,4,'unavailable image connection must stop before a planning call');
  }
  assert.deepEqual(errors,[]);const report={live,initialTitle:initial.document.title,imageUrl,requests:requests.map(x=>({operation:x.operation,provider:x.provider,images:x.images?.length})),errors};
  await writeFile(path.join(out,live?'live-report.json':'fixture-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
