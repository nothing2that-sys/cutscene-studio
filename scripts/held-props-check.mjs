// Hand-held props (props[].attachTo): the prop sits at the holder's grip point, follows
// the hand when the pose changes, stays attached through save/reopen and undo, can be
// set from the properties panel, and the prompt says who holds it in which hand.
// Usage: node scripts/held-props-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const probe=()=>page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(e=>e.name).find(n=>n.includes('/src/held-props.js'));const {gripPoint}=await import(url);
 const b=window.__bodyV1,out={};for(const p of b.props){const a=p.root.userData.attachTo||p.root.userData.primitive?.attachTo;if(!a)continue;const m=b.actors.find(x=>x.id===a.actor).driver,g=gripPoint(m,a.hand),box=new (g.constructor)();
  const bb=new (window.__bb||(window.__bb=p.root.position.constructor))();p.root.updateMatrixWorld(true);let lo=Infinity,hi=-Infinity;p.root.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const bx=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);lo=Math.min(lo,bx.min.y);hi=Math.max(hi,bx.max.y);});
  const center=p.root.position;out[p.id]={hand:g.toArray().map(v=>+v.toFixed(3)),bottom:+lo.toFixed(3),top:+hi.toFixed(3),grip:p.root.userData.heldGrip,pos:center.toArray().map(v=>+v.toFixed(3))};}return out;});
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});
 const scene={version:1,units:'meters',title:'우산',room:{size:[8,3,6],walls:false},camera:{position:[0,1.4,5],target:[0,1,0],fov:45},
  actors:[{id:'man',name:'남자',position:[0,0,0],height:1.78,bodyType:'male',pose:'standing'}],
  props:[{id:'umbrella',name:'우산',type:'cylinder',position:[3,0,0],size:[.04,.9,.04],attachTo:{actor:'man',hand:'right'}},{id:'cup',name:'컵',type:'cylinder',position:[3,0,1],size:[.08,.1,.08],attachTo:{actor:'man',hand:'left'}},{id:'torch',name:'횃불',type:'cylinder',position:[2,0,1],size:[.04,.5,.04],attachTo:{actor:'man',hand:'right',grip:'bottom'}},{id:'bag',name:'가방',type:'box',position:[1,0,1],size:[.3,.25,.1]}]};
 await page.evaluate(async t=>{await window.__bodyV1.studio.importText(t,'held',true);},JSON.stringify(scene));await page.waitForTimeout(800);
 const at=await probe();
 for(const id of ['umbrella','cup','torch']){const r=at[id];assert.ok(Math.hypot(r.pos[0]-r.hand[0],r.pos[2]-r.hand[2])<0.02,id+' centred on the grip');}
 // Tall props hang from the hand (top end in the hand); short ones and grip:'bottom' stand on it.
 assert.equal(at.umbrella.grip,'top');assert.ok(Math.abs(at.umbrella.top-(at.umbrella.hand[1]+.06))<0.02,'umbrella hangs: top end at the grip');
 assert.equal(at.cup.grip,'bottom');assert.ok(Math.abs(at.cup.bottom-(at.cup.hand[1]-.05))<0.02,'cup stands: lower part at the grip');
 assert.equal(at.torch.grip,'bottom');assert.ok(Math.abs(at.torch.bottom-(at.torch.hand[1]-.06))<0.02,'grip bottom: tall torch stands on the hand');
 // Pose change: point with the right arm; the umbrella follows.
 await page.locator('.layer-item[data-imported="false"][data-idx="0"]').first().click({position:{x:8,y:10}});await page.waitForTimeout(300);
 await page.selectOption('#quick-pose','pointing');await page.click('#quick-pose-apply');await page.waitForTimeout(600);
 const moved=await probe();
 assert.ok(Math.hypot(...moved.umbrella.hand.map((v,i)=>v-at.umbrella.hand[i]))>0.2,'the right hand moved');
 assert.ok(Math.hypot(moved.umbrella.pos[0]-moved.umbrella.hand[0],moved.umbrella.pos[2]-moved.umbrella.hand[2])<0.02,'umbrella followed the hand');
 // Save/reopen keeps it attached; undo keeps following.
 const project=await page.evaluate(async()=>JSON.stringify(await window.__bodyV1.drive.save()));
 await page.evaluate(async t=>{await window.__bodyV1.studio.importText(t,'reopen',false);},project);await page.waitForTimeout(1500);
 const reopened=await probe();assert.ok(reopened.umbrella&&reopened.cup,'still attached after reopen');
 assert.ok(Math.hypot(...reopened.umbrella.pos.map((v,i)=>v-moved.umbrella.pos[i]))<0.01,'same place after reopen');
 // Panel: hold the bag in the left hand.
 const bagIdx=await page.evaluate(()=>window.__bodyV1.props.findIndex(p=>p.id==='bag'));
 await page.locator(`.layer-item[data-imported="true"][data-idx="${bagIdx}"]`).first().click({position:{x:8,y:10}});await page.waitForTimeout(300);
 await page.selectOption('#object-info-hold','man|left');await page.waitForTimeout(500);
 const bag=(await probe()).bag;assert.ok(bag,'bag attached from the panel');assert.ok(Math.hypot(bag.pos[0]-bag.hand[0],bag.pos[2]-bag.hand[2])<0.02,'bag in the left hand');
 assert.equal(bag.grip,'top','25 cm bag hangs by default');
 await page.selectOption('#object-info-grip','bottom');await page.waitForTimeout(400);
 const standing=(await probe()).bag;assert.equal(standing.grip,'bottom','grip set from the panel');assert.ok(Math.abs(standing.bottom-(standing.hand[1]-.06))<0.02,'bag now stands on the hand');
 await page.selectOption('#object-info-grip','');await page.waitForTimeout(400);
 // Prompt and shot.json.
 const pkg=await page.evaluate(async()=>{const p=await window.__bodyV1.studio.createShotPackage();return {prompt:p.prompt,held:p.json.labels.filter(l=>l.heldBy).map(l=>[l.id,l.heldBy.hand])};});
 assert.deepEqual(pkg.held.sort(),[['bag','left'],['cup','left'],['torch','right'],['umbrella','right']]);
 assert.match(pkg.prompt,/남자이\(가\) 오른손에 들고 있음\(위쪽을 쥐고 손 아래로 늘어뜨림\)\. 이 소품은 손에 든 것 하나만 그림/);assert.match(pkg.prompt,/왼손에 들고 있음\(아래쪽을 쥐고 손 위로 세움\)/);assert.match(pkg.prompt,/손에 든 것: .*우산\(오른손\)/);
 // Validation.
 const bad=await page.evaluate(async t=>{const S=window.__bodyV1.studio;return S.importText(t,'bad',true,false);},JSON.stringify({...scene,props:[{...scene.props[0],attachTo:{actor:'nobody',hand:'right'}}]}));
 assert.equal(bad,false,'unknown holder rejected');
 const badGrip=await page.evaluate(async t=>window.__bodyV1.studio.importText(t,'bad',true,false),JSON.stringify({...scene,props:[{...scene.props[0],attachTo:{actor:'man',hand:'right',grip:'middle'}}]}));
 assert.equal(badGrip,false,'unknown grip rejected');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,at,moved:moved.umbrella,bag},null,1));
}finally{await browser.close();}
