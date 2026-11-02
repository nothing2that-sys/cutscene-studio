import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='validation/direct-editor';await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright();const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
const context=await browser.newContext({viewport:{width:1600,height:1100},acceptDownloads:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const checks=[],metrics={};
async function save(name){const pending=page.waitForEvent('download');await page.locator('#btn-save').click();const d=await pending;const file=out+'/'+name;await d.saveAs(file);return JSON.parse(await readFile(file,'utf8'));}
async function library(){if(!await page.locator('#pose-library-panel').isVisible())await page.locator('#pose-library-open').click();}
async function probe(){await page.evaluate(async()=>{const urls=performance.getEntriesByType('resource').map(e=>e.name),mod=await import(urls.find(u=>u.includes('mannequin-js'))),THREE=await import(urls.find(u=>/\.vite\/deps\/three\.js/.test(u))),rig=await import('/src/body-rig.js');const stage=mod.getStage();window.__directCheck={stage,THREE,rig,person:()=>stage.scene.children.find(m=>m.torso&&m.l_elbow)};});}
const snapshot=()=>page.evaluate(()=>{const {THREE,rig,person}=window.__directCheck,m=person();return {position:m.position.toArray(),knee:m.l_knee.getWorldPosition(new THREE.Vector3()).toArray(),ankle:m.l_ankle.getWorldPosition(new THREE.Vector3()).toArray(),lengths:rig.boneDistances(m),bend:m.l_knee.bend};});
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
async function drag(point,dx,dy){await page.mouse.move(point.x+point.width/2,point.y+point.height/2);await page.mouse.down();await page.mouse.move(point.x+point.width/2+dx,point.y+point.height/2+dy,{steps:20});await page.waitForTimeout(250);await page.mouse.up();}
try{
  await page.goto('http://127.0.0.1:3002');await page.locator('#studio-example').click();await probe();
  metrics.straightLeg=await page.evaluate(async()=>{
    const {rig,THREE,stage}=window.__directCheck,poses=await import('/src/pose-library.js');
    const m=rig.createCharacter({height:1.75,headUnits:8});m.l_leg.rotation.set(0,0,0);m.l_knee.rotation.set(0,0,0);rig.constrainBody(m);
    const hip=m.l_leg.getWorldPosition(new THREE.Vector3()),end=m.l_ankle.getWorldPosition(new THREE.Vector3()),target=hip.clone().lerp(end,0.8),before=end.distanceTo(target);
    let result;for(let i=0;i<50;i++)result=rig.solveConstrainedIK(m,['l_leg','l_knee','l_ankle'],target);
    if(result.error>0.015||m.l_knee.bend<5)throw Error('Straight leg failed to bend toward a shorter target');
    const original=stage.scene.quaternion.toArray();let rejected=false;try{poses.applyReferencePose(m,{kind:'rotations',rotations:{parent:[0,1,0,'XYZ']}});}catch{rejected=true;}
    if(!rejected||JSON.stringify(original)!==JSON.stringify(stage.scene.quaternion.toArray()))throw Error('Unknown pose joint changed the scene');
    const value={initialError:before,finalError:result.error,kneeBend:m.l_knee.bend};m.parent.remove(m);return value;
  });checks.push('straight leg folds toward ankle target; unknown reference joints rejected');
  assert.equal(await page.locator('body').getAttribute('data-edit-mode'),'move');
  await library();const initialPoseCount=await page.locator('.pose-card').count();await page.locator('#pose-library-close').click();
  await page.locator('[data-direct-view="front"]').click();
  const before=await save('before.json'),start=await page.evaluate(()=>{const {stage,THREE,person}=window.__directCheck,m=person(),p=m.torso.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,0.15,0)).project(stage.camera),r=stage.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height,width:0,height:0};});
  await drag(start,80,20);const moved=await save('moved.json');
  assert.ok(distance(before.mannequins[0].position,moved.mannequins[0].position)>0.03);
  assert.deepEqual(before.mannequins[0].boneLayout,moved.mannequins[0].boneLayout);checks.push('body mesh drag moves whole actor and preserves bone layout');
  await library();assert.equal(await page.locator('.pose-card').count(),initialPoseCount);await page.locator('#pose-library-close').click();checks.push('camera and root movement do not archive false poses');
  await page.locator('[data-edit-mode="pose"]').click();await page.locator('[data-direct-view="side"]').click();
  const beforeKnee=await snapshot();await drag(await page.locator('[data-pose-point="l_knee"]').boundingBox(),45,-30);const afterKnee=await snapshot();
  metrics.kneeMoved=distance(beforeKnee.knee,afterKnee.knee);metrics.ankleFollowed=distance(beforeKnee.ankle,afterKnee.ankle);assert.ok(metrics.kneeMoved>0.015);assert.ok(metrics.ankleFollowed>0.015);assert.deepEqual(beforeKnee.position,afterKnee.position);checks.push('knee handle moves knee; lower leg follows; root stays');
  const beforeAnkle=await snapshot();await drag(await page.locator('[data-pose-point="l_ankle"]').boundingBox(),-15,-90);const afterAnkle=await snapshot();
  metrics.ankleMoved=distance(beforeAnkle.ankle,afterAnkle.ankle);metrics.kneeBendAfter=afterAnkle.bend;assert.ok(metrics.ankleMoved>0.015);
  for(const key of Object.keys(beforeKnee.lengths))assert.ok(Math.abs(beforeKnee.lengths[key]-afterAnkle.lengths[key])<1e-6);checks.push('ankle drag coordinates leg with fixed segment lengths');
  await page.screenshot({path:out+'/pose-handles.png'});
  await library();await page.locator('#pose-library-name').fill('직접 조작한 테스트 포즈');await page.locator('#pose-library-record').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.pose-card span')].some(e=>e.textContent==='직접 조작한 테스트 포즈'));
  await page.locator('#pose-library-search').fill('직접 조작한');assert.equal(await page.locator('.pose-card').count(),1);await page.locator('#pose-library-search').fill('');checks.push('named poses are searchable');
  const count=await page.locator('.pose-card').count();await page.locator('#pose-library-record').click();assert.equal(await page.locator('.pose-card').count(),count);checks.push('auto archive, manual naming and duplicate suppression');
  const pending=page.waitForEvent('download');await page.locator('#pose-library-backup').click();const backup=await pending;await backup.saveAs(out+'/library.json');
  await page.reload();await probe();await library();await page.waitForFunction(()=>[...document.querySelectorAll('.pose-card span')].some(e=>e.textContent==='직접 조작한 테스트 포즈'));checks.push('library persists across reload and backs up');
  await page.locator('#pose-library-close').click();await page.locator('#studio-example').click();
  await page.locator('.layer-item[data-imported="false"][data-idx="1"] span').first().click();
  const targetBefore=await save('target-before.json');await page.locator('#pose-reference-file').setInputFiles('examples/poses/sitting.json');
  await page.waitForFunction(()=>document.querySelector('#direct-status').textContent.includes('포즈를 적용'));
  const targetAfter=await save('target-after.json');assert.deepEqual(targetAfter.mannequins[1].bodyProfile,targetBefore.mannequins[1].bodyProfile);assert.deepEqual(targetAfter.mannequins[1].boneLayout,targetBefore.mannequins[1].boneLayout);assert.equal(targetAfter.mannequins[1].position[0],targetBefore.mannequins[1].position[0]);assert.equal(targetAfter.mannequins[1].position[2],targetBefore.mannequins[1].position[2]);assert.equal(targetAfter.mannequins.length,2);assert.notDeepEqual(targetAfter.mannequins[1].joints.l_knee.rotation,targetBefore.mannequins[1].joints.l_knee.rotation);checks.push('pose JSON changes selected actor only, preserves identity and placement');
  await library();const data=JSON.parse(await readFile(out+'/library.json','utf8')),beforeRestore=await page.locator('.pose-card').count();await page.locator('#pose-library-restore').setInputFiles(out+'/library.json');await page.waitForFunction(()=>document.querySelector('#direct-status').textContent.includes('복원했습니다'));assert.equal(await page.locator('.pose-card').count(),beforeRestore);assert.ok(beforeRestore>=data.poses.length);checks.push('library backup restore is deduplicated');
  while(await page.locator('.pose-card').count()){const count=await page.locator('.pose-card').count();await page.locator('.pose-card-remove').first().click();await page.waitForFunction(count=>document.querySelectorAll('.pose-card').length<count,count);}
  await page.reload();await library();await page.waitForFunction(()=>document.querySelector('#pose-library-status').textContent.startsWith('0개'));assert.equal(await page.locator('.pose-card').count(),0);
  await page.locator('#pose-library-restore').setInputFiles(out+'/library.json');await page.waitForFunction(()=>document.querySelector('#direct-status').textContent.includes('복원했습니다'));assert.equal(await page.locator('.pose-card').count(),data.poses.length);checks.push('deletions persist, empty library stays empty, backup recovers it');
  await page.screenshot({path:out+'/library.png'});
  // Repeat the essential interactions on the shipped bundle, not just Vite source.
  await page.goto('http://127.0.0.1:3001');await page.locator('#studio-example').click();
  await page.locator('[data-edit-mode="pose"]').click();await page.locator('[data-direct-view="front"]').click();
  const actorPoint=await page.locator('[data-pose-point="torso"]').boundingBox();await page.locator('[data-edit-mode="move"]').click();
  const shippedBefore=await save('shipped-before.json');await drag(actorPoint,60,0);const shippedMoved=await save('shipped-moved.json');
  assert.ok(distance(shippedBefore.mannequins[0].position,shippedMoved.mannequins[0].position)>0.02);
  await page.locator('[data-edit-mode="pose"]').click();await page.locator('[data-direct-view="side"]').click();
  await drag(await page.locator('[data-pose-point="l_knee"]').boundingBox(),40,-35);const shippedPosed=await save('shipped-posed.json');
  assert.notDeepEqual(shippedPosed.mannequins[0].joints.l_leg.rotation,shippedMoved.mannequins[0].joints.l_leg.rotation);assert.deepEqual(shippedPosed.mannequins[0].boneLayout,shippedMoved.mannequins[0].boneLayout);
  await page.screenshot({path:out+'/production-handles.png'});
  await library();await page.locator('#pose-library-name').fill('배포본 테스트 포즈');await page.locator('#pose-library-record').click();await page.waitForFunction(()=>[...document.querySelectorAll('.pose-card span')].some(e=>e.textContent==='배포본 테스트 포즈'));
  await page.reload();await library();await page.waitForFunction(()=>[...document.querySelectorAll('.pose-card span')].some(e=>e.textContent==='배포본 테스트 포즈'));checks.push('production bundle: whole drag, knee target, fixed bones and persistent library');
  assert.deepEqual(errors,[]);const report={passed:true,checks,metrics,pageErrors:errors};await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){await page.screenshot({path:out+'/failure.png'});console.log(JSON.stringify({metrics,part:await page.locator('#body-part-select').inputValue().catch(()=>null),status:await page.locator('#direct-status').textContent().catch(()=>null)}));throw error;}finally{await browser.close();}
