import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='validation/image-references';await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:3001');await page.locator('#studio-example').click();await page.locator('#image-references-open').click();await page.waitForFunction(()=>document.querySelector('#image-references-status').textContent.includes('등록 1001개'));
 assert.equal(await page.locator('.image-reference-card').count(),36);assert.equal(await page.locator('#image-references-category option').count(),21);checks.push('1001 image references registered in 20 categories; only 36 cards mounted per page');
 await page.locator('#image-references-search').fill('POSE-0251');assert.equal(await page.locator('.image-reference-card').count(),1);await page.waitForFunction(()=>document.querySelector('.image-reference-card img')?.naturalWidth>0);await page.screenshot({path:out+'/search.png'});checks.push('ID search resolves verified local PNG');
 await page.locator('.image-reference-card').click();assert.equal(await page.locator('#image-reference-pinned').isVisible(),true);assert.equal(await page.locator('body').getAttribute('data-pose-solo'),'true');
 await page.locator('#image-reference-link').click();await page.waitForFunction(()=>/저장|바꿨/.test(document.querySelector('#direct-status').textContent));
 await page.locator('#pose-library-open').click();await page.waitForFunction(()=>[...document.querySelectorAll('.pose-card span')].some(e=>e.textContent.includes('POSE-0251')));
 const pending=page.waitForEvent('download');await page.locator('#pose-library-backup').click();await (await pending).saveAs(out+'/library.json');const library=JSON.parse(await readFile(out+'/library.json','utf8')),linked=library.poses.find(p=>p.reference?.poseId==='POSE-0251');assert.ok(linked);assert.equal(linked.pose.type,'pose-reference');checks.push('pinned 2D reference links current real 3D pose; linkage included in backup');
 await page.locator('#pose-library-close').click();await page.locator('#image-reference-hide').click();await page.locator('#image-references-open').click();await page.locator('#image-references-search').fill('');await page.locator('#image-references-category').selectOption('의자앉기');assert.match(await page.locator('#image-references-status').innerText(),/검색/);assert.ok(await page.locator('.image-reference-card').count()>0);checks.push('category filter and reference close work');
 await page.waitForFunction(()=>[...document.querySelectorAll('.image-reference-card img')].filter(img=>img.getBoundingClientRect().top<innerHeight).every(img=>img.complete&&img.naturalWidth>0));await page.screenshot({path:out+'/catalog.png'});assert.deepEqual(errors,[]);const report={checks,pageErrors:errors};await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
