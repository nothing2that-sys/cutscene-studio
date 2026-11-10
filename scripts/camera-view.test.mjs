import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/node_modules/three/build/three.module.js';
import {fitViewToAspect} from '../app/src/camera-view.js';

// Where a world point lands, in frame-height units from the frame centre.
function place(camera,point){camera.updateMatrixWorld(true);camera.updateProjectionMatrix();const p=point.clone().project(camera);return [p.x/2*camera.aspect,-p.y/2];}
function cameraWith(aspect,view){const c=new THREE.PerspectiveCamera(40,aspect,.1,100);c.position.set(1,1.6,5);c.lookAt(0,1,0);if(view)c.view={...view};return c;}

test('a fixed-view pan made in one window keeps every point in place for another aspect',()=>{
 // Pan 120 px right, 40 px down and zoom-crop in a 454x427 window (aspect 1.06).
 const k=.86,window={enabled:true,fullWidth:454,fullHeight:427,offsetX:-120+30,offsetY:-40+20,width:454*k,height:427*k};
 const points=[new THREE.Vector3(0,1.6,0),new THREE.Vector3(.8,.2,-1),new THREE.Vector3(-1.2,1,.5)];
 const seen=points.map(p=>place(cameraWith(454/427,window),p));
 for(const aspect of [16/9,9/16,1,2.35]){
  const naive=points.map(p=>place(cameraWith(aspect,window),p)),fitted=points.map(p=>place(cameraWith(aspect,fitViewToAspect(window,aspect)),p));
  const err=a=>Math.max(...a.flatMap((q,i)=>[Math.abs(q[0]-seen[i][0]),Math.abs(q[1]-seen[i][1])]));
  assert.ok(err(fitted)<1e-9,`aspect ${aspect}: fitted error ${err(fitted)}`);
  if(Math.abs(aspect-454/427)>.1)assert.ok(err(naive)>.01,`aspect ${aspect}: the unfitted view should be off (${err(naive)})`);
 }
});
test('no view or same aspect is left alone',()=>{
 assert.equal(fitViewToAspect(null,1.5),null);
 const v={enabled:true,fullWidth:300,fullHeight:200,offsetX:-10,offsetY:5,width:300,height:200};
 assert.equal(fitViewToAspect(v,1.5),v);
 assert.equal(fitViewToAspect({...v,enabled:false},2).fullWidth,300);
});
