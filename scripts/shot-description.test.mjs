import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/node_modules/three/build/three.module.js';
import {extractShotFacts,describeShot} from '../app/src/shot-description.js';

// Minimal articulated stand-in facing +Z at yaw 0. Its l_* joints sit on -X,
// which is the figure's anatomical right; sides must come from geometry.
const STAND={body:[0,1,0],torso:[0,1.2,0],neck:[0,1.5,0],head:[0,1.55,0],l_arm:[-.2,1.45,0],l_elbow:[-.22,1.18,0],l_wrist:[-.23,.95,0],r_arm:[.2,1.45,0],r_elbow:[.22,1.18,0],r_wrist:[.23,.95,0],l_leg:[-.1,.95,0],l_knee:[-.1,.5,0],l_ankle:[-.1,.07,0],r_leg:[.1,.95,0],r_knee:[.1,.5,0],r_ankle:[.1,.07,0]};
function actor(name,joints=STAND,{x=0,z=0,yaw=0}={}){
 const root=new THREE.Group();root.name=name;root.position.set(x,0,z);root.rotation.y=yaw;
 for(const [k,p]of Object.entries(joints)){root[k]=new THREE.Object3D();root[k].position.set(...p);root.add(root[k]);}
 const body=new THREE.Mesh(new THREE.BoxGeometry(.4,1.7,.25));body.position.set(0,.85,0);root.add(body);root.torso.raycast=()=>{};
 root.updateMatrixWorld(true);return {id:name,name,root,height:1.75,headUnits:8};
}
function camera(position,target,aspect=16/9,fov=40){const c=new THREE.PerspectiveCamera(fov,aspect,.1,50);c.position.set(...position);c.lookAt(...target);c.updateMatrixWorld(true);return c;}
const describe=(cam,actors,props=[],lighting=null)=>describeShot(extractShotFacts({camera:cam,aspect:cam.aspect,actors,props,lighting}),{shotName:'테스트'});
const lineOf=(d,name)=>d.text.split('\n').find(l=>l.startsWith('- '+name));

test('front full shot: facing, stance and anatomical sides come from geometry',()=>{
 const raised={...STAND,r_elbow:[.25,1.72,0],r_wrist:[.27,1.98,0]};
 const d=describe(camera([0,1.5,5],[0,1,0]),[actor('지훈',raised)]);
 const line=lineOf(d,'지훈');
 assert.equal(d.structured.shotSize,'full');
 assert.match(line,/몸이 카메라 정면을 향함/);assert.match(line,/서 있음/);
 // +X joint is the anatomical left of a +Z-facing figure and appears on screen right.
 assert.match(line,/왼팔: 위로 높이 듦, 팔을 폄, 손은 머리 위\(화면 오른쪽\)/);
 assert.match(line,/오른팔: 내림.*\(화면 왼쪽\)/);
 assert.match(line,/두 발 모두 바닥에 닿음/);
 assert.match(d.text,/수평에 가까운 앵글|약간 내려다보는 앵글/);
});
test('profile and back views report turn direction',()=>{
 const side=describe(camera([5,1.5,0],[0,1,0]),[actor('A')]);assert.match(lineOf(side,'A'),/옆모습/);
 const back=describe(camera([0,1.5,-5],[0,1,0]),[actor('A')]);assert.match(lineOf(back,'A'),/뒷모습/);
 const threeQuarter=describe(camera([0,1.5,5],[0,1,0]),[actor('A',STAND,{yaw:Math.PI/4})]);assert.match(lineOf(threeQuarter,'A'),/3\/4 정면/);
});
test('shot size follows which landmarks are inside the frame',()=>{
 assert.equal(describe(camera([0,1.45,1.2],[0,1.45,0]),[actor('A')]).structured.shotSize,'bust');
 assert.equal(describe(camera([0,1.3,1.6],[0,1.2,0]),[actor('A')]).structured.shotSize,'medium');
 assert.equal(describe(camera([0,2,25],[0,1,0]),[actor('A')]).structured.shotSize,'long');
 const out=describe(camera([0,1.5,5],[0,1,0]),[actor('A'),actor('B',STAND,{x:30})]);
 assert.match(lineOf(out,'B'),/화면 밖/);assert.equal(out.structured.actors[1].inFrame,false);
});
test('sitting, squatting and kneeling are distinguished',()=>{
 const seated={...STAND,body:[0,.5,0],torso:[0,.7,0],neck:[0,1,0],head:[0,1.05,0],l_arm:[-.2,.95,0],l_elbow:[-.22,.68,0],l_wrist:[-.23,.45,.1],r_arm:[.2,.95,0],r_elbow:[.22,.68,0],r_wrist:[.23,.45,.1],l_leg:[-.1,.45,0],l_knee:[-.1,.45,.45],l_ankle:[-.1,.07,.45],r_leg:[.1,.45,0],r_knee:[.1,.45,.45],r_ankle:[.1,.07,.45]};
 const chair=new THREE.Group();chair.name='의자';const seat=new THREE.Mesh(new THREE.BoxGeometry(.5,.42,.5));seat.position.set(0,.21,0);chair.add(seat);chair.updateMatrixWorld(true);
 const cam=camera([0,1.2,4],[0,.6,0]);
 assert.match(lineOf(describe(cam,[actor('A',seated)],[{id:'chair',name:'의자',root:chair}]),'A'),/의자에 앉음/);
 assert.match(lineOf(describe(cam,[actor('A',seated)]),'A'),/앉은 자세\(엉덩이 아래 받침 없음\)/);
 const squat={...seated,l_leg:[-.1,.45,0],l_knee:[-.1,.55,.4],l_ankle:[-.1,.07,.05],r_leg:[.1,.45,0],r_knee:[.1,.55,.4],r_ankle:[.1,.07,.05]};
 assert.match(lineOf(describe(cam,[actor('A',squat)]),'A'),/쪼그려 앉음/);
 const kneel={...STAND,body:[0,.62,0],torso:[0,.82,0],neck:[0,1.12,0],head:[0,1.17,0],l_arm:[-.2,1.07,0],l_elbow:[-.22,.8,0],l_wrist:[-.23,.57,0],r_arm:[.2,1.07,0],r_elbow:[.22,.8,0],r_wrist:[.23,.57,0],l_leg:[-.1,.57,0],l_knee:[-.1,.07,.05],l_ankle:[-.1,.07,-.4],r_leg:[.1,.57,0],r_knee:[.1,.07,.05],r_ankle:[.1,.07,-.4]};
 assert.match(lineOf(describe(cam,[actor('A',kneel)]),'A'),/두 무릎을 꿇음/);
});
test('occlusion, contacts, depth order, props and light are described',()=>{
 const table=new THREE.Group();table.name='탁자';const top=new THREE.Mesh(new THREE.BoxGeometry(1.4,.75,.6));top.position.set(0,.375,1);table.add(top);table.updateMatrixWorld(true);
 const box=new THREE.Group();box.name='상자';const cube=new THREE.Mesh(new THREE.BoxGeometry(.3,.3,.3));cube.position.set(.3,.9,1);box.add(cube);box.updateMatrixWorld(true);
 const reach={...STAND,r_elbow:[.22,1.05,.35],r_wrist:[.25,.78,.8]};
 const d=describe(camera([0,1.3,5],[0,1,0]),[actor('지훈',reach),actor('서연',STAND,{x:1.2,z:-2})],[{id:'table',name:'탁자',root:table},{id:'box',name:'상자',root:box}],{position:[-3,5,3],target:[0,0,0]});
 const line=lineOf(d,'지훈');
 assert.match(line,/탁자에 가려짐: 왼쪽 무릎·오른쪽 무릎·왼발·오른발/);
 assert.match(line,/왼손이 탁자에 닿음/);
 assert.match(d.text,/앞뒤 관계: 카메라에서 가까운 순서로 지훈\(\d+(\.\d)?m\) → 서연/);
 assert.match(d.text,/소품 상자: .*탁자 위에 놓임/);
 assert.match(d.text,/빛: 주광은 화면 왼쪽 위, 카메라 쪽\(앞\)에서 비춤 → 그림자는 화면 오른쪽 인물 뒤쪽으로 떨어짐/);
 assert.ok(d.structured.actors.every(a=>a.inFrame));
});
