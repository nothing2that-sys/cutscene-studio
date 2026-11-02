import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const baseline=process.argv.includes('--baseline');
const out=`validation/ik-continuity/${baseline?'before':'after'}`;
await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const results=[];
let convergence;
try {
  for(const [part,chain]of [['Head',['torso','neck','head']],['Neck',['torso','neck']],['Right_Wrist',['r_arm','r_elbow','r_wrist']],['Left_Ankle',['l_leg','l_knee','l_ankle']]]){
    await page.goto('http://127.0.0.1:3002');
    await page.locator('[data-edit-mode="advanced"]').click();
    await page.locator('#studio-example').click();
    await page.locator('#studio-shots button').first().click();
    await page.locator('.layer-item[data-imported="false"][data-idx="0"] span').first().click();
    await page.locator('#body-part-select').selectOption(part);
    await page.locator('#btn-gizmo-translate').click();
    const start=await page.evaluate(async()=>{
      const urls=performance.getEntriesByType('resource').map(e=>e.name);
      const mod=await import(urls.find(u=>u.includes('mannequin-js')));
      const THREE=await import(urls.find(u=>/\.vite\/deps\/three\.js/.test(u)));
      const rig=await import('/src/body-rig.js');
      const stage=mod.getStage();let tc;stage.scene.traverse(n=>{if(n.isTransformControls)tc=n;});
      const m=stage.scene.children.find(n=>n.torso&&n.l_elbow);
      window.__ikCheck={THREE,rig,stage,tc,m};
      const p=tc.object.getWorldPosition(new THREE.Vector3()).project(stage.camera),r=stage.renderer.domElement.getBoundingClientRect();
      return [r.left+(p.x+1)/2*r.width,r.top+(1-p.y)/2*r.height];
    });
    const sample=()=>page.evaluate(chain=>{
      const {THREE,m,rig}=window.__ikCheck;
    return {q:chain.map(k=>m[k].getWorldQuaternion(new THREE.Quaternion()).toArray()),root:m.position.toArray(),lengths:rig.boneDistances(m)};
    },chain);
    let previous=await sample(),worst=0,boneDrift=0;
    const lengths=previous.lengths;
    await page.mouse.move(...start);
    const handle=await page.evaluate(()=>window.__ikCheck.tc.axis);
    assert.ok(handle,part+' handle not hit');
    await page.mouse.down();
    for(let step=1;step<=40;step++){
      await page.mouse.move(start[0]+600*step/40,start[1]+300*step/40);
      const current=await sample();
      assert.ok(Math.hypot(...current.root.map((v,i)=>v-previous.root[i]))<1e-8,part+' drag moved root instead of joint');
      for(let j=0;j<chain.length;j++){
        const dot=Math.abs(current.q[j].reduce((s,v,i)=>s+v*previous.q[j][i],0));
        worst=Math.max(worst,2*Math.acos(Math.min(1,dot))*180/Math.PI);
      }
      for(const key of Object.keys(lengths))boneDrift=Math.max(boneDrift,Math.abs(lengths[key]-current.lengths[key]));
      previous=current;
    }
    await page.mouse.up();
    await page.screenshot({path:`${out}/${part}.png`});
    results.push({part,handle,worstWorldStepDegrees:worst,boneDrift});
    console.log(JSON.stringify(results.at(-1)));
  }
  assert.deepEqual(errors,[]);
  if(!baseline)convergence=await page.evaluate(()=>{
    const {THREE,rig}=window.__ikCheck,m=rig.createCharacter({height:1.8,headUnits:8});
    const joints=['r_arm','r_elbow','r_wrist'],start=joints.map(k=>m[k].quaternion.clone());
    m.r_arm.raise+=20;m.r_elbow.bend+=20;rig.constrainBody(m);
    const target=m.r_wrist.getWorldPosition(new THREE.Vector3());
    joints.forEach((k,i)=>m[k].quaternion.copy(start[i]));rig.constrainBody(m);
    let previous=m.r_wrist.getWorldPosition(new THREE.Vector3()).distanceTo(target),initial=previous;
    for(let n=0;n<60;n++){
      const current=rig.solveConstrainedIK(m,joints,target).error;
      if(current>previous+1e-8)throw new Error('Repeated target worsened');previous=current;
    }
    m.parent.remove(m);
    if(previous>=0.015||previous>=initial)throw new Error('Continuous IK stalled: '+JSON.stringify({initial,final:previous}));
    return {initialError:initial,finalError:previous,iterations:60,monotone:true};
  });
  if(!baseline)for(const r of results){assert.ok(r.worstWorldStepDegrees>0.01,'Joint did not respond: '+JSON.stringify(r));assert.ok(r.worstWorldStepDegrees<=20.0001,JSON.stringify(r));assert.ok(r.boneDrift<1e-6);}
  await writeFile(`${out}/report.json`,JSON.stringify({baseline,passed:baseline?null:true,results,convergence,pageErrors:errors},null,2));
}finally{await browser.close();}
