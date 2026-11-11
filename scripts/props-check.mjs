// Primitive props: every type builds visible meshes from scene JSON and from the add
// buttons; the size inputs rebuild in place, undo restores the old size, and size
// survives save/reopen. Usage: node scripts/props-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
const TYPES=['box','table','chair','sphere','cylinder','door','window','bed','sofa','stairs'];
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});
 const scene={version:1,units:'meters',title:'소품',room:{size:[14,3,8],walls:true},camera:{position:[0,2.2,7.5],target:[0,0.6,0],fov:55},actors:[],
  props:TYPES.map((t,i)=>({id:t,name:t,type:t,position:[-5.4+(i%5)*2.7,0,-1.5+Math.floor(i/5)*2.6],size:{box:[.4,.4,.4],table:[1.4,.75,.8],chair:[.5,.95,.5],sphere:[.4,.4,.4],cylinder:[.3,.9,.3],door:[.9,2.05,.08],window:[1.2,1.1,.08],bed:[1.5,.95,2.05],sofa:[1.9,.85,.9],stairs:[1,1.08,1.5]}[t]}))};
 const built=await page.evaluate(async scene=>{const b=window.__bodyV1;await b.studio.importText(JSON.stringify(scene),'props',true);await new Promise(r=>setTimeout(r,800));
  return b.props.map(p=>{let n=0;p.root.traverse(m=>{if(m.isMesh)n++;});const box=new (p.root.position.constructor)();return {id:p.id,meshes:n,height:+(()=>{let lo=Infinity,hi=-Infinity;p.root.updateMatrixWorld(true);p.root.traverse(m=>{if(!m.isMesh)return;m.geometry.computeBoundingBox();const bb=m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);lo=Math.min(lo,bb.min.y);hi=Math.max(hi,bb.max.y);});return hi-lo;})().toFixed(3)};});},scene);
 for(const p of built){assert.ok(p.meshes>0,p.id+' has meshes');const want=scene.props.find(x=>x.id===p.id).size[1];assert.ok(Math.abs(p.height-want)<0.02,`${p.id} height ${p.height} vs ${want}`);}
 await page.screenshot({path:'docs/review-evidence/2026-11-11-props.png'});
 // Size inputs on the bed; undo restores; save/reopen keeps.
 const idx=await page.evaluate(()=>window.__bodyV1.props.findIndex(p=>p.id==='bed'));
 await page.locator(`.layer-item[data-imported="true"][data-idx="${idx}"]`).first().click({position:{x:8,y:10}});await page.waitForTimeout(300);
 await page.fill('#object-size-h','0.6');await page.locator('#object-size-h').dispatchEvent('change');await page.waitForTimeout(400);
 const resized=await page.evaluate(()=>window.__bodyV1.props.find(p=>p.id==='bed').root.userData.primitive.size);
 assert.deepEqual(resized,[1.5,0.6,2.05]);
 const project=await page.evaluate(async()=>JSON.stringify(await window.__bodyV1.drive.save()));
 await page.click('#btn-undo');await page.waitForTimeout(1500);
 assert.deepEqual(await page.evaluate(()=>window.__bodyV1.props.find(p=>p.id==='bed').root.userData.primitive.size),[1.5,0.95,2.05],'undo restores size');
 await page.evaluate(async t=>{await window.__bodyV1.studio.importText(t,'reopen',false);},project);await page.waitForTimeout(1500);
 assert.deepEqual(await page.evaluate(()=>window.__bodyV1.props.find(p=>p.id==='bed').root.userData.primitive.size),[1.5,0.6,2.05],'reopen keeps size');
 // Add buttons create each type.
 const before=await page.evaluate(()=>window.__bodyV1.props.length);
 await page.evaluate(()=>{document.querySelector('[data-prop]').closest('details').open=true;});
 for(const t of TYPES)await page.locator(`[data-prop="${t}"]`).click();
 const added=await page.evaluate(n=>window.__bodyV1.props.slice(n).map(p=>p.root.userData.primitive.type),before);
 assert.deepEqual(added,TYPES);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,built},null,1));
}finally{await browser.close();}
