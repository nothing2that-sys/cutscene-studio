import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {readReferencePoses} from '../app/src/pose-format.js';
import {EXAMPLE_SCENE} from '../app/src/scene-format.js';
import {STARTER_POSES} from '../app/src/starter-poses.js';
test('converted wrappers validate their inner rotations and reject invalid payloads',()=>{
  const pose={type:'pose-reference',version:1,rotationUnit:'radians',rotations:{l_knee:[0,0,1,'XYZ']}};
  assert.equal(readReferencePoses(JSON.stringify({type:'converted-pose',version:1,pose}))[0].kind,'rotations');
  for(const invalid of [{type:'converted-pose',version:2,pose},{type:'converted-pose',version:1,pose:{}},{type:'converted-pose',version:1,pose:{...pose,rotations:{parent:[0,0,0]}}}])assert.throws(()=>readReferencePoses(JSON.stringify(invalid)));
});
test('starter semantic and rendered rotation references are readable',()=>{
  for(const record of STARTER_POSES)assert.equal(readReferencePoses(JSON.stringify(record.pose)).length,1);
  for(const file of readdirSync(new URL('../examples/poses/',import.meta.url)))assert.equal(readReferencePoses(readFileSync(new URL('../examples/poses/'+file,import.meta.url),'utf8'))[0].kind,'rotations');
});
test('scene and saved project offer explicit per-person candidates',()=>{
  assert.equal(readReferencePoses(JSON.stringify(EXAMPLE_SCENE)).length,2);
  const data=readFileSync(new URL('./fixtures/native-project.json',import.meta.url),'utf8');assert.equal(readReferencePoses(data).length,2);
});
test('invalid pose files fail without silently selecting a default',()=>{
  for(const value of [null,{},[],42,{pose:'teleporting'},{pose:'standing',joints:{l_knee:{bend:999}}},{type:'pose-reference',version:1,rotationUnit:'degrees',rotations:{head:[0,0,0]}},{type:'pose-reference',version:1,rotationUnit:'radians',rotations:{head:[0,'no',0]}}])assert.throws(()=>readReferencePoses(JSON.stringify(value)));
  assert.throws(()=>readReferencePoses('{'));
  assert.throws(()=>readReferencePoses(JSON.stringify({type:'pose-reference',version:1,rotationUnit:'radians',rotations:{parent:[0,0,0]}})));
});
