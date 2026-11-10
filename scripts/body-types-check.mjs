// Body types in the editor: every type keeps figure-based left/right, reopens identically
// from a saved project, switches type keeping pose/position/height, undoes the switch,
// and accepts a legacy (image reference) pose with its facing kept.
// Usage: node scripts/body-types-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
const TYPES=['female','male','neutral','child','male-heavy'];
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1400,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const helpers=`window.__bt={
 frame(a){const m=a.driver,V=m.position.constructor,W=k=>m[k].getWorldPosition(new V()),up=W('neck').sub(W('body')).normalize(),f=new V();
  for(const n of ['footL','footR']){const mesh=a.bodyMeshes.find(x=>x.name===n);mesh.geometry.computeBoundingBox();const c=mesh.localToWorld(mesh.geometry.boundingBox.getCenter(new V()));f.add(c.sub([W('l_ankle'),W('r_ankle')].sort((x,y)=>x.distanceTo(c)-y.distanceTo(c))[0]));}
  f.addScaledVector(up,-f.dot(up)).normalize();return {W,up,f,left:new V().crossVectors(up,f).normalize()};},
 verts(){return window.__bodyV1.actors.map(a=>{const V=a.driver.position.constructor;return a.bodyMeshes.map(mesh=>{const p=mesh.geometry.attributes.position;return [0,Math.floor(p.count/2),p.count-1].map(i=>new V().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).toArray());}).flat();});},
 diff(a,b){let m=0;a.forEach((actor,i)=>actor.forEach((p,j)=>{const o=b[i][j];m=Math.max(m,Math.hypot(p[0]-o[0],p[1]-o[1],p[2]-o[2]));}));return m;}};`;
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio&&document.getElementById('studio-example'),null,{timeout:120000});
 await page.addScriptTag({content:helpers});
 await page.evaluate(async()=>{const m=await import('/src/body-v1-adapter.js');await m.ensureBodyTypes();});
 const scene={version:1,units:'meters',title:'체형 확인',room:{size:[8,3,6],walls:false},camera:{position:[0,1.4,6],target:[0,1,0],fov:45},
  actors:TYPES.map((t,i)=>({id:'t'+i,name:t,position:[(i-2)*1.1,0,0],yaw:0,height:t==='child'?1.15:t==='female'?1.65:1.78,pose:'standing',...(t==='female'?{}:{bodyType:t})})),props:[]};
 await page.evaluate(async text=>{await window.__bodyV1.studio.importText(text,'types',true);},JSON.stringify(scene));
 await page.waitForFunction(n=>window.__bodyV1.actors.length===n,TYPES.length,{timeout:60000});
 const info=await page.evaluate(()=>window.__bodyV1.actors.map(a=>({profile:a.driver.userData.bodyAsset?.profile??'default',type:a.driver.userData.bodyProfile.bodyType??'female',height:+(new (a.driver.position.constructor)().setFromMatrixPosition(a.driver.head.matrixWorld).y).toFixed(2)})));
 TYPES.forEach((t,i)=>{assert.equal(info[i].type,t);assert.equal(info[i].profile,t==='female'?'default':t);});
 // Figure-based sides on every type.
 const sides=await page.evaluate(()=>{const b=window.__bodyV1,out={};for(const a of b.actors){for(const [key,end]of [['l_arm','l_wrist'],['r_arm','r_wrist'],['l_leg','l_ankle'],['r_leg','r_ankle']]){const before=a.driver[key].raise;b.drive.setJoint(a.id,key,'raise',key.includes('arm')?150:60);const F=window.__bt.frame(a),side=F.W(end).sub(F.W('body')).dot(F.left),fwd=F.W(end).sub(F.W(key)).dot(F.f);out[a.driver.userData.bodyProfile.bodyType??'female'+'']=out[a.driver.userData.bodyProfile.bodyType??'female']||{};out[a.driver.userData.bodyProfile.bodyType??'female'][key]={side:+side.toFixed(3),fwd:+fwd.toFixed(3)};b.drive.setJoint(a.id,key,'raise',before);}}return out;});
 for(const [t,r]of Object.entries(sides))for(const [k,v]of Object.entries(r)){assert.equal(v.side>0,k.startsWith('l_'),`${t} ${k} on the wrong side`);assert.ok(v.fwd>0,`${t} ${k} must move forward`);}
 // Pose some joints, save, reopen: identical bodies.
 await page.evaluate(()=>{const b=window.__bodyV1;b.actors.forEach((a,i)=>{b.drive.setJoint(a.id,'l_elbow','bend',30+i*15);b.drive.setJoint(a.id,'r_leg','raise',10+i*8);b.drive.setJoint(a.id,'torso','turn',-10+i*5);});});
 const before=await page.evaluate(()=>window.__bt.verts());
 const project=await page.evaluate(async()=>JSON.stringify(await window.__bodyV1.drive.save()));
 await page.evaluate(async text=>{await window.__bodyV1.studio.importText(text,'reopen',false);},project);await page.waitForTimeout(1500);
 const reopened=await page.evaluate(()=>window.__bt.verts());const reopenDiff=await page.evaluate(([a,b])=>window.__bt.diff(a,b),[before,reopened]);
 assert.ok(reopenDiff<1e-6,'reopened bodies differ by '+reopenDiff);
 // Switch the first actor (female) to male through the panel; pose, position and height stay.
 const pre=await page.evaluate(()=>{const a=window.__bodyV1.actors[0],m=a.driver;return {elbow:m.l_elbow.bend,leg:m.r_leg.raise,turn:m.torso.turn,x:m.position.x,height:m.userData.bodyProfile.height};});
 await page.locator('.layer-item[data-imported="false"][data-idx="0"]').first().click();await page.waitForTimeout(300);
 await page.selectOption('#body-type','male');await page.click('#body-type-apply');
 await page.waitForFunction(()=>window.__bodyV1.actors[0]?.driver.userData.bodyProfile.bodyType==='male',null,{timeout:30000});await page.waitForTimeout(500);
 const post=await page.evaluate(()=>{const a=window.__bodyV1.actors[0],m=a.driver,V=m.position.constructor;let low=Infinity;for(const mesh of a.bodyMeshes){mesh.geometry.computeBoundingBox();const bb=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);low=Math.min(low,bb.min.y);}return {elbow:m.l_elbow.bend,leg:m.r_leg.raise,turn:m.torso.turn,x:m.position.x,height:m.userData.bodyProfile.height,profile:m.userData.bodyAsset.profile,feet:low,status:document.getElementById('body-status')?.textContent};});
 for(const k of ['elbow','leg','turn','x','height'])assert.ok(Math.abs(pre[k]-post[k])<1e-6,`switch changed ${k}: ${pre[k]} -> ${post[k]}`);
 assert.equal(post.profile,'male');assert.ok(Math.abs(post.feet)<.03,'feet left the floor after the switch: '+post.feet);
 // Undo brings the female body back exactly.
 await page.click('#btn-undo');await page.waitForFunction(()=>(window.__bodyV1.actors[0]?.driver.userData.bodyProfile.bodyType??'female')==='female',null,{timeout:30000});await page.waitForTimeout(500);
 const undone=await page.evaluate(()=>window.__bt.verts());const undoDiff=await page.evaluate(([a,b])=>window.__bt.diff(a,b),[reopened,undone]);
 assert.ok(undoDiff<1e-6,'undo did not restore the body: '+undoDiff);
 // Image-reference (legacy rotation) pose on the child keeps its facing.
 const legacy=JSON.parse(await readFile(new URL('./fixtures/legacy-rotation-pose.json',import.meta.url),'utf8'));
 await page.locator('.layer-item[data-imported="false"][data-idx="3"]').first().click();await page.waitForTimeout(300);
 const facing=()=>page.evaluate(()=>{const m=window.__bodyV1.actors[3].driver,V=m.position.constructor,l=m.l_leg.getWorldPosition(new V()).sub(m.r_leg.getWorldPosition(new V()));return Math.atan2(-l.z,l.x)*180/Math.PI;});
 const f0=await facing();await page.locator('#pose-reference-file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy.pose))});await page.waitForTimeout(800);
 const f1=await facing(),turn=Math.abs(((f1-f0+540)%360)-180);assert.ok(turn<1,'child pose changed facing by '+turn);
 assert.equal(await page.evaluate(()=>window.__bodyV1.actors[3].driver.userData.bodyProfile.bodyType),'child');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,types:info,reopenDiff,switch:{profile:post.profile,feet:+post.feet.toFixed(4)},undoDiff,childFacingTurn:+turn.toFixed(3)},null,1));
}finally{await browser.close();}
