// S1: a restore that waits for a body-type mesh is a pending restore. While it waits,
// edits are blocked, and a newer load/undo wins over the older one.
// The body-type bundle is delayed on the network so the wait is long enough to race.
// Usage: node scripts/restore-race-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:1400,height:950}});
await context.route('**/doll-body-types/**',async route=>{await new Promise(r=>setTimeout(r,6000));await route.continue();});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});
 // Two editor projects: one needs the (still loading) male body, one only default bodies.
 const projects=await page.evaluate(async()=>{const S=window.__bodyV1.studio,scene=t=>({version:1,units:'meters',title:t,actors:[{id:'a',name:t,position:[0,0,0],height:1.7}],camera:{position:[0,1.4,4],target:[0,1,0]}});
  await S.importText(JSON.stringify(scene('기본')),'x',true);await new Promise(r=>setTimeout(r,500));const plain=await window.__bodyV1.drive.save();
  const male=structuredClone(plain);male.mannequins[0].name='남성';male.mannequins[0].bodyProfile.bodyType='male';male.mannequins[0].bodyAsset={...male.mannequins[0].bodyAsset,profile:'male'};male.mannequins[0].bodyV1Pose.basePose.rigProfile='male';
  plain.mannequins[0].name='나중 것';return {male:JSON.stringify(male),plain:JSON.stringify(plain)};});
 const result=await page.evaluate(async({male,plain})=>{const S=window.__bodyV1.studio;
  const first=S.importText(male,'male',false);await new Promise(r=>setTimeout(r,300));
  const waiting=document.getElementById('scene-restore-status')?.textContent||'';
  // An edit while waiting is blocked by the pending-restore guard.
  let blocked=false;try{window.__bodyV1.drive.setVisibility?.('a',false);}catch(e){blocked=/복원/.test(e.message);}
  const second=await S.importText(plain,'plain',false);await Promise.resolve(first).catch(()=>{});await new Promise(r=>setTimeout(r,7000));
  return {waiting,blocked,second,names:window.__bodyV1.actors.map(a=>a.driver.name),types:window.__bodyV1.actors.map(a=>a.driver.userData.bodyProfile.bodyType||'female')};},projects);
 assert.match(result.waiting,/체형 메시/,'waiting is shown');
 assert.equal(result.blocked,true,'edits are blocked while waiting');
 assert.deepEqual(result.names,['나중 것'],'the newer load wins');assert.deepEqual(result.types,['female']);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,...result},null,1));
}finally{await browser.close();}
