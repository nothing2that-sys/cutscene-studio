// Cutscene Studio additions, 2026-11-11. Distributed under GPL-3.0.
// Turns a person's neck and head toward a point (actors[].lookAt).
// The direction a joint value turns the head is measured on the figure itself rather
// than assumed, so it holds for every body type and for bent or turned torsos:
// the head's own forward axis is read with the torso straight, then neck/head turn and
// nod are corrected a few times until the measured head direction meets the target.
import * as THREE from 'three';
import {getBodyV1} from './body-v1-adapter.js';

const UP=new THREE.Vector3(0,1,0),D=THREE.MathUtils.radToDeg;
const LIMIT={turn:80,nod:45};               // total over neck + head, degrees
const SHARE={neck:.4,head:.6};

function frameOf(m){
  const update=()=>{getBodyV1(m)?.sync();m.updateMatrixWorld(true);};
  const at=k=>m[k].getWorldPosition(new THREE.Vector3());
  const headQ=()=>m.head.getWorldQuaternion(new THREE.Quaternion());
  return {update,at,headQ};
}
const horizontal=v=>new THREE.Vector3(v.x,0,v.z);
const signedYaw=(from,to)=>{const a=horizontal(from).normalize(),b=horizontal(to).normalize();return D(Math.atan2(new THREE.Vector3().crossVectors(a,b).y,a.dot(b)));};
const pitchOf=v=>D(Math.atan2(v.y,Math.hypot(v.x,v.z)));

// Returns {yaw, pitch, clamped, residual} in degrees, or null when the figure has no head.
export function aimHead(m,target,{constrain}={}){
  if(!m?.head||!m.neck||!target)return null;
  const {update,at,headQ}=frameOf(m);
  const keep={torso:{bend:m.torso.bend,tilt:m.torso.tilt,turn:m.torso.turn}};
  // Body forward from the figure's own left (l_ joints are the figure's left side).
  const set=(n,h)=>{m.neck.turn=n.turn;m.neck.nod=n.nod;m.head.turn=h.turn;m.head.nod=h.nod;};
  set({turn:0,nod:0},{turn:0,nod:0});m.torso.bend=0;m.torso.tilt=0;m.torso.turn=0;update();
  const left=horizontal(at('l_leg').sub(at('r_leg')));if(left.lengthSq()<1e-8){Object.assign(m.torso,keep.torso);update();return null;}
  const bodyForward=new THREE.Vector3().crossVectors(left,UP).normalize();
  const local=bodyForward.clone().applyQuaternion(headQ().invert());
  Object.assign(m.torso,keep.torso);
  const forward=()=>{update();return local.clone().applyQuaternion(headQ());};
  // Which way does a positive turn / nod move the head here?
  const f0=forward();m.head.turn=20;const turnSign=Math.sign(signedYaw(f0,forward()))||1;m.head.turn=0;
  m.head.nod=20;const nodSign=Math.sign(pitchOf(forward())-pitchOf(f0))||1;m.head.nod=0;
  let yaw=0,pitch=0,clamped=false,residual=0;
  for(let i=0;i<6;i++){
    const f=forward(),d=target.clone().sub(at('head'));
    const dy=signedYaw(f,d),dp=pitchOf(d)-pitchOf(f);residual=Math.hypot(dy,dp);
    if(residual<.5)break;
    const ny=THREE.MathUtils.clamp(yaw+dy,-LIMIT.turn,LIMIT.turn),np=THREE.MathUtils.clamp(pitch+dp,-LIMIT.nod,LIMIT.nod);
    if(ny!==yaw+dy||np!==pitch+dp)clamped=true;yaw=ny;pitch=np;
    set({turn:turnSign*yaw*SHARE.neck,nod:nodSign*pitch*SHARE.neck},{turn:turnSign*yaw*SHARE.head,nod:nodSign*pitch*SHARE.head});
    if(clamped&&i>0)break;
  }
  constrain?.(m);update();
  const f=forward(),d=target.clone().sub(at('head'));
  return {yaw:Math.round(yaw),pitch:Math.round(pitch),clamped,residual:Math.round(Math.hypot(signedYaw(f,d),pitchOf(d)-pitchOf(f)))};
}

// The point a person looks at: another person's head, a prop's centre, or a point.
export function lookTarget(spec,{actors=[],props=[]}){
  if(Array.isArray(spec))return new THREE.Vector3(...spec);
  const actor=actors.find(a=>a.id===spec);if(actor?.root?.head){actor.root.updateMatrixWorld(true);return actor.root.head.getWorldPosition(new THREE.Vector3());}
  const prop=props.find(p=>p.id===spec);if(prop)return prop.center.clone();
  return null;
}
