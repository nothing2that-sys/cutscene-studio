import * as THREE from 'three';
import { Male } from 'mannequin-js/src/mannequin.js';
import { JOINTS, chestIssues, normalizeChest } from './scene-format.js';
import {setBodySurface,surfaceColor,invalidateBodySurface,suspendBodySurface,resumeBodySurface,bodyPartBounds} from './body-surface.js';
import {getBodyV1,installBodyV1} from './body-v1-adapter.js';

const chestGuides=new WeakMap();
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
  if(profile.chest!==undefined){const issues=chestIssues(profile.chest);if(issues.length)rigError(issues.map(i=>i.path+': '+i.message).join('\n'));}
}
function positionChestGuide(m) {
  const group=chestGuides.get(m),profile=m.userData.bodyProfile?.chest;
  if(!group||!profile)return;
  group.position.set(0,0,0);group.quaternion.identity();group.scale.set(1,1,1);
  group.children.forEach((mesh,i)=>{
    mesh.position.set(2.8,17*profile.height,(i===0?-1:1)*10*profile.spacing/2);
    mesh.rotation.set(0,0,0);mesh.scale.set(1.55*profile.projection,2.05,2);
  });
}
function configureChestGuide(m,profile) {
  let group=chestGuides.get(m);
  if(!profile){
    if(group){group.removeFromParent();group.children.forEach(mesh=>{mesh.geometry.dispose();mesh.material.dispose();});chestGuides.delete(m);}
    return;
  }
  if(!group){
    group=new THREE.Group();group.name='Chest volume reference';m.torso.imageWrapper.add(group);chestGuides.set(m,group);
    for(const side of ['left','right']){
      // Neutral mannequin volumes; these are shape anchors, not nipple markers.
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshStandardMaterial({color:surfaceColor(),roughness:0.85}));
      mesh.name='Chest '+side;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.posePartKey='Torso';group.add(mesh);
    }
  }
  m.torso.imageWrapper.add(group);
  positionChestGuide(m);
}
export function chestLandmarks(m) {
  if(!chestGuides.get(m))return null;
  m.updateMatrixWorld(true);
  if(m.userData.bodySurface==='human'&&m.userData.surfaceChestAnchors){const [left,right]=m.userData.surfaceChestAnchors.map(p=>m.torso.imageWrapper.localToWorld(new THREE.Vector3(...p)).toArray());return {kind:'chest-volume-centers',space:'world-meters',left,right};}
  return {kind:'chest-volume-centers',space:'world-meters',left:chestGuides.get(m).children[0].getWorldPosition(new THREE.Vector3()).toArray(),right:chestGuides.get(m).children[1].getWorldPosition(new THREE.Vector3()).toArray()};
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
  positionChestGuide(m);
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
  m.updateMatrixWorld(true);invalidateBodySurface(m);
}
export function configureBody(m,profile,keepFeet=true) {
  profileValid(profile);
  if(getBodyV1(m)){const current=m.userData.bodyProfile;if(profile.headUnits!==current.headUnits||JSON.stringify(profile.chest||null)!==JSON.stringify(current.chest||null))rigError('공통 인체는 현재 기본 등신·가슴 형태를 유지합니다. 다른 체형은 기존 인체 장면으로 불러와 사용하세요.');const sole=()=>{m.updateMatrixWorld(true);return Math.min(bodyPartBounds(m,'l_ankle').min.y,bodyPartBounds(m,'r_ankle').min.y);},before=keepFeet?sole():null;getBodyV1(m).configure(profile);lockBoneLayout(m);constrainBody(m);if(keepFeet){m.position.y+=before-sole();m.updateMatrixWorld(true);}return;}
  const oldMin=keepFeet?new THREE.Box3().setFromObject(m).min.y:null;
  const previousSurface=suspendBodySurface(m);
  // Box3 also measures invisible objects: detach references during neutral sizing.
  chestGuides.get(m)?.removeFromParent();
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
  m.userData.bodyProfile={height:profile.height,headUnits:profile.headUnits,...(profile.chest?{chest:normalizeChest(profile.chest)}:{})};
  restoreRotations(m,rotations);m.position.copy(position);m.quaternion.copy(orientation);m.updateMatrixWorld(true);
  configureChestGuide(m,m.userData.bodyProfile.chest);m.updateMatrixWorld(true);
  if(previousSurface!==null)resumeBodySurface(m,previousSurface);
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
export function createCharacter(profile={height:1.75,headUnits:8},options={}) {
  const m=new Male();initializeBody(m,profile);if(options.legacy||profile&&(profile.headUnits!==8||profile.chest)){m.userData.bodyCompatibility='legacy-male-v7';setBodySurface(m);}else{if(options.driverNativeScale!==undefined){if(!Number.isFinite(options.driverNativeScale)||options.driverNativeScale<=0)throw Error('잘못된 driver native scale');m.scale.setScalar(options.driverNativeScale);}const driverNativeScale=m.scale.x;installBodyV1(m,{freshFactory:()=>{const clone=createCharacter(m.userData.bodyProfile,{driverNativeScale});clone.removeFromParent();return clone;}});lockBoneLayout(m);}return m;
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
  if(/_(arm|elbow|wrist)$/.test(part))return part.endsWith('_wrist')?[side+'arm',side+'elbow',side+'wrist']:[side+'arm',side+'elbow'];
  if(/_(leg|knee|ankle)$/.test(part))return part.endsWith('_ankle')?[side+'leg',side+'knee',side+'ankle']:[side+'leg',side+'knee'];
  return null;
}
export function solveConstrainedIK(m,keys,requested,options={}) {
  constrainBody(m);
  const chain=keys.map(key=>m[key]);if(chain.some(x=>!x)||chain.length<2)return {reached:false,error:Infinity};
  const end=chain.at(-1),base=chain[0].getWorldPosition(new THREE.Vector3()),target=requested.clone();
  const initial=boneDistances(m),positions=chain.map(j=>j.getWorldPosition(new THREE.Vector3()));
  let reach=0;for(let i=1;i<positions.length;i++)reach+=positions[i].distanceTo(positions[i-1]);
  const delta=target.clone().sub(base);
  if(delta.length()>reach)target.copy(base).add(delta.setLength(Math.max(0,reach-1e-6)));
  // Optimize actual Euler DOFs rather than projecting a large quaternion onto
  // limits: that projection can choose a completely different pose near a limit.
  // Keep each input event inside a world-orientation trust region of the last pose.
  const watched=['body',...Object.keys(JOINTS)].filter(key=>{for(let node=m[key];node;node=node.parent)if(node===chain[0])return true;return false;});
  const startWorld=watched.map(key=>m[key].getWorldQuaternion(new THREE.Quaternion()));
  const startLocal=chain.map(j=>j.rotation.clone());
  const maxWorldStep=20*RAD,maxLocalStep=12*RAD;
  const jp=new THREE.Vector3(),ep=new THREE.Vector3(),toE=new THREE.Vector3(),toT=new THREE.Vector3(),axis=new THREE.Vector3(),cross=new THREE.Vector3(),parent=new THREE.Quaternion(),q=new THREE.Quaternion();
  let bestError=end.getWorldPosition(ep).distanceToSquared(target),continuityLimited=false;
  // At a straight knee/elbow, a shorter collinear target has zero CCD gradient.
  // Seed the hinge from the two-bone solution and align the resulting limb, then
  // accept only a legal, continuous improvement before the ordinary refinement.
  if(chain.length===3&&/_(knee|elbow)$/.test(keys[1])){
    const saved=rigRotations(m),a=positions[0].distanceTo(positions[1]),b=positions[1].distanceTo(positions[2]),d=base.distanceTo(target);
    if(a*b>1e-12&&d>1e-8){
      const desired=Math.acos(THREE.MathUtils.clamp((d*d-a*a-b*b)/(2*a*b),-1,1));
      chain[1].rotation.z+=THREE.MathUtils.clamp(desired-chain[1].rotation.z,-maxLocalStep,maxLocalStep);
      clampJoint(m,keys[1]);m.updateMatrixWorld(true);
      toE.subVectors(end.getWorldPosition(ep),base);toT.subVectors(target,base);
      if(toE.lengthSq()>1e-12){
        q.setFromUnitVectors(toE.normalize(),toT.normalize());chain[0].getWorldQuaternion(parent);parent.premultiply(q);
        if(chain[0].parent)parent.premultiply(chain[0].parent.getWorldQuaternion(new THREE.Quaternion()).invert());
        chain[0].quaternion.copy(parent);clampJoint(m,keys[0]);
        for(const component of ['x','y','z'])chain[0].rotation[component]=THREE.MathUtils.clamp(chain[0].rotation[component],startLocal[0][component]-maxLocalStep,startLocal[0][component]+maxLocalStep);
        constrainBody(m);
        const error=end.getWorldPosition(ep).distanceToSquared(target),continuous=watched.every((k,n)=>startWorld[n].angleTo(m[k].getWorldQuaternion(q))<=maxWorldStep+1e-10);
        if(continuous&&error<bestError-1e-12)bestError=error;else {restoreRotations(m,saved);constrainBody(m);}
      }else {restoreRotations(m,saved);constrainBody(m);}
    }
  }
  const iterations=Number.isInteger(options.iterations)?THREE.MathUtils.clamp(options.iterations,1,24):24;
  for(let iteration=0;iteration<iterations;iteration++){
    let improved=false;
    for(let i=chain.length-2;i>=0;i--){
      const joint=chain[i],key=keys[i],limits=key==='body'?bodyLimits:JOINTS[key];
      if(!limits)continue;
      const dofs=bindings(m,key);
      for(const [name,range]of Object.entries(limits)){
        const binding=dofs[name];if(!binding)continue;
        const [component,sign]=binding;
        joint.getWorldPosition(jp);end.getWorldPosition(ep);
        // XYZ Euler's axes: parent X, parent*Rx Y, parent*Rx*Ry Z.
        axis.set(component==='x'?1:0,component==='y'?1:0,component==='z'?1:0);
        if(component==='z')axis.applyQuaternion(q.setFromAxisAngle(new THREE.Vector3(0,1,0),joint.rotation.y));
        if(component!=='x')axis.applyQuaternion(q.setFromAxisAngle(new THREE.Vector3(1,0,0),joint.rotation.x));
        if(joint.parent)axis.applyQuaternion(joint.parent.getWorldQuaternion(parent));
        toE.subVectors(ep,jp).addScaledVector(axis,-toE.dot(axis));
        toT.subVectors(target,jp).addScaledVector(axis,-toT.dot(axis));
        if(toE.lengthSq()<1e-14||toT.lengthSq()<1e-14)continue;
        const angle=Math.atan2(axis.dot(cross.crossVectors(toE,toT)),toE.dot(toT));
        const bounds=range.map(v=>v/sign*RAD).sort((a,b)=>a-b),old=joint.rotation[component];
        const low=Math.max(bounds[0],startLocal[i][component]-maxLocalStep),high=Math.min(bounds[1],startLocal[i][component]+maxLocalStep);
        let step=THREE.MathUtils.clamp(old+THREE.MathUtils.clamp(angle,-4*RAD,4*RAD),low,high)-old;
        for(let attempt=0;attempt<8&&Math.abs(step)>1e-7;attempt++,step*=0.5){
          joint.rotation[component]=old+step;chain[0].updateWorldMatrix(true,true);
          const continuous=watched.every((k,n)=>startWorld[n].angleTo(m[k].getWorldQuaternion(q))<=maxWorldStep+1e-10);
          const error=end.getWorldPosition(ep).distanceToSquared(target);
          if(continuous&&error<bestError-1e-12){bestError=error;improved=true;break;}
          if(!continuous)continuityLimited=true;
          joint.rotation[component]=old;chain[0].updateWorldMatrix(true,true);
        }
      }
    }
    if(bestError<1e-6||!improved)break;
  }
  constrainBody(m);
  const result={reached:false,error:end.getWorldPosition(ep).distanceTo(requested),reach,targetClamped:target.distanceTo(requested)>1e-6,continuityLimited};
  result.reached=result.error<0.015;m.userData.lastIK=result;
  // Every manipulation preserves segment distances, even when the target is unreachable.
  const after=boneDistances(m);
  for(const key of Object.keys(initial))if(Math.abs(initial[key]-after[key])>1e-6)rigError('관절 조작 중 뼈 길이 보존 검사에 실패했습니다: '+key);
  return result;
}

export function snapshotBodyJoints(m) {
  return Object.fromEntries(named(m).map(([key,j])=>[key,{position:j.position.toArray(),rotation:j.rotation.toArray(),scale:j.scale.toArray()}]));
}

// mannequin-js posture getters reorder Euler objects, including hidden thumb
// drivers. Serialization must observe the scene without changing a single DOF.
export function readLegacyPosture(m){
 const saved=[];m.traverse(n=>{if(n.rotation&&n.quaternion)saved.push({n,e:n.rotation.toArray(),q:n.quaternion.toArray()});});
 try{return structuredClone(m.posture);}finally{for(const {n,e,q}of saved){const er=n.rotation._onChangeCallback,qr=n.quaternion._onChangeCallback;n.rotation._onChangeCallback=()=>{};n.quaternion._onChangeCallback=()=>{};try{n.rotation.fromArray(e);n.quaternion.fromArray(q);}finally{n.rotation._onChangeCallback=er;n.quaternion._onChangeCallback=qr;}}}
}
