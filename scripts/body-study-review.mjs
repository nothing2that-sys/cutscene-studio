import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='docs/review-evidence/2026-11-03-body-study';await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1400,height:1000},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:3001/body-study.html');await page.waitForFunction(()=>window.bodyStudy);
 const capture=async name=>{const data=await page.evaluate(()=>{window.bodyStudy.render();return window.bodyStudy.renderer.domElement.toDataURL('image/png').split(',')[1];});await writeFile(`${out}/${name}.png`,Buffer.from(data,'base64'));};
 await capture('reference-clay');await page.screenshot({path:`${out}/reference-side-by-side.png`,fullPage:true});
 await page.locator('#joints').check();await capture('reference-joints');await page.screenshot({path:`${out}/landmarks-ui.png`,fullPage:true});await page.locator('#joints').uncheck();
 await page.locator('#style').selectOption('silhouette');await capture('reference-silhouette');await page.locator('#overlay').check();await page.locator('#render').screenshot({path:`${out}/reference-overlay.png`});await page.locator('#overlay').uncheck();
 await page.locator('#style').selectOption('line');await capture('reference-lines');
 const reference=await page.evaluate(()=>window.bodyStudy.cage);await writeFile(`${out}/reference-cage.json`,JSON.stringify(reference,null,2));
 const projections=await page.evaluate(()=>Object.entries(window.bodyStudy.cage.joints).map(([name,p])=>{const q=window.bodyStudy.camera.position.clone().set((p[0]-480)/640,(1280-p[1])/640,p[2]/640).project(window.bodyStudy.camera);return {name,sourcePixels:p.slice(0,2),renderPixels:[(q.x+1)*240,(1-q.y)*320],visibility:name.startsWith('hip')?'inferred center under surface':'manually read from drawing'};}));
 await writeFile(`${out}/landmarks.json`,JSON.stringify({camera:'orthographic, front +Z, image 960×1280 → render 480×640',note:'These are authored pose anchors, not independently measured silhouette accuracy or a visual score.',points:projections},null,2));
 await page.locator('#pose').selectOption('neutral');await page.locator('#style').selectOption('clay');
 for(const view of ['front','side','back','oblique']){await page.locator('#view').selectOption(view);await capture(`neutral-${view}`);}
 await page.locator('#style').selectOption('wire');await capture('neutral-cage');
 const neutral=await page.evaluate(()=>window.bodyStudy.cage);await writeFile(`${out}/neutral-cage.json`,JSON.stringify(neutral,null,2));
 const geometry=await page.evaluate(()=>window.bodyStudy.geometry());
 let obj='# Actual neutral study render geometry; meters approximately\n',offset=1;
 for(const p of geometry){obj+=`o ${p.name}\n`;for(let i=0;i<p.positions.length;i+=3)obj+=`v ${p.positions.slice(i,i+3).join(' ')}\n`;for(let i=0;i<p.indices.length;i+=3)obj+=`f ${p.indices.slice(i,i+3).map(n=>n+offset).join(' ')}\n`;offset+=p.positions.length/3;}
 await writeFile(`${out}/neutral-mesh.obj`,obj);
 // Verify cage editing changes actual geometry, export/import roundtrip and reset.
 const before=await page.evaluate(()=>window.bodyStudy.geometry()[0].positions);const x=Number(await page.locator('#x').inputValue());await page.locator('#x').fill(String(x+10));await page.locator('#x').dispatchEvent('change');
 const after=await page.evaluate(()=>window.bodyStudy.geometry()[0].positions);assert.notDeepEqual(before,after);
 const pending=page.waitForEvent('download');await page.locator('#save').click();await(await pending).saveAs(`${out}/edited-roundtrip.json`);
 await page.locator('#reset').click();assert.deepEqual(await page.evaluate(()=>window.bodyStudy.geometry()[0].positions),before);
 await page.locator('#load').setInputFiles(`${out}/edited-roundtrip.json`);await page.waitForFunction(x=>window.bodyStudy.cage.parts[0].rings[0][0][0]===x+10,x);assert.deepEqual(await page.evaluate(()=>window.bodyStudy.geometry()[0].positions),after);
 await page.locator('#reset').click();assert.deepEqual(errors,[]);
 await page.locator('#pose').selectOption('reference');await page.locator('#view').selectOption('front');await page.locator('#style').selectOption('clay');
 const display=await page.locator('#render').evaluate(el=>({frame:[el.clientWidth,el.clientHeight],canvas:[el.querySelector('canvas').clientWidth,el.querySelector('canvas').clientHeight],overlayHidden:getComputedStyle(el.querySelector('img')).display==='none'}));assert.deepEqual(display.frame,display.canvas);assert.equal(display.overlayHidden,true);
 await page.goto('http://127.0.0.1:3001/model-preview.html');await page.waitForFunction(()=>document.querySelector('#preview-status').textContent.includes('175cm'));assert.deepEqual(errors,[]);
 const report={pageErrors:errors,display,geometry:geometry.map(p=>({name:p.name,vertices:p.positions.length/3,triangles:p.indices.length/3})),checks:['Actual WebGL captures in reference pose and four neutral directions','XYZ cage edits change geometry','JSON download and import preserve edited geometry','Reset restores authored cage','Comparison canvas and image share display size; overlay really hides','Existing model preview still opens'],scope:'No visual acceptance verdict; production rig and editor untouched'};
 await writeFile(`${out}/checks.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
