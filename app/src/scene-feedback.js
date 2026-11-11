import { analyzeScene, validateCamera, chestIssues } from './scene-format.js';

const issue=(path,code,message,expected,actual)=>({severity:'error',path,code,message,expected,actual});
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const orders=['XYZ','XZY','YXZ','YZX','ZXY','ZYX'];
export function analyzeEditorState(data) {
  const errors=[],warnings=[];
  const add=(p,c,m,e,a)=>{if(errors.length<100)errors.push(issue(p,c,m,e,a));};
  function vector(value,p,positive=false){
    if(!Array.isArray(value)||value.length!==3||value.some(n=>typeof n!=='number'||!Number.isFinite(n)||Math.abs(n)>1e6||(positive&&n<=0)))add(p,'INVALID_TRANSFORM','유한한 숫자 3개의 변환 배열이 필요합니다.',positive?'three positive numbers':'three finite numbers',value);
  }
  function rotation(value,p){
    if(!Array.isArray(value)||![3,4].includes(value.length)||value.slice(0,3).some(n=>typeof n!=='number'||!Number.isFinite(n))||(value.length===4&&!orders.includes(value[3])))add(p,'INVALID_ROTATION','라디안 회전값 3개와 선택적인 Euler 순서가 필요합니다.','[x,y,z] or [x,y,z,"XYZ"]',value);
  }
  function transform(m,p){
    if(!plain(m)){add(p,'OBJECT_REQUIRED','변환 객체가 필요합니다.','object',m);return;}
    vector(m.position,p+'.position');rotation(m.rotation,p+'.rotation');vector(m.scale,p+'.scale',true);
    if(m.sceneNotes!==undefined){if(!plain(m.sceneNotes))add(p+'.sceneNotes','OBJECT_REQUIRED','대상 설명은 객체여야 합니다.');else for(const [key,value]of Object.entries(m.sceneNotes))if(key==='lookAt'?!(typeof value==='string'&&value.length<=64||Array.isArray(value)&&value.length===3&&value.every(Number.isFinite)):key==='expression'?typeof value!=='string'||value.length>200:!['role','intent','description'].includes(key)||typeof value!=='string'||value.length>12000)add(p+'.sceneNotes.'+key,'INVALID_DESCRIPTION','역할·배치 의도·외형 설명은 12000자 이하 문자열로 지정하세요.');}
    if(m.name!==undefined&&typeof m.name!=='string')add(p+'.name','STRING_REQUIRED','이름은 문자열이어야 합니다.');
  }
  function mannequin(m,p){
    transform(m,p);if(!plain(m))return;
    if(m.bodyProfile!==undefined){
      const b=m.bodyProfile;
      if(!plain(b)||!Number.isFinite(b.height)||b.height<0.5||b.height>3||!Number.isFinite(b.headUnits)||b.headUnits<3||b.headUnits>12)add(p+'.bodyProfile','BODY_PROFILE','체형은 키 0.5~3m, 등신 비율 3~12로 지정하세요.');
      if(plain(b)&&b.chest!==undefined)errors.push(...chestIssues(b.chest,p+'.bodyProfile.chest'));
      if(m.boneLayout===undefined)warnings.push({severity:'warning',path:p+'.boneLayout',code:'LEGACY_RIG',message:'체형 정보에 뼈 길이 고정 기준이 없습니다. 불러온 현재 길이를 기준으로 잠그며 원래 비율은 검증할 수 없습니다.'});
    }
    if(m.boneLayout!==undefined){
      const layout=m.boneLayout;
      if(!plain(layout)||!plain(layout.joints)||!plain(layout.headImage))add(p+'.boneLayout','RIG_LOCK','뼈 길이 고정 정보가 올바르지 않습니다.');
      else {
        vector(layout.rootScale,p+'.boneLayout.rootScale',true);
        const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<1e-8);
        if(!same(m.scale,layout.rootScale))add(p+'.scale','BODY_SCALE_LOCKED','포즈에서 몸 전체 크기를 바꿀 수 없습니다. 체형 설정을 사용하세요.');
        if(plain(m.joints))for(const [key,j]of Object.entries(m.joints)){
          const lock=layout.joints[key];
          if(!plain(j)||!lock||!same(j.position,lock.position)||!same(j.scale,lock.scale))add(p+'.joints.'+key,'BONE_LENGTH_LOCKED','관절 위치·길이·크기가 고정값과 다릅니다. 포즈는 회전으로만 수정하세요.');
        }
      }
    }
    const shape=[3,3,3,3,3,1,3,3,1,3,3,1,3,7,7,7,7,7,3,1,3,7,7,7,7,7];
    if(!plain(m.posture)||m.posture.version!==7||!Array.isArray(m.posture.data)||m.posture.data.length!==shape.length||m.posture.data.some((a,i)=>!Array.isArray(a)||a.length!==shape[i]||a.some(n=>typeof n!=='number'||!Number.isFinite(n))))add(p+'.posture','INVALID_POSTURE','지원하는 마네킹 v7 자세 데이터 형식이 아닙니다.','version 7; 26 correctly shaped numeric rows',m.posture);
    if(m.joints!==undefined){
      if(!plain(m.joints))add(p+'.joints','OBJECT_REQUIRED','관절 변환 객체가 필요합니다.','object',m.joints);
      else for(const [key,value]of Object.entries(m.joints)){
        if(['__proto__','constructor','prototype'].includes(key))add(p+'.joints.'+key,'INVALID_JOINT','지원하지 않는 관절 키입니다.');
        else transform(value,p+'.joints.'+key);
      }
    }
  }
  function imported(m,p){
    transform(m,p);if(!plain(m))return;
    if(m.attachTo!==undefined&&!(plain(m.attachTo)&&typeof m.attachTo.actor==='string'&&['right','left'].includes(m.attachTo.hand)))add(p+'.attachTo','INVALID_ATTACH','손에 든 소품은 {actor, hand: right|left}로 적습니다.');
    if(m.studioId!==undefined&&(typeof m.studioId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(m.studioId)))add(p+'.studioId','INVALID_ID','소품 ID는 1~64자의 영문·숫자·밑줄·하이픈이어야 합니다.');
    if(m.primitive){
      // Checked alone, so the holder of a hand-held prop is checked by shape only.
      const {attachTo,...alone}=m.primitive;if(attachTo!==undefined&&!(plain(attachTo)&&typeof attachTo.actor==='string'&&['right','left'].includes(attachTo.hand)))add(p+'.primitive.attachTo','INVALID_ATTACH','손에 든 소품은 {actor, hand: right|left}로 적습니다.');
      const r=analyzeScene({version:1,units:'meters',actors:[],props:[alone],camera:{position:[0,1,5],target:[0,1,0]}});
      errors.push(...r.errors.map(x=>({...x,path:x.path.replace('props[0]',p+'.primitive')})));
    }else if(typeof m.glbBase64!=='string'||!m.glbBase64.length||m.glbBase64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(m.glbBase64))add(p+'.glbBase64','MISSING_MODEL','복원할 GLB 데이터 또는 단순 소품 정의가 없습니다.','embedded GLB base64 or primitive');
  }
  if(!plain(data))return {valid:false,errors:[issue('$','PROJECT_REQUIRED','프로젝트 객체가 필요합니다.')],warnings};
  if(data.type==='mannequin'){mannequin(data,'object');return {valid:!errors.length,errors,warnings};}
  if(data.type==='importedModel'){imported(data,'object');return {valid:!errors.length,errors,warnings};}
  for(const [key,max,fn]of [['mannequins',100,mannequin],['importedModels',400,imported]]){
    const items=data[key]??(key==='importedModels'?[]:undefined);
    if(!Array.isArray(items)||items.length>max)add(key,'PROJECT_ARRAY','올바른 프로젝트 객체 배열이 필요합니다.','array, max '+max,items);
    else items.forEach((m,i)=>fn(m,key+'['+i+']'));
  }
  if(data.selectedBodyPart!==undefined&&!['Root','Torso','Neck','Head','Left_Arm','Left_Elbow','Left_Wrist','Left_Leg','Left_Knee','Left_Ankle','Right_Arm','Right_Elbow','Right_Wrist','Right_Leg','Right_Knee','Right_Ankle'].includes(data.selectedBodyPart))add('selectedBodyPart','INVALID_SELECTION','지원하지 않는 선택 관절입니다.');
  if(data.camera!==undefined){
    if(!plain(data.camera))add('camera','OBJECT_REQUIRED','카메라 객체가 필요합니다.');
    else {
    vector(data.camera.position,'camera.position');rotation(data.camera.rotation,'camera.rotation');
    if(data.camera.target!==undefined)vector(data.camera.target,'camera.target');
    if(data.camera.fov!==undefined&&(typeof data.camera.fov!=='number'||!Number.isFinite(data.camera.fov)||data.camera.fov<10||data.camera.fov>100))add('camera.fov','NUMBER_RANGE','화각은 10~100도여야 합니다.');
    }
  }
  const projection=(value,path)=>{try{validateCamera({position:[0,0,1],target:[0,0,0],fov:40,zoom:value?.zoom,view:value?.view},path);}catch(e){errors.push(...(e.issues||[issue(path,'INVALID_PROJECTION',e.message)]));}};
  if(data.camera)projection(data.camera,'camera');
  if(data.fixedView!==undefined&&data.fixedView!==null){const f=data.fixedView;if(!plain(f)||typeof f.enabled!=='boolean'||!['working','shot'].includes(f.role)||!Number.isFinite(f.zoom)||f.zoom<.25||f.zoom>4||!Number.isFinite(f.panX)||!Number.isFinite(f.panY))add('fixedView','INVALID_FIXED_VIEW','유효한 고정 화면·팬·줌 상태가 필요합니다.');}
  if(data.studio!==undefined){
    if(!plain(data.studio)){add('studio','OBJECT_REQUIRED','스튜디오 상태 객체가 필요합니다.');}
    else {
      const s=data.studio,r=analyzeScene(s.document);if(s.shotProjection!==undefined&&s.shotProjection!==null){if(!plain(s.shotProjection)||typeof s.shotProjection.key!=='string')add('studio.shotProjection','INVALID_PROJECTION','유효한 촬영 투영 상태가 필요합니다.');else projection(s.shotProjection,'studio.shotProjection');}
      errors.push(...r.errors.map(x=>({...x,path:'studio.document.'+x.path})));
      if(s.initialProposal!==undefined){const initial=analyzeScene(s.initialProposal);errors.push(...initial.errors.map(x=>({...x,path:'studio.initialProposal.'+x.path})));}
      if(!Array.isArray(s.shots)||s.shots.length>24)add('studio.shots','PROJECT_SHOTS','최대 24개의 카메라 컷 배열이 필요합니다.');
      else {
        const shotIds=new Set();
        s.shots.forEach((shot,i)=>{
          const p='studio.shots['+i+']';
          if(!plain(shot)){add(p,'OBJECT_REQUIRED','카메라 컷 객체가 필요합니다.');return;}
          if(typeof shot.id!=='string'||shotIds.has(shot.id))add(p+'.id','DUPLICATE_ID','고유한 컷 ID가 필요합니다.');shotIds.add(shot.id);
          try{validateCamera(shot.camera,p+'.camera');}catch(e){errors.push(...(e.issues||[issue(p,'INVALID_CAMERA',e.message)]));}
        });
        if(!Number.isInteger(s.activeShot)||s.activeShot< -1||s.activeShot>=s.shots.length)add('studio.activeShot','INVALID_SHOT_INDEX','선택 컷 번호가 실제 컷 범위를 벗어납니다.');
      }
      if(typeof s.aspect!=='number'||!Number.isFinite(s.aspect)||s.aspect<0.1||s.aspect>10)add('studio.aspect','INVALID_ASPECT','유효한 촬영 화면비가 필요합니다.');
    }
  }else warnings.push({severity:'warning',path:'studio',code:'LEGACY_PROJECT',message:'구형 프로젝트입니다. 공간·조명·컷 정보가 없어 현재 편집기의 환경이 유지됩니다.'});
  return {valid:!errors.length,errors:errors.slice(0,100),warnings};
}
export function analyzeInputText(text,source='붙여넣기',sceneOnly=false) {
  const base={reportVersion:1,source,originalJSON:text,inputKind:'scene',valid:false,applied:false,errors:[],warnings:[],visualReview:false,
    scope:'JSON 문법·지원 필드·자료형·수치 범위와 일부 공간 경고를 검사합니다. 해부학·접촉·시선·가림·최종 구도는 렌더에서 확인해야 합니다.'};
  if(typeof text!=='string'||new TextEncoder().encode(text).length>(sceneOnly?2_000_000:40_000_000))return {...base,errors:[issue('$','INPUT_TOO_LARGE','JSON 파일 크기 제한을 넘었습니다.',sceneOnly?'2MB 이하':'40MB 이하')]};
  let data;
  try{data=JSON.parse(text.replace(/^\uFEFF/,''));}
  catch(e){
    const position=Number(e.message.match(/position (\d+)/)?.[1]),prefix=Number.isFinite(position)?text.slice(0,position):'';
    const line=Number.isFinite(position)?prefix.split('\n').length:null,column=Number.isFinite(position)?prefix.length-prefix.lastIndexOf('\n'):null;
    const message=text.trim().startsWith('~~~')||text.trim().startsWith(String.fromCharCode(96).repeat(3))?'코드 펜스를 제거하고 JSON 객체만 넣어주세요.':'JSON 문법 오류입니다. 쉼표·따옴표·괄호를 확인하세요.';
    return {...base,errors:[{...issue('$','JSON_SYNTAX',message),line,column,parserMessage:e.message}]};
  }
  const native=plain(data)&&(data.editorState||data.mannequins||data.type==='mannequin'||data.type==='importedModel');
  if(native&&sceneOnly)return {...base,inputKind:'project',errors:[issue('$','WRONG_IMPORT','정밀 프로젝트/전달 묶음입니다. 위쪽 Load에서 열어주세요.','scene JSON at this input')]};
  if(native){
    const value=data.editorState||data,r=analyzeEditorState(value);
    return {...base,...r,inputKind:data.type?'object':'project',value};
  }
  const r=analyzeScene(data);
  return {...base,...r,value:r.scene};
}
export function publicReport(report) {
  const {value,scene,...result}=report;
  return result;
}
export function repairRequest(report) {
  return ['컷신 스튜디오의 JSON 검사 결과입니다. 원본 JSON에서 보고된 오류를 수정해 주세요.',
    '경고는 장면 의도와 대조해 필요한 경우만 수정하세요. 문제없는 인물 ID·포즈·소품·카메라·조명과 사용자 수정은 유지하세요.',
    report.inputKind==='scene'?'편집기가 지원하는 version=1 장면 JSON 객체 하나를 반환하세요.':'정밀 프로젝트의 라디안 회전·로컬 관절·사용자 배치를 보존하고 같은 프로젝트 형식으로 반환하세요. 최초 제안으로 재생성하지 마세요.',
    '원문 사건을 추가하거나 지원하지 않는 필드를 새로 만들지 마세요. JSON 검사 통과를 시각 검증 완료라고 설명하지 마세요.',
    '',JSON.stringify(publicReport(report),null,2)].join('\n');
}
