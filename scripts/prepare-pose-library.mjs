import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {STARTER_POSES} from '../app/src/starter-poses.js';
import assert from 'node:assert/strict';
await mkdir('app/public/pose-library',{recursive:true});await mkdir('examples/poses',{recursive:true});await mkdir('validation/direct-editor',{recursive:true});
// Usage: node scripts/prepare-pose-library.mjs [baseUrl] [id,id,...]  (ids without 'starter-'; default all)
const base=process.argv[2]||'http://127.0.0.1:3002',only=process.argv[3]?new Set(process.argv[3].split(',')):null;
const {chromium}=loadPlaywright();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});await page.locator('#studio-example').click();
  for(const entry of STARTER_POSES.filter(e=>!only||only.has(e.id.slice(8)))){
    await page.locator('#pose-library-open').click();
    const card=page.locator(`[data-pose-id="${entry.id}"]`);await card.locator('.pose-card-apply').click();
    await page.waitForFunction(id=>document.querySelector(`[data-pose-id="${id}"] img`)?.src.startsWith('data:image/png'),entry.id);
    const png=await card.locator('img').getAttribute('src');await writeFile('app/public/pose-library/'+entry.id.slice(8)+'.png',Buffer.from(png.split(',')[1],'base64'));
    const pending=page.waitForEvent('download');await page.locator('#pose-reference-save').click();const d=await pending;const file='examples/poses/'+entry.id.slice(8)+'.json';await d.saveAs(file);
    const pose=JSON.parse(await readFile(file,'utf8'));pose.name=entry.name;await writeFile(file,JSON.stringify(pose,null,2)+'\n');console.log(entry.name);
  }
  await page.locator('#pose-library-open').click();await page.screenshot({path:'validation/direct-editor/starter-library.png'});assert.deepEqual(errors,[]);
}finally{await browser.close();}
