// Cutscene Studio additions, 2026-11-11. Distributed under GPL-3.0.
// Hand-held props (props[].attachTo = {actor, hand}): the prop follows the hand. The grip
// point is the wrist moved a little further along the forearm. attachTo.grip says which
// end is in the hand: 'top' hangs the prop below the hand (a bag by its handles, a folded
// umbrella by its crook), 'bottom' stands it on the hand (a cup, a raised torch). Without
// grip, props 25 cm or taller hang and shorter ones stand. The prop keeps its own
// rotation; only its position follows.
import * as THREE from 'three';
import {getBodyV1} from './body-v1-adapter.js';

export const attachOf=prop=>prop?.userData?.attachTo||prop?.userData?.primitive?.attachTo||null;

export const HANG_HEIGHT=0.25;
export const gripEnd=(attach,height)=>attach?.grip==='top'||attach?.grip==='bottom'?attach.grip:height>=HANG_HEIGHT?'top':'bottom';

export function gripPoint(m,hand){
  const k=hand==='left'?'l':'r';if(!m?.[k+'_wrist']||!m[k+'_elbow'])return null;
  getBodyV1(m)?.sync();m.updateMatrixWorld(true);
  const wrist=m[k+'_wrist'].getWorldPosition(new THREE.Vector3()),elbow=m[k+'_elbow'].getWorldPosition(new THREE.Vector3());
  const scale=(m.userData.bodyProfile?.height||1.7)/1.7;
  return wrist.clone().add(wrist.clone().sub(elbow).normalize().multiplyScalar(0.075*scale));
}

// Moves every attached prop to its holder's hand. Returns how many were placed.
export function placeHeldProps(props,actors){
  let placed=0;
  for(const prop of props){
    const a=attachOf(prop);if(!a)continue;
    const m=actors.find(x=>x.userData.studioId===a.actor);const grip=m&&gripPoint(m,a.hand);if(!grip)continue;
    prop.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(prop);if(box.isEmpty())continue;
    const height=box.max.y-box.min.y,end=gripEnd(a,height),inHand=Math.min(height/2,0.06);
    prop.userData.heldGrip=end; // read by the LLM package (how it is held)
    const anchor=new THREE.Vector3((box.min.x+box.max.x)/2,end==='top'?box.max.y-inHand:box.min.y+inHand,(box.min.z+box.max.z)/2);
    const shift=grip.sub(anchor);if(shift.lengthSq()<1e-10)continue;
    prop.position.add(shift);prop.updateMatrixWorld(true);placed++;
  }
  return placed;
}
