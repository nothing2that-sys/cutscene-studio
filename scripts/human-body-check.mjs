import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='validation/human-body';await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:3002');await page.locator('#studio-example').click();assert.equal(await page.locator('#body-surface-mode').inputValue(),'human');
 const result=await page.evaluate(async()=>{
  const urls=performance.getEntriesByType('resource').map(e=>e.name),rig=await import(urls.find(u=>u.includes('/src/body-rig.js'))),surface=await import(urls.find(u=>u.includes('/src/body-surface.js'))),THREE=await import(urls.find(u=>/\.vite\/deps\/three\.js/.test(u))),{getStage}=await import(urls.find(u=>u.includes('mannequin-js'))),stage=getStage(),m=rig.createCharacter({height:1.75,headUnits:8}),renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(420,580);renderer.outputColorSpace=THREE.SRGBColorSpace;stage.scene.background=new THREE.Color('#f0f1f4');stage.scene.children.forEach(o=>{if(o!==m&&!o.isLight)o.visible=false;});const results=[],checks=[];
  const snapshot=()=>JSON.stringify({position:m.position.toArray(),profile:m.userData.bodyProfile,bones:rig.captureBoneLayout(m),joints:rig.snapshotBodyJoints(m)});
  const original=snapshot();let drawCalls={};
  for(const pose of ['neutral','squat','reaching']){
   if(pose==='squat'){m.l_leg.raise=100;m.r_leg.raise=100;m.l_leg.straddle=25;m.r_leg.straddle=25;m.l_knee.bend=130;m.r_knee.bend=130;m.torso.bend=25;m.l_arm.raise=85;m.r_arm.raise=85;}
   if(pose==='reaching'){m.l_leg.raise=0;m.r_leg.raise=0;m.l_knee.bend=5;m.r_knee.bend=5;m.torso.bend=0;m.l_arm.raise=130;m.r_arm.raise=40;m.l_elbow.bend=30;m.r_elbow.bend=80;}
   rig.constrainBody(m);const saved=snapshot();
   for(const mode of ['rig','human']){
    surface.setBodySurface(m,mode);if(snapshot()!==saved)throw Error('Appearance mutated rig');const box=new THREE.Box3().setFromObject(m),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),range=Math.max(size.y/2,size.x/2,.65)*1.15,camera=new THREE.OrthographicCamera(-range*420/580,range*420/580,range,-range,.01,100);camera.position.copy(center).add(new THREE.Vector3(3,.7,5));camera.lookAt(center);renderer.render(stage.scene,camera);drawCalls[mode]=renderer.info.render.calls;results.push({name:pose+'-'+mode,image:renderer.domElement.toDataURL(),height:size.y,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
   }
  }
  for(const profile of [{height:1.55,headUnits:5},{height:1.75,headUnits:8},{height:1.95,headUnits:9.5}]){const model=rig.createCharacter(profile);if(Math.abs(model.userData.bodyMetrics.height-profile.height)>1e-6||Math.abs(model.userData.bodyMetrics.headUnits-profile.headUnits)>1e-6)throw Error('Body sizing failed');model.removeFromParent();}
  checks.push('appearance toggles preserve all joints, locked layout, profile and root in neutral/squat/reaching poses','5/8/9.5-head sizing remains accurate');
  if(results[1].drawCalls>2||results[1].triangles>45000)throw Error('Drawing mannequin exceeds the two-pass rendering budget');checks.push('drawing mannequin including contour stays within 2 draw calls and 45000 rendered triangles');
  if(Math.abs(results[1].height-1.75)>.005)throw Error('Human neutral stature differs from configured height');checks.push('human neutral visible height matches configured stature within 5mm; rig transforms are unchanged');
  return {results,checks};
 });
 for(const item of result.results){await writeFile(out+'/'+item.name+'.png',Buffer.from(item.image.split(',')[1],'base64'));delete item.image;}
 await page.reload();await page.locator('#studio-example').click();await page.locator('#body-surface-mode').selectOption('rig');await page.reload();assert.equal(await page.locator('#body-surface-mode').inputValue(),'rig');await page.locator('#body-surface-mode').selectOption('human');await page.locator('#studio-example').click();await page.screenshot({path:out+'/app-human.png'});assert.deepEqual(errors,[]);result.checks.push('UI toggle and local preference persist across reload');result.pageErrors=errors;await writeFile(out+'/checks.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
