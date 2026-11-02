// Offline image-space fitting. Bone lengths and the root transform never participate in optimization.
import * as THREE from 'three';
import {clampJoint,constrainBody,snapshotBodyJoints,boneDistances} from './body-rig.js';
import {retargetLandmarks,referenceFrame} from './reference-retarget.js';
import {correctReference,correctedView} from './reference-corrections.js';
const KEYS=['l_arm','r_arm','l_elbow','r_elbow','l_wrist','r_wrist','l_leg','r_leg','l_knee','r_knee','l_ankle','r_ankle'];
const DOFS=[['body','x'],['body','y'],['body','z'],['torso','x'],['torso','y'],['torso','z'],...['l_arm','r_arm','l_leg','r_leg'].flatMap(k=>['x','y','z'].map(a=>[k,a])),...['l_elbow','r_elbow','l_knee','r_knee'].map(k=>[k,'z'])];
function projection(m,frame){
  const set=new Set();for(const key of KEYS){let o=m[key];while(o&&o!==m){set.add(o);o=o.parent;}}
  const depth=o=>{let n=0;while(o&&o!==m){n++;o=o.parent;}return n;},nodes=[...set].sort((a,b)=>depth(a)-depth(b));
  const up=frame.previewUp,right=up.clone().cross(frame.previewDirection).normalize();
  return ()=>{m.updateWorldMatrix(true,false);for(const o of nodes){o.updateMatrix();o.matrixWorld.multiplyMatrices(o.parent.matrixWorld,o.matrix);}return KEYS.map(k=>{const e=m[k].matrixWorld.elements;return [e[12]*right.x+e[13]*right.y+e[14]*right.z,e[12]*up.x+e[13]*up.y+e[14]*up.z];});};
}
function metric(model,target,weights){
  const sum=weights.reduce((a,b)=>a+b,0),mean=(points,axis)=>points.reduce((a,p,i)=>a+p[axis]*weights[i],0)/sum;
  const mx=mean(model,0),my=mean(model,1),tx=mean(target,0),ty=mean(target,1);let covariance=0,variance=0;
  for(let i=0;i<12;i++){const x=model[i][0]-mx,y=model[i][1]-my;covariance+=weights[i]*(x*(target[i][0]-tx)+y*(target[i][1]-ty));variance+=weights[i]*(x*x+y*y);}
  const scale=Math.max(.001,covariance/Math.max(variance,1e-12));let mse=0,max=0;const residuals=[];
  for(let i=0;i<12;i++){const d=Math.hypot(scale*(model[i][0]-mx)+tx-target[i][0],scale*(model[i][1]-my)+ty-target[i][1]);mse+=weights[i]*d*d;max=Math.max(max,d);residuals.push(d);}
  const dx=Math.max(...target.map(p=>p[0]))-Math.min(...target.map(p=>p[0])),dy=Math.max(...target.map(p=>p[1]))-Math.min(...target.map(p=>p[1])),diagonal=Math.max(Math.hypot(dx,dy),1);
  return {loss:mse/sum/(diagonal*diagonal),normalizedError:Math.sqrt(mse/sum)/diagonal,maxNormalizedError:max/diagonal,residuals,scale};
}
const snapshot=m=>Object.fromEntries(Object.entries(snapshotBodyJoints(m)).map(([k,j])=>[k,j.rotation]));
const restore=(m,rotations)=>{for(const [key,r]of Object.entries(rotations))m[key].rotation.fromArray(r);constrainBody(m);};
export function refineReference(m,raw,observations,baseline,tags){
  const lengths=boneDistances(m),position=m.position.toArray(),variants=[...observations.variants].sort((a,b)=>b.meanBodyScore-a.meanBodyScore).slice(0,2);let best=null;
  for(const observation of variants){
    const data={...raw,tags,disableExampleCorrections:true,keypoints:raw.keypoints.map(p=>[...p]),scores:[...raw.scores]};for(let i=0;i<17;i++){data.keypoints[i][0]=observation.crop[i][0];data.keypoints[i][1]=observation.crop[i][1];data.scores[i]=observation.scores[i];}
    const target=observation.crop.slice(5,17).map(p=>[p[0],-p[1]]),weights=observation.scores.slice(5,17).map(s=>Math.max(.15,s));
    for(const depthScale of [0,.35,1]){
      const input={...data,depthScale},frame=referenceFrame(input),project=projection(m,frame);retargetLandmarks(m,input);
      const supported=['바닥앉기','무릎꿇기','쪼그리기와숙이기'].includes(raw.category);
      const limitPelvis=()=>{if(supported){m.body.rotation.x=THREE.MathUtils.clamp(m.body.rotation.x,-Math.PI/9,Math.PI/9);m.body.rotation.z=THREE.MathUtils.clamp(m.body.rotation.z,-Math.PI/9,Math.PI/9);}};limitPelvis();
      const initialBody=m.body.quaternion.clone(),initialYaw=m.body.rotation.y,penalty=()=>frame.groundHint?0.003*Math.pow(initialBody.angleTo(m.body.quaternion),2):0;
      const evaluate=()=>metric(project(),target,weights).loss+penalty();let loss=evaluate();
      for(const step of [25,12,6,3,1])for(let pass=0;pass<3;pass++){
        let improved=false;
        for(const [key,axis]of DOFS){const saved=m[key].rotation.toArray();let chosen=saved;
          for(const sign of [-1,1]){m[key].rotation.fromArray(saved);m[key].rotation[axis]+=sign*step*Math.PI/180;clampJoint(m,key);if(key==='body'){const delta=Math.atan2(Math.sin(m.body.rotation.y-initialYaw),Math.cos(m.body.rotation.y-initialYaw));m.body.rotation.y=initialYaw+THREE.MathUtils.clamp(delta,-Math.PI/3,Math.PI/3);limitPelvis();}const value=evaluate();if(value<loss-1e-9){loss=value;chosen=m[key].rotation.toArray();improved=true;}}
          m[key].rotation.fromArray(chosen);
        }
        if(!improved)break;
      }
      const stats=metric(project(),target,weights),rank=stats.loss+.02*(1-observation.meanBodyScore);
      if(!best||rank<best.rank)best={rank,rotations:snapshot(m),stats,depthScale,observationRotation:observation.rotation,observationScore:observation.meanBodyScore,previewDirection:frame.previewDirection.toArray(),previewUp:frame.previewUp.toArray()};
    }
  }
  restore(m,best.rotations);const manualCorrection=correctReference(m,raw.id,raw.poseSeed,raw.upperSeed);const finalLengths=boneDistances(m);if(Object.keys(lengths).some(k=>Math.abs(lengths[k]-finalLengths[k])>1e-6)||JSON.stringify(position)!==JSON.stringify(m.position.toArray()))throw Error('Image refinement changed locked lengths/root');
  const pose={...baseline.pose,rotations:snapshot(m)},quality={...baseline.quality,status:'needs-correction',visualReview:false,refinement:{version:3,method:'independent-2d-rotation-ensemble-and-constrained-projection-fit',normalizedError:best.stats.normalizedError,maxNormalizedError:best.stats.maxNormalizedError,depthScale:best.depthScale,observationRotation:best.observationRotation,mean2dBodyScore:best.observationScore,model:observations.model,modelSha256:observations.modelSha256},notes:[...baseline.quality.notes,'Image-space fit is not a guarantee of hidden depth, contacts, or physical balance.']};
  if(manualCorrection){quality.manualCorrection=manualCorrection;quality.refinement.metricStage='before-reference-specific-edit';}const view=correctedView(raw.id);if(view){best.previewDirection=view.direction;best.previewUp=view.up;quality.viewAssumed=true;}
  return {...baseline,pose,quality,previewDirection:best.previewDirection,previewUp:best.previewUp};
}
