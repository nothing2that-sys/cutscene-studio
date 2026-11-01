import { createRequire } from 'node:module';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(path.resolve(path.dirname(process.execPath),'../package.json'));
const {chromium}=require('playwright');
const {EXAMPLE_SCENE}=await import('../app/src/scene-format.js');
await mkdir('validation/json-feedback',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1050},acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const precise=x=>JSON.parse(JSON.stringify(x,(_k,v)=>typeof v==='number'?Math.round(v*1e8)/1e8:v));
async function download(selector,name){
  const waiting=page.waitForEvent('download');await page.locator(selector).click();const d=await waiting;
  const file='validation/json-feedback/'+name;await d.saveAs(file);return JSON.parse(await readFile(file,'utf8'));
}
async function enter(value,apply=true){
  await page.locator('#studio-json').fill(typeof value==='string'?value:JSON.stringify(value,null,2));
  await page.locator(apply?'#studio-apply':'#studio-check').click();
}
try{
  await page.goto('http://127.0.0.1:3001');
  await page.locator('#studio-example').click();
  await page.waitForFunction(()=>document.querySelector('#studio-status').textContent.includes('인물 2명'));
  const before=await download('#btn-save','before.json');
  await page.getByText('LLM JSON 붙여넣기',{exact:true}).click();
  const bad=structuredClone(EXAMPLE_SCENE);bad.units='cm';bad.actors[0].joints.r_elbow={bend:999};bad.props[0].dimensions=[1,1,1];
  const badText=JSON.stringify(bad,null,2);await enter(badText);
  assert.ok((await page.locator('#studio-validation-issues').innerText()).includes('actors[0].joints.r_elbow.bend'));
  assert.equal(await page.locator('#studio-validation').getAttribute('data-level'),'error');
  await page.locator('#studio-repair-copy').click();
  await page.waitForFunction(()=>document.querySelector('#studio-status').textContent.includes('원본 JSON과 검사 결과를 복사했습니다'));
  const repair=await page.evaluate(()=>navigator.clipboard.readText());
  assert.equal(JSON.parse(repair.slice(repair.indexOf('{'))).originalJSON,badText);
  const report=await download('#studio-report-download','error-report.json');
  assert.equal(report.errors.length,3);assert.equal(report.originalJSON,badText);assert.equal(report.applied,false);
  const after=await download('#btn-save','after-rejection.json');
  assert.deepEqual(precise(after.mannequins),precise(before.mannequins));
  const warning=structuredClone(EXAMPLE_SCENE);warning.actors[0].position[0]=12;
  await enter(warning,false);
  const checked=await download('#studio-report-download','checked-only.json');
  assert.equal(checked.valid,true);assert.equal(checked.applied,false);assert.ok(checked.warnings.some(x=>x.code==='OUTSIDE_ROOM'));
  const still=await download('#btn-save','after-check-only.json');
  assert.deepEqual(precise(still.mannequins),precise(before.mannequins));
  await page.locator('#studio-apply').click();
  const applied=await download('#studio-report-download','warning-applied.json');
  assert.equal(applied.applied,true);assert.equal(await page.locator('#studio-validation').getAttribute('data-level'),'warning');
  await enter(EXAMPLE_SCENE);
  assert.equal(await page.locator('#studio-validation').getAttribute('data-level'),'ok');
  await enter('{\n "version": 1,\n "units": meters\n}');
  const syntax=await download('#studio-report-download','syntax.json');assert.equal(syntax.errors[0].code,'JSON_SYNTAX');
  const corrupt=structuredClone(before);corrupt.mannequins[0].position=[1,'wrong',3];corrupt.mannequins[0].posture.data=[];
  await page.locator('#btn-load').setInputFiles({name:'broken-project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(corrupt))});
  await page.waitForFunction(()=>document.querySelector('#studio-validation-source').textContent.includes('broken-project.json'));
  const projectReport=await download('#studio-report-download','project-report.json');
  assert.ok(projectReport.errors.some(x=>x.path==='mannequins[0].position'));
  const preserved=await download('#btn-save','after-project-error.json');
  assert.deepEqual(precise(preserved.mannequins),precise(before.mannequins));
  await page.locator('#studio-file').setInputFiles({name:'bad-scene.json',mimeType:'application/json',buffer:Buffer.from(badText)});
  await page.waitForFunction(()=>document.querySelector('#studio-validation-source').textContent.includes('bad-scene.json'));
  await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'writeText',{value:async()=>{throw new Error('blocked');},configurable:true}));
  await page.locator('#studio-repair-copy').click();
  assert.equal(await page.locator('#studio-repair-text').isVisible(),true);
  assert.ok((await page.locator('#studio-repair-text').inputValue()).includes('bad-scene.json'));
  await page.screenshot({path:'validation/json-feedback/error-ui.png'});
  assert.deepEqual(errors,[]);
  const result={passed:true,checks:['multiple errors visible','exact original JSON in clipboard repair request','report JSON download','invalid scene preserves current scene','validate-only keeps scene','spatial warnings apply with warning status','corrected JSON clears old issues','syntax errors','bad project rejected before mutation','file import source recorded','clipboard denial offers selectable fallback'],pageErrors:errors};
  await writeFile('validation/json-feedback/browser-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
