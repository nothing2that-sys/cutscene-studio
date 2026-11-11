import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='docs/review-evidence/2026-11-03-doll-core-refinement';await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:3001/doll-core.html');await page.waitForFunction(()=>window.dollCore,{},{timeout:120000});const modes={};
 assert.equal(page.workers().length,0,'Default preview should load without a meshing worker');const responsiveness=[];
 for(const quality of ['balanced','source','light']){
  await page.locator('#quality').selectOption(quality);
  if(quality==='source')responsiveness.push(await page.evaluate(async()=>{const times=[];let last=performance.now();while(window.dollCore.pending){await new Promise(requestAnimationFrame);const now=performance.now();times.push(now-last);last=now;}return {quality:'source',frames:times.length,maxFrameGapMs:Math.max(0,...times)};}));
  await page.waitForFunction(()=>!window.dollCore.pending);
  modes[quality]=await page.evaluate(()=>[...window.dollCore.meshes].map(([name,m])=>{const g=m.geometry,p=g.attributes.position,idx=g.index,edges=new Map(),directed=new Map();let volume=0;for(let i=0;i<idx.count;i+=3){const t=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=a<b?a+':'+b:b+':'+a;edges.set(key,(edges.get(key)||0)+1);const d=a+':'+b;directed.set(d,(directed.get(d)||0)+1);}const v=t.map(k=>[p.getX(k),p.getY(k),p.getZ(k)]);volume+=(v[0][0]*(v[1][1]*v[2][2]-v[1][2]*v[2][1])+v[0][1]*(v[1][2]*v[2][0]-v[1][0]*v[2][2])+v[0][2]*(v[1][0]*v[2][1]-v[1][1]*v[2][0]))/6;}return {name,vertices:p.count,triangles:idx.count/3,bytes:p.array.byteLength+g.attributes.normal.array.byteLength+idx.array.byteLength,volume,boundary:[...edges.values()].filter(v=>v===1).length,nonManifold:[...edges.values()].filter(v=>v>2).length,inconsistent:[...directed.values()].filter(v=>v>1).length,metadata:g.userData};}));
  for(const view of ['front','side','oblique']){await page.locator('#view').selectOption(view);const url=await page.evaluate(()=>{window.dollCore.render();return window.dollCore.renderer.domElement.toDataURL();});await writeFile(`${out}/${quality}-${view}.png`,Buffer.from(url.split(',')[1],'base64'));}
 }
 for(const parts of Object.values(modes))for(const p of parts){assert.equal(p.boundary,0);assert.equal(p.nonManifold,0);assert.equal(p.inconsistent,0);assert.ok(p.volume>0);}assert.ok(responsiveness[0].frames>3,'UI should keep painting while source meshes are calculated');
 for(const q of ['light','balanced'])for(const p of modes[q]){const source=modes.source.find(s=>s.name===p.name);p.volumeChangePercent=(p.volume/source.volume-1)*100;assert.ok(Math.abs(p.volumeChangePercent)<2);}
 assert.deepEqual(errors,[]);await writeFile(out+'/mesh-audit.json',JSON.stringify({modes,responsiveness,pageErrors:errors,scope:'Reduction fidelity relative to the revised sculpture, not reference-art resemblance.'},null,2));console.log(JSON.stringify({modes,responsiveness}));
}finally{await browser.close();}
