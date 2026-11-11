import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/node_modules/three/build/three.module.js';
import {objectNotes,describeObjects,inspectObjectOverlaps} from '../app/src/scene-object-info.js';
import {validateScene,EXAMPLE_SCENE} from '../app/src/scene-format.js';
const box=(w,h,d,x=0,y=0,z=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d));m.position.set(x,y,z);return m;};
test('actor/prop descriptions round-trip; invalid text values are rejected',()=>{
 const scene=structuredClone(EXAMPLE_SCENE);for(const item of [...scene.actors,...scene.props])Object.assign(item,{role:'역할',intent:'배치 의도',description:'무광 철제 · 검정'});
 const normalized=validateScene(scene);assert.equal(normalized.props[0].description,'무광 철제 · 검정');assert.deepEqual(validateScene(normalized),normalized);scene.props[0].description={bad:true};assert.throws(()=>validateScene(scene));scene.props[0].description='x'.repeat(12001);assert.throws(()=>validateScene(scene));
});
test('edited notes override proposal and empty edits remain empty',()=>{
 const m=new THREE.Group();m.torso={};m.name='수정한 이름';m.userData.studioId='jihoon';m.add(box(1,1,1));m.userData.sceneNotes={intent:'',description:'사용자가 정한 붉은 코트'};
 assert.equal(objectNotes(m,EXAMPLE_SCENE).intent,'');const details=describeObjects([m],EXAMPLE_SCENE);assert.equal(details[0].description,'사용자가 정한 붉은 코트');assert.equal(details[0].name,'수정한 이름');assert.equal(details[0].editorStateIndex,0);assert.equal(EXAMPLE_SCENE.actors[0].name,'지훈');
 const copies=describeObjects([m,m],EXAMPLE_SCENE);assert.notEqual(copies[0].id,copies[1].id);assert.equal(copies[1].sourceId,'jihoon');assert.equal(copies[1].editorStateIndex,1);
});
test('spatial overlap ignores visual occlusion and simple support; checks furniture parts',()=>{
 const table=new THREE.Group();table.add(box(2,.1,1,0,1,0),box(.1,.9,.1,-.9,.5,-.4),box(.1,.9,.1,.9,.5,-.4));table.name='탁자';
 const underneath=box(.2,.3,.2,0,.3,0),onTop=box(.2,.2,.2,0,1.15,0),behind=box(.3,1,.3,0,.5,-3);
 assert.equal(inspectObjectOverlaps([table,underneath,onTop,behind]).issues.length,0);
 underneath.position.y=1;assert.ok(inspectObjectOverlaps([table,underneath],underneath).issues.length>0);underneath.position.y=.3;underneath.position.x=.9;underneath.position.z=-.4;assert.equal(inspectObjectOverlaps([table,underneath]).issues.length,1);
});
