import * as THREE from 'three';
import {OBB} from 'three/addons/math/OBB.js';

export function objectNotes(object,scene){
 const source=object.torso?scene?.actors?.find(a=>a.id===object.userData.studioId):object.userData.primitive;
 return Object.fromEntries(['role','intent','description'].map(key=>[key,object.userData.sceneNotes?.[key]??source?.[key]??'']));
}
export function describeObjects(objects,scene){
 let actorIndex=0,propIndex=0;const used=new Set();
 return objects.map(object=>{const actor=!!object.torso,index=actor?actorIndex++:propIndex++,box=new THREE.Box3().setFromObject(object);
  const sourceId=object.userData.studioId||object.userData.primitive?.id||null,baseId=sourceId||`${actor?'actor':'prop'}-${index+1}`;let id=baseId;for(let suffix=2;used.has(id);suffix++)id=baseId+'-'+suffix;used.add(id);
  return {id,sourceId,kind:actor?'actor':object.userData.primitive?.type||'imported-model',editorStateArray:actor?'mannequins':'importedModels',editorStateIndex:index,name:object.name||'이름 없음',...objectNotes(object,scene),position:object.position.toArray(),rotation:object.rotation.toArray(),scale:object.scale.toArray(),positionSpace:'editor world root, meters',bounds:box.isEmpty()?null:{min:box.min.toArray(),max:box.max.toArray()}};
 });
}
function meshBoxes(object){
 const boxes=[];object.updateWorldMatrix(true,true);
 object.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry?.attributes.position)return;
  for(let node=mesh;node&&node!==object;node=node.parent)if(!node.visible)return;
  mesh.geometry.computeBoundingBox();const obb=new OBB().fromBox3(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
  // Ignore touching surfaces and very shallow overlap at ordinary support points.
  obb.halfSize.subScalar(.01).max(new THREE.Vector3());if(obb.halfSize.toArray().some(n=>n<=0))return;boxes.push(obb);
 });return boxes;
}
export function inspectObjectOverlaps(objects,selected=null){
 const targets=objects.filter(o=>!selected||o===selected),cache=new Map(),bounds=new Map(objects.map(o=>[o,new THREE.Box3().setFromObject(o)])),issues=[],seen=new Set();
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
 const kind=document.createElement('p');kind.className='body-hint';kind.textContent=(object.torso?'인물':{box:'상자',table:'탁자',chair:'의자',sphere:'구체'}[object.userData.primitive?.type]||'가져온 모델')+' · ID '+(object.userData.studioId||object.userData.primitive?.id||'직접 추가');section.appendChild(kind);
 const values={name:object.name||'',...objectNotes(object,scene)},fields={};
 for(const [key,label]of [['name','이름'],['role','역할 / 무엇인가'],['intent','이 위치·자세에 둔 의도'],['description','최종 외형 설명 · 재질 / 색 / 디자인']]){
  const row=document.createElement('label');row.className='studio-label';row.textContent=label;
  const field=document.createElement(key==='name'||key==='role'?'input':'textarea');field.id='object-info-'+key;field.value=values[key];field.maxLength=key==='name'?200:12000;field.placeholder=key==='name'?'이름 없음':'미작성 · 장면 의도에 맞게 입력하세요';row.appendChild(field);section.appendChild(row);fields[key]=field;
 }
 const status=document.createElement('output');status.id='object-info-status';
 const save=()=>{object.name=fields.name.value;object.userData.sceneNotes=Object.fromEntries(['role','intent','description'].map(key=>[key,fields[key].value]));if(object.userData.primitive)Object.assign(object.userData.primitive,{name:object.name,...object.userData.sceneNotes});heading.textContent='선택한 대상 · '+(object.name||'이름 없음');api.commit();status.textContent='설명 저장됨 · 최종 전달 묶음과 작화 지시문에 포함됩니다.';};
 Object.values(fields).forEach(field=>field.onchange=save);
 const hint=document.createElement('p');hint.className='body-hint';hint.textContent='입력을 마치면 자동 저장합니다. 설명을 바꿔도 3D 크기·위치·포즈는 바뀌지 않습니다. 공간 수정은 뷰어에서 하세요.';section.append(hint,status);
 const check=document.createElement('button');check.className='btn';check.id='object-overlap-check';check.textContent='현재 공간 겹침 검사';const report=document.createElement('output');report.id='object-overlap-report';
 check.onclick=()=>{const result=inspectObjectOverlaps(api.objects(),object);report.textContent=result.issues.length?result.issues.map(i=>i.names.join(' ↔ ')+' · 겹침 가능성').join('\n')+'\n의도한 접촉인지 측면·위에서도 확인하세요.':'큰 외곽 겹침을 찾지 못했습니다. 정밀 접촉 검증은 아닙니다.';report.dataset.warning=String(!!result.issues.length);};
 section.append(check,report);container.prepend(section);
}
