import * as THREE from 'three';
import asset from './assets/reference-human.json';
import {illustrationBody} from './illustration-body.js';

const V=(a=[])=>new THREE.Vector3(...a),Z=new THREE.Vector3(0,0,1);
const neighbors=Array.from({length:asset.positions.length/3},()=>new Set());for(let i=0;i<asset.indices.length;i+=3)for(let j=0;j<3;j++){const a=asset.indices[i+j],b=asset.indices[i+(j+1)%3];neighbors[a].add(b);neighbors[b].add(a);}const adjacency=neighbors.map(set=>[...set]);
function smoothSurface(positions){for(const amount of [.25,-.26]){const next=[...positions];for(let i=0;i<adjacency.length;i++)for(let axis=0;axis<3;axis++){const mean=adjacency[i].reduce((sum,j)=>sum+positions[j*3+axis],0)/adjacency[i].length;next[i*3+axis]+=amount*(mean-positions[i*3+axis]);}for(let i=0;i<positions.length;i++)positions[i]=next[i];}}
export const HUMAN_SKIN_STATS={vertices:asset.positions.length/3,triangles:asset.indices.length/3,bones:asset.keys.length};
export const skinJoint=(m,key)=>key.split('.').reduce((node,name)=>node[name],m);
export function skinPartBounds(mesh,key){const box=new THREE.Box3(),index=asset.keys.indexOf(key),point=new THREE.Vector3(),weights=mesh.geometry.attributes.skinWeight,ids=mesh.geometry.attributes.skinIndex;for(let i=0;i<mesh.geometry.attributes.position.count;i++){let weight=0;for(let j=0;j<4;j++)if(ids.array[i*4+j]===index)weight+=weights.array[i*4+j];if(weight>.2)box.expandByPoint(mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld));}return box;}
function frame(a,b){const y=b.clone().sub(a).normalize(),x=new THREE.Vector3(1,0,0).addScaledVector(y,-y.x);if(x.lengthSq()<1e-5)x.copy(Z).addScaledVector(y,-y.z);x.normalize();return new THREE.Matrix4().makeBasis(x,y,x.clone().cross(y).normalize()).setPosition(a);}
function fit(a,b,c,d,crossScale){return frame(c,d).multiply(new THREE.Matrix4().makeScale(crossScale,c.distanceTo(d)/b.distanceTo(a),crossScale)).multiply(frame(a,b).invert());}
function localBox(node,rootInverse){const result=new THREE.Box3();node.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry?.attributes.position?.count)return;mesh.geometry.computeBoundingBox();result.union(mesh.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInverse,mesh.matrixWorld)));});return result;}

export function buildHumanSkin(m,material,bones){
 const joints=new Set(asset.keys.map(key=>skinJoint(m,key)));for(const [,value]of Object.entries(m))if(value?.isObject3D&&value!==m.parent)joints.add(value);
 const saved=[...joints].map(joint=>[joint,joint.rotation.toArray()]);
 try{
  for(const [key,q]of m.userData.bodyBase.rotations)m[key].quaternion.copy(q);
  for(const key of ['body','torso','neck','head'])m[key].rotation.set(0,0,0,'XYZ');
  for(const side of ['l','r']){m[side+'_arm'].rotation.set(side==='l'?40*Math.PI/180:-40*Math.PI/180,0,0,'XYZ');m[side+'_elbow'].rotation.set(0,0,35*Math.PI/180,'XYZ');m[side+'_leg'].rotation.set(side==='l'?6*Math.PI/180:-6*Math.PI/180,0,0,'XYZ');m[side+'_knee'].rotation.set(0,0,0,'XYZ');}
  m.updateWorldMatrix(true,true);const rootInverse=m.matrixWorld.clone().invert(),at=node=>node.getWorldPosition(new THREE.Vector3()).applyMatrix4(rootInverse),hip=at(m.l_leg).add(at(m.r_leg)).multiplyScalar(.5),neck=at(m.neck),baseScale=at(m.l_leg).distanceTo(at(m.r_leg))/V(asset.bones.l_leg.head).distanceTo(V(asset.bones.r_leg.head)),headBox=localBox(m.head.image,rootInverse),whole=localBox(m,rootInverse),headCenter=headBox.getCenter(new THREE.Vector3());
  const matrices=asset.keys.map(key=>{
   const source=asset.bones[key],a=V(source.head),b=V(source.tail);let c,d,cross=baseScale;
   if(key==='pelvis'||key==='torso'){c=hip;d=neck;}
   else if(key==='head'){c=headCenter.clone().setY(headBox.min.y);d=headCenter.clone().setY(headBox.max.y);cross=(headBox.max.y-headBox.min.y)/(b.y-a.y);}
   else if(key==='neck'){c=neck;d=headCenter.clone();}
   else if(key.endsWith('_ankle')){
    const bounds=localBox(skinJoint(m,key).image,rootInverse),points=[];for(let i=0;i<asset.positions.length/3;i++){let w=0;for(let j=0;j<4;j++)if(asset.skinIndex[i*4+j]===asset.keys.indexOf(key))w+=asset.skinWeight[i*4+j];if(w>.65)points.push(V(asset.positions.slice(i*3,i*3+3)));}const sourceBox=new THREE.Box3().setFromPoints(points),size=sourceBox.getSize(new THREE.Vector3()),targetSize=bounds.getSize(new THREE.Vector3());return new THREE.Matrix4().makeTranslation(...bounds.min.toArray()).multiply(new THREE.Matrix4().makeScale(targetSize.x/size.x,targetSize.y/size.y,targetSize.z/size.z)).multiply(new THREE.Matrix4().makeTranslation(...sourceBox.min.clone().negate().toArray()));
   }else{const joint=skinJoint(m,key);c=at(joint);const next=key.endsWith('_arm')?m[key.slice(0,2)+'elbow']:key.endsWith('_elbow')?m[key.slice(0,2)+'wrist']:key.endsWith('_leg')?m[key.slice(0,2)+'knee']:key.endsWith('_knee')?m[key.slice(0,2)+'ankle']:key.endsWith('_wrist')?m[key.slice(0,2)+'finger_2']:key.endsWith('.mid')?skinJoint(m,key.replace('.mid','.tip')):key.endsWith('.tip')?null:joint.mid;
    d=next?at(next):joint.imageWrapper.localToWorld(new THREE.Vector3(0,joint.yVal,0)).applyMatrix4(rootInverse);
    if(key.includes('finger')||key.endsWith('_wrist'))cross=Math.min(baseScale,c.distanceTo(d)/a.distanceTo(b));
   }
   return fit(a,b,c,d,cross);
  });
  const positions=[];for(let i=0;i<asset.positions.length/3;i++){const point=V(asset.positions.slice(i*3,i*3+3)),result=new THREE.Vector3();for(let j=0;j<4;j++){const w=asset.skinWeight[i*4+j];if(w)result.addScaledVector(point.clone().applyMatrix4(matrices[asset.skinIndex[i*4+j]]),w);}positions.push(...result.toArray());}
  let minY=Infinity,maxY=-Infinity;for(let i=1;i<positions.length;i+=3){minY=Math.min(minY,positions[i]);maxY=Math.max(maxY,positions[i]);}
  for(let i=1;i<positions.length;i+=3)positions[i]=whole.min.y+(positions[i]-minY)/(maxY-minY)*(whole.max.y-whole.min.y);
  const chest=m.userData.bodyProfile?.chest,inv=new THREE.Matrix4().multiplyMatrices(m.torso.imageWrapper.matrixWorld.clone().invert(),m.matrixWorld),forward=new THREE.Matrix4().multiplyMatrices(rootInverse,m.torso.imageWrapper.matrixWorld);
  for(let i=0;i<positions.length;i+=3){const p=V(positions.slice(i,i+3)).applyMatrix4(inv);if(p.x<=0)continue;
   // Keep a neutral rib-cage silhouette after adapting the source torso to this rig.
   // The optional chest profile supplies the actor-specific volume above this surface.
   const ribBlend=Math.exp(-Math.pow((p.y-6.5)/4.8,4)-Math.pow(p.z/4.5,8));
   p.x-=Math.max(0,p.x-3.9)*ribBlend;
   if(chest){let blend=0;for(const side of [-1,1])blend=Math.max(blend,Math.exp(-1.5*(Math.pow((p.y-17*chest.height)/2.05,2)+Math.pow((p.z-side*5*chest.spacing)/2,2))));p.x+=Math.max(0,2.8+1.55*chest.projection-p.x)*blend;}
   p.applyMatrix4(forward);positions[i]=p.x;positions[i+1]=p.y;positions[i+2]=p.z;
  }
  smoothSurface(positions);minY=Infinity;maxY=-Infinity;for(let i=1;i<positions.length;i+=3){minY=Math.min(minY,positions[i]);maxY=Math.max(maxY,positions[i]);}for(let i=1;i<positions.length;i+=3)positions[i]=whole.min.y+(positions[i]-minY)/(maxY-minY)*(whole.max.y-whole.min.y);
  const geometry=illustrationBody(m,asset.keys,rootInverse,headBox,whole,{positions,indices:asset.indices,skinIndex:asset.skinIndex,skinWeight:asset.skinWeight});
  Object.assign(HUMAN_SKIN_STATS,{vertices:geometry.attributes.position.count,triangles:geometry.index.count/3,bones:asset.keys.length});
  if(!bones)bones=asset.keys.map(key=>{const bone=new THREE.Bone();bone.name='Skin '+key;skinJoint(m,key).add(bone);return bone;});
  m.updateWorldMatrix(true,true);const mesh=new THREE.SkinnedMesh(geometry,material),skeleton=new THREE.Skeleton(bones);mesh.name='Drawing mannequin';mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;m.add(mesh);mesh.bind(skeleton,m.matrixWorld.clone());mesh.normalizeSkinWeights();
  const boxes=asset.keys.map(()=>new THREE.Box3()),inverses=bones.map(b=>b.matrixWorld.clone().invert().multiply(m.matrixWorld)),drawPositions=geometry.attributes.position.array,drawWeights=geometry.attributes.skinWeight.array,drawIds=geometry.attributes.skinIndex.array;for(let i=0;i<geometry.attributes.position.count;i++){let index=0;for(let j=1;j<4;j++)if(drawWeights[i*4+j]>drawWeights[i*4+index])index=j;const bone=drawIds[i*4+index];boxes[bone].expandByPoint(V(drawPositions.slice(i*3,i*3+3)).applyMatrix4(inverses[bone]));}
  mesh.raycast=(raycaster,hits)=>{for(let i=0;i<bones.length;i++){if(boxes[i].isEmpty())continue;const ray=raycaster.ray.clone().applyMatrix4(bones[i].matrixWorld.clone().invert()),hit=ray.intersectBox(boxes[i],new THREE.Vector3());if(!hit)continue;hit.applyMatrix4(bones[i].matrixWorld);const distance=hit.distanceTo(raycaster.ray.origin);if(distance<raycaster.near||distance>raycaster.far)continue;let key=asset.keys[i];if(key.includes('finger'))key=key.slice(0,2)+'wrist';hits.push({distance,point:hit,object:skinJoint(m,key).image,face:null});}};
  const outlineMaterial=new THREE.MeshBasicMaterial({color:'#454954',side:THREE.BackSide});
  outlineMaterial.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed += normal * 0.055;');};
  const outline=new THREE.SkinnedMesh(geometry,outlineMaterial);outline.name='Drawing contour';outline.userData.bodyOutline=true;outline.frustumCulled=false;outline.raycast=()=>{};mesh.add(outline);outline.bind(skeleton,m.matrixWorld.clone());
  mesh.userData.skinAsset='illustration-mannequin-v1';return {mesh,bones};
 }finally{for(const [joint,r]of saved)joint.rotation.fromArray(r);m.updateWorldMatrix(true,true);}
}
