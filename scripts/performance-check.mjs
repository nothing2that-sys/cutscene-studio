import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {EXAMPLE_SCENE} from '../app/src/scene-format.js';
import assert from 'node:assert/strict';
const before=process.argv.includes('--before'),software=process.argv.includes('--software');
const out=`validation/performance/${before?'before':'after'}-${software?'software':'hardware'}`;await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle='+(software?'swiftshader':'d3d11')]});
const page=await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:3002');
  const scene=structuredClone(EXAMPLE_SCENE);scene.actors=Array.from({length:6},(_,i)=>({...structuredClone(scene.actors[i%2]),id:'person-'+i,position:[(i%3-1)*1.2,0,Math.floor(i/3)*1.2]}));scene.room.size=[8,4,8];
  await page.locator('#studio-file').setInputFiles({name:'performance-scene.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(scene))});await page.waitForFunction(()=>document.querySelectorAll('.layer-item[data-imported="false"]').length===6);
  await page.evaluate(async()=>{
    const urls=performance.getEntriesByType('resource').map(e=>e.name),mod=await import(urls.find(u=>u.includes('mannequin-js')));const stage=mod.getStage(),stats=[];const original=stage.renderer.render.bind(stage.renderer);
    stage.renderer.render=(...args)=>{const t=performance.now();const result=original(...args);stats.push({at:performance.now(),cpuMs:performance.now()-t,calls:stage.renderer.info.render.calls,triangles:stage.renderer.info.render.triangles,visibleActors:stage.scene.children.filter(m=>m.torso&&m.visible).length});return result;};
    window.__perfCheck={stage,stats};
  });
  await page.locator('[data-edit-mode="pose"]').click();
  await page.waitForTimeout(1500);
  async function measure(moving){return page.evaluate(async moving=>{
    const {stage,stats}=window.__perfCheck,base=stage.camera.position.clone();stats.length=0;
    const start=performance.now();let frames=0;
    await new Promise(resolve=>{function frame(t){frames++;if(moving){stage.camera.position.x=base.x+Math.sin((t-start)/450)*0.1;stage.controls.update();}if(t-start>=2500)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);});
    const duration=performance.now()-start,samples=stats.filter(s=>s.at>=start),average=key=>samples.length?samples.reduce((sum,s)=>sum+s[key],0)/samples.length:0;
    return {durationMs:duration,animationFrames:frames,mainRenderCount:samples.length,mainRenderFps:samples.length*1000/duration,averageRenderCpuMs:average('cpuMs'),averageDrawCalls:average('calls'),averageTriangles:average('triangles'),averageVisibleActors:average('visibleActors'),buffer:[stage.renderer.domElement.width,stage.renderer.domElement.height]};
  },moving);}
  const idle=await measure(false),moving=await measure(true);
  const renderer=await page.evaluate(()=>{const gl=window.__perfCheck.stage.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
  await page.screenshot({path:out+'/editor.png'});
  assert.deepEqual(errors,[]);if(!before){assert.equal(idle.mainRenderCount,0);assert.equal(moving.averageVisibleActors,1);}const report={phase:before?'before':'after',software,renderer,actors:6,idle,moving,pageErrors:errors};await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
