// Shot camera roll (dutch angle) and lens in mm: the shot description reads the roll back
// from the camera and names the lens; the panel inputs change the active shot; both
// survive save/reopen. Usage: node scripts/camera-lens-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});
 const scene={version:1,units:'meters',title:'렌즈',room:{size:[8,3,6],walls:true},actors:[{id:'a',name:'인물',position:[0,0,0],height:1.7}],camera:{position:[0,1.5,4],target:[0,1.2,0],focalMm:85},
  shots:[{id:'dutch',name:'더치',purpose:'기울임',camera:{position:[0,1.5,4],target:[0,1.2,0],focalMm:85,roll:15}}]};
 const r=await page.evaluate(async t=>{const S=window.__bodyV1.studio;await S.importText(t,'lens',true);await new Promise(r=>setTimeout(r,600));const d=S.shotDescription();return {text:d.text.split('\n').find(l=>l.startsWith('- 카메라')),cam:d.structured.camera};},JSON.stringify(scene));
 assert.ok(Math.abs(r.cam.rollDeg-15)<0.6,'roll read back: '+r.cam.rollDeg);assert.ok(Math.abs(r.cam.focal35mm-85)<=12,'lens near 85mm: '+r.cam.focal35mm);
 assert.match(r.text,/시계 방향으로 15° 기울어진 더치 앵글/);
 // Panel inputs on the active shot.
 await page.evaluate(()=>{document.getElementById('studio-shot-roll').closest('details')?.setAttribute('open','');});
 await page.locator('#studio-shots button').first().click();await page.waitForTimeout(300);
 await page.fill('#studio-shot-roll','-10');await page.locator('#studio-shot-roll').dispatchEvent('change');
 await page.fill('#studio-shot-focal','35');await page.locator('#studio-shot-focal').dispatchEvent('change');await page.waitForTimeout(400);
 const after=await page.evaluate(()=>{const S=window.__bodyV1.studio,shot=S.snapshot().shots[0];return {roll:shot.camera.roll,fov:shot.camera.fov,text:S.shotDescription().text.split('\n').find(l=>l.startsWith('- 카메라'))};});
 assert.equal(after.roll,-10);assert.ok(Math.abs(after.fov-37.85)<0.05,'35mm -> fov '+after.fov);assert.match(after.text,/반시계 방향으로 10°/);
 const project=await page.evaluate(async()=>JSON.stringify(await window.__bodyV1.drive.save()));
 await page.evaluate(async t=>{await window.__bodyV1.studio.importText(t,'reopen',false);},project);await page.waitForTimeout(1200);
 assert.equal(await page.evaluate(()=>window.__bodyV1.studio.snapshot().shots[0].camera.roll),-10,'roll survives reopen');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,first:r.text,after:after.text},null,1));
}finally{await browser.close();}
