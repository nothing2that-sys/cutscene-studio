import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScene, EXAMPLE_SCENE } from '../app/src/scene-format.js';
import { analyzeInputText } from '../app/src/scene-feedback.js';
import {readFileSync} from 'node:fs';

test('optional chest profile defaults and invalid scene/native values',()=>{
  const scene=structuredClone(EXAMPLE_SCENE);scene.actors[1].chest={height:0.7};
  assert.deepEqual(validateScene(scene).actors[1].chest,{height:0.7,spacing:0.46,projection:1});
  scene.actors[1].chest={height:undefined};assert.equal(validateScene(scene).actors[1].chest.height,0.65);
  for(const invalid of [null,[],{height:0.1},{spacing:1},{projection:'1'},{projection:NaN},{offsetY:2}]){
    scene.actors[1].chest=invalid;assert.throws(()=>validateScene(scene));
  }
  const native=JSON.parse(readFileSync(new URL('./fixtures/native-project.json',import.meta.url),'utf8'));
  native.mannequins[0].bodyProfile.chest={height:99};
  const report=analyzeInputText(JSON.stringify(native));assert.equal(report.valid,false);
  assert.ok(report.errors.some(e=>e.path==='mannequins[0].bodyProfile.chest.height'));
});

test('example scene normalizes and round trips without changing the input',()=>{
  const before=JSON.stringify(EXAMPLE_SCENE);
  const result=validateScene(EXAMPLE_SCENE);
  assert.equal(result.actors.length,2);assert.equal(result.props.length,2);
  assert.deepEqual(validateScene(JSON.parse(JSON.stringify(result))),result);
  assert.equal(JSON.stringify(EXAMPLE_SCENE),before);
});
test('bad LLM proposals are rejected before reaching the editor',()=>{
  const cases=[
    s=>s.actors[0].position=[0,NaN,0],
    s=>s.actors[0].joints={r_elbow:{bend:999}},
    s=>s.actors[0].pose='teleporting',
    s=>s.actors[1].id=s.actors[0].id,
    s=>s.camera.target=s.camera.position,
    s=>s.props[0].size=[-1,2,3],
    s=>s.lighting.intensity='bright',
    s=>s.units='cm',
    s=>s.shots[1].id=s.shots[0].id,
    s=>s.actors[0].joints=JSON.parse('{"__proto__":{"bend":10}}'),
  ];
  for(const change of cases){const s=structuredClone(EXAMPLE_SCENE);change(s);assert.throws(()=>validateScene(s));}
});

test('lighting type: sun default, lamp and spot accepted, unknown rejected',()=>{
 assert.equal(validateScene({...EXAMPLE_SCENE}).lighting.type,'sun');
 const lamp=validateScene({...EXAMPLE_SCENE,lighting:{...EXAMPLE_SCENE.lighting,type:'lamp'}}).lighting;assert.equal(lamp.type,'lamp');assert.equal(lamp.coneDeg,undefined);
 const spot=validateScene({...EXAMPLE_SCENE,lighting:{...EXAMPLE_SCENE.lighting,type:'spot',coneDeg:40}}).lighting;assert.equal(spot.coneDeg,40);assert.equal(spot.softness,.3);
 assert.throws(()=>validateScene({...EXAMPLE_SCENE,lighting:{...EXAMPLE_SCENE.lighting,type:'neon'}}),/조명 종류/);
 assert.throws(()=>validateScene({...EXAMPLE_SCENE,lighting:{...EXAMPLE_SCENE.lighting,type:'lamp',position:[0,1,0],target:[0,1,0]}}),/목표점/);
});
