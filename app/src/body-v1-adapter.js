import * as THREE from 'three';
import {isSupportedSourceOrigin} from './body-v1-source-request.js';
import {createDollContacts} from './doll-contact.js';
import {BODY_TYPES,bodyTypeOf} from './doll-profiles.js';
import {preloadFullDollAssets,prepareFullDoll,assembleFullDoll,migrateFullDollPose,restoreFullDollMainPose,FULL_DOLL_REST_REVISION,shoulderRestQuaternion} from './doll-full-rig.js';

export const BODY_V1_ASSET=Object.freeze({id:'body-v1-default',version:1,rigVersion:'body-v1'});
const adapters=new WeakMap(),RAD=Math.PI/180;
export const prepareBodyV1=()=>prepareFullDoll({profile:'default',protection:false,initialState:'rest'});
// Body types other than the default build their torso mesh in a worker on first use.
const readyProfiles=new Set(['default']);
export const bodyTypeReady=type=>readyProfiles.has(BODY_TYPES[type||'female']?.profile);
export function ensureBodyTypes(types=Object.keys(BODY_TYPES)){return Promise.all([...new Set(types.map(t=>t||'female'))].map(t=>{const id=BODY_TYPES[t]?.profile;if(!id)return Promise.reject(Error('지원하지 않는 체형 종류입니다: '+t));return preloadFullDollAssets({profile:id}).then(()=>readyProfiles.add(id));}));}
const assetFor=id=>({...BODY_V1_ASSET,...(id!=='default'?{profile:id}:{})});
export const getBodyV1=m=>adapters.get(m);
// The asset's L/R bone names follow the front reference image, so its "L"
// bones sit on the figure's anatomical right. Driver keys are anatomical
// (scene JSON and UI say l_ = the figure's own left), hence the crossed map.
const names={body:'pelvis',torso:'thorax',neck:'neck',head:'head',l_arm:'upperR',r_arm:'upperL',l_elbow:'foreR',r_elbow:'foreL',l_wrist:'wristR',r_wrist:'wristL',l_leg:'thighR',r_leg:'thighL',l_knee:'shinR',r_knee:'shinL',l_ankle:'ankleR',r_ankle:'ankleL'};
export const DRIVER_SIDE_REVISION=2;
const fullBoneNames=[...Object.values(names),'abdomen',...['L','R'].flatMap(side=>Array.from({length:5},(_,i)=>[...['','_1',...(i===4?[]:['_2']),'_tip'].map(s=>'finger'+side+i+s),...['','_1','_tip'].map(s=>'toe'+side+i+s)]).flat())];
const parts={thorax:'Torso',head:'Head',neck:'Neck',upperL:'Right_Arm',upperR:'Left_Arm',foreL:'Right_Elbow',foreR:'Left_Elbow',handL:'Right_Wrist',handR:'Left_Wrist',thighL:'Right_Leg',thighR:'Left_Leg',shinL:'Right_Knee',shinR:'Left_Knee',footL:'Right_Ankle',footR:'Left_Ankle'};
// Bases were authored for the old same-letter pairing (l_ key on asset "L" bone).
// Native Male DOFs of l_/r_ keys mirror each other across native Z, so a key now
// reuses the opposite key's basis composed with a half turn about Z: every value
// keeps its anatomical meaning (raise forward, straddle outward) on the correct side.
const SIDE_FLIP=new THREE.Quaternion(0,0,1,0);
const opposite=key=>key.startsWith('l_')?'r_'+key.slice(2):key.startsWith('r_')?'l_'+key.slice(2):key;
const sided=fn=>key=>opposite(key)===key?fn(key):fn(opposite(key)).multiply(SIDE_FLIP);
const sameLetterLegacyBasis=key=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),key.includes('elbow')?(key.startsWith('r_')?Math.PI:0):key.includes('knee')?Math.PI/2:-Math.PI/2);
const legacyBasis=sided(sameLetterLegacyBasis);
const basis=sided(key=>/^[lr]_arm$/.test(key)?shoulderRestQuaternion(key==='l_arm'?'L':'R').invert().multiply(sameLetterLegacyBasis(key)):sameLetterLegacyBasis(key));
export function validateBodyV1State(state){
 const actors=state?.mannequins||(state?.type==='mannequin'?[state]:[]);
 for(const a of actors){if(a.bodyAsset!==undefined&&(!a.bodyAsset||Object.keys(a.bodyAsset).some(k=>!['id','version','rigVersion','profile'].includes(k))||Object.entries(BODY_V1_ASSET).some(([k,v])=>a.bodyAsset[k]!==v)||(a.bodyAsset.profile!==undefined&&(a.bodyAsset.profile==='default'||!Object.values(BODY_TYPES).some(t=>t.profile===a.bodyAsset.profile)))))throw Error('지원하지 않는 인체 자산 또는 리그 버전입니다.');
  if(a.bodyV1Pose&&!a.bodyAsset)throw Error('인체 v1 포즈에는 자산·리그 버전이 필요합니다.');
  if(a.bodyAsset){if(BODY_TYPES[bodyTypeOf(a.bodyProfile)]?.profile!==(a.bodyAsset.profile??'default'))throw Error('체형 종류와 인체 자산 프로필이 맞지 않습니다.');const d=a.bodyV1Pose,p=d?.basePose;if(p?.description!==undefined&&(typeof p.description!=='string'||p.description.length>12000))throw Error('인물 설명은 12000자 이하 문자열이어야 합니다.');if(p?.curls!==undefined){if(!p.curls||typeof p.curls!=='object'||Array.isArray(p.curls))throw Error('잘못된 손발 굽힘 값');for(const k of ['L','R','toeL','toeR'])if(!Number.isFinite(p.curls[k])||p.curls[k]<0||p.curls[k]>(k.startsWith('toe')?50:80))throw Error('잘못된 손발 굽힘 값');}if(d?.driverSideRevision!==undefined&&d.driverSideRevision!==DRIVER_SIDE_REVISION)throw Error('지원하지 않는 인체 좌우 revision입니다.');if(d?.driverNativeScale!==undefined&&(!Number.isFinite(d.driverNativeScale)||d.driverNativeScale<=0))throw Error('잘못된 driver native scale');if(![1,2].includes(p?.restRevision??1)||![1,2].includes(d?.driverRestRevision??1)||(p?.restRevision??1)!==(d?.driverRestRevision??1))throw Error('지원하지 않는 인체 rest/driver revision입니다.');if(p?.sourceRequestRevision!=null&&!isSupportedSourceOrigin(p.sourceRequestRevision)||d?.sourceRequestRevision!=null&&(!isSupportedSourceOrigin(d.sourceRequestRevision)||d.sourceRequestRevision!==p?.sourceRequestRevision))throw Error('지원하지 않는 source request revision');if(p?.sourceRequestInterpretation!=null&&(typeof p.sourceRequestInterpretation!=='string'||p.sourceRequestInterpretation.length>2000))throw Error('잘못된 source 해석');const validQ=q=>Array.isArray(q)&&q.length===4&&q.every(Number.isFinite)&&Math.abs(Math.hypot(...q)-1)<.01;
   if(a.bodyProfile?.headUnits!==8||a.bodyProfile.chest)throw Error('명시된 공통 인체 자산은 기본 등신·가슴 형태만 지원합니다.');
   if(d?.version!==1||p?.version!==1||p.kind!=='articulated-full-doll-pose'||p.rigProfile!==(a.bodyAsset.profile??'default')||!Array.isArray(p.root)||p.root.length!==3||!p.root.every(v=>Number.isFinite(v)&&Math.abs(v)<=10)||!p.quaternions||Object.keys(p.quaternions).length!==fullBoneNames.length||fullBoneNames.some(k=>!validQ(p.quaternions[k]))||!d.driverBase||Object.keys(d.driverBase).length!==Object.keys(names).length||Object.keys(names).some(k=>!validQ(d.driverBase[k])))throw Error('인체 v1 포즈 데이터가 올바르지 않습니다.');
  }
 }
}
export function installBodyV1(m,{profile=m.userData.bodyProfile||{height:1.75,headUnits:8},freshFactory}={}){
 if(adapters.has(m))return adapters.get(m);
 // Legacy hidden meshes still belong to this actor's mutable scene graph.
 // Clone their buffers too; mannequin-js reuses sphere/nail geometries globally.
 const legacyGeometry=new Map();m.traverse(node=>{if(node.geometry){if(!legacyGeometry.has(node.geometry))legacyGeometry.set(node.geometry,node.geometry.clone());node.geometry=legacyGeometry.get(node.geometry);}});
 const dollProfileId=BODY_TYPES[bodyTypeOf(profile)]?.profile;if(!dollProfileId)throw Error('지원하지 않는 체형 종류입니다.');if(!readyProfiles.has(dollProfileId))throw Error('체형 메시를 준비하는 중입니다. 잠시 후 다시 시도하세요.');
 const full=assembleFullDoll({profile:dollProfileId,protection:false,initialState:'rest'}),canonicalRest=full.poseData(),root=new THREE.Group();root.name='Body v1 asset';
 // Asset rest is kept below user placement. Every actual driver joint remains
 // inside this root; hidden legacy meshes are never substituted for body meshes.
 m.add(root);root.add(m.body);root.add(full.root);
 const nativeScale=m.scale.x,box=new THREE.Box3().setFromObject(full.root),stature=box.max.y-box.min.y;
 // Keep the canonical FK/IK rig in its authored study-world frame. A uniform
 // 3D surface transform converts every actual displayed mesh to main metres.
 // This also lets the frozen source recipe operate on real canonical bones.
 let unitScale=profile.height/stature;
 full.root.scale.setScalar(1/nativeScale);
 const authoredMatrices=new Map([...full.meshes.values()].map(mesh=>[mesh,mesh.matrix.clone()])),rawUpdate=full.update,rawGuides=full.guides;
 const relative=(node,ancestor=full.root)=>{const chain=[];for(let n=node;n&&n!==ancestor;n=n.parent)chain.unshift(n);const matrix=new THREE.Matrix4();for(const n of chain){n.updateMatrix();matrix.multiply(n.matrix);}return matrix;};
 const surfaceTransform=()=>new THREE.Matrix4().makeTranslation(0,-box.min.y*unitScale,0).multiply(new THREE.Matrix4().makeScale(unitScale,unitScale,unitScale));
 Object.defineProperty(full,'sourceRequestFrame',{get(){full.root.updateMatrixWorld(true);return {schema:1,restRevision:FULL_DOLL_REST_REVISION,canonicalToDisplay:full.root.matrixWorld.clone().multiply(surfaceTransform())};}});
 function canonicalMeshes(){for(const [mesh,matrix]of authoredMatrices){matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);mesh.updateMatrix();}}
 function displayMeshes(){const transform=surfaceTransform();for(const [mesh,matrix]of authoredMatrices){const parent=relative(mesh.parent),local=parent.clone().invert().multiply(transform).multiply(parent).multiply(matrix);local.decompose(mesh.position,mesh.quaternion,mesh.scale);mesh.updateMatrix();}full.root.updateMatrixWorld(true);}
 full.update=()=>{canonicalMeshes();rawUpdate();displayMeshes();alignFrames();};
 const appliedListeners=new Set();full.onAppliedState=listener=>{if(typeof listener!=='function')throw Error('적용 관측자는 함수여야 합니다.');appliedListeners.add(listener);return()=>appliedListeners.delete(listener);};
 for(const name of ['preset','applyPose','applyCanonicalPose','setJoint','setCurl','setToeCurl','setProtection','applySourceRequest']){const mutate=full[name].bind(full);full[name]=(...args)=>{canonicalMeshes();try{return mutate(...args);}finally{displayMeshes();alignFrames();if(name==='setJoint')for(const listener of appliedListeners)listener(full.lastAppliedState);}};}
 full.guides=camera=>{canonicalMeshes();full.root.updateMatrixWorld(true);const lines=rawGuides(camera),world=full.root.matrixWorld.clone().multiply(surfaceTransform()).multiply(full.root.matrixWorld.clone().invert());for(const line of lines)for(const point of line)point?.applyMatrix4(world);displayMeshes();return lines;};
 root.userData.bodyAsset=assetFor(dollProfileId);root.userData.bodyProfile=structuredClone(profile);root.userData.sceneNotes=m.userData.sceneNotes;
 m.userData.bodyAsset=assetFor(dollProfileId);m.userData.bodySurface='body-v1';
 const originalMeshes=[];m.body.traverse(n=>{if(n.isMesh){originalMeshes.push(n);n.visible=false;n.raycast=()=>{};}});
 // Driver frames conjugate native Male XYZ DOFs into the canonical +Z rig.
 // Their origins follow the authored full hierarchy, rather than old proportions.
 const outputs={},frames={},bases=Object.fromEntries(Object.keys(names).map(k=>[k,basis(k)]));
 for(const k of Object.keys(names)){m[k].removeFromParent();m[k].position.set(0,0,0);m[k].rotation.set(0,0,0,'XYZ');}
 const parent={body:null,torso:'body',neck:'torso',head:'neck',l_arm:'torso',r_arm:'torso',l_elbow:'l_arm',r_elbow:'r_arm',l_wrist:'l_elbow',r_wrist:'r_elbow',l_leg:'body',r_leg:'body',l_knee:'l_leg',r_knee:'r_leg',l_ankle:'l_knee',r_ankle:'r_knee'};
 for(const k of Object.keys(names)){const frame=new THREE.Group(),out=new THREE.Group();frame.name='Driver frame '+k;out.name='Driver output '+k;frame.quaternion.copy(bases[k]);out.quaternion.copy(bases[k]).invert();(parent[k]?outputs[parent[k]]:root).add(frame);frame.add(m[k]);m[k].add(out);frames[k]=frame;outputs[k]=out;}
 const mapped=k=>bases[k].clone().multiply(m[k].quaternion).multiply(bases[k].clone().invert());
 let basePose=null,driverBase=null,sourceMode=false;
 function alignFrames(){
  // Work entirely in asset-local matrices: user placement must not introduce
  // cancellation/ULP changes into the independently pinned neutral rest asset.
  full.root.updateMatrix();for(const k of Object.keys(names)){outputs[k].scale.set(1/m[k].scale.x,1/m[k].scale.y,1/m[k].scale.z);if(k==='body')outputs[k].scale.multiplyScalar(unitScale/nativeScale);outputs[k].updateMatrix();}
  for(const k of Object.keys(names)){const bone=relative(full.bones.get(names[k])),parent=relative(frames[k].parent,root),p=new THREE.Vector3().setFromMatrixPosition(bone).applyMatrix4(surfaceTransform()).applyMatrix4(full.root.matrix).applyMatrix4(parent.clone().invert()),parentQ=new THREE.Quaternion(),q=new THREE.Quaternion(),unused=new THREE.Vector3();parent.decompose(unused,parentQ,new THREE.Vector3());bone.decompose(unused,q,new THREE.Vector3());q.multiply(bases[k]).multiply(m[k].quaternion.clone().invert());frames[k].position.copy(p);frames[k].quaternion.copy(parentQ.invert().multiply(q));frames[k].updateMatrix();}
  root.updateMatrixWorld(true);
 }
 function sync(){for(const k of Object.keys(names)){const b=full.bones.get(names[k]);b.quaternion.copy(basePose?new THREE.Quaternion().fromArray(basePose.quaternions[names[k]]).multiply(new THREE.Quaternion().fromArray(driverBase[k]).invert()).multiply(mapped(k)):mapped(k));}full.update();root.userData.sceneNotes=m.userData.sceneNotes;return full;}
 function neutral(){basePose=null;driverBase=null;sourceMode=false;for(const k of Object.keys(names))m[k].rotation.set(0,0,0,'XYZ');for(const [name,b]of full.bones)b.quaternion.fromArray(canonicalRest.quaternions[name]);full.bones.get('pelvis').position.fromArray(canonicalRest.root);full.update();alignFrames();sync();}
 function source(f,clamp){
  canonicalMeshes();if(f.sourceRequest)full.applySourceRequest(f.sourceRequest);else{full.preset(f.fullPreset||'neutral');for(const [key,axes]of Object.entries(f.fullDegrees||{}))for(const [axis,degrees]of Object.entries(axes))full.bones.get(key).rotation[axis]=degrees*RAD;full.update();}
  for(const k of Object.keys(names)){const q=full.bones.get(names[k]).quaternion;m[k].quaternion.copy(bases[k].clone().invert().multiply(q).multiply(bases[k]));m[k].rotation.reorder('XYZ');}clamp?.();basePose=structuredClone(full.poseData());driverBase=Object.fromEntries(Object.keys(names).map(k=>[k,mapped(k).toArray()]));sourceMode=true;sync();alignFrames();}
 function snapshot(){sync();return {version:1,driverRestRevision:FULL_DOLL_REST_REVISION,driverSideRevision:DRIVER_SIDE_REVISION,driverNativeScale:nativeScale,basePose:basePose?structuredClone(basePose):full.poseData(),driverBase:driverBase?structuredClone(driverBase):Object.fromEntries(Object.keys(names).map(k=>[k,mapped(k).toArray()])),source:sourceMode,sourceRequestRevision:basePose?.sourceRequestRevision??full.sourceRequestRevision??null};}
 function restore(data){if(!data){neutral();return;}let p=structuredClone(data.basePose),nextDriverBase=structuredClone(data.driverBase);
  if(data.driverSideRevision!==DRIVER_SIDE_REVISION){
   // Saved before the anatomical side fix: the l_ driver then drove the asset
   // "L" bone. Move each driver value and residual to the key that now drives
   // that bone; the flip keeps every DOF number and the displayed pose exact.
   const flip=q=>SIDE_FLIP.clone().multiply(q).multiply(SIDE_FLIP.clone().invert()),before=Object.fromEntries(Object.keys(names).map(k=>[k,m[k].quaternion.clone()]));
   for(const k of Object.keys(names))if(opposite(k)!==k){m[k].quaternion.copy(flip(before[opposite(k)]));m[k].rotation.reorder('XYZ');nextDriverBase[k]=data.driverBase[opposite(k)];}
  }
  if((p.restRevision??1)<2){
   // Evaluate the old explicit saved pose and its driver residual before changing
   // rest coordinates. This preserves old world orientation, including edits.
   for(const k of Object.keys(names)){const oldCurrent=legacyBasis(k).multiply(m[k].quaternion).multiply(legacyBasis(k).invert()),oldBase=new THREE.Quaternion().fromArray(p.quaternions[names[k]]),oldDriver=new THREE.Quaternion().fromArray(nextDriverBase[k]);p.quaternions[names[k]]=oldBase.multiply(oldDriver.invert()).multiply(oldCurrent).toArray();}
   p=migrateFullDollPose(p);nextDriverBase=Object.fromEntries(Object.keys(names).map(k=>[k,mapped(k).toArray()]));
  }
  canonicalMeshes();try{restoreFullDollMainPose(full,p);}finally{displayMeshes();alignFrames();}basePose=structuredClone(full.poseData());driverBase=nextDriverBase;sourceMode=!!data.source;sync();}
 const bodyMeshes=[...full.meshes.values()];for(const mesh of bodyMeshes){mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.posePartKey=parts[mesh.name];mesh.userData.posePartNode=mesh.name==='thorax'?m.torso:m[Object.keys(names).find(k=>names[k]===mesh.parent.name)]||m.torso;}
 let displayContacts=null,jointProtection=true;
 const adapter={root,full,bodyMeshes,originalMeshes,sync,neutral,source,snapshot,restore,
  get jointProtection(){return jointProtection;},setJointProtection(value){jointProtection=Boolean(value);},
  auditDisplayedJoint(key,{alreadySynchronized=false}={}){if(!alreadySynchronized)sync();displayContacts??=createDollContacts(full.meshes,new Map(Object.entries(names).map(([key,name])=>[name,outputs[key]])));const group=full.bones.get(names[key]),only=new Set();for(const [part,mesh]of full.meshes){for(let n=mesh.parent;n;n=n.parent)if(n===group){only.add(part);break;}}if(key==='torso'||key==='body')only.add('thorax');let low=Infinity,high=-Infinity;const point=new THREE.Vector3();for(const mesh of bodyMeshes){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);low=Math.min(low,point.y);high=Math.max(high,point.y);}}const height=high-low,tolerance=.002*height;return {...displayContacts.audit({only,stride:1,margin:tolerance}),height,tolerance,scope:'actual displayed vertex penetration diagnostic; independent triangle validation required'};},
  configure(next){unitScale=next.height/stature;m.userData.bodyProfile=structuredClone(next);root.userData.bodyProfile=structuredClone(next);sync();},
  actor(id){
   return {id,root,driver:m,bodyMeshes,auditJoint:key=>adapter.auditDisplayedJoint(key),get protection(){return jointProtection;},get sourceRequestFrame(){return full.sourceRequestFrame;},joints:{...Object.fromEntries(Object.keys(names).map(k=>[k,m[k]])),...Object.fromEntries(Object.entries(names).map(([k,name])=>[name,outputs[k]]))},pelvis:outputs.body,chest:outputs.torso,canonicalFullRig:full,guides:full.guides,contactBinding:full.contactBinding,surfaceAnchors:full.surfaceAnchors.map(a=>({...a,actorId:id})),
    createOracleRequestRig:async()=>{
     const clone=await freshFactory(),a=getBodyV1(clone);a.setJointProtection(false);a.neutral();const actor=a.actor(id);
     return {...actor,protection:false,update:a.sync,dispose(){a.full.dispose();const owned=new Set();clone.traverse(n=>{if(n.geometry)owned.add(n.geometry);});for(const geometry of owned)geometry.dispose();clone.removeFromParent();}};
    }
   };
  }
 };
 adapters.set(m,adapter);neutral();return adapter;
}

// Bounds of the actual displayed v1 exterior (vertex-exact, so rotated parts such as a
// kneeling shin do not leave the figure floating); legacy bodies and props keep their existing bounds.
export function displayedObjectBounds(object,target=new THREE.Box3()){
 const asset=getBodyV1(object);if(!asset)return target.setFromObject(object);asset.sync();object.updateMatrixWorld(true);target.makeEmpty();for(const mesh of asset.bodyMeshes)target.union(new THREE.Box3().setFromObject(mesh,true));return target;
}
