// actors[].lookAt: on load the neck and head turn toward the target.
// A person at the origin faces +z; targets at known angles. The applied yaw/pitch must
// match the geometry (CCW from above = positive yaw), the remaining error must be small,
// the result must survive save/reopen, and every body type must work.
// Usage: node scripts/look-at-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1400,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const rows=[];
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});
 await page.evaluate(async()=>{const m=await import('/src/body-v1-adapter.js');await m.ensureBodyTypes();});
 const cases=[['ahead',0,0],['left30',30,0],['right30',-30,0],['left60',60,0],['right60',-60,0],['up',0,20],['down',0,-25]];
 for(const type of ['female','male','child','male-heavy']){
  for(const [name,yaw,pitch]of cases){
   const r=2.5,h=type==='child'?1.15:1.75,eye=h*.93,a=yaw*Math.PI/180,tp=[Math.sin(a)*r,eye+Math.tan(pitch*Math.PI/180)*r,Math.cos(a)*r];
   const scene={version:1,units:'meters',title:'look',room:{size:[10,3,10],walls:false},camera:{position:[0,1.5,6],target:[0,1,0],fov:45},
    actors:[{id:'p',name:'p',position:[0,0,0],yaw:0,height:h,pose:'standing',lookAt:tp,...(type==='female'?{}:{bodyType:type})}],props:[]};
   const res=await page.evaluate(async({scene,tp})=>{const b=window.__bodyV1;await b.studio.importText(JSON.stringify(scene),'look',true);await new Promise(r=>setTimeout(r,300));
    const {aimHead}=await import(performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('/src/look-at.js'))||'/src/look-at.js');
    const m=b.actors[0].driver,V=m.position.constructor;
    // Re-run on the loaded figure: it is already aimed, so the correction must be ~0.
    const again=aimHead(m,new V(...tp));return {neck:m.neck.turn,head:m.head.turn,nod:m.head.nod,again};},{scene,tp});
   rows.push({type,name,yaw,pitch,...res});
   assert.ok(res.again.residual<=2,`${type} ${name}: head misses the target by ${res.again.residual}°`);
   assert.ok(Math.abs(res.again.yaw-yaw)<=3,`${type} ${name}: yaw ${res.again.yaw} vs ${yaw}`);
   assert.ok(Math.abs(res.again.pitch-pitch)<=4,`${type} ${name}: pitch ${res.again.pitch} vs ${pitch}`);
  }
 }
 // Example-like scene: two people and a prop, ids as targets; save and reopen keep it.
 const scene={version:1,units:'meters',title:'gaze',room:{size:[8,3,6],walls:false},camera:{position:[0,1.4,6],target:[0,1,0],fov:45},
  actors:[{id:'jihoon',name:'지훈',position:[-0.8,0,0],yaw:35,height:1.78,bodyType:'male',lookAt:'seoyeon',expression:'놀라 굳은 얼굴'},{id:'seoyeon',name:'서연',position:[1.6,0,-1.4],yaw:-40,height:1.65,lookAt:'box'}],
  props:[{id:'box',name:'상자',type:'box',position:[0.4,0.75,-0.2],size:[0.3,0.2,0.3]}]};
 const r=await page.evaluate(async scene=>{const b=window.__bodyV1;await b.studio.importText(JSON.stringify(scene),'gaze',true);await new Promise(r=>setTimeout(r,500));
  const snap=()=>b.actors.map(a=>[a.driver.neck.turn,a.driver.head.turn,a.driver.head.nod].map(v=>+v.toFixed(4)));const before=snap();
  const project=JSON.stringify(await b.drive.save());await b.studio.importText(project,'reopen',false);await new Promise(r=>setTimeout(r,1500));
  const notes=b.actors.map(a=>a.driver.userData.sceneNotes);return {before,after:snap(),notes,prompt:b.studio.promptText?.()||''};},scene);
 assert.deepEqual(r.after,r.before,'gaze survives save/reopen');
 assert.equal(r.notes[0].lookAt,'seoyeon');assert.equal(r.notes[0].expression,'놀라 굳은 얼굴');assert.equal(r.notes[1].lookAt,'box');
 assert.ok(Math.abs(r.before[0][0]+r.before[0][1])>20,'jihoon turns his head toward seoyeon');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,rows:rows.map(x=>`${x.type} ${x.name}: yaw ${x.again.yaw} pitch ${x.again.pitch} residual ${x.again.residual}`),gaze:r.before},null,1));
}finally{await browser.close();}
