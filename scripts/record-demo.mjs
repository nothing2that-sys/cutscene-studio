// Reproducible recording of the real local editor. Requires Playwright + Chrome.
// node scripts/record-demo.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const out=path.resolve('docs/demo'); await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:out,size:{width:1920,height:1080}},acceptDownloads:true});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const cues=[];let started;
async function caption(title,body,seconds=5){
  cues.push({seconds:Math.round((Date.now()-started)/1000),title,body});
  await page.evaluate(({title,body})=>{let el=document.getElementById('demo-caption');if(!el){el=document.createElement('div');el.id='demo-caption';el.style.cssText='position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:999999;background:rgba(7,15,28,.96);color:white;padding:16px 30px;border:1px solid #59c9c0;border-radius:12px;box-shadow:0 4px 24px #0008;text-align:center;max-width:1250px;pointer-events:none;font:20px/1.5 "Malgun Gothic",sans-serif';document.body.append(el);}el.replaceChildren();const t=document.createElement('strong');t.style.cssText='display:block;font-size:25px;color:#7ce5d8';t.textContent=title;const b=document.createElement('span');b.textContent=body;el.append(t,b);},{title,body});
  await page.waitForTimeout(seconds*1000);
}
async function download(selector,name){const pending=page.waitForEvent('download');await page.locator(selector).click();await(await pending).saveAs(path.join(out,name));}
try{
 await page.goto(process.argv[2]||'http://127.0.0.1:3001');
 await page.waitForFunction(()=>window.__bodyV1?.studio);started=Date.now();
 await caption('Cutscene Studio · 소설에서 작화 참조까지','실제 로컬 편집기 화면 · 한국어 자막 데모 · 외부 AI 호출 없이 편집',5);
 await page.locator('#studio-example').click();
 await caption('01  예제 장면으로 시작','두 인물과 소품을 한 공간에 배치하고 촬영 구도를 확인합니다.',6);
 await page.locator('#studio-file').setInputFiles(path.resolve('app/saved/nowhere-to-hide-rain/scene.json'));
 await caption('02  장면 JSON 열기','빗속 액션 장면의 인물 · 공간 · 조명 · 카메라를 불러옵니다.',6);
 await page.screenshot({path:path.join(out,'editor.png')});
 const canvas=page.locator('canvas').first();const box=await canvas.boundingBox();
 if(box){await page.mouse.move(box.x+box.width*.55,box.y+box.height*.45);await page.mouse.down();await page.mouse.move(box.x+box.width*.68,box.y+box.height*.5,{steps:50});await page.mouse.up();}
 await caption('03  작업 화면에서 구도 탐색','빈 공간 드래그로 시점을 회전합니다. 저장된 촬영 컷은 따로 유지됩니다.',6);
 await page.locator('#studio-shot-name').fill('데모 · 직접 잡은 구도');await page.locator('#studio-shot-add').click();
 await caption('04  구도 저장','현재 시점을 새 컷으로 저장합니다. 컷들은 같은 인물과 공간을 공유합니다.',5);
 await page.locator('#studio-file').setInputFiles(path.resolve('app/saved/nowhere-to-hide-rain/scene.json'));
 await download('#studio-color','demo-color.png');
 await caption('05  PNG 캡처','선택 표시와 편집 가이드가 없는 작화용 컬러 참조를 저장합니다.',5);
 await download('#studio-llm-package','demo-package.zip');
 await caption('06  LLM 패키지 내보내기','컬러 · 라벨 · 깊이 · 조명 · 포즈와 장면 설명을 ZIP으로 전달합니다.',7);
 await page.screenshot({path:path.join(out,'package-export.png')});
 const before=(await readFile('app/saved/nowhere-to-hide-rain/cutscene-color.png')).toString('base64');
 const after=(await readFile('app/saved/nowhere-to-hide-rain/final-comic-v1.png')).toString('base64');
 await page.setContent(`<html lang="ko"><meta charset="utf-8"><style>body{margin:0;background:#091321;color:#fff;font:24px 'Malgun Gothic',sans-serif;padding:50px;text-align:center}h1{color:#7ce5d8;font-size:42px}main{display:flex;gap:30px;justify-content:center}figure{margin:0;width:46%}img{width:100%;height:650px;object-fit:contain;background:#101d2e}figcaption{padding:15px}p{color:#c3cfdd;font-size:22px}</style><h1>3D 참조 → 외부 이미지 생성 결과</h1><main><figure><img src="data:image/png;base64,${before}"><figcaption>편집기에서 내보낸 참조</figcaption></figure><figure><img src="data:image/png;base64,${after}"><figcaption>기존 image_gen 작화 예제</figcaption></figure></main><p>최종 작화는 별도 이미지 생성 단계입니다. 편집기 내 자동 생성 기능은 없으며, 구도와 자세는 달라질 수 있습니다.</p></html>`);
 await page.waitForTimeout(9000);await page.screenshot({path:path.join(out,'before-after.png')});
 await page.setContent('<html lang="ko"><meta charset="utf-8"><body style="background:#091321;color:white;font:32px/1.8 Malgun Gothic,sans-serif;text-align:center;padding-top:230px"><h1 style="color:#7ce5d8">Cutscene Studio</h1><p>장면을 열고 · 구도를 다듬고 · 작화 참조를 전달하세요</p><p>github.com/nothing2that-sys/cutscene-studio</p><p style="font-size:23px;color:#b8c5d5">로컬 편집 · GPL-3.0 · 예제와 개발 기록 공개</p></body></html>');await page.waitForTimeout(5_000);
 if(errors.length)throw Error(errors.join('\n'));
}finally{
 const video=page.video();await context.close();if(video)await video.saveAs(path.join(out,'cutscene-studio-demo.webm'));await browser.close();
 await writeFile(path.join(out,'recording-report.json'),JSON.stringify({pageErrors:errors,cues,viewport:'1920x1080',audio:'none; Korean burned-in captions',recordedAt:new Date().toISOString()},null,2));
}
console.log('Recorded docs/demo/cutscene-studio-demo.webm');
