import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/node_modules/three/build/three.module.js';
import {turbo,ringStep,rangeColor,planFrame} from '../app/src/depth-views.js';
import {depthRange,depthLevel,DEPTH_NEAR_VALUE,DEPTH_FAR_VALUE} from '../app/src/llm-package.js';

test('inverse-distance grey keeps steps near and far instead of clamping',()=>{
 // 1000 surface pixels from 2 m to 12 m, plus a huge far background prop at 40 m (0.5%).
 const n=1000,label=new Uint8Array(n+5).fill(1),distance=new Float32Array(n+5);
 for(let i=0;i<n;i++)distance[i]=2+10*i/n;for(let i=n;i<n+5;i++)distance[i]=40;
 const range=depthRange({label,distance});
 assert.ok(range.nearM<=2.15&&range.farM<=12.2,'percentiles ignore the 0.5% background prop: '+JSON.stringify(range));
 assert.equal(depthLevel(range.nearM,range),DEPTH_NEAR_VALUE);assert.equal(depthLevel(range.farM,range),DEPTH_FAR_VALUE);
 // Near half a metre gets more grey levels than half a metre far away.
 const nearSteps=depthLevel(2.2,range)-depthLevel(2.7,range),farSteps=depthLevel(11,range)-depthLevel(11.5,range);
 assert.ok(nearSteps>farSteps*5,`${nearSteps} vs ${farSteps}`);
 assert.ok(farSteps>=1,'far surfaces still change');
});
test('range colours run red (near) to blue (far); ring spacing stays readable',()=>{
 const near=rangeColor(2,2,10),far=rangeColor(10,2,10);
 assert.ok(near[0]>near[2],'near is red: '+near);assert.ok(far[2]>far[0],'far is blue: '+far);
 assert.deepEqual(turbo(-1),turbo(0));
 for(const [a,b]of [[2,5],[1,15],[3,40],[0,120]]){const s=ringStep(a,b);const n=(b-a)/s;assert.ok(n<=12&&(n>=2||s===.25),`${a}-${b}: ${s}`);}
});
test('plan frame: up is the camera view, screen-left stays left',()=>{
 const cam=new THREE.PerspectiveCamera();cam.position.set(0,1.6,5);cam.lookAt(0,1,0);
 const F=planFrame(cam);
 const [lx,ly]=F.map([-2,0,0]),[rx]=F.map([2,0,0]),[,fy]=F.map([0,0,-3]);
 assert.ok(lx<0&&rx>0,'world -X is camera left');assert.ok(Math.abs(ly-5)<1e-6&&Math.abs(fy-8)<1e-6,'forward distance along the view');
 const back=new THREE.PerspectiveCamera();back.position.set(0,1.6,-5);back.lookAt(0,1,0);
 assert.ok(planFrame(back).map([-2,0,0])[0]>0,'from behind, world -X is on the right');
});
