import {loadPlaywright} from './playwright-runtime.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='validation/review-regression';await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const precise=value=>JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='number'?Math.round(v*1e8)/1e8:v));
async function download(selector,name){const pending=page.waitForEvent('download');await page.locator(selector).click();const d=await pending;const file=out+'/'+name;await d.saveAs(file);return JSON.parse(await readFile(file,'utf8'));}
const save=name=>download('#btn-save',name);
async function load(value){await page.locator('#btn-load').setInputFiles({name:'review-project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});await page.waitForFunction(()=>document.querySelector('#studio-status').textContent.includes('입력 적용 완료'));}
async function example(){await page.locator('#studio-example').click();await page.waitForFunction(()=>document.querySelector('#studio-status').textContent.includes('인물 2명'));}
try{
  await page.goto('http://127.0.0.1:3001');await example();
  const original=await save('original.json');
  let importSequence=0;
  async function fromFile(value){
    const name='review-object-'+(++importSequence)+'.json';
    await page.locator('#btn-add-mannequin').click();
    const pending=page.waitForEvent('filechooser');await page.locator('#btn-add-mannequin-path').click();
    await (await pending).setFiles({name,mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
    await page.waitForFunction(name=>document.querySelector('#studio-validation-source').textContent.includes(name),name);
  }
  const object={...structuredClone(original.mannequins[0]),type:'mannequin'};
  const broken=structuredClone(object);broken.position=[1,'bad',3];
  const stretched=structuredClone(object);stretched.joints.l_elbow.position[1]+=3;
  for(const [input,code]of [[broken,'INVALID_TRANSFORM'],[stretched,'BONE_LENGTH_LOCKED'],['{"type":"mannequin",','JSON_SYNTAX']]){
    await fromFile(input);
    assert.ok((await page.locator('#studio-validation-issues').innerText()).includes(code));
    assert.equal(await page.locator('.layer-item[data-imported="false"]').count(),2);
  }
  const preserved=await save('after-bad-fromfile.json');assert.deepEqual(precise(preserved.mannequins),precise(original.mannequins));await load(preserved);
  await fromFile(object);assert.equal(await page.locator('.layer-item[data-imported="false"]').count(),3);
  await page.locator('#btn-undo').click();assert.equal(await page.locator('.layer-item[data-imported="false"]').count(),2);
  checks.push('F1/F2 From File rejects malformed/stretched/syntax, preserves state, valid import and Undo');
  await page.locator('#studio-room-x').fill('8');await page.locator('#studio-room-x').press('Tab');
  await page.locator('#studio-light-direction').selectOption('back');
  const edited=await save('edited.json');
  assert.deepEqual(edited.studio.initialProposal,original.studio.initialProposal);
  assert.equal(edited.studio.document.room.size[0],8);
  const packet=await download('#studio-packet','handoff.json');
  assert.deepEqual(packet.proposal,original.studio.initialProposal);
  assert.deepEqual(packet.editorState.studio.document.lighting.position,[0,4,-4]);
  assert.equal(packet.proposalOrigin,'scene-import');checks.push('F6 immutable initial proposal, current environment and packet');
  await page.locator('#studio-light-direction').selectOption('top');await load(edited);
  assert.equal(await page.locator('#studio-light-direction').inputValue(),'back');
  await page.locator('#studio-light-direction').selectOption('top');await page.locator('#btn-undo').click();
  assert.equal(await page.locator('#studio-light-direction').inputValue(),'back');
  const custom=structuredClone(edited);custom.studio.document.lighting.position=[1,5,2];await load(custom);
  assert.equal(await page.locator('#studio-light-direction').inputValue(),'custom');checks.push('F8 direction UI restored by Load/Undo and custom preset');
  await load(edited);const roundtrip=await save('roundtrip.json');assert.deepEqual(roundtrip.studio.initialProposal,original.studio.initialProposal);
  const legacy=structuredClone(edited);delete legacy.studio.initialProposal;delete legacy.studio.proposalOrigin;await load(legacy);
  const legacyPacket=await download('#studio-packet','legacy-handoff.json');assert.equal(legacyPacket.proposalOrigin,'legacy-current-state');checks.push('F6 save roundtrip and explicit legacy provenance');
  const missing=structuredClone(edited);delete missing.mannequins[0].boneLayout;await load(missing);
  assert.ok((await page.locator('#studio-validation-issues').innerText()).includes('LEGACY_RIG'));checks.push('F7 missing rig lock warning');
  await example();await page.locator('.layer-item[data-imported="false"][data-idx="0"] span').first().click();
  await page.locator('body').click({position:{x:800,y:970}});
  await page.keyboard.press('Delete');
  await page.locator('.layer-item[data-imported="false"] span').first().click();
  await page.locator('body').click({position:{x:800,y:970}});await page.keyboard.press('Delete');
  assert.equal(await page.locator('.layer-item[data-imported="false"]').count(),0);
  await page.locator('#btn-undo').click();assert.equal(await page.locator('.layer-item[data-imported="false"]').count(),1);
  await page.locator('.btn-delete-layer[data-imported="false"]').first().click();assert.equal(await page.locator('.layer-item[data-imported="false"]').count(),0);
  const empty=await save('empty.json');await load(empty);assert.equal(await page.locator('.layer-item[data-imported="false"]').count(),0);checks.push('F9 keyboard/trash both permit empty scene, Undo and reload');
  const response=await page.request.get('http://127.0.0.1:3001/THIRD_PARTY_LICENSES.txt');
  assert.match(response.headers()['content-type'],/^text\/plain/);checks.push('F11 license text MIME');
  await example();await page.screenshot({path:out+'/editor.png'});
  assert.deepEqual(errors,[]);
  const report={passed:true,checks,pageErrors:errors};await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
