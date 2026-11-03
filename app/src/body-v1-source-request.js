import * as THREE from 'three';
import requests from './body-v1-source-requests.json' with {type:'json'};
export const NATURAL_SOURCE_REQUESTS=Object.freeze(requests);
const currentRevisions=new Set(Object.values(requests).map(r=>r.revision)),savedOrigins=new Set([...currentRevisions,'body-v1-inferred-natural-sole-v1:original','body-v1-inferred-natural-sole-v1:p015']);
export const isSupportedSourceOrigin=revision=>savedOrigins.has(revision);
const validVector=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
export function applyWorldSourceRequest(r,request){
 if(request?.schema!==1||!currentRevisions.has(request.revision)||!request.joints||!validVector(request.joints.pelvis?.worldPosition)||!['L','R'].every(s=>validVector(request.ankleTargets?.[s])))throw Error('지원하지 않는 명시 source request');
 const frame=r.sourceRequestFrame;if(!frame?.canonicalToDisplay?.isMatrix4)throw Error('실제 source 표시 좌표계가 없습니다.');
 const map=frame.canonicalToDisplay.clone(),inverse=map.clone().invert(),frameQ=new THREE.Quaternion(),scale=new THREE.Vector3();map.decompose(new THREE.Vector3(),frameQ,scale);
 if(Math.min(...scale.toArray())<=0||Math.max(...scale.toArray())-Math.min(...scale.toArray())>1e-12)throw Error('source 표시 좌표계는 균등 축척이어야 합니다.');
 const inverseQ=frameQ.clone().invert(),worldQuaternions={};for(const [name,goal]of Object.entries(request.joints)){if(!r.bones.has(name)||!Array.isArray(goal.worldQuaternion)||goal.worldQuaternion.length!==4||!goal.worldQuaternion.every(Number.isFinite)||Math.abs(Math.hypot(...goal.worldQuaternion)-1)>.01)throw Error('잘못된 source joint: '+name);worldQuaternions[name]=inverseQ.clone().multiply(new THREE.Quaternion().fromArray(goal.worldQuaternion)).toArray();}
 const saved=r.poseData();try{
  r.preset('neutral');r.applyCanonicalPose({revision:request.revision,root:new THREE.Vector3(...request.joints.pelvis.worldPosition).applyMatrix4(inverse).toArray(),worldQuaternions});
  const worldQ=(b,q)=>{b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));r.root.updateMatrixWorld(true);},rootQ=r.root.getWorldQuaternion(new THREE.Quaternion());
  for(const side of ['L','R']){
   const upper=r.bones.get('thigh'+side),lower=r.bones.get('shin'+side),ankle=r.bones.get('ankle'+side),hip=upper.getWorldPosition(new THREE.Vector3()),knee=lower.getWorldPosition(new THREE.Vector3()),end=ankle.getWorldPosition(new THREE.Vector3()),goal=new THREE.Vector3(...request.ankleTargets[side]).applyMatrix4(inverse).applyMatrix4(r.root.matrixWorld),a=hip.distanceTo(knee),b=knee.distanceTo(end),distance=hip.distanceTo(goal);
   if(!(distance>0&&distance<=a+b&&distance>=Math.abs(a-b)))throw Error('원래 source 발목 목표는 도달 범위를 벗어납니다: '+side);
   const axis=goal.clone().sub(hip).normalize(),pole=new THREE.Vector3(...request.joints['shin'+side].worldPosition).applyMatrix4(inverse).applyMatrix4(r.root.matrixWorld).sub(hip);pole.addScaledVector(axis,-pole.dot(axis));if(pole.lengthSq()<1e-20)throw Error('source 무릎 방향을 정의할 수 없습니다.');pole.normalize();
   const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along)),desired=hip.clone().addScaledVector(axis,along).addScaledVector(pole,height),delta=new THREE.Quaternion().setFromUnitVectors(knee.clone().sub(hip).normalize(),desired.sub(hip).normalize());worldQ(upper,delta.multiply(upper.getWorldQuaternion(new THREE.Quaternion())));
   const nowKnee=lower.getWorldPosition(new THREE.Vector3()),nowEnd=ankle.getWorldPosition(new THREE.Vector3()),correction=new THREE.Quaternion().setFromUnitVectors(nowEnd.sub(nowKnee).normalize(),goal.clone().sub(nowKnee).normalize());worldQ(lower,correction.multiply(lower.getWorldQuaternion(new THREE.Quaternion())));worldQ(ankle,rootQ.clone().multiply(new THREE.Quaternion().fromArray(worldQuaternions['ankle'+side])));
  }
  for(const side of ['L','R']){const actual=-THREE.MathUtils.radToDeg(r.bones.get('finger'+side+'1').rotation.x)/.25,declared=request.digitCurlDegrees?.[side],toe=THREE.MathUtils.radToDeg(r.bones.get('toe'+side+'0_1').rotation.x)/.8;if(!Number.isFinite(actual)||actual<-.001||actual>80.001||!Number.isFinite(toe)||toe<-.001||toe>50.001||declared!==undefined&&(!Number.isFinite(declared)||declared<0||declared>80||Math.abs(actual-declared)>.001))throw Error('명시 digit quaternion과 굽힘 메타데이터가 다릅니다.');r.curlState[side]=declared??THREE.MathUtils.clamp(actual,0,80);r.curlState['toe'+side]=THREE.MathUtils.clamp(toe,0,50);}
  r.update();return request.revision;
 }catch(error){r.applyPose(saved);throw error;}
}
