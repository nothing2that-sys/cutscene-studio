import {validateScene,JOINTS} from './scene-format.js';
import {analyzeEditorState} from './scene-feedback.js';
export const POSE_NAMES={standing:'서기',sitting:'앉기',pointing:'가리키기',reaching:'손 뻗기'};
const orders=['XYZ','XZY','YXZ','YZX','ZXY','ZYX'];
const jointKeys=new Set(['body','pelvis',...Object.keys(JOINTS),...['l','r'].flatMap(side=>['fingers','nails',...Array.from({length:5},(_,i)=>'finger_'+i)].map(part=>side+'_'+part))]);
function rotations(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('관절 회전 객체가 필요합니다.');
  const result={};
  for(const [key,r]of Object.entries(value)){
    if(!jointKeys.has(key)||!Array.isArray(r)||![3,4].includes(r.length)||r.slice(0,3).some(n=>!Number.isFinite(n))||(r.length===4&&!orders.includes(r[3])))throw Error('잘못된 관절 회전: '+key);
    result[key]=[...r];
  }
  if(!Object.keys(result).length)throw Error('포즈에 관절 회전 정보가 없습니다.');
  return result;
}
function semantic(actor){
  const scene=validateScene({version:1,units:'meters',actors:[{id:'reference',position:[0,0,0],...actor}],camera:{position:[0,1,4],target:[0,1,0]}});
  const a=scene.actors[0];return {name:a.name||POSE_NAMES[a.pose],kind:'semantic',pose:a.pose,joints:a.joints};
}
export function readReferencePoses(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>5_000_000)throw Error('포즈 JSON은 5MB 이하로 넣어주세요.');
  let data;try{data=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('포즈 JSON 문법을 확인하세요. 이미지 대신 저장한 포즈·장면·인물 JSON을 넣어주세요.');}
  if(data?.type==='converted-pose'){if(data.version!==1||data.pose?.type!=='pose-reference')throw Error('지원하는 변환 포즈 형식이 아닙니다.');return readReferencePoses(JSON.stringify(data.pose));}
  if(data?.type==='pose-reference'){
    if(data.version!==1||data.rotationUnit!=='radians'||Object.keys(data).some(k=>!['type','version','name','rotationUnit','rotations'].includes(k)))throw Error('지원하는 포즈 참조 형식이 아닙니다.');
    return [{name:typeof data.name==='string'?data.name:'저장한 포즈',kind:'rotations',rotations:rotations(data.rotations)}];
  }
  const native=data?.editorState||data;
  if(native?.type==='mannequin'||Array.isArray(native?.mannequins)){
    const check=analyzeEditorState(native);if(!check.valid)throw Error(check.errors.map(e=>e.path+': '+e.message).join('\n'));
    const actors=native.type==='mannequin'?[native]:native.mannequins;
    if(!actors.length)throw Error('파일에 인물이 없습니다.');
    return actors.map(m=>({name:m.name||'저장된 인물',kind:'rotations',rotations:rotations(Object.fromEntries(Object.entries(m.joints||{}).map(([key,value])=>[key,value.rotation])))}));
  }
  if(Array.isArray(data?.actors)){
    const scene=validateScene(data);if(!scene.actors.length)throw Error('장면에 인물이 없습니다.');return scene.actors.map(semantic);
  }
  if(!data||typeof data!=='object'||Array.isArray(data)||(!Object.hasOwn(data,'pose')&&!Object.hasOwn(data,'joints')))throw Error('포즈·인물·장면 JSON이 아닙니다.');
  return [semantic(data)];
}
