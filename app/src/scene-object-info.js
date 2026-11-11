import * as THREE from 'three';
import {getBodyV1,displayedObjectBounds} from './body-v1-adapter.js';
import {OBB} from 'three/addons/math/OBB.js';
import {aimHead,lookTarget} from './look-at.js';
import {PROP_NAMES} from './scene-format.js';
import {attachOf} from './held-props.js';

const objectId=o=>o.torso?o.userData.studioId||null:o.userData.primitive?.id||o.userData.studioId||null;
// Gaze targets in the live scene: people by their head, props by their centre.
export function liveLookScene(objects){
 return {actors:objects.filter(o=>o.torso&&objectId(o)).map(o=>({id:objectId(o),root:o})),props:objects.filter(o=>!o.torso&&objectId(o)).map(o=>({id:objectId(o),center:displayedObjectBounds(o).getCenter(new THREE.Vector3())}))};
}

export function objectNotes(object,scene){
 const source=object.torso?scene?.actors?.find(a=>a.id===object.userData.studioId):object.userData.primitive;
 const notes=Object.fromEntries(['role','intent','description'].map(key=>[key,object.userData.sceneNotes?.[key]??source?.[key]??'']));
 // Gaze and expression exist for people only and are left out when unset.
 for(const key of ['lookAt','expression']){const v=object.userData.sceneNotes?.[key]??source?.[key];if(v!==undefined&&v!==''&&v!==null)notes[key]=v;}
 return notes;
}
export function describeObjects(objects,scene){
 let actorIndex=0,propIndex=0;const used=new Set();
 return objects.map(object=>{const actor=!!object.torso,index=actor?actorIndex++:propIndex++,box=displayedObjectBounds(object);
  const sourceId=objectId(object),baseId=sourceId||`${actor?'actor':'prop'}-${index+1}`;let id=baseId;for(let suffix=2;used.has(id);suffix++)id=baseId+'-'+suffix;used.add(id);
  const state=actor?getBodyV1(object)?.snapshot():null;
  return {id,sourceId,...(state?{bodyAsset:{...object.userData.bodyAsset},bodyRestRevision:state.basePose.restRevision,sourceRequestOrigin:state.sourceRequestRevision?{revision:state.sourceRequestRevision,interpretation:state.basePose.sourceRequestInterpretation,editedPoseStoredExplicitly:true}:null}:{}),kind:actor?'actor':object.userData.primitive?.type||'imported-model',editorStateArray:actor?'mannequins':'importedModels',editorStateIndex:index,name:object.name||'이름 없음',...objectNotes(object,scene),position:object.position.toArray(),rotation:object.rotation.toArray(),scale:object.scale.toArray(),positionSpace:'editor world root, meters',bounds:box.isEmpty()?null:{min:box.min.toArray(),max:box.max.toArray()}};
 });
}
function meshBoxes(object){
 const boxes=[];object.updateWorldMatrix(true,true);
 object.traverse(mesh=>{
  if(!mesh.isMesh||mesh.userData.bodyOutline||!mesh.geometry?.attributes.position)return;
  for(let node=mesh;node&&node!==object;node=node.parent)if(!node.visible)return;
  if(mesh.isSkinnedMesh){
   const parts=mesh.skeleton.bones.map(()=>new THREE.Box3()),inverse=mesh.skeleton.bones.map(b=>b.matrixWorld.clone().invert()),point=new THREE.Vector3(),weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
   for(let i=0;i<mesh.geometry.attributes.position.count;i++){const w=[weights.getX(i),weights.getY(i),weights.getZ(i),weights.getW(i)],ids=[indices.getX(i),indices.getY(i),indices.getZ(i),indices.getW(i)],bone=ids[w.indexOf(Math.max(...w))];mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse[bone]);parts[bone].expandByPoint(point);}
   parts.forEach((part,i)=>{if(part.isEmpty())return;const obb=new OBB().fromBox3(part).applyMatrix4(mesh.skeleton.bones[i].matrixWorld);obb.halfSize.subScalar(.01).max(new THREE.Vector3());if(obb.halfSize.toArray().every(n=>n>0))boxes.push(obb);});return;
  }
  mesh.geometry.computeBoundingBox();const obb=new OBB().fromBox3(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
  // Ignore touching surfaces and very shallow overlap at ordinary support points.
  obb.halfSize.subScalar(.01).max(new THREE.Vector3());if(obb.halfSize.toArray().some(n=>n<=0))return;boxes.push(obb);
 });return boxes;
}
export function inspectObjectOverlaps(objects,selected=null){
 const targets=objects.filter(o=>!selected||o===selected),cache=new Map(),bounds=new Map(objects.map(o=>[o,displayedObjectBounds(o)])),issues=[],seen=new Set();
 const get=o=>{if(!cache.has(o))cache.set(o,meshBoxes(o));return cache.get(o);};
 for(const a of targets)for(const b of objects){
  if(a===b)continue;const ai=objects.indexOf(a),bi=objects.indexOf(b),key=[ai,bi].sort((x,y)=>x-y).join(':');if(seen.has(key))continue;seen.add(key);
  const intersection=bounds.get(a).clone().intersect(bounds.get(b));if(intersection.isEmpty()||intersection.getSize(new THREE.Vector3()).toArray().some(n=>n<=.02))continue;
  if(get(a).some(x=>get(b).some(y=>x.intersectsOBB(y))))issues.push({severity:'warning',code:'POSSIBLE_VOLUME_OVERLAP',objects:[ai,bi],names:[a.name||'이름 없음',b.name||'이름 없음'],message:'부위 외곽이 3D 공간에서 겹칠 가능성이 있습니다. 접촉 의도와 실제 표면을 확인하세요.'});
 }
 return {method:'per-mesh oriented bounding boxes, 1cm inset; whole-object overlap requires >2cm on all axes',scope:'공간 외곽 근사 검사입니다. 화면의 앞뒤 가림을 검사하지 않습니다. 곡면·오목한 형상·GLB 변형에는 오탐/누락이 있을 수 있으며 무경고가 무침투를 보장하지 않습니다. 의도한 손/의자 접촉은 직접 확인하세요.',issues};
}
export function renderObjectInfo(container,object,scene,api){
 const section=document.createElement('section');section.className='object-info';section.id='selected-object-info';
 const heading=document.createElement('h3');heading.textContent='선택한 대상 · '+(object.name||'이름 없음');section.appendChild(heading);
 const kind=document.createElement('p');kind.className='body-hint';kind.textContent=(object.torso?'인물':PROP_NAMES[object.userData.primitive?.type]||'가져온 모델')+' · ID '+(object.userData.studioId||object.userData.primitive?.id||'직접 추가');section.appendChild(kind);
 const values={name:object.name||'',...objectNotes(object,scene)},fields={};
 for(const [key,label]of [['name','이름'],['role','역할 / 무엇인가'],['intent','이 위치·자세에 둔 의도'],['description','최종 외형 설명 · 재질 / 색 / 디자인']]){
  const row=document.createElement('label');row.className='studio-label';row.textContent=label;
  const field=document.createElement(key==='name'||key==='role'?'input':'textarea');field.id='object-info-'+key;field.value=values[key];field.maxLength=key==='name'?200:12000;field.placeholder=key==='name'?'이름 없음':'미작성 · 장면 의도에 맞게 입력하세요';row.appendChild(field);section.appendChild(row);fields[key]=field;
 }
 if(object.torso){fields.description.placeholder='손발의 형태·손톱·피부·장갑·신발 등 최종 작화에 필요한 설명';const hint=document.createElement('p');hint.className='body-hint';hint.textContent='손발은 닫힌 단순 외피로 표시합니다. 세부 형태·손톱·장갑·신발은 인물 설명으로 전달합니다. 손목·발목 방향과 접촉 위치는 현재 포즈를 유지합니다.';section.appendChild(hint);}
 const status=document.createElement('output');status.id='object-info-status';
 // People: expression and gaze target. Both go to the image prompt in words; the gaze
 // button also turns the neck and head toward the target.
 let gaze=null;
 if(object.torso){
  const own=objectId(object),others=api.objects().filter(o=>o!==object&&objectId(o));
  const expRow=document.createElement('label');expRow.className='studio-label';expRow.textContent='표정';
  const exp=document.createElement('input');exp.id='object-info-expression';exp.maxLength=200;exp.value=values.expression||'';exp.placeholder='예: 놀라 굳은 얼굴 · 눈썹을 찌푸림';expRow.appendChild(exp);section.appendChild(expRow);fields.expression=exp;
  const lookRow=document.createElement('label');lookRow.className='studio-label';lookRow.textContent='시선 대상';
  const look=document.createElement('select');look.id='object-info-lookAt';
  const opts=[['','지정 안 함'],...others.map(o=>[objectId(o),(o.torso?'인물 · ':'소품 · ')+(o.name||objectId(o))])];
  if(Array.isArray(values.lookAt))opts.push(['@point','지정한 지점 ('+values.lookAt.map(n=>n.toFixed(1)).join(', ')+')']);
  for(const [v,t]of opts){const o=document.createElement('option');o.value=v;o.textContent=t;look.appendChild(o);}
  look.value=Array.isArray(values.lookAt)?'@point':(values.lookAt||'');lookRow.appendChild(look);section.appendChild(lookRow);
  const aim=document.createElement('button');aim.className='btn';aim.id='object-info-aim';aim.textContent='시선 맞추기 (목·머리 회전)';section.appendChild(aim);
  gaze={look,exp,point:Array.isArray(values.lookAt)?values.lookAt:null,own};
  aim.onclick=()=>{const v=look.value;if(!v){status.textContent='시선 대상을 먼저 고르세요.';return;}
   const target=lookTarget(v==='@point'?gaze.point:v,liveLookScene(api.objects()));if(!target){status.textContent='시선 대상을 찾지 못했습니다.';return;}
   const r=aimHead(object,target,{constrain:api.constrain});save();status.textContent=r?.clamped?'목·머리 회전 한계까지 돌렸습니다. 몸 방향도 돌려 보세요.':'시선을 맞췄습니다.';};
 }
 // Primitive props: width / height / depth in metres, rebuilt in place.
 if(object.userData.primitive&&api.resizeProp){
  const row=document.createElement('div');row.className='studio-row object-size';const label=document.createElement('span');label.className='studio-label';label.textContent='크기 m (가로·높이·깊이)';row.appendChild(label);
  const inputs=object.userData.primitive.size.map((v,i)=>{const n=document.createElement('input');n.type='number';n.step='0.05';n.min='0.02';n.max='20';n.value=String(v);n.id='object-size-'+'whd'[i];n.setAttribute('aria-label',['가로','높이','깊이'][i]+' (m)');row.appendChild(n);return n;});
  const apply=()=>{try{api.resizeProp(object,inputs.map(n=>Number(n.value)));inputs.forEach((n,i)=>n.value=String(object.userData.primitive.size[i]));api.commit();status.textContent='크기를 바꿨습니다.';}catch(e){status.textContent=e.message;}};
  inputs.forEach(n=>n.onchange=apply);section.appendChild(row);
 }
 // Props: hold in a person's hand. The prop then follows that hand.
 if(!object.torso&&api.placeHeld){
  const row=document.createElement('label');row.className='studio-label';row.textContent='손에 들기';
  const hold=document.createElement('select');hold.id='object-info-hold';const now=attachOf(object);
  const options=[['','들지 않음'],...api.objects().filter(o=>o.torso&&o.userData.studioId).flatMap(o=>[[o.userData.studioId+'|right',(o.name||o.userData.studioId)+' · 오른손'],[o.userData.studioId+'|left',(o.name||o.userData.studioId)+' · 왼손']])];
  for(const [v,t]of options){const o=document.createElement('option');o.value=v;o.textContent=t;hold.appendChild(o);}
  hold.value=now?now.actor+'|'+now.hand:'';row.appendChild(hold);section.appendChild(row);
  hold.onchange=()=>{const [actor,hand]=hold.value.split('|'),next=hold.value?{actor,hand}:null;
   if(object.userData.primitive){if(next)object.userData.primitive.attachTo=next;else delete object.userData.primitive.attachTo;}
   if(next)object.userData.attachTo=next;else delete object.userData.attachTo;
   api.placeHeld();api.commit();status.textContent=next?'손에 들었습니다. 포즈를 바꾸면 손을 따라 움직입니다.':'손에서 내려놓았습니다.';};
 }
 const save=()=>{object.name=fields.name.value;object.userData.sceneNotes=Object.fromEntries(['role','intent','description'].map(key=>[key,fields[key].value]));
  if(gaze){const v=gaze.look.value,lookAt=v==='@point'?gaze.point:v||undefined;if(lookAt!==undefined)object.userData.sceneNotes.lookAt=lookAt;if(gaze.exp.value.trim())object.userData.sceneNotes.expression=gaze.exp.value.trim();}if(object.userData.primitive)Object.assign(object.userData.primitive,{name:object.name,...object.userData.sceneNotes});heading.textContent='선택한 대상 · '+(object.name||'이름 없음');api.commit();status.textContent='설명 저장됨 · 최종 전달 묶음과 작화 지시문에 포함됩니다.';};
 Object.values(fields).forEach(field=>field.onchange=save);if(gaze)gaze.look.onchange=save;
 const hint=document.createElement('p');hint.className='body-hint';hint.textContent='입력을 마치면 자동 저장합니다. 설명을 바꿔도 3D 크기·위치·포즈는 바뀌지 않습니다. 공간 수정은 뷰어에서 하세요.';section.append(hint,status);
 const check=document.createElement('button');check.className='btn';check.id='object-overlap-check';check.textContent='현재 공간 겹침 검사';const report=document.createElement('output');report.id='object-overlap-report';
 check.onclick=()=>{const result=inspectObjectOverlaps(api.objects(),object);report.textContent=result.issues.length?result.issues.map(i=>i.names.join(' ↔ ')+' · 겹침 가능성').join('\n')+'\n의도한 접촉인지 측면·위에서도 확인하세요.':'큰 외곽 겹침을 찾지 못했습니다. 정밀 접촉 검증은 아닙니다.';report.dataset.warning=String(!!result.issues.length);};
 section.append(check,report);container.prepend(section);
}
