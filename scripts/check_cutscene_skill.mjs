import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd(),skill=path.resolve('skills/cutscene-studio');
const output=path.resolve('validation/skill-'+Date.now());
await mkdir(output,{recursive:true});
const script=path.join(skill,'scripts/scene.mjs');
const fixture=JSON.parse(await readFile('examples/example-scene.json','utf8'));
let packet,packetSource='validation/handoff.json';
try {packet=JSON.parse(await readFile(packetSource,'utf8'));}
catch(error){
  if(error.code!=='ENOENT')throw error;
  const editorState=JSON.parse(await readFile('scripts/fixtures/native-project.json','utf8'));
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  packet={proposal:structuredClone(fixture),editorState,activeShot:editorState.studio.shots[0],images:{color:png,depth:png},direction:'Fixture extraction check'};
  packetSource='tracked native-project fixture and synthetic 1px PNG';
}
const checks=[];
const skipped=[];
function call(args,{ok=true,cwd=root,tool=script}={}){
  const r=spawnSync(process.execPath,[tool,...args],{cwd,encoding:'utf8'});
  if(ok){assert.equal(r.status,0,r.stderr||r.stdout);return JSON.parse(r.stdout);}
  assert.notEqual(r.status,0,'Expected failure');return r;
}
const info=call(['info']);assert.equal(info.appRoot,root);checks.push('app discovery');
assert.equal(call(['validate',path.resolve('examples/example-scene.json')]).valid,true);
checks.push('live app schema validation');
const normalized=path.join(output,'normalized.json');
call(['validate',path.resolve('examples/example-scene.json'),'--out',normalized]);
call(['validate',path.resolve('examples/example-scene.json'),'--out',normalized],{ok:false});
checks.push('normalized output refuses accidental overwrite');
const broken=structuredClone(fixture);broken.actors[1].id=broken.actors[0].id;
const badFile=path.join(output,'invalid.json');await writeFile(badFile,JSON.stringify(broken));
call(['validate',badFile],{ok:false});checks.push('duplicate ID rejection');
packet.editorState.mannequins[0].position[0]=4.25;
packet.proposal.actors[0].position[0]=-9;
packet.editorState.camera.position=[99,99,99];
const changed=path.join(output,'edited-handoff.json');await writeFile(changed,JSON.stringify(packet));
const inspected=call(['inspect',changed]);
assert.equal(inspected.actors[0].position[0],4.25);
assert.deepEqual(inspected.captureCamera,packet.activeShot.camera);
assert.notDeepEqual(inspected.captureCamera.position,packet.editorState.camera.position);
assert.equal(inspected.visualReview,false);
checks.push('edited native state and capture camera override initial proposal/working view');
const extracted=path.join(output,'extracted');call(['extract',changed,'--out',extracted]);
for(const name of ['color','depth'])assert.deepEqual(await readFile(path.join(extracted,name+'.png')),Buffer.from(packet.images[name].split(',')[1],'base64'));
assert.deepEqual(JSON.parse(await readFile(path.join(extracted,'project.json'),'utf8')),packet.editorState);
call(['extract',changed,'--out',extracted],{ok:false});
checks.push('byte-exact PNG/project extraction and no overwrite');
const invalidImage=structuredClone(packet);invalidImage.images.depth='data:image/png;base64,dGVzdA==';
const invalidPacket=path.join(output,'invalid-image.json');await writeFile(invalidPacket,JSON.stringify(invalidImage));
const invalidDest=path.join(output,'invalid-extraction');call(['extract',invalidPacket,'--out',invalidDest],{ok:false});
let created=false;try{await access(invalidDest);created=true;}catch{}assert.equal(created,false);
checks.push('invalid image rejected before creating output folder');
const isolated=path.join(output,'isolated');
await mkdir(path.join(isolated,'scripts'),{recursive:true});
await copyFile(script,path.join(isolated,'scripts/scene.mjs'));
await copyFile(path.join(skill,'scripts/scene-format.mjs'),path.join(isolated,'scripts/scene-format.mjs'));
const fallback=call(['validate',path.resolve('examples/example-scene.json')],{cwd:path.parse(root).root,tool:path.join(isolated,'scripts/scene.mjs')});
assert.equal(fallback.fallback,true);checks.push('offline bundled schema fallback');
const catalog={source:'https://ai-pose-gallery.pages.dev/',rows:[{id:'test_pose','系統':'全身1人・標準系','ポーズ番号':'T001','分類':'標準','ポーズ名':'腕組み','アングル':'正面','サムネ':'thumbs/test.jpg','原寸':'img/test.png'}]};
const cache=path.join(output,'gallery-cache.json');await writeFile(cache,JSON.stringify(catalog));
const pythonCandidates=process.env.PYTHON?[[process.env.PYTHON,[]]]:[['python',[]],['py',['-3']]];
const python=pythonCandidates.find(([cmd,args])=>spawnSync(cmd,[...args,'--version'],{encoding:'utf8',timeout:5000,windowsHide:true}).status===0);
if(python){
  const gallery=spawnSync(python[0],[...python[1],'-B','-X','utf8',path.join(skill,'scripts/gallery.py'),'--cache',cache,'search','팔짱','--limit','1'],{encoding:'utf8',timeout:15000,windowsHide:true});
  assert.equal(gallery.status,0,gallery.stderr);
  assert.ok(gallery.stdout.includes('test_pose'));
  checks.push('optional gallery helper works from local metadata without retired skill paths/network');
}else skipped.push({check:'optional Python gallery helper',reason:'No Python found; set PYTHON to an executable, or install python/py.'});
const report={passed:true,checks,skipped,packetSource,output,independentLLMRun:false};
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
await writeFile('validation/skill-integration-latest.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
