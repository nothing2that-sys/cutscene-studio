import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScene, EXAMPLE_SCENE } from '../app/src/scene-format.js';

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
