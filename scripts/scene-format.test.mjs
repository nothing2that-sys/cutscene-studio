import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScene, EXAMPLE_SCENE, POSES } from '../app/src/scene-format.js';
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

test('body type: v1 types accepted, conflicts with headUnits/chest rejected, female omitted',()=>{
 const actor=EXAMPLE_SCENE.actors[0];
 for(const t of ['male','neutral','child','male-heavy'])assert.equal(validateScene({...EXAMPLE_SCENE,actors:[{...actor,bodyType:t,headUnits:undefined,chest:undefined}]}).actors[0].bodyType,t);
 assert.equal(validateScene({...EXAMPLE_SCENE,actors:[{...actor,bodyType:'female'}]}).actors[0].bodyType,undefined);
 assert.throws(()=>validateScene({...EXAMPLE_SCENE,actors:[{...actor,bodyType:'giant'}]}),/체형 종류/);
 assert.throws(()=>validateScene({...EXAMPLE_SCENE,actors:[{...actor,bodyType:'child',headUnits:5}]}),/headUnits/);
});
test('low pose presets are accepted for every body type',()=>{
  for(const pose of ['kneeling','half-kneeling','squatting','crouching','lying'])for(const bodyType of ['female','male','child']){
    const scene=validateScene({version:1,units:'meters',actors:[{id:'a',position:[0,0,0],pose,bodyType}],camera:{position:[0,1,4],target:[0,1,0]}});
    assert.equal(scene.actors[0].pose,pose);
  }
  assert.ok(POSES.lying.body,'lying turns the whole figure');
});
test('gaze and expression: targets must exist, not be the person, and expression stays short',()=>{
  const base={version:1,units:'meters',actors:[{id:'a',position:[0,0,0],lookAt:'b',expression:'놀란 얼굴'},{id:'b',position:[1,0,0],lookAt:[0,1.5,2]}],props:[{id:'cup',type:'box',position:[0,0,1],size:[.1,.1,.1]}],camera:{position:[0,1,4],target:[0,1,0]}};
  const v=validateScene(base);assert.equal(v.actors[0].lookAt,'b');assert.equal(v.actors[0].expression,'놀란 얼굴');assert.deepEqual(v.actors[1].lookAt,[0,1.5,2]);
  assert.equal(validateScene({...base,actors:[{...base.actors[0],lookAt:'cup'},base.actors[1]]}).actors[0].lookAt,'cup');
  const code=a=>{try{validateScene({...base,actors:[{...base.actors[0],...a},base.actors[1]]});return null;}catch(e){return e.issues.map(i=>i.code).join(',');}};
  assert.equal(code({lookAt:'nobody'}),'UNKNOWN_LOOK_TARGET');assert.equal(code({lookAt:'a'}),'SELF_LOOK_TARGET');assert.equal(code({expression:'x'.repeat(201)}),'STRING_REQUIRED');
});
test('the skill copy of the validator is the app validator (R8)',()=>{
  const norm=f=>readFileSync(new URL(f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
  assert.equal(norm('../skills/cutscene-studio/scripts/scene-format.mjs'),norm('../app/src/scene-format.js'),'copy app/src/scene-format.js to skills/cutscene-studio/scripts/scene-format.mjs');
});
test('a child body defaults to a child height and warns when tall (R7)',()=>{
  const scene=a=>({version:1,units:'meters',actors:[{id:'c',position:[0,0,0],bodyType:'child',...a}],camera:{position:[0,1,4],target:[0,1,0]}});
  assert.equal(validateScene(scene({})).actors[0].height,1.2);
  assert.equal(validateScene({...scene({}),actors:[{id:'m',position:[0,0,0],bodyType:'male'}]}).actors[0].height,1.75);
  const r=analyzeInputText(JSON.stringify(scene({height:1.75})),'t',true);assert.ok(r.warnings.some(w=>w.code==='BODY_TYPE_HEIGHT'));
});
test('spot-only light fields on other lights are reported, not silently dropped (R10)',()=>{
  const r=analyzeInputText(JSON.stringify({version:1,units:'meters',actors:[],camera:{position:[0,1,4],target:[0,1,0]},lighting:{type:'lamp',position:[1,2,1],target:[0,1,0],coneDeg:40}}),'t',true);
  assert.ok(r.warnings.some(w=>w.code==='IGNORED_FIELD'));
});
