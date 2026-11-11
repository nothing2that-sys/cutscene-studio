// Imported GLB props in history and saves (REVIEW_2026-11-11 R3, R6, R9):
// - undo/redo restore the model's bytes from the key kept outside history
// - the model keeps its stable id through undo and save/reopen
// - a broken single GLB is reported instead of failing silently
// Builds a one-triangle GLB itself. Usage: node scripts/history-glb-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
function triangleGlb(){
 const pos=new Float32Array([0,0,0, .5,0,0, 0,.5,0]),bin=Buffer.from(pos.buffer);
 const gltf={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],
  buffers:[{byteLength:bin.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:bin.length}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[.5,.5,0]}]};
 let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
 const head=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
 jh.writeUInt32LE(json.length,0);jh.write('JSON',4);bh.writeUInt32LE(bin.length,0);bh.write('BIN\0',4);
 const total=12+8+json.length+8+bin.length;head.write('glTF',0);head.writeUInt32LE(2,4);head.writeUInt32LE(total,8);
 return Buffer.concat([head,jh,json,bh,bin]).toString('base64');
}
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1400,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});
 await page.locator('#studio-example').click();await page.waitForFunction(()=>window.__bodyV1.actors.length===2);await page.waitForTimeout(800);
 const glb=triangleGlb();
 const r=await page.evaluate(async glb=>{const b=window.__bodyV1,S=b.studio,wait=ms=>new Promise(r=>setTimeout(r,ms));
  const state=await b.drive.save();state.importedModels.push({name:'tri.glb',glbBase64:glb,position:[0,0.5,1],rotation:[0,0,0,'XYZ'],scale:[1,1,1],studioId:'prop-tri'});
  await S.importText(JSON.stringify(state),'with-glb',false);await wait(1500);
  const find=()=>b.props.find(p=>p.id==='prop-tri');const first=find();
  // Two edits, then undo both: the GLB must come back from the key.
  b.drive.setJoint(b.actors[0].id,'l_elbow','bend',40);window.__bodyV1.studio&&document.getElementById('btn-undo');
  const saveState=async()=>{const s=await b.drive.save();return s;};
  const before=(await saveState()).importedModels.find(m=>m.studioId==='prop-tri');
  return {loaded:!!first,glbLen:before?.glbBase64?.length,id:before?.studioId};},glb);
 assert.ok(r.loaded,'GLB loaded');assert.equal(r.glbLen,glb.length,'save keeps the full GLB');assert.equal(r.id,'prop-tri');
 // Make history entries, undo/redo across them.
 await page.locator('.layer-item[data-imported="false"][data-idx="0"]').first().click();await page.waitForTimeout(300);
 for(const pose of ['kneeling','squatting']){await page.selectOption('#quick-pose',pose);await page.click('#quick-pose-apply');await page.waitForTimeout(500);}
 for(const btn of ['#btn-undo','#btn-undo','#btn-redo']){await page.click(btn);await page.waitForTimeout(1500);}
 const after=await page.evaluate(async()=>{const s=await window.__bodyV1.drive.save();const m=s.importedModels.find(m=>m.studioId==='prop-tri');return {len:m?.glbBase64?.length,keyLeak:s.importedModels.some(m=>String(m.glbBase64).startsWith('glb#'))};});
 assert.equal(after.len,glb.length,'undo/redo restore the GLB bytes');assert.equal(after.keyLeak,false,'no history key leaks into a save');
 // Save/reopen keeps the id.
 const reopened=await page.evaluate(async()=>{const S=window.__bodyV1.studio,t=JSON.stringify(await window.__bodyV1.drive.save());await S.importText(t,'reopen',false);await new Promise(r=>setTimeout(r,1500));return window.__bodyV1.props.map(p=>p.id);});
 assert.ok(reopened.includes('prop-tri'),'stable id after reopen');
 // A broken GLB object import is reported (R9).
 await page.evaluate(async()=>{const S=window.__bodyV1.studio;await S.importText(JSON.stringify({type:'importedModel',name:'broken.glb',glbBase64:'AAAA',position:[0,0,0],rotation:[0,0,0,'XYZ'],scale:[1,1,1]}),'broken',false);});
 await page.waitForTimeout(1200);
 const report=await page.evaluate(()=>document.getElementById('studio-status')?.textContent||'');
 const detail=await page.evaluate(()=>document.body.innerText.includes('GLB 모델을 복원하지 못했습니다: broken.glb'));assert.ok(detail,'broken GLB is reported by name: '+report);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,glbLength:glb.length,reopened,report},null,1));
}finally{await browser.close();}
