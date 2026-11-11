// l_/r_ joints must drive the figure's own left/right, and projects saved before
// the side fix must reopen with the identical displayed body.
// Usage: node scripts/body-sides-check.mjs [baseUrl]
//        node scripts/body-sides-check.mjs --make-fixture <pre-fix baseUrl>
import {loadPlaywright} from './playwright-runtime.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const makeFixture=process.argv[2]==='--make-fixture',base=(makeFixture?process.argv[3]:process.argv[2])||'http://127.0.0.1:3001';
const FIXTURE=new URL('./fixtures/pre-side-fix-project.json',import.meta.url);
const EDITS=[['jihoon','l_arm','raise',120],['jihoon','l_elbow','bend',60],['jihoon','r_leg','straddle',-35],['jihoon','l_wrist','bend',25],['seoyeon','r_arm','straddle',-50],['seoyeon','l_knee','bend',70],['seoyeon','l_leg','raise',50]];
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:960}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
// Shared in-page helpers: anatomical frame from the feet, and displayed vertex samples.
const helpers=`window.__sides={
 frame(a){const m=a.driver,V=m.position.constructor,W=k=>m[k].getWorldPosition(new V()),up=W('neck').sub(W('body')).normalize(),f=new V();
  for(const n of ['footL','footR']){const mesh=a.bodyMeshes.find(x=>x.name===n);mesh.geometry.computeBoundingBox();const c=mesh.localToWorld(mesh.geometry.boundingBox.getCenter(new V()));f.add(c.sub([W('l_ankle'),W('r_ankle')].sort((x,y)=>x.distanceTo(c)-y.distanceTo(c))[0]));}
  f.addScaledVector(up,-f.dot(up)).normalize();return {W,up,f,left:new V().crossVectors(up,f).normalize()};},
 vertices(){return window.__bodyV1.actors.map(a=>{const V=a.driver.position.constructor;return Object.fromEntries(a.bodyMeshes.map(mesh=>{const p=mesh.geometry.attributes.position;return [mesh.name,[0,Math.floor(p.count/2),p.count-1].map(i=>new V().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).toArray())];}));});}};`;
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1&&document.getElementById('studio-example'));
 await page.addScriptTag({content:helpers});
 await page.locator('#studio-example').click();await page.waitForFunction(()=>window.__bodyV1.actors.length===2);
 if(makeFixture){
  const result=await page.evaluate(async edits=>{const b=window.__bodyV1;for(const e of edits)b.drive.setJoint(...e);return {project:await b.drive.save(),vertices:window.__sides.vertices()};},EDITS);
  assert.equal(result.project.mannequins[0].bodyV1Pose.driverSideRevision,undefined,'fixture must come from the pre-fix build');
  await writeFile(FIXTURE,JSON.stringify({note:'Saved by the pre side-fix build (l_ drove the asset L bone). Do not regenerate with a fixed build.',edits:EDITS,...result}));
  console.log('fixture written');
 }else{
  const sides=await page.evaluate(()=>{const b=window.__bodyV1,out={};
   for(const [i,a]of b.actors.entries())for(const [key,end,prop,value]of [['l_arm','l_wrist','raise',160],['r_arm','r_wrist','raise',160],['l_leg','l_ankle','raise',70],['r_leg','r_ankle','raise',70],['l_arm','l_wrist','straddle',-70],['r_arm','r_wrist','straddle',-70]]){
    const m=a.driver,before=m[key][prop];b.drive.setJoint(a.id,key,prop,value);const F=window.__sides.frame(a),hand=F.W(end).sub(F.W('body'));
    out[a.id+'.'+key+'.'+prop]={side:F.W(key).sub(F.W('body')).dot(F.left),endSide:hand.dot(F.left),forward:F.W(end).sub(F.W(key)).dot(F.f),up:F.W(end).sub(F.W(key)).dot(F.up)};b.drive.setJoint(a.id,key,prop,before);}
   return out;});
  for(const [name,s]of Object.entries(sides)){
   const left=name.includes('.l_');assert.equal(s.side>0,left,name+' joint is on the wrong side');assert.equal(s.endSide>0,left,name+' limb end is on the wrong side');
   if(name.endsWith('raise'))assert.ok(s.forward>0,name+' must move forward');
   if(name.endsWith('straddle'))assert.ok(Math.abs(s.endSide)>.35,name+' must move outward');
  }
  const fixture=JSON.parse(await readFile(FIXTURE,'utf8'));
  const reopened=await page.evaluate(async project=>{const b=window.__bodyV1;await b.drive.load(project);const saved=await b.drive.save();const m=b.actors[0].driver;return {vertices:window.__sides.vertices(),side:saved.mannequins[0].bodyV1Pose.driverSideRevision,r_arm:m.r_arm.raise,l_arm:m.l_arm.raise,r_elbow:m.r_elbow.bend};},fixture.project);
  let max=0;reopened.vertices.forEach((actor,i)=>{for(const [name,points]of Object.entries(actor))points.forEach((p,j)=>{const o=fixture.vertices[i][name][j];max=Math.max(max,Math.hypot(p[0]-o[0],p[1]-o[1],p[2]-o[2]));});});
  assert.ok(max<1e-6,'pre-fix project changed shape: '+max);
  assert.equal(reopened.side,2);
  // The old l_arm value drove the anatomical right arm; it now belongs to r_arm.
  assert.ok(Math.abs(reopened.r_arm-120)<1e-6&&Math.abs(reopened.r_elbow-60)<1e-6&&Math.abs(reopened.l_arm+5)<1e-6,JSON.stringify(reopened).slice(0,200));
  // Legacy-rig rotation files (image references) must reproduce the legacy limb directions.
  const legacy=JSON.parse(await readFile(new URL('./fixtures/legacy-rotation-pose.json',import.meta.url),'utf8'));
  await page.locator('.layer-item[data-imported="false"][data-idx="0"]').first().click();
  const hipFacing=()=>page.evaluate(()=>{const m=window.__bodyV1.actors[0].driver,V=m.position.constructor,l=m.l_leg.getWorldPosition(new V()).sub(m.r_leg.getWorldPosition(new V()));return Math.atan2(-l.z,l.x)*180/Math.PI;});
  const facingBefore=await hipFacing();
  await page.locator('#pose-reference-file').setInputFiles({name:'legacy-pose.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy.pose))});
  await page.waitForTimeout(800);
  const legacyError=await page.evaluate(expected=>{const m=window.__bodyV1.actors[0].driver,V=m.position.constructor,W=k=>m[k].getWorldPosition(new V()),inv=m.getWorldQuaternion(m.quaternion.clone()).invert();m.updateMatrixWorld(true);
   return Math.max(...Object.entries(expected).map(([k,e])=>{const [a,b]=k.split('>'),d=W(b).sub(W(a)).normalize().applyQuaternion(inv);return Math.acos(Math.min(1,Math.max(-1,d.dot(new V(...e)))))*180/Math.PI;}));},legacy.expectedDirections);
  // Applying a pose keeps the figure's current facing.
  const facingTurn=Math.abs(((await hipFacing()-facingBefore+540)%360)-180);assert.ok(facingTurn<1,'pose changed the facing by '+facingTurn.toFixed(1)+'°');
  assert.ok(legacyError<8,'legacy rotation pose differs from the legacy rig by '+legacyError.toFixed(1)+'°');
  // Re-applying the same reference after an edit gives back exactly the first result
  // (no rest-pose drift or pelvis twist building up).
  const bodyVerts=()=>page.evaluate(()=>window.__sides.vertices()[0]);
  const firstApply=await bodyVerts();
  await page.evaluate(()=>{const b=window.__bodyV1,a=b.actors[0];b.drive.setJoint(a.id,'l_elbow','bend',80);b.drive.setJoint(a.id,'torso','turn',25);});
  await page.locator('#pose-reference-file').setInputFiles({name:'legacy-pose-again.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy.pose))});
  await page.waitForTimeout(800);
  const again=await bodyVerts();let reapplyDiff=0;for(const [name,points]of Object.entries(firstApply))points.forEach((p,j)=>{const o=again[name][j];reapplyDiff=Math.max(reapplyDiff,Math.hypot(p[0]-o[0],p[1]-o[1],p[2]-o[2]));});
  assert.ok(reapplyDiff<1e-6,'re-applying the reference changed the body by '+reapplyDiff);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,sideChecks:Object.keys(sides).length,preFixMaxVertexDiff:max,legacyPoseMaxDegrees:+legacyError.toFixed(2),reapplyMaxVertexDiff:reapplyDiff},null,2));
 }
}finally{await browser.close();}
