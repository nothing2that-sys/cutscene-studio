import * as THREE from 'three';
import { Male } from 'mannequin-js/src/mannequin.js';
import { JOINTS } from './scene-format.js';

const RAD=THREE.MathUtils.DEG2RAD;
const AXES={torso:{bend:['z',-1],tilt:['x',-1],turn:['y',1]},neck:{nod:['z',-1],tilt:['x',-1],turn:['y',1]},head:{nod:['z',-1],tilt:['x',-1],turn:['y',1]}};
const bodyLimits={bend:[-90,90],tilt:[-90,90],turn:[-180,180]};
function bindings(m,key) {
  if(key==='body')return {bend:['z',-1],tilt:['x',-1],turn:['y',1]};
  if(AXES[key])return AXES[key];
  const side=m[key].leftOrRight||1;
  if(/_(arm|leg)$/.test(key))return {raise:['z',1],straddle:['x',-side],turn:['y',-side]};
  if(/_(elbow|knee)$/.test(key))return {bend:['z',1]};
  if(/_wrist$/.test(key))return {bend:['x',-side],turn:['y',side],straddle:['z',side]};
  return {bend:['z',-1],turn:['y',side]};
}
const named=m=>Object.entries(m).filter(([key,value])=>value?.isObject3D&&value!==m.parent);
function rigError(message){throw new Error(message);}
function profileValid(profile) {
  if(!profile||typeof profile.height!=='number'||!Number.isFinite(profile.height)||profile.height<0.5||profile.height>3)rigError('키는 50~300cm 범위여야 합니다.');
  if(typeof profile.headUnits!=='number'||!Number.isFinite(profile.headUnits)||profile.headUnits<3||profile.headUnits>12)rigError('등신 비율은 3~12 범위여야 합니다.');
}
function rigRotations(m){return named(m).map(([key,j])=>[key,j.quaternion.clone()]);}
function restoreRotations(m,rotations){for(const [key,q]of rotations)m[key].quaternion.copy(q);}
export function captureBoneLayout(m) {
  return {rootScale:m.scale.toArray(),joints:Object.fromEntries(named(m).map(([key,j])=>[key,{position:j.position.toArray(),scale:j.scale.toArray()}])),headImage:{position:m.head.image.position.toArray(),scale:m.head.image.scale.toArray()}};
}
export function lockBoneLayout(m) {m.userData.boneLayout=captureBoneLayout(m);}
export function enforceBoneLengths(m) {
  const lock=m.userData.boneLayout;if(!lock)return;
  m.scale.fromArray(lock.rootScale);
  for(const [key,values]of Object.entries(lock.joints))if(m[key]?.isObject3D){m[key].position.fromArray(values.position);m[key].scale.fromArray(values.scale);}
  m.head.image.position.fromArray(lock.headImage.position);m.head.image.scale.fromArray(lock.headImage.scale);
}
export function clampJoint(m,key) {
  const joint=m[key],limits=key==='body'?bodyLimits:JOINTS[key];
  if(!joint||!limits)return;
  joint.rotation.reorder('XYZ');
  const map=bindings(m,key);
  for(const [name,range]of Object.entries(limits)){
    const binding=map[name];if(!binding)continue;
    const [axis,sign]=binding;
    const v=joint.rotation[axis]/RAD*sign;
    joint.rotation[axis]=THREE.MathUtils.clamp(Number.isFinite(v)?v:0,...range)/sign*RAD;
  }
  if(/_(knee|elbow)$/.test(key)){joint.rotation.x=0;joint.rotation.y=0;}
  if(/_ankle$/.test(key))joint.rotation.x=THREE.MathUtils.clamp(joint.rotation.x,-25*RAD,25*RAD);
}
export function constrainBody(m) {
  enforceBoneLengths(m);
  for(const key of ['body',...Object.keys(JOINTS)])clampJoint(m,key);
  m.updateMatrixWorld(true);
}
export function configureBody(m,profile,keepFeet=true) {
  profileValid(profile);
  const oldMin=keepFeet?new THREE.Box3().setFromObject(m).min.y:null;
  const rotations=rigRotations(m),position=m.position.clone(),orientation=m.quaternion.clone();
  const base=m.userData.bodyBase;
  m.position.set(0,0,0);m.quaternion.identity();m.scale.fromArray(base.scale);
  restoreRotations(m,base.rotations);
  // Measure in an upright neutral pose; crouching never changes configured stature.
  for(const key of ['torso','neck','head'])m[key].rotation.set(0,0,0,'XYZ');
  m.head.image.position.fromArray(base.headPosition);m.head.image.scale.fromArray(base.headScale);
  m.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(m),head=new THREE.Box3().setFromObject(m.head.image);
  const whole=box.max.y-box.min.y,headHeight=head.max.y-head.min.y;
  const factor=(whole-headHeight)/(headHeight*(profile.headUnits-1));
  m.head.image.scale.fromArray(base.headScale).multiplyScalar(factor);
  // Anchor the bottom of the head, so enlargement does not detach it from the neck.
  const geometry=m.head.image.geometry;geometry.computeBoundingBox();
  m.head.image.position.y=base.headPosition[1]+geometry.boundingBox.min.y*base.headScale[1]*(1-factor);
  m.updateMatrixWorld(true);
  const adjusted=new THREE.Box3().setFromObject(m);
  m.scale.multiplyScalar(profile.height/(adjusted.max.y-adjusted.min.y));
  m.updateMatrixWorld(true);
  const actual=new THREE.Box3().setFromObject(m),actualHead=new THREE.Box3().setFromObject(m.head.image);
  m.userData.bodyMetrics={height:actual.max.y-actual.min.y,headHeight:actualHead.max.y-actualHead.min.y};
  m.userData.bodyMetrics.headUnits=m.userData.bodyMetrics.height/m.userData.bodyMetrics.headHeight;
  m.userData.bodyProfile={height:profile.height,headUnits:profile.headUnits};
  restoreRotations(m,rotations);m.position.copy(position);m.quaternion.copy(orientation);m.updateMatrixWorld(true);
  if(keepFeet){m.position.y+=oldMin-new THREE.Box3().setFromObject(m).min.y;m.updateMatrixWorld(true);}
  lockBoneLayout(m);constrainBody(m);
}
export function initializeBody(m,profile) {
  m.userData.bodyBase={scale:m.scale.toArray(),headPosition:m.head.image.position.toArray(),headScale:m.head.image.scale.toArray(),rotations:rigRotations(m)};
  for(const key of ['body',...Object.keys(JOINTS)]){
    const joint=m[key];
    for(const [name,[axis,sign]]of Object.entries(bindings(m,key))){
      // Independent local DOFs: a head slider does not silently change the neck.
      Object.defineProperty(joint,name,{configurable:true,get(){this.rotation.reorder('XYZ');return this.rotation[axis]/RAD*sign;},set(v){this.rotation.reorder('XYZ');this.rotation[axis]=v/sign*RAD;}});
    }
  }
  if(profile)configureBody(m,profile,false);else lockBoneLayout(m);
}
export function createCharacter(profile={height:1.75,headUnits:8}) {
  const m=new Male();initializeBody(m,profile);return m;
}
export function boneDistances(m) {
  m.updateMatrixWorld(true);
  const result={};
  for(const [a,b]of [['l_arm','l_elbow'],['l_elbow','l_wrist'],['r_arm','r_elbow'],['r_elbow','r_wrist'],['l_leg','l_knee'],['l_knee','l_ankle'],['r_leg','r_knee'],['r_knee','r_ankle'],['torso','neck'],['neck','head']])result[a+'>'+b]=m[a].getWorldPosition(new THREE.Vector3()).distanceTo(m[b].getWorldPosition(new THREE.Vector3()));
  return result;
}
export function manipulationChain(part) {
  const map={torso:['body','torso'],neck:['torso','neck'],head:['torso','neck','head']};
  if(map[part])return map[part];
  const side=part.slice(0,2);
  if(/_(arm|elbow|wrist)$/.test(part))return part.endsWith('_arm')?[side+'arm',side+'elbow']:[side+'arm',side+'elbow',side+'wrist'];
  if(/_(leg|knee|ankle)$/.test(part))return part.endsWith('_leg')?[side+'leg',side+'knee']:[side+'leg',side+'knee',side+'ankle'];
  return null;
}
export function solveConstrainedIK(m,keys,requested) {
  enforceBoneLengths(m);
  const chain=keys.map(key=>m[key]);if(chain.some(x=>!x)||chain.length<2)return {reached:false,error:Infinity};
  const end=chain.at(-1),base=chain[0].getWorldPosition(new THREE.Vector3()),target=requested.clone();
  const initial=boneDistances(m),positions=chain.map(j=>j.getWorldPosition(new THREE.Vector3()));
  let reach=0;for(let i=1;i<positions.length;i++)reach+=positions[i].distanceTo(positions[i-1]);
  const delta=target.clone().sub(base);
  if(delta.length()>reach)target.copy(base).add(delta.setLength(Math.max(0,reach-1e-6)));
  let best=rigRotations(m),bestError=end.getWorldPosition(new THREE.Vector3()).distanceToSquared(target);
  const jp=new THREE.Vector3(),ep=new THREE.Vector3(),toE=new THREE.Vector3(),toT=new THREE.Vector3(),q=new THREE.Quaternion(),world=new THREE.Quaternion(),parent=new THREE.Quaternion();
  for(let iteration=0;iteration<48;iteration++){
    for(let i=chain.length-2;i>=0;i--){
      const joint=chain[i],key=keys[i];joint.updateWorldMatrix(true,true);
      joint.getWorldPosition(jp);end.getWorldPosition(ep);toE.subVectors(ep,jp);toT.subVectors(target,jp);
      if(toE.lengthSq()<1e-14||toT.lengthSq()<1e-14)continue;
      q.setFromUnitVectors(toE.normalize(),toT.normalize());joint.getWorldQuaternion(world);world.premultiply(q);
      if(joint.parent){joint.parent.getWorldQuaternion(parent);world.premultiply(parent.invert());}
      joint.quaternion.copy(world);clampJoint(m,key);enforceBoneLengths(m);m.updateMatrixWorld(true);
      const error=end.getWorldPosition(ep).distanceToSquared(target);
      if(error<bestError){bestError=error;best=rigRotations(m);}
    }
    if(bestError<1e-6)break;
  }
  restoreRotations(m,best);constrainBody(m);
  const result={reached:false,error:end.getWorldPosition(ep).distanceTo(requested),reach,targetClamped:target.distanceTo(requested)>1e-6};
  result.reached=result.error<0.015;m.userData.lastIK=result;
  // Every manipulation preserves segment distances, even when the target is unreachable.
  const after=boneDistances(m);
  for(const key of Object.keys(initial))if(Math.abs(initial[key]-after[key])>1e-6)rigError('관절 조작 중 뼈 길이 보존 검사에 실패했습니다: '+key);
  return result;
}

export function snapshotBodyJoints(m) {
  return Object.fromEntries(named(m).map(([key,j])=>[key,{position:j.position.toArray(),rotation:j.rotation.toArray(),scale:j.scale.toArray()}]));
}
