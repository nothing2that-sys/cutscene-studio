import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='docs/review-evidence/2026-11-03-doll-core-refinement';await mkdir(out,{recursive:true});
const baseline=process.argv.includes('--baseline');
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:3001/doll-core.html');await page.waitForFunction(()=>window.dollCore,{},{timeout:120000});
 if(baseline){
  const data=await page.evaluate(()=>({design:window.dollCore.design,meshes:[...window.dollCore.meshes].map(([name,m])=>({name,positions:Array.from(m.geometry.attributes.position.array),normals:Array.from(m.geometry.attributes.normal.array),indices:Array.from(m.geometry.index.array)}))}));await writeFile(out+'/baseline.json',JSON.stringify(data));
 }
 const capture=async name=>{const data=await page.evaluate(()=>{window.dollCore.render();return window.dollCore.renderer.domElement.toDataURL('image/png').split(',')[1];});await writeFile(`${out}/${name}.png`,Buffer.from(data,'base64'));};
 if(baseline){for(const view of ['front','side','back','oblique']){await page.locator('#view').selectOption(view);await capture('before-'+view);}console.log('Frozen baseline');}
 else{
  const old=JSON.parse(await readFile(out+'/baseline.json','utf8'));
  const result=await page.evaluate(async old=>{
   const api=window.dollCore,gl=api.renderer.getContext(),report={};
   const current=[...api.meshes].map(([name,m])=>[name,m.geometry]);
   function geometry(data){const template=current[0][1],g=template.clone();g.setAttribute('position',new template.attributes.position.constructor(new Float32Array(data.positions),3));g.setAttribute('normal',new template.attributes.normal.constructor(new Float32Array(data.normals),3));g.setIndex(data.indices);g.computeBoundingBox();return g;}
   const oldGeometry=new Map(old.meshes.map(p=>[p.name,geometry(p)]));
   const use=which=>{for(const [name,g]of current)api.meshes.get(name).geometry=which==='before'?oldGeometry.get(name):g;};
   const percentile=(a,p)=>a.slice().sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))];
   async function measure(){for(let i=0;i<20;i++){api.renderer.render(api.scene,api.camera);gl.finish();}const samples=[];for(let batch=0;batch<12;batch++){const t=performance.now();for(let i=0;i<40;i++){api.renderer.render(api.scene,api.camera);gl.finish();}samples.push((performance.now()-t)/40);await new Promise(requestAnimationFrame);}
    const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');let gpuMeanMs=null,gpuStatus=ext?'query unavailable':'extension unavailable';if(ext){const query=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);for(let i=0;i<40;i++)api.renderer.render(api.scene,api.camera);gl.endQuery(ext.TIME_ELAPSED_EXT);gl.flush();for(let i=0;i<100;i++){if(gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT)){gpuMeanMs=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6/40;gpuStatus='valid batched query';}else gpuStatus='disjoint; discarded';break;}await new Promise(requestAnimationFrame);}gl.deleteQuery(query);}
    return {medianBatchMeanMs:percentile(samples,.5),p95BatchMeanMs:percentile(samples,.95),gpuMeanMs,gpuStatus,glError:gl.getError(),triangles:api.renderer.info.render.triangles,draws:api.renderer.info.render.calls,vertices:[...api.meshes.values()].reduce((s,m)=>s+m.geometry.attributes.position.count,0),geometryBytes:[...api.meshes.values()].reduce((sum,m)=>sum+m.geometry.attributes.position.array.byteLength+m.geometry.attributes.normal.array.byteLength+m.geometry.index.array.byteLength,0)};}
   // Interleaved warm measurements under the same current renderer/camera.
   for(const which of ['before','after','after','before']){use(which);const m=await measure();(report[which]??=[]).push(m);}use('after');window.coreAB={use,dispose:()=>{use('after');for(const g of oldGeometry.values())g.dispose();}};report.viewport={width:api.renderer.domElement.width,height:api.renderer.domElement.height};return report;
  },old);
  for(const view of ['front','side','back','oblique']){await page.locator('#view').selectOption(view);await page.evaluate(()=>window.coreAB.use('before'));await capture('before-'+view);await page.evaluate(()=>window.coreAB.use('after'));await capture('after-'+view);}await page.evaluate(()=>window.coreAB.dispose());
  await page.locator('#pose').selectOption('reference');await page.locator('#view').selectOption('front');await capture('after-reference');await page.locator('#style').selectOption('silhouette');await page.locator('#overlay').check();await page.locator('#viewport').screenshot({path:out+'/after-overlay.png'});await page.locator('#overlay').uncheck();await page.locator('#style').selectOption('clay');await page.locator('#pose').selectOption('neutral');
  const meshes=await page.evaluate(()=>[...window.dollCore.meshes].map(([name,m])=>({name,positions:Array.from(m.geometry.attributes.position.array),normals:Array.from(m.geometry.attributes.normal.array),indices:Array.from(m.geometry.index.array),metadata:m.geometry.userData})));
  await writeFile(out+'/optimized-meshes.json',JSON.stringify(meshes));await writeFile(out+'/design.json',JSON.stringify(await page.evaluate(()=>window.dollCore.design),null,2));await writeFile(out+'/core-neutral.obj',await page.evaluate(()=>window.dollCore.obj()));
  assert.ok(result.after[0].triangles<result.before[0].triangles*.5);for(const which of ['before','after'])for(const p of result[which])assert.equal(p.glError,0);assert.deepEqual(errors,[]);await writeFile(out+'/performance.json',JSON.stringify({method:'Four interleaved passes; each has 20 warmups + 12 batches × 40 renders, gl.finish wall time; optional 40-render GPU elapsed query. Same final browser/material/camera/resolution. Batch means reduce timer quantization; this is not target-PC FPS.',result,pageErrors:errors},null,2));console.log(JSON.stringify(result));
 }
}finally{await browser.close();}
