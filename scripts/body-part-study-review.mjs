import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='docs/review-evidence/2026-11-03-body-parts';await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:3001/body-part-study.html');await page.waitForFunction(()=>window.bodyPartStudy);
 await page.screenshot({path:out+'/assembled.png',fullPage:true});
 await page.locator('#source-map [data-part="thorax"]').click();assert.equal(await page.locator('#part').inputValue(),'thorax');assert.match(await page.locator('#detail').textContent(),/흉곽/);
 await page.locator('#isolate').check();assert.deepEqual(await page.evaluate(()=>[...window.bodyPartStudy.meshes.values()].filter(m=>m.visible).map(m=>m.name)),['thorax']);
 await page.screenshot({path:out+'/thorax-inspection.png',fullPage:true});
 await page.locator('#part').selectOption('palmL');assert.equal(await page.evaluate(()=>[...window.bodyPartStudy.meshes.values()].filter(m=>m.visible).length),6);
 await page.locator('#isolate').uncheck();await page.locator('#part').selectOption('all');await page.locator('#explode').fill('100');
 assert.notEqual(await page.evaluate(()=>window.bodyPartStudy.meshes.get('upperL').position.x),0);
 await page.screenshot({path:out+'/exploded.png',fullPage:true});
 await page.locator('#explode').fill('0');assert.ok(Math.abs(await page.evaluate(()=>window.bodyPartStudy.meshes.get('upperL').position.x))<1e-12);
 await page.locator('#view').selectOption('oblique');await page.screenshot({path:out+'/oblique.png',fullPage:true});assert.deepEqual(errors,[]);
 const report={pageErrors:errors,parts:await page.evaluate(()=>window.bodyPartStudy.parts.map(p=>p.name)),checks:['Click source drawing to inspect corresponding shell','Isolate selected thorax','Hand selection includes its fingers','Explode and reassemble real meshes','Open oblique view'],scope:'Structural breakdown of previous prototype; no new anatomy or functional joint acceptance'};await writeFile(out+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
