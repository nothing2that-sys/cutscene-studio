import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
await mkdir('validation/body-rig',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true});
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
async function save(name){const wait=page.waitForEvent('download');await page.locator('#btn-save').click();const d=await wait;const f='validation/body-rig/'+name;await d.saveAs(f);return JSON.parse(await readFile(f,'utf8'));}
try{
  await page.goto('http://127.0.0.1:3002');
  await page.waitForSelector('#body-height');
  const engine=await page.evaluate(async()=>{
    const rig=await import('/src/body-rig.js');
    const {JOINTS}=await import('/src/scene-format.js');
    const check=(value,message)=>{if(!value)throw new Error(message);};
    const near=(a,b,t=1e-6)=>Math.abs(a-b)<t;
    function yBounds(object){
      let min=Infinity,max=-Infinity;
      object.traverse(n=>{
        if(!n.isMesh)return;n.geometry.computeBoundingBox();const b=n.geometry.boundingBox;
        for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
          const p=n.position.clone().set(x,y,z).applyMatrix4(n.matrixWorld);min=Math.min(min,p.y);max=Math.max(max,p.y);
        }
      });return {min,max,height:max-min};
    }
    const measured=[];
    for(const profile of [{height:1.8,headUnits:5},{height:1.8,headUnits:8},{height:1.8,headUnits:9.5},{height:1.4,headUnits:5}]){
      const m=rig.createCharacter(profile);
      for(const key of ['torso','neck','head'])m[key].rotation.set(0,0,0,'XYZ');
      m.updateMatrixWorld(true);
      const body=yBounds(m),head=yBounds(m.head.image),ratio=body.height/head.height;
      check(near(body.height,profile.height),'measured height mismatch '+JSON.stringify({profile,body}));
      check(near(ratio,profile.headUnits),'measured heads mismatch '+JSON.stringify({profile,ratio}));
      measured.push({profile,measuredHeight:body.height,measuredHeadUnits:ratio});
      m.parent.remove(m);
    }
    const m=rig.createCharacter({height:1.75,headUnits:8}),original=rig.boneDistances(m);
    let seed=17;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let iteration=0;iteration<80;iteration++){
      for(const [key,limits]of Object.entries(JOINTS))for(const [prop,[low,high]]of Object.entries(limits))m[key][prop]=low-180+random()*(high-low+360);
      rig.constrainBody(m);
      for(const [key,limits]of Object.entries(JOINTS))for(const [prop,[low,high]]of Object.entries(limits))check(m[key][prop]>=low-1e-7&&m[key][prop]<=high+1e-7,'joint limit '+key+'.'+prop);
      const lengths=rig.boneDistances(m);for(const key of Object.keys(original))check(near(lengths[key],original[key]),'bone changed '+key);
    }
    const target=m.r_wrist.getWorldPosition(m.position.clone()).add(m.position.clone().set(0.08,0.06,0.04));
    const initialError=m.r_wrist.getWorldPosition(m.position.clone()).distanceTo(target);
    const reachable=rig.solveConstrainedIK(m,['r_arm','r_elbow','r_wrist'],target);
    check(reachable.error<=initialError+1e-5,'IK worsened reachable target');
    const far=rig.solveConstrainedIK(m,['l_leg','l_knee','l_ankle'],m.position.clone().set(100,50,-100));
    check(!far.reached&&far.targetClamped,'unreachable target did not clamp');
    check(Math.abs(m.l_knee.rotation.x)<1e-10&&Math.abs(m.l_knee.rotation.y)<1e-10,'knee twisted');
    m.l_elbow.position.multiplyScalar(3);m.r_leg.scale.setScalar(2);m.scale.multiplyScalar(4);rig.enforceBoneLengths(m);
    const final=rig.boneDistances(m);for(const key of Object.keys(original))check(near(final[key],original[key]),'lock failed '+key);
    m.parent.remove(m);
    return {measured,randomPoses:80,reachable,far,boneLengthPreserved:true};
  });
  await page.goto('http://127.0.0.1:3001');
  await page.locator('#studio-example').click();
  await page.waitForFunction(()=>document.querySelector('#studio-status').textContent.includes('인물 2명'));
  await page.locator('#body-height').fill('180');await page.locator('[data-head-units="5"]').click();await page.locator('#body-apply').click();
  const first=await save('five-heads.json');assert.deepEqual(first.mannequins[0].bodyProfile,{height:1.8,headUnits:5});
  await page.locator('.layer-item[data-imported="false"][data-idx="1"] span').first().click();
  await page.locator('#body-height').fill('165');await page.locator('[data-head-units="9.5"]').click();await page.locator('#body-apply').click();
  const two=await save('two-characters.json');assert.deepEqual(two.mannequins[0].bodyProfile,{height:1.8,headUnits:5});assert.deepEqual(two.mannequins[1].bodyProfile,{height:1.65,headUnits:9.5});
  await page.locator('#body-part-select').selectOption('Left_Elbow');
  assert.equal(await page.locator('#num-pos-x').count(),0);
  await page.locator('#num-rot-bend').fill('999');await page.locator('#num-rot-bend').press('Tab');
  assert.equal(Number(await page.locator('#num-rot-bend').inputValue()),150);
  const posed=await save('posed.json');
  assert.deepEqual(posed.mannequins[1].boneLayout,two.mannequins[1].boneLayout);
  for(const [key,lock]of Object.entries(two.mannequins[1].boneLayout.joints)){assert.deepEqual(posed.mannequins[1].joints[key].position,lock.position);assert.deepEqual(posed.mannequins[1].joints[key].scale,lock.scale);}
  await page.locator('#btn-load').setInputFiles('validation/body-rig/two-characters.json');
  await page.waitForFunction(()=>document.querySelector('#body-head-units').value==='9.5');
  const loaded=await save('reloaded.json');assert.deepEqual(loaded.mannequins.map(m=>m.bodyProfile),two.mannequins.map(m=>m.bodyProfile));
  const bad=structuredClone(two);bad.mannequins[0].joints.l_elbow.position[1]+=3;
  await page.locator('#btn-load').setInputFiles({name:'stretched.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
  await page.waitForFunction(()=>document.querySelector('#studio-validation-source').textContent.includes('stretched.json'));
  assert.ok((await page.locator('#studio-validation-issues').innerText()).includes('BONE_LENGTH_LOCKED'));
  await page.locator('#body-part-select').selectOption('Root');
  await page.screenshot({path:'validation/body-rig/editor.png'});
  assert.deepEqual(pageErrors,[]);
  const report={passed:true,engine,ui:['independent height/headUnits per actor','5 and 9.5 head presets','joint translation fields removed','numeric angle clamped','local bone offsets and scales preserved','profile roundtrip','stretched project rejected'],pageErrors};
  await writeFile('validation/body-rig/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
