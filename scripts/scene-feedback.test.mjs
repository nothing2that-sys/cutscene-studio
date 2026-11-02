import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeScene,EXAMPLE_SCENE } from '../app/src/scene-format.js';
import { analyzeInputText,repairRequest,publicReport } from '../app/src/scene-feedback.js';

test('all field errors collected without normalizing away mistakes',()=>{
  const raw=structuredClone(EXAMPLE_SCENE);
  raw.units='cm';raw.room.walls='false';raw.actors[0].joints.r_elbow={bend:999};raw.props[0].dimensions=[1,1,1];raw.actors[1].id=raw.actors[0].id;
  const before=JSON.stringify(raw),report=analyzeScene(raw);
  assert.equal(report.valid,false);assert.equal(report.scene,null);
  for(const path of ['units','room.walls','actors[0].joints.r_elbow.bend','props[0].dimensions','actors[1].id'])assert.ok(report.errors.some(x=>x.path===path),path);
  assert.equal(JSON.stringify(raw),before);
});
test('syntax errors and fence errors preserve exact original for repair',()=>{
  for(const text of ['{\n "version": 1,\n "units": meters\n}',String.fromCharCode(96).repeat(3)+'json\n{}\n'+String.fromCharCode(96).repeat(3)]){
    const r=analyzeInputText(text);assert.equal(r.errors[0].code,'JSON_SYNTAX');assert.equal(r.originalJSON,text);
    assert.equal(JSON.parse(repairRequest(r).slice(repairRequest(r).indexOf('{\n'))).originalJSON,text);
  }
});
test('spatial warnings permit scene and are distinct from errors',()=>{
  const s=structuredClone(EXAMPLE_SCENE);s.actors[0].position=[12,-0.2,0];
  const r=analyzeScene(s);assert.equal(r.valid,true);assert.ok(r.warnings.some(x=>x.code==='OUTSIDE_ROOM'));assert.ok(r.warnings.some(x=>x.code==='BELOW_FLOOR'));
  assert.equal(r.errors.length,0);assert.ok(r.scene);
});
test('wrong shapes fail as field reports rather than TypeError',()=>{
  for(const value of [null,[],42,{...EXAMPLE_SCENE,actors:[null]},{...EXAMPLE_SCENE,lighting:[]},{...EXAMPLE_SCENE,actors:[{...EXAMPLE_SCENE.actors[0],joints:[]}]}]){
    assert.equal(analyzeInputText(JSON.stringify(value)).valid,false);
  }
});
test('malformed native project rejected before scene mutation and has source',()=>{
  const original=JSON.parse(readFileSync(new URL('./fixtures/native-project.json',import.meta.url),'utf8'));
  assert.equal(analyzeInputText(JSON.stringify(original),'project.json').valid,true);
  const bad=structuredClone(original);bad.mannequins[0].position=[1,'two',3];bad.studio.activeShot=99;
  const r=analyzeInputText(JSON.stringify(bad),'broken-project.json');
  assert.equal(r.valid,false);assert.equal(r.inputKind,'project');
  assert.ok(r.errors.some(x=>x.path==='mannequins[0].position'));assert.ok(r.errors.some(x=>x.path==='studio.activeShot'));
  assert.equal(publicReport(r).value,undefined);assert.equal(r.source,'broken-project.json');
});

test('height and head units are independent validated actor settings',()=>{
  for(const headUnits of [5,8,9.5]){
    const scene=structuredClone(EXAMPLE_SCENE);scene.actors[0].height=1.8;scene.actors[0].headUnits=headUnits;
    const r=analyzeScene(scene);assert.equal(r.valid,true);assert.equal(r.scene.actors[0].height,1.8);assert.equal(r.scene.actors[0].headUnits,headUnits);
  }
  const scene=structuredClone(EXAMPLE_SCENE);scene.actors[0].headUnits=99;
  assert.ok(analyzeScene(scene).errors.some(x=>x.path==='actors[0].headUnits'));
});
