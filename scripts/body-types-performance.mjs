// Eight people in one scene: all default bodies versus mixed body types and poses.
// Reports body-type readiness after start, scene load time, draw calls, triangles and
// render time on the shot-camera renderer (1280×720, headless SwiftShader: compare the
// two rows with each other, not with a real GPU).
// Usage: node scripts/body-types-performance.mjs [baseUrl] [output.json]
import {loadPlaywright} from './playwright-runtime.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001',output=process.argv[3]||'docs/review-evidence/2026-11-10-body-types-performance/performance.json';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1400,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const TYPES=['female','male','neutral','child','male-heavy','female','male','child'],POSES=['standing','kneeling','half-kneeling','squatting','crouching','lying','sitting','standing'];
const scene=mixed=>({version:1,units:'meters',title:'perf',room:{size:[12,3,8],walls:false},camera:{position:[0,1.6,9],target:[0,.7,0],fov:45},
 actors:TYPES.map((t,i)=>({id:'p'+i,name:'p'+i,position:[(i-3.5)*1.2,0,(i%2)*-1],yaw:20*i,height:t==='child'?1.15:1.7,pose:mixed?POSES[i]:'standing',...(mixed&&t!=='female'?{bodyType:t}:{})})),props:[]});
try{
 const t0=Date.now();await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});const appReadyMs=Date.now()-t0;
 const typesReadyMs=await page.evaluate(async()=>{const t=performance.now();const a=await import('/src/body-v1-adapter.js');await a.ensureBodyTypes();return Math.round(performance.now()-t);});
 const rows={};
 for(const [name,mixed]of [['8 default, standing',false],['8 mixed types and poses',true]]){
  rows[name]=await page.evaluate(async text=>{
   const b=window.__bodyV1,t=performance.now();await b.studio.importText(text,'perf',true);const loadMs=performance.now()-t;
   let scene=b.actors[0].root;while(scene.parent)scene=scene.parent;
   const r=b.studio.previewRenderer,cam=b.studio.shotCamera,gl=r.getContext(),px=new Uint8Array(4);r.setSize(1280,720,false);b.studio.updateShotCamera();
   r.info.autoReset=true;r.render(scene,cam);const calls=r.info.render.calls,triangles=r.info.render.triangles;
   const times=[];for(let i=0;i<20;i++){const s=performance.now();r.render(scene,cam);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);times.push(performance.now()-s);}
   times.sort((x,y)=>x-y);return {loadMs:Math.round(loadMs),drawCalls:calls,triangles,renderMsMedian:+times[10].toFixed(1)};
  },JSON.stringify(scene(mixed)));
 }
 const result={appReadyMs,typesReadyMs,rows,errors};
 await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,1));console.log(JSON.stringify(result,null,1));
}finally{await browser.close();}
