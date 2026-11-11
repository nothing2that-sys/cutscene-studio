// Overlap warnings: a person standing inside a table is reported on scene import and in
// the package; a held prop touching its holder and a clear scene are not.
// Usage: node scripts/overlap-warning-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1400,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const run=scene=>page.evaluate(async t=>{const S=window.__bodyV1.studio;await S.importText(t,'ov',true);await new Promise(r=>setTimeout(r,600));
 const report=document.querySelector('#studio-feedback, .scene-feedback, #validation-panel')?.innerText||document.body.innerText;const pkg=await S.createShotPackage();return {inReport:/POSSIBLE_VOLUME_OVERLAP|겹칠 수 있습니다/.test(report),pkg:(pkg.json.warnings||[]).filter(w=>w.code==='POSSIBLE_VOLUME_OVERLAP').map(w=>w.message)};},JSON.stringify(scene));
const base_={version:1,units:'meters',title:'겹침',room:{size:[8,3,6],walls:false},camera:{position:[0,1.4,5],target:[0,1,0],fov:45}};
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});
 const inside=await run({...base_,actors:[{id:'p',name:'인물',position:[0,0,0],height:1.7}],props:[{id:'t',name:'탁자',type:'table',position:[0,0,0],size:[1.4,.75,.8]}]});
 assert.equal(inside.inReport,true,'reported on import');assert.ok(inside.pkg.some(m=>m.includes('인물')&&m.includes('탁자')),'in shot.json warnings');
 const clear=await run({...base_,actors:[{id:'p',name:'인물',position:[-1.5,0,0],height:1.7}],props:[{id:'t',name:'탁자',type:'table',position:[1,0,0],size:[1.4,.75,.8]}]});
 assert.equal(clear.pkg.length,0,'clear scene has no overlap warning');
 const held=await run({...base_,actors:[{id:'p',name:'인물',position:[0,0,0],height:1.7}],props:[{id:'u',name:'우산',type:'cylinder',position:[2,0,0],size:[.04,.9,.04],attachTo:{actor:'p',hand:'right'}}]});
 assert.equal(held.pkg.length,0,'held prop is not an overlap');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,inside:inside.pkg},null,1));
}finally{await browser.close();}
