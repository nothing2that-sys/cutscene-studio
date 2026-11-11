// Autosave and character-sheet hygiene (REVIEW_2026-11-11 R1/R2):
// - opening the app writes nothing and offers no restore on a clean profile
// - after changes, a reload offers the previous work; restore brings back poses and sheets
// - importing a scene JSON clears sheets from the previous work (no id carry-over)
// - a project file without sheets clears them; one with sheets restores them
// Usage: node scripts/autosave-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:1400,height:950}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const ready=()=>page.waitForFunction(()=>window.__bodyV1?.studio&&window.__autosave,null,{timeout:120000});
const refs=()=>page.evaluate(()=>Object.fromEntries(Object.entries(window.__bodyV1.studio.references()).map(([k,v])=>[k,v.length])));
const stored=()=>page.evaluate(async()=>{const m=await import('/src/autosave.js');return (await m.readAutosave())?.savedAt||null;});
const knee=()=>page.evaluate(()=>window.__bodyV1.actors.find(a=>a.id==='jihoon')?.driver.l_knee.bend??null);
try{
 await page.goto(base);await ready();await page.waitForTimeout(2500);
 assert.equal(await page.locator('#autosave-banner').isVisible(),false,'clean profile must not offer a restore');
 assert.equal(await stored(),null,'opening the app must not write an autosave');
 // Work: example scene, a character sheet on jihoon, a kneeling pose.
 await page.locator('#studio-example').click();await page.waitForFunction(()=>window.__bodyV1.actors.length===2);await page.waitForTimeout(800);
 await page.locator('input[data-ref-input="jihoon"]').setInputFiles('app/public/pose-library/standing.png');await page.waitForFunction(()=>window.__bodyV1.studio.references().jihoon?.length===1);
 await page.locator('.layer-item[data-imported="false"][data-idx="0"]').first().click();await page.waitForTimeout(300);
 await page.selectOption('#quick-pose','kneeling');await page.click('#quick-pose-apply');await page.waitForTimeout(500);
 const kneeBefore=await knee();assert.ok(kneeBefore>90,'kneeling applied');
 await page.waitForTimeout(2200);assert.ok(await stored(),'autosave written after changes');
 assert.equal(await page.evaluate(()=>window.__autosave.dirty),true);
 // Reload: offered, restored with pose and sheet.
 page.on('dialog',d=>d.accept());await page.reload();await ready();
 await page.locator('#autosave-banner').waitFor({state:'visible',timeout:15000});
 await page.click('#autosave-restore');await page.waitForFunction(()=>window.__bodyV1.actors.length===2,null,{timeout:60000});await page.waitForTimeout(800);
 assert.deepEqual(await refs(),{jihoon:1},'sheet restored');assert.ok(Math.abs((await knee())-kneeBefore)<1e-6,'pose restored');
 // R1: a new scene import clears sheets and says so.
 await page.locator('#studio-example').click();await page.waitForTimeout(1500);
 assert.deepEqual(await refs(),{},'scene import clears previous sheets');
 assert.match(await page.locator('#studio-status').textContent(),/이전 설정화 1장을 비웠습니다/);
 // R1: project files. With sheets -> kept; without -> cleared.
 await page.locator('input[data-ref-input="seoyeon"]').setInputFiles('app/public/pose-library/standing.png');await page.waitForFunction(()=>window.__bodyV1.studio.references().seoyeon?.length===1);
 const project=await page.evaluate(async()=>({...(await window.__bodyV1.drive.save()),characterReferences:structuredClone(window.__bodyV1.studio.references())}));
 const {characterReferences,...bare}=project;
 await page.evaluate(async t=>{await window.__bodyV1.studio.importText(t,'no-refs.json',false);},JSON.stringify(bare));await page.waitForTimeout(1200);
 assert.deepEqual(await refs(),{},'project without sheets clears them');
 await page.evaluate(async t=>{await window.__bodyV1.studio.importText(t,'with-refs.json',false);},JSON.stringify(project));await page.waitForTimeout(1200);
 assert.deepEqual(await refs(),{seoyeon:1},'project with sheets restores them');
 // Undo must not touch sheets.
 await page.click('#btn-undo');await page.waitForTimeout(1200);assert.deepEqual(await refs(),{seoyeon:1},'undo keeps sheets');
 // Dismiss clears the stored copy.
 await page.evaluate(async()=>{await window.__autosave.flush();});await page.reload();await ready();
 await page.locator('#autosave-banner').waitFor({state:'visible',timeout:15000});await page.click('#autosave-dismiss');await page.waitForTimeout(500);
 assert.equal(await stored(),null,'dismiss clears the autosave');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,kneeBefore},null,1));
}finally{await browser.close();}
