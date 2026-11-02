import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Euler,Quaternion} from '../app/node_modules/three/build/three.module.js';
const canonical=value=>JSON.parse(JSON.stringify(value,(key,v)=>key==='rotation'&&Array.isArray(v)?new Quaternion().setFromEuler(new Euler(...v)).toArray().map(n=>Math.round(n*1e8)/1e8):typeof v==='number'?Math.round(v*1e8)/1e8:v));
const out='validation/solo-view';await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
async function download(selector,name){const pending=page.waitForEvent('download');await page.locator(selector).click();const d=await pending;await d.saveAs(out+'/'+name);return readFile(out+'/'+name);}
const save=async name=>JSON.parse(await download('#btn-save',name));
try{
  await page.goto('http://127.0.0.1:3001');await page.locator('#studio-example').click();
  const original=await save('original.json'),color=await download('#studio-color','before.png');
  await page.locator('[data-edit-mode="pose"]').click();await page.waitForFunction(()=>document.body.dataset.poseSolo==='true');
  await page.evaluate(()=>{
    const gl=document.querySelector('canvas').getContext('webgl2');window.__soloDraws=[];for(const name of ['drawElements','drawArrays']){const original=gl[name].bind(gl);gl[name]=(...args)=>{window.__soloDraws.push(performance.now());return original(...args);};}});
  await page.waitForTimeout(1600);await page.evaluate(()=>window.__soloDraws.length=0);await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.__soloDraws.length),0);checks.push('unchanged pose view performs no GPU draw calls');
  const solo=await save('solo.json');assert.deepEqual(solo.camera,original.camera);assert.deepEqual(canonical(solo.mannequins),canonical(original.mannequins));assert.deepEqual(solo.importedModels,original.importedModels);checks.push('solo save preserves all actors, props, equivalent joint rotations and original working camera');
  const soloColor=await download('#studio-color','solo.png');assert.deepEqual(soloColor,color);checks.push('solo color PNG equals whole-scene PNG byte for byte');
  const depth=await download('#studio-depth','depth.png');assert.equal(depth.readUInt32BE(16),1600);assert.equal(depth.readUInt32BE(20),900);checks.push('full-size depth export remains available during solo');
  await page.locator('#edit-lightweight').uncheck();const qualityColor=await download('#studio-color','quality.png');assert.deepEqual(qualityColor,color);await page.locator('#edit-lightweight').check();checks.push('editing quality toggle does not change capture quality or composition');
  await page.locator('.layer-item[data-imported="false"][data-idx="1"] span').first().click();assert.equal(await page.locator('body').getAttribute('data-pose-solo'),'true');assert.deepEqual((await save('second.json')).camera,original.camera);checks.push('selecting another actor keeps solo and original scene camera');
  await page.locator('#studio-preview-refresh').click();await page.locator('#pose-solo').uncheck();await page.waitForFunction(()=>document.body.dataset.poseSolo==='false');assert.deepEqual((await save('restored.json')).camera,original.camera);checks.push('manual preview refresh and solo exit restore whole-scene editing');
  await page.locator('#pose-solo').check();await page.locator('[data-edit-mode="move"]').click();await page.waitForFunction(()=>document.body.dataset.poseSolo==='false');
  await page.locator('#render-info summary').click();await page.waitForFunction(()=>document.querySelector('#render-info-text').textContent.includes('1024×704'));checks.push('move exits solo; renderer diagnostics display capped editing resolution');
  await page.locator('[data-edit-mode="pose"]').click();await page.waitForFunction(()=>document.querySelector('#render-info-text').textContent.includes('선택 인물 단독: 켬'));await page.waitForTimeout(200);await page.screenshot({path:out+'/solo.png'});assert.deepEqual(errors,[]);
  await writeFile(out+'/report.json',JSON.stringify({checks,pageErrors:errors},null,2));console.log(JSON.stringify({checks,pageErrors:errors},null,2));
}finally{await browser.close();}
