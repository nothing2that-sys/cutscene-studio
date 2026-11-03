// Cutscene Studio additions, 2026-11-01. Distributed under GPL-3.0.
// Metres, Y up, right-handed; actor positions are the feet anchor.
export const JOINTS = {
  torso: { bend: [-90,90], tilt: [-45,45], turn: [-90,90] },
  neck: { nod: [-90,90], tilt: [-45,45], turn: [-90,90] },
  head: { nod: [-90,90], tilt: [-45,45], turn: [-90,90] },
  l_arm: { raise: [-180,180], straddle: [-180,180], turn: [-90,90] },
  r_arm: { raise: [-180,180], straddle: [-180,180], turn: [-90,90] },
  l_elbow: { bend: [0,150] }, r_elbow: { bend: [0,150] },
  l_wrist: { bend: [-90,90], turn: [-90,90], straddle: [-45,45] },
  r_wrist: { bend: [-90,90], turn: [-90,90], straddle: [-45,45] },
  l_leg: { raise: [-90,135], straddle: [-90,90], turn: [-90,90] },
  r_leg: { raise: [-90,135], straddle: [-90,90], turn: [-90,90] },
  l_knee: { bend: [0,150] }, r_knee: { bend: [0,150] },
  l_ankle: { bend: [-45,45], turn: [-45,45] },
  r_ankle: { bend: [-45,45], turn: [-45,45] },
};
export const POSES = {
  standing: { l_arm: { raise: -5 }, r_arm: { raise: -5 } },
  sitting: { l_leg: { raise: 90 }, r_leg: { raise: 90 }, l_knee: { bend: 90 }, r_knee: { bend: 90 }, l_elbow: { bend: 70 }, r_elbow: { bend: 70 } },
  pointing: { r_arm: { raise: 90 }, r_elbow: { bend: 5 } },
  reaching: { torso: { bend: 18 }, r_arm: { raise: 65 }, r_elbow: { bend: 15 } },
};
export const PROP_TYPES = ['box', 'table', 'chair', 'sphere'];
export const CHEST_DEFAULTS = {height:0.65,spacing:0.46,projection:1};
export const CHEST_LIMITS = {height:[0.55,0.78],spacing:[0.3,0.6],projection:[0.4,1.6]};
export function chestIssues(value,path='chest') {
  const errors=[];
  const add=(p,message)=>errors.push({severity:'error',path:p,code:'CHEST_PROFILE',message});
  if(!value||typeof value!=='object'||Array.isArray(value)){add(path,'가슴 형태는 height·spacing·projection 객체로 지정하세요.');return errors;}
  for(const key of Object.keys(value))if(!Object.hasOwn(CHEST_LIMITS,key))add(path+'.'+key,'지원하지 않는 가슴 형태 항목입니다.');
  for(const [key,[low,high]]of Object.entries(CHEST_LIMITS))if(value[key]!==undefined&&(!Number.isFinite(value[key])||value[key]<low||value[key]>high))add(path+'.'+key,`${low}~${high} 범위의 숫자가 필요합니다.`);
  return errors;
}
export function normalizeChest(value){return Object.fromEntries(Object.entries(CHEST_DEFAULTS).map(([key,fallback])=>[key,value?.[key]===undefined?fallback:value[key]]));}

function collector() {
  const errors=[],warnings=[];
  const short=v=>v===undefined?'(필드 없음)':JSON.stringify(v)?.slice(0,180);
  function issue(severity,path,code,message,expected,actual) {
    const list=severity==='error'?errors:warnings;
    if(list.length<100)list.push({severity,path,code,message,...(expected!==undefined?{expected}:{}),actual:short(actual)});
  }
  const error=(p,c,m,e,a)=>issue('error',p,c,m,e,a),warn=(p,c,m)=>issue('warning',p,c,m);
  const obj=(v,p)=>{if(!v||typeof v!=='object'||Array.isArray(v)){error(p,'OBJECT_REQUIRED','객체가 필요합니다.','object',v);return {};}return v;};
  const keys=(o,allowed,p)=>{for(const k of Object.keys(o))if(!allowed.includes(k))error(p?p+'.'+k:k,'UNKNOWN_FIELD','지원하지 않는 필드입니다. 오타 또는 다른 포맷인지 확인하세요.',allowed.join(', '),o[k]);};
  const num=(v,p,min=-100,max=100)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max){error(p,'NUMBER_RANGE',min+'~'+max+' 범위의 유한한 숫자가 필요합니다.',{type:'number',min,max},v);return min;}return v;};
  const vec=(v,p,min=-100,max=100)=>{if(!Array.isArray(v)||v.length!==3){error(p,'VECTOR_REQUIRED','숫자 3개로 된 [x, y, z] 배열이 필요합니다.','[number, number, number]',v);return [0,0,0];}return v.map((n,i)=>num(n,p+'['+i+']',min,max));};
  const str=(v,p,fallback='')=>{if(v===undefined)return fallback;if(typeof v!=='string'||v.length>12000){error(p,'STRING_REQUIRED','12000자 이하 문자열이 필요합니다.','string, maxLength 12000',v);return fallback;}return v;};
  const color=(v,p,fallback)=>{if(v===undefined)return fallback;if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v)){error(p,'COLOR_REQUIRED','#RRGGBB 형식의 색상이 필요합니다.','#RRGGBB',v);return fallback;}return v;};
  const list=(v,p,max)=>{if(!Array.isArray(v)||v.length>max){error(p,'ARRAY_LIMIT','최대 '+max+'개의 객체 배열이 필요합니다.',{type:'array',maxItems:max},v);return [];}return v.map((x,i)=>obj(x,p+'['+i+']'));};
  function camera(input,p='camera') {
    const c=obj(input,p);keys(c,['position','target','fov','zoom','view'],p);
    const position=vec(c.position,p+'.position'),target=vec(c.target,p+'.target');
    if(Array.isArray(c.position)&&Array.isArray(c.target)&&position.every((x,i)=>Math.abs(x-target[i])<1e-6))error(p,'CAMERA_NO_DIRECTION','카메라 위치와 목표점은 달라야 합니다.','position != target',c);
    const projection={};if(c.zoom!==undefined)projection.zoom=num(c.zoom,p+'.zoom',.0001,10000);if(c.view!==undefined){if(c.view===null)projection.view=null;else{const v=obj(c.view,p+'.view');keys(v,['enabled','fullWidth','fullHeight','offsetX','offsetY','width','height'],p+'.view');if(typeof v.enabled!=='boolean')error(p+'.view.enabled','BOOLEAN_REQUIRED','true 또는 false가 필요합니다.');projection.view={enabled:!!v.enabled};for(const k of ['fullWidth','fullHeight','width','height'])projection.view[k]=num(v[k],p+'.view.'+k,.0001,1000000);for(const k of ['offsetX','offsetY'])projection.view[k]=num(v[k],p+'.view.'+k,-1000000,1000000);}}return {position,target,fov:num(c.fov===undefined?40:c.fov,p+'.fov',10,100),...projection};
  }
  return {errors,warnings,error,warn,obj,keys,num,vec,str,color,list,camera};
}
export class SceneValidationError extends Error {
  constructor(issues) {super(issues.map(x=>x.path+': '+x.message).join('\n'));this.name='SceneValidationError';this.issues=issues;}
}
export function validateCamera(input,path='camera') {
  const c=collector(),value=c.camera(input,path);
  if(c.errors.length)throw new SceneValidationError(c.errors);
  return value;
}
export function analyzeScene(input) {
  const c=collector(),{error,warn,obj,keys,num,vec,str,color,list,camera}=c;
  const raw=obj(input,'$');
  keys(raw,['version','units','title','sourceText','assumptions','room','actors','props','camera','lighting','shots'],'');
  if(raw.version!==1)error('version','VERSION_REQUIRED','장면 버전은 1이어야 합니다.',1,raw.version);
  if(raw.units!=='meters')error('units','UNITS_REQUIRED','길이 단위는 meters만 지원합니다.','meters',raw.units);
  if(raw.room===undefined)warn('room','DEFAULT_ROOM','방 정보가 없어 기본 방 6×3×5m를 사용합니다.');
  if(raw.lighting===undefined)warn('lighting','DEFAULT_LIGHTING','조명 정보가 없어 기본 주광과 주변광을 사용합니다.');
  const room=raw.room===undefined?{}:obj(raw.room,'room');
  keys(room,['size','color','walls'],'room');
  if(room.walls!==undefined&&typeof room.walls!=='boolean')error('room.walls','BOOLEAN_REQUIRED','true 또는 false가 필요합니다.','boolean',room.walls);
  const ids=new Set();
  function id(v,p){const value=str(v,p);if(!/^[A-Za-z0-9_-]{1,64}$/.test(value))error(p,'INVALID_ID','1~64자의 영문·숫자·밑줄·하이픈 ID가 필요합니다.','[A-Za-z0-9_-]{1,64}',v);else if(ids.has(value))error(p,'DUPLICATE_ID','인물·소품 ID가 중복됩니다. 고유한 ID로 바꾸세요.','unique actor/prop id',v);ids.add(value);return value;}
  const actors=list(raw.actors===undefined?[]:raw.actors,'actors',12).map((a,i)=>{
    const p='actors['+i+']';keys(a,['id','name','position','yaw','height','headUnits','chest','pose','joints','intent','role','description'],p);
    const chest=a.chest===undefined?undefined:normalizeChest(a.chest);
    if(a.chest!==undefined)c.errors.push(...chestIssues(a.chest,p+'.chest').slice(0,Math.max(0,100-c.errors.length)));
    const pose=a.pose===undefined?'standing':a.pose;
    if(typeof pose!=='string'||!Object.hasOwn(POSES,pose))error(p+'.pose','UNSUPPORTED_POSE','지원하지 않는 기본 포즈입니다.',Object.keys(POSES),pose);
    const joints={},entries=a.joints===undefined?{}:obj(a.joints,p+'.joints');
    for(const [joint,values]of Object.entries(entries)){
      if(!Object.hasOwn(JOINTS,joint)){error(p+'.joints.'+joint,'UNSUPPORTED_JOINT','지원하지 않는 관절 이름입니다.',Object.keys(JOINTS),joint);continue;}
      const props=obj(values,p+'.joints.'+joint);keys(props,Object.keys(JOINTS[joint]),p+'.joints.'+joint);joints[joint]={};
      for(const [key,value]of Object.entries(props))if(Object.hasOwn(JOINTS[joint],key))joints[joint][key]=num(value,p+'.joints.'+joint+'.'+key,...JOINTS[joint][key]);
    }
    return {id:id(a.id,p+'.id'),name:str(a.name,p+'.name',typeof a.id==='string'?a.id:''),position:vec(a.position,p+'.position'),yaw:num(a.yaw===undefined?0:a.yaw,p+'.yaw',-360,360),height:num(a.height===undefined?1.75:a.height,p+'.height',0.5,3),headUnits:num(a.headUnits===undefined?8:a.headUnits,p+'.headUnits',3,12),...(chest?{chest}:{}),pose,joints,intent:str(a.intent,p+'.intent'),role:str(a.role,p+'.role'),description:str(a.description,p+'.description')};
  });
  const props=list(raw.props===undefined?[]:raw.props,'props',80).map((a,i)=>{
    const p='props['+i+']';keys(a,['id','name','type','position','size','yaw','color','role','intent','description'],p);
    if(!PROP_TYPES.includes(a.type))error(p+'.type','UNSUPPORTED_PROP','지원하지 않는 소품 형상입니다.',PROP_TYPES,a.type);
    return {id:id(a.id,p+'.id'),name:str(a.name,p+'.name',typeof a.id==='string'?a.id:''),type:a.type,position:vec(a.position,p+'.position'),size:vec(a.size,p+'.size',0.02,20),yaw:num(a.yaw===undefined?0:a.yaw,p+'.yaw',-360,360),color:color(a.color,p+'.color','#8c7965'),role:str(a.role,p+'.role'),intent:str(a.intent,p+'.intent'),description:str(a.description,p+'.description')};
  });
  const shotIds=new Set();
  const shots=list(raw.shots===undefined?[]:raw.shots,'shots',24).map((s,i)=>{
    const p='shots['+i+']';keys(s,['id','name','purpose','camera'],p);const sid=str(s.id,p+'.id','shot-'+(i+1));
    if(!/^[A-Za-z0-9_-]{1,64}$/.test(sid)||shotIds.has(sid))error(p+'.id','DUPLICATE_OR_INVALID_SHOT_ID','고유한 영문·숫자 ID가 필요합니다.','unique shot id',s.id);
    shotIds.add(sid);return {id:sid,name:str(s.name,p+'.name','컷 '+(i+1)),purpose:str(s.purpose,p+'.purpose'),camera:camera(s.camera,p+'.camera')};
  });
  const light=raw.lighting===undefined?{}:obj(raw.lighting,'lighting');keys(light,['position','target','color','intensity','ambient'],'lighting');
  const scene={version:1,units:'meters',title:str(raw.title,'title','새 장면'),sourceText:str(raw.sourceText,'sourceText'),assumptions:str(raw.assumptions,'assumptions'),
    room:{size:vec(room.size===undefined?[6,3,5]:room.size,'room.size',1,30),color:color(room.color,'room.color','#b9b5ac'),walls:room.walls!==false},actors,props,camera:camera(raw.camera),shots,
    lighting:{position:vec(light.position===undefined?[-3,5,3]:light.position,'lighting.position'),target:vec(light.target===undefined?[0,1,0]:light.target,'lighting.target'),color:color(light.color,'lighting.color','#fff0d6'),intensity:num(light.intensity===undefined?2:light.intensity,'lighting.intensity',0,10),ambient:num(light.ambient===undefined?0.6:light.ambient,'lighting.ambient',0,3)}};
  if(!c.errors.length){
    const [w,h,d]=scene.room.size;
    for(const [i,a]of actors.entries()){
      if(Math.abs(a.position[0])>w/2||Math.abs(a.position[2])>d/2)warn('actors['+i+'].position','OUTSIDE_ROOM',a.name+'의 기준점이 방 바닥 범위 밖에 있습니다. 의도한 배치인지 확인하세요.');
      if(a.position[1]<-0.02)warn('actors['+i+'].position[1]','BELOW_FLOOR',a.name+'의 인체 최저점이 바닥 아래로 지정되어 있습니다.');
      if(a.pose==='standing'&&a.position[1]+a.height>h+0.05)warn('actors['+i+'].height','ABOVE_CEILING',a.name+'의 키와 높이가 방 높이를 넘습니다. 렌더에서 확인하세요.');
    }
    for(const [i,p]of props.entries()){
      const angle=p.yaw*Math.PI/180,x=(Math.abs(p.size[0]*Math.cos(angle))+Math.abs(p.size[2]*Math.sin(angle)))/2,z=(Math.abs(p.size[2]*Math.cos(angle))+Math.abs(p.size[0]*Math.sin(angle)))/2;
      if(Math.abs(p.position[0])+x>w/2+0.01||Math.abs(p.position[2])+z>d/2+0.01)warn('props['+i+'].position','PROP_OUTSIDE_ROOM',p.name+'의 단순 외곽이 방 범위를 벗어납니다.');
      if(p.position[1]<-0.02)warn('props['+i+'].position[1]','BELOW_FLOOR',p.name+'의 밑면이 바닥 아래입니다.');
    }
    for(const [p,cam]of [['camera',scene.camera],...shots.map((s,i)=>['shots['+i+'].camera',s.camera])])if(scene.room.walls&&(cam.position[0]<-w/2||cam.position[2]<-d/2))warn(p+'.position','BEHIND_WALL','카메라가 표시된 뒤쪽 벽 바깥에 있어 벽이 인물을 가릴 수 있습니다.');
    if(!actors.length)warn('actors','NO_ACTORS','인물이 없는 장면입니다. 의도한 환경 컷인지 확인하세요.');
  }
  return {valid:c.errors.length===0,errors:c.errors,warnings:c.warnings,scene:c.errors.length?null:scene};
}
export function validateScene(input) {
  const report=analyzeScene(input);
  if(!report.valid)throw new SceneValidationError(report.errors);
  return report.scene;
}

export const EXAMPLE_SCENE = {
  version:1, units:'meters', title:'문 앞의 방문자',
  sourceText:'지훈은 탁자 앞에 서 있었다. 문가에 멈춰 선 서연이 그를 바라봤다. 탁자 위에는 작은 상자가 놓여 있었다.',
  assumptions:'방 크기·인물 키·위치·저녁빛은 연출을 위한 추정이다. 두 인물과 상자가 함께 읽히는 한 순간을 선택했다.',
  room:{size:[6,3,5],color:'#b9b5ac',walls:true},
  actors:[
    {id:'jihoon',name:'지훈',position:[-0.8,0,0],yaw:35,height:1.78,pose:'standing',joints:{head:{turn:25}},role:'탁자 앞에 선 인물',intent:'문가의 서연을 돌아본다'},
    {id:'seoyeon',name:'서연',position:[1.6,0,-1.4],yaw:-40,height:1.65,pose:'standing',joints:{head:{turn:-15}},role:'문가에 멈춘 방문자',intent:'지훈을 바라본다'},
  ],
  props:[
    {id:'table',name:'탁자',type:'table',role:'상자를 받치는 탁자',intent:'탁자 위 상자와 두 인물의 관계를 보여준다',description:'세부 디자인은 미정인 직사각형 탁자',position:[0,0,-0.2],size:[1.5,0.75,0.8],yaw:0,color:'#8c7965'},
    {id:'box',name:'작은 상자',type:'box',role:'탁자 위 소품',intent:'원문에 등장한 작은 상자의 위치를 표시한다',description:'내용물과 세부 재질은 미정인 작은 직육면체 상자',position:[0.2,0.75,-0.2],size:[0.3,0.22,0.25],yaw:10,color:'#b48c58'},
  ],
  camera:{position:[4,2.5,6],target:[0.1,1,-0.5],fov:42},
  lighting:{position:[-3,5,2],target:[0,1,-0.5],color:'#ffe1b0',intensity:2.4,ambient:0.6},
  shots:[
    {id:'wide',name:'관계와 공간',purpose:'두 인물과 탁자의 상자를 함께 보여준다',camera:{position:[4,2.5,6],target:[0.1,1,-0.5],fov:42}},
    {id:'low',name:'상자 너머',purpose:'탁자를 전경에 두고 방문자를 바라본다',camera:{position:[-2.2,1.15,2.5],target:[1,1.2,-1.2],fov:48}},
  ],
};
