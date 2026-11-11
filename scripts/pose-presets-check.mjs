// Scene pose presets on every body type: the lowest point sits on the floor, the right
// parts touch it, the shot description reads the pose, and the figure does not cut into
// itself more than it does standing. Saves a contact sheet per pose.
// Usage: node scripts/pose-presets-check.mjs [baseUrl] [outDir]
import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001',out=process.argv[3]||'docs/review-evidence/2026-11-10-pose-presets';
const TYPES=['female','male','neutral','child','male-heavy'];
// part: [mesh names, how many of them must be within tolerance (m) of the floor]
const EXPECT={
 standing:{stance:/^서 있음/,touch:[[['footL','footR'],2,.005]]},
 kneeling:{stance:/두 무릎을 꿇음/,touch:[[['thighL','thighR'],2,.012]]},
 'half-kneeling':{stance:/(왼쪽|오른쪽) 무릎을 꿇음/,touch:[[['thighL','thighR'],1,.012],[['footL','footR'],1,.012]]},
 squatting:{stance:/^쪼그려 앉음, 상체를 앞으로/,touch:[[['footL','footR'],2,.005]]},
 crouching:{stance:/^웅크려 앉음, 상체를 앞으로/,touch:[[['footL','footR'],2,.005]]},
 lying:{stance:/등을 대고 누움/,touch:[[['thorax'],1,.02],[['head'],1,.04]]},
 'lying-prone':{stance:/엎드림/,touch:[[['thorax'],1,.03]]},
 'lying-side':{stance:/옆으로 누움/,touch:[[['upperL','upperR','foreL','foreR'],1,.01]]},
};
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={};
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});
 await page.evaluate(async()=>{const m=await import('/src/body-v1-adapter.js');await m.ensureBodyTypes();});
 for(const [pose,expect]of Object.entries(EXPECT)){
  const scene={version:1,units:'meters',title:pose,room:{size:[10,3,6],walls:false},camera:{position:[0,1.5,9.5],target:[0,.5,0],fov:42},
   actors:TYPES.map((t,i)=>({id:'t'+i,name:t,position:[(i-2)*1.4,0,0],yaw:70,height:t==='child'?1.15:t==='female'?1.65:1.78,pose,...(t==='female'?{}:{bodyType:t})})),props:[]};
  const rows=await page.evaluate(async scene=>{
   const b=window.__bodyV1;await b.studio.importText(JSON.stringify(scene),'pose-check',true);await new Promise(r=>setTimeout(r,500));
   const d=b.studio.shotDescription(),stances=Object.fromEntries((d.structured?.actors||[]).map(a=>[a.name,a.stance]));
   return b.actors.map(a=>{const V=a.driver.position.constructor,v=new V(),parts={};let low=Infinity;
    for(const mesh of a.bodyMeshes){mesh.updateMatrixWorld(true);const p=mesh.geometry.attributes.position;let mn=Infinity;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);mn=Math.min(mn,v.y);}parts[mesh.name]=mn;low=Math.min(low,mn);}
    const audit=a.auditJoint('body'),type=a.driver.userData.bodyProfile.bodyType??'female';
    return {type,low,parts,stance:stances[a.driver.name]??stances[type],penetration:audit.total??audit.count??null,deepestMm:audit.pairs?Math.max(0,...audit.pairs.map(p=>p.maxDepth??0))*1000:null};});
  },scene);
  await page.screenshot({path:`${out}/${pose}.png`});
  report[pose]=rows.map(r=>({type:r.type,stance:r.stance,lowMm:+(r.low*1000).toFixed(1),penetration:r.penetration,near:Object.fromEntries(Object.entries(r.parts).filter(([,y])=>y-r.low<.03).map(([k,y])=>[k,+((y-r.low)*1000).toFixed(1)]))}));
  for(const r of rows){
   assert.ok(Math.abs(r.low)<.003,`${pose}/${r.type}: lowest point ${r.low} is not on the floor`);
   for(const [names,count,tol]of expect.touch){const n=names.filter(k=>r.parts[k]-r.low<tol).length;assert.ok(n>=count,`${pose}/${r.type}: ${names.join('/')} — ${n} of ${count} touch the floor`);}
   assert.match(r.stance||'',expect.stance,`${pose}/${r.type}: stance read as "${r.stance}"`);
  }
 }
 // Editor path: the quick-pose menu on a selected person keeps the lowest point on the
 // floor (not the ankles) and the person's place and facing.
 const editor={};
 await page.evaluate(async scene=>{await window.__bodyV1.studio.importText(JSON.stringify(scene),'pose-ui',true);},{version:1,units:'meters',title:'ui',room:{size:[8,3,6],walls:false},camera:{position:[0,1.2,5],target:[0,.6,0],fov:45},actors:[{id:'u',name:'u',position:[.4,0,-.3],yaw:30,height:1.78,pose:'standing',bodyType:'male'}],props:[]});
 await page.waitForTimeout(500);await page.locator('.layer-item[data-imported="false"][data-idx="0"]').first().click();await page.waitForTimeout(300);
 const probe=()=>page.evaluate(()=>{const a=window.__bodyV1.actors[0],m=a.driver,V=m.position.constructor,v=new V();let low=Infinity;for(const mesh of a.bodyMeshes){mesh.updateMatrixWorld(true);const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)low=Math.min(low,v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).y);}const l=m.l_leg.getWorldPosition(new V()).sub(m.r_leg.getWorldPosition(new V())),pel=m.body.getWorldPosition(new V());return {low,facing:Math.atan2(-l.z,l.x)*180/Math.PI,x:pel.x,z:pel.z};});
 const start=await probe();
 for(const pose of ['kneeling','half-kneeling','squatting','crouching','lying','standing']){
  await page.selectOption('#quick-pose',pose);await page.click('#quick-pose-apply');await page.waitForTimeout(400);
  const r=await probe(),turn=Math.abs(((r.facing-start.facing+540)%360)-180);editor[pose]={lowMm:+(r.low*1000).toFixed(1),turnDeg:+turn.toFixed(2)};
  assert.ok(Math.abs(r.low)<.003,`editor ${pose}: lowest point ${r.low} is not on the floor`);
  assert.ok(turn<1,`editor ${pose}: facing changed by ${turn}°`);
 }
 // Save → reopen keeps low poses exactly (lying turns the pelvis bone itself).
 const verts=()=>page.evaluate(()=>window.__bodyV1.actors.map(a=>{const V=a.driver.position.constructor;return a.bodyMeshes.flatMap(mesh=>{const p=mesh.geometry.attributes.position;return [0,p.count>>1,p.count-1].map(i=>new V().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).toArray());});}));
 await page.evaluate(async text=>{await window.__bodyV1.studio.importText(text,'mix',true);},JSON.stringify({version:1,units:'meters',title:'mix',room:{size:[8,3,6],walls:false},camera:{position:[0,1.2,5],target:[0,.5,0],fov:45},actors:[{id:'a',name:'a',position:[-1,0,0],yaw:20,height:1.65,pose:'lying'},{id:'b',name:'b',position:[0,0,0],yaw:-30,height:1.15,pose:'kneeling',bodyType:'child'},{id:'c',name:'c',position:[1,0,0],yaw:90,height:1.78,pose:'half-kneeling',bodyType:'male-heavy'}],props:[]}));
 await page.waitForTimeout(500);const savedVerts=await verts();
 const project=await page.evaluate(async()=>JSON.stringify(await window.__bodyV1.drive.save()));
 await page.evaluate(async text=>{await window.__bodyV1.studio.importText(text,'reopen',false);},project);await page.waitForTimeout(1500);
 const reopened=await verts();let reopenDiff=0;savedVerts.forEach((a,i)=>a.forEach((p,j)=>{const q=reopened[i][j];reopenDiff=Math.max(reopenDiff,Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]));}));
 assert.ok(reopenDiff<1e-6,'low poses changed on reopen by '+reopenDiff);
 // Self-penetration is reported against standing, per body type (the heavy body already
 // presses its arms into its chest standing; see BODY_VARIETY_PLAN stage 1).
 const growth={};for(const pose of Object.keys(EXPECT))growth[pose]=Object.fromEntries(report[pose].map((r,i)=>[r.type,r.penetration-report.standing[i].penetration]));
 for(const [pose,g]of Object.entries(growth))for(const t of ['female','male','neutral','child'])assert.ok(g[t]<=5,`${pose}/${t}: ${g[t]} more self-contact points than standing`);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,reopenDiff,editor,report,penetrationVsStanding:growth},null,1));
}finally{await browser.close();}
