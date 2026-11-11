import {loadPlaywright} from '../../../scripts/playwright-runtime.mjs';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const {chromium}=loadPlaywright();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:3001');
  await page.locator('#studio-file').setInputFiles(path.join(dir,'scene.json'));
  await page.waitForFunction(()=>document.querySelector('#studio-status')?.textContent.includes('인물 2명'));
  for(const [selector,name]of [['#studio-color','preview.png'],['#btn-save','project.json']]){
    const pending=page.waitForEvent('download');await page.locator(selector).click();
    await (await pending).saveAs(path.join(dir,name));
  }
  await writeFile(path.join(dir,'render-report.json'),JSON.stringify({pageErrors:errors,status:await page.locator('#studio-status').textContent()},null,2));
  console.log(JSON.stringify({errors,preview:path.join(dir,'preview.png')}));
}finally{await browser.close();}
