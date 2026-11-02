// Offline preparation only. Runtime editor loads the resulting pose-reference JSON.
import * as THREE from 'three';
import {constrainBody,clampJoint,snapshotBodyJoints,boneDistances} from './body-rig.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),Q=()=>new THREE.Quaternion();
const at=(m,key)=>m[key].getWorldPosition(V()),mid=(a,b)=>a.clone().add(b).multiplyScalar(.5);
// Corrections for visually inspected examples; never substitute one template for the entire collection.
const CORRECTIONS={
  'POSE-0301':{body:{bend:0},l_leg:{raise:75,straddle:3},r_leg:{raise:75,straddle:3},l_knee:{bend:150},r_knee:{bend:150},l_ankle:{bend:35},r_ankle:{bend:35},l_arm:{raise:5},r_arm:{raise:5},l_elbow:{bend:10},r_elbow:{bend:10}},
  'POSE-0401':{body:{bend:-90},l_leg:{straddle:18},r_leg:{straddle:18},l_knee:{bend:3},r_knee:{bend:3},l_arm:{straddle:65,raise:0},r_arm:{straddle:65,raise:0},l_elbow:{bend:5},r_elbow:{bend:5}},
  'POSE-0451':{body:{bend:90},l_arm:{raise:155,straddle:15},r_arm:{raise:155,straddle:15},l_elbow:{bend:135},r_elbow:{bend:135},l_leg:{straddle:8},r_leg:{straddle:5},l_knee:{bend:100},r_knee:{bend:8}},
};
function basis(first,second){const x=first.clone().normalize(),y=second.clone().addScaledVector(x,-second.dot(x));if(x.lengthSq()<.5||y.lengthSq()<1e-8)return null;y.normalize();return new THREE.Matrix4().makeBasis(x,y,x.clone().cross(y).normalize());}
function align(m,key,fromA,fromB,toA,toB){
  const a=basis(fromA,fromB),b=basis(toA,toB);if(!a||!b)return false;
  const delta=Q().setFromRotationMatrix(b).multiply(Q().setFromRotationMatrix(a).invert());
  const joint=m[key],world=joint.getWorldQuaternion(Q());joint.quaternion.copy(joint.parent.getWorldQuaternion(Q()).invert().multiply(delta.multiply(world)));clampJoint(m,key);joint.updateWorldMatrix(true,true);return true;
}
export function retargetLandmarks(m,data){
  if(!Array.isArray(data.keypoints)||data.keypoints.length<17||!Array.isArray(data.scores)||data.scores.slice(0,17).some(v=>!Number.isFinite(v)))throw Error('Invalid inferred landmarks');
  const originalLengths=boneDistances(m),originalPosition=m.position.toArray();
  for(const [key,q]of m.userData.bodyBase.rotations)m[key].quaternion.copy(q);
  // XY is in 288x384 crop pixels, Z is root-relative metres (RTMW3D codec).
  // Unknown intrinsics require an approximate XY/metre scale; this is not calibrated photogrammetry.
  const points=data.keypoints.map(p=>V(p[0]*1.75/300,-p[1]*1.75/300,-p[2]));
  const lateral=points[11].clone().sub(points[12]);lateral.y=0;
  if(lateral.lengthSq()<1e-6)lateral.copy(points[5]).sub(points[6]).setY(0);
  const yaw=Q().setFromUnitVectors(lateral.normalize(),V(0,0,-1));points.forEach(p=>p.applyQuaternion(yaw));
  let groundHint=null;const tags=data.tags||[];
  if(tags.some(t=>/바로눕/.test(t)))groundHint={kind:'supine',axis:V(0,0,1),angle:Math.PI/2};
  else if(tags.some(t=>/엎드/.test(t)))groundHint={kind:'prone',axis:V(0,0,1),angle:-Math.PI/2};
  else if(tags.some(t=>/옆으로눕|옆눕/.test(t)))groundHint={kind:'side-lying',axis:V(1,0,0),angle:Math.PI/2};
  const previewDirection=V(0,0,1).applyQuaternion(yaw);
  if(groundHint){
    const up=mid(points[5],points[6]).sub(mid(points[11],points[12])).normalize(),z=points[12].clone().sub(points[11]).normalize(),y=up.clone().addScaledVector(z,-up.dot(z)).normalize(),x=y.clone().cross(z).normalize();
    const estimatedFrame=Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
    const correction=Q().setFromAxisAngle(groundHint.axis,groundHint.angle).multiply(estimatedFrame.invert());points.forEach(p=>p.applyQuaternion(correction));previewDirection.applyQuaternion(correction);
  }
  const hips=mid(points[11],points[12]),shoulders=mid(points[5],points[6]),up=shoulders.clone().sub(hips);
  m.updateMatrixWorld(true);
  align(m,'body',at(m,'neck').sub(mid(at(m,'l_leg'),at(m,'r_leg'))),at(m,'l_leg').sub(at(m,'r_leg')),up,points[11].clone().sub(points[12]));
  align(m,'torso',at(m,'neck').sub(at(m,'torso')),at(m,'l_arm').sub(at(m,'r_arm')),up,points[5].clone().sub(points[6]));
  const errors=[],chains=[['l_arm','l_elbow','l_wrist',5,7,9],['r_arm','r_elbow','r_wrist',6,8,10],['l_leg','l_knee','l_ankle',11,13,15],['r_leg','r_knee','r_ankle',12,14,16]];
  for(const [upper,hinge,end,a,b,c]of chains){
    const u=points[b].clone().sub(points[a]).normalize(),v=points[c].clone().sub(points[b]).normalize();
    if(u.lengthSq()<.5||v.lengthSq()<.5){errors.push({joint:upper,errorDegrees:180});continue;}
    m[hinge].rotation.set(0,0,Math.min(150,THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(u.dot(v),-1,1))))*Math.PI/180);m.updateMatrixWorld(true);
    let currentU=at(m,hinge).sub(at(m,upper)).normalize(),currentV=at(m,end).sub(at(m,hinge)).normalize();
    if(!align(m,upper,currentU,currentV,u,v)){
      const joint=m[upper],world=joint.getWorldQuaternion(Q()),delta=Q().setFromUnitVectors(currentU,u);joint.quaternion.copy(joint.parent.getWorldQuaternion(Q()).invert().multiply(delta.multiply(world)));clampJoint(m,upper);joint.updateWorldMatrix(true,true);
    }
    // Refine after enforcing Euler ranges; never translate or scale a bone.
    const loss=()=>{const x=at(m,hinge).sub(at(m,upper)).normalize(),y=at(m,end).sub(at(m,hinge)).normalize();return 2-x.dot(u)-y.dot(v);};
    let best=loss();
    for(const step of [12,5,2,.75])for(let pass=0;pass<3;pass++)for(const [key,axis]of [[upper,'x'],[upper,'y'],[upper,'z'],[hinge,'z']]){
      const saved=m[key].rotation.toArray();let chosen=saved;
      for(const sign of [-1,1]){m[key].rotation.fromArray(saved);m[key].rotation[axis]+=sign*step*Math.PI/180;clampJoint(m,key);m[key].updateWorldMatrix(true,true);const candidate=loss();if(candidate<best-1e-8){best=candidate;chosen=m[key].rotation.toArray();}}
      m[key].rotation.fromArray(chosen);m[key].updateWorldMatrix(true,true);
    }
    currentU=at(m,hinge).sub(at(m,upper)).normalize();currentV=at(m,end).sub(at(m,hinge)).normalize();
    errors.push({joint:upper,errorDegrees:Math.max(THREE.MathUtils.radToDeg(currentU.angleTo(u)),THREE.MathUtils.radToDeg(currentV.angleTo(v)))});
  }
  const correction=CORRECTIONS[data.id];
  if(correction){for(const [key,q]of m.userData.bodyBase.rotations)m[key].quaternion.copy(q);for(const [key,values]of Object.entries(correction))for(const [prop,value]of Object.entries(values))m[key][prop]=value;}
  constrainBody(m);const lengths=boneDistances(m);if(Object.keys(lengths).some(k=>Math.abs(lengths[k]-originalLengths[k])>1e-6)||JSON.stringify(originalPosition)!==JSON.stringify(m.position.toArray()))throw Error('Retarget changed locked bone lengths or root position');
  const weak=data.scores.slice(5,17).filter(v=>v<.45).length,maxError=Math.max(...errors.map(e=>e.errorDegrees));
  const quality={status:weak>2||maxError>35?'needs-correction':'estimated',meanBodyScore:data.scores.slice(0,17).reduce((s,v)=>s+v,0)/17,weakBodyJoints:weak,maxDirectionErrorDegrees:maxError,errors,visualReview:false,exampleCorrection:!!correction,groundOrientationHint:groundHint?.kind||null,notes:['Monocular depth and hidden joints are estimates.','Finger articulation, gaze and contact are not reconstructed.',...(correction?['Reference-specific correction applied; fitting error refers to original model fit, not the corrected output.']:[])]};
  return {pose:{type:'pose-reference',version:1,name:data.id,rotationUnit:'radians',rotations:Object.fromEntries(Object.entries(snapshotBodyJoints(m)).map(([key,j])=>[key,j.rotation]))},quality,previewDirection:previewDirection.toArray()};
}
