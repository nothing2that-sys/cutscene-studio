// Cutscene Studio extension to fanverseio/pose-toolkit. GPL-3.0.
import { validateScene, EXAMPLE_SCENE, POSES } from './scene-format.js';
import './studio.css';
import { constrainBody, captureBoneLayout, snapshotBodyJoints, chestLandmarks } from './body-rig.js';
import { analyzeInputText } from './scene-feedback.js';
import { createValidationPanel } from './validation-panel.js';

export function initCutsceneStudio(api) {
  const { THREE, stage } = api;
  let document = validateScene(EXAMPLE_SCENE);
  let initialProposal = structuredClone(document);
  let proposalOrigin = 'scene-import';
  const lightPresets={left:[-3,5,3],right:[3,5,3],back:[0,4,-4],top:[0,6,0]};
  let shots = [];
  let activeShot = -1;
  let aspect = 16/9;
  let lastFrame = 0;
  const environment = new THREE.Group();
  environment.name = 'Cutscene room';
  stage.scene.add(environment);
  stage.ground.visible = false;
  stage.light.shadow.mapSize.set(1024,1024);
  stage.light.shadow.camera.near = 0.1;
  stage.light.shadow.camera.far = 60;
  stage.light.shadow.camera.updateProjectionMatrix();
  const ambient = stage.scene.children.find(n=>n.isAmbientLight);
  const preview = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  preview.outputColorSpace = THREE.SRGBColorSpace;
  preview.shadowMap.enabled = true;
  preview.shadowMap.type = THREE.PCFSoftShadowMap;
  const shotCamera = new THREE.PerspectiveCamera(40,aspect,0.1,40);
  const panel = window.document.createElement('section');
  panel.id='studio-panel'; panel.className='glass-panel';
  panel.innerHTML=`
    <header class="studio-heading"><span class="eyebrow">LOCAL CUTSCENE STUDIO</span><h2>장면을 직접 연출하세요</h2><p>소설 → 장면 JSON → 포즈·구도 수정 → 촬영</p></header>
    <div class="studio-scroll">
      <div class="studio-row"><button id="studio-example" class="btn primary">예제 장면</button><label class="btn">장면 JSON 열기<input id="studio-file" type="file" accept=".json" hidden></label></div>
      <details><summary>LLM JSON 붙여넣기</summary><textarea id="studio-json" aria-label="LLM 장면 JSON" placeholder="LLM이 만든 장면 JSON을 붙여넣으세요"></textarea><div class="studio-row"><button id="studio-check" class="btn">검사만</button><button id="studio-apply" class="btn">장면 적용</button></div></details>
      <label class="studio-label">장면 제목<input id="studio-title" maxlength="200"></label>
      <details><summary>원문과 연출 의도</summary><label class="studio-label">소설 원문<textarea id="studio-source"></textarea></label><label class="studio-label">연출을 위해 추정한 정보<textarea id="studio-assumptions"></textarea></label></details>
      <details open><summary>공간과 조명</summary>
        <div class="studio-row"><span>방 크기 m</span><input id="studio-room-x" type="number" aria-label="방 너비" min="1" max="30" step="0.5"><input id="studio-room-y" type="number" aria-label="방 높이" min="1" max="30" step="0.5"><input id="studio-room-z" type="number" aria-label="방 깊이" min="1" max="30" step="0.5"></div>
        <label class="studio-check"><input id="studio-walls" type="checkbox"> 뒤쪽 벽 표시</label>
        <label class="studio-label">주광 세기 <input id="studio-light" type="range" min="0" max="6" step="0.1"></label>
        <label class="studio-label">주광 방향 <select id="studio-light-direction"><option value="custom" disabled>사용자 지정</option><option value="left">왼쪽 앞</option><option value="right">오른쪽 앞</option><option value="back">뒤쪽 역광</option><option value="top">위에서</option></select></label>
        <div class="studio-row"><label>빛 색 <input id="studio-light-color" type="color"></label><label>주변광 <input id="studio-ambient" type="number" min="0" max="3" step="0.1"></label></div>
      </details>
      <details><summary>소품 추가</summary><div class="studio-row"><button class="btn" data-prop="box">상자</button><button class="btn" data-prop="table">탁자</button><button class="btn" data-prop="chair">의자</button><button class="btn" data-prop="sphere">구체</button></div><p class="studio-help">오른쪽 목록에서 선택한 뒤 Move / Rotate로 옮깁니다. 크기는 장면 JSON의 size로 지정합니다.</p></details>
      <div class="studio-section"><h3>카메라 컷</h3><p class="studio-help">작업 화면을 돌려 구도를 찾고 저장하세요. 인물·포즈는 모든 카메라 컷이 공유합니다.</p>
        <div class="studio-row"><input id="studio-shot-name" aria-label="새 컷 이름" placeholder="컷 이름"><button id="studio-shot-add" class="btn">구도 저장</button></div>
        <div class="studio-row"><label>화각 <input id="studio-fov" type="number" min="10" max="100" value="40"></label><select id="studio-aspect" aria-label="촬영 화면비"><option value="1.7777777777777777">16:9</option><option value="1.3333333333333333">4:3</option><option value="1">1:1</option><option value="0.75">3:4</option><option value="0.5625">9:16</option></select></div>
        <div id="studio-shots"></div>
      </div>
      <div class="studio-section"><h3>촬영 미리보기</h3><div id="studio-preview"></div><p id="studio-caption" class="studio-help">컷을 저장하면 이곳에 촬영 구도가 표시됩니다.</p>
        <div class="studio-row"><button id="studio-color" class="btn primary">PNG 캡처</button><button id="studio-depth" class="btn">Depth PNG</button></div>
        <div class="studio-row"><button id="studio-packet" class="btn">LLM 전달 묶음</button><button id="studio-prompt" class="btn">작화 지시문</button></div>
      </div>
      <p class="studio-help">프로젝트 Save는 정밀 관절·공간·컷을 함께 저장합니다. LLM 연결 없이 오프라인으로 편집합니다.</p>
      <p class="studio-credit">Based on pose-toolkit · mannequin.js · Three.js</p>
    </div><output id="studio-status" role="status">예제 장면을 열거나 장면 JSON을 불러오세요.</output>`;
  window.document.getElementById('app').appendChild(panel);
  const $=id=>window.document.getElementById(id);
  $('studio-preview').appendChild(preview.domElement);
  const status=(text,error=false)=> { $('studio-status').textContent=text; $('studio-status').classList.toggle('error',error); };
  const run=fn=>{try{fn();}catch(e){status(e.message,true);console.error(e);}};
  const download=(name,data,type='application/json')=> {
    const url=URL.createObjectURL(new Blob([data],{type}));
    const a=window.document.createElement('a'); a.href=url; a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const feedback=createValidationPanel(panel.querySelector('.studio-scroll'),download,status);
  function readCamera() { return {position:stage.camera.position.toArray(),target:stage.controls.target.toArray(),fov:stage.camera.fov}; }
  function setCamera(camera,def) {
    camera.position.fromArray(def.position); camera.fov=def.fov; camera.lookAt(new THREE.Vector3(...def.target)); camera.updateProjectionMatrix();
  }
  function currentShot() { return shots[activeShot] || {name:'현재 작업 구도',purpose:'',camera:readCamera()}; }
  function updateShotCamera() {
    setCamera(shotCamera,currentShot().camera);
    shotCamera.aspect=aspect;
    shotCamera.far=Math.max(20,shotCamera.position.length()+Math.hypot(...document.room.size)*2);
    shotCamera.updateProjectionMatrix();
  }
  function cleanRender(fn) {
    const hidden=[];
    stage.scene.traverse(n=>{
      if(n.userData.editingWall&&!n.visible){hidden.push([n,false]);n.visible=true;}
      if(n.userData.exportHideWhenGizmoDisabled||n.userData.ikLimbKey||n.type==='GridHelper'||n.type==='AxesHelper') {hidden.push([n,n.visible]);n.visible=false;}
    });
    // Hide selection tint during capture without changing the selected part.
    const materials=[];
    stage.scene.traverse(n=>{
      if(n.userData.origEmissive && n.material) {
        const ms=Array.isArray(n.material)?n.material:[n.material];
        const originals=Array.isArray(n.userData.origEmissive)?n.userData.origEmissive:[n.userData.origEmissive];
        ms.forEach((m,i)=>{if(m.emissive&&originals[i]){materials.push([m,m.emissive.clone()]);m.emissive.copy(originals[i]);}});
      }
    });
    try{return fn();}finally{hidden.forEach(([n,v])=>n.visible=v);materials.forEach(([m,c])=>m.emissive.copy(c));}
  }
  function renderPNG(depth=false) {
    updateShotCamera();
    const width=aspect>=1?1600:Math.round(1600*aspect),height=Math.round(width/aspect);
    const previousSize=preview.getSize(new THREE.Vector2());
    const bg=stage.scene.background,override=stage.scene.overrideMaterial;
    let depthMaterial;
    try {
      preview.setSize(width,height,false);
      if(depth) {
        depthMaterial=new THREE.ShaderMaterial({
          uniforms:{near:{value:shotCamera.near},far:{value:shotCamera.far}},
          vertexShader:'varying float distanceZ; void main(){vec4 v=modelViewMatrix*vec4(position,1.); distanceZ=-v.z; gl_Position=projectionMatrix*v;}',
          fragmentShader:'uniform float near; uniform float far; varying float distanceZ; void main(){float d=1.-clamp((distanceZ-near)/(far-near),0.,1.); gl_FragColor=vec4(vec3(d),1.);}',
        });
        stage.scene.overrideMaterial=depthMaterial; stage.scene.background=new THREE.Color(0x000000);
      }
      cleanRender(()=>preview.render(stage.scene,shotCamera));
      return preview.domElement.toDataURL('image/png');
    } finally {
      stage.scene.background=bg; stage.scene.overrideMaterial=override;
      depthMaterial?.dispose(); preview.setSize(previousSize.x,previousSize.y,false);
    }
  }
  function savePNG(depth) {
    const url=renderPNG(depth); const a=window.document.createElement('a');
    a.download=`cutscene-${depth?'depth':'color'}.png`; a.href=url; a.click();
    status(depth?'선형 카메라 거리값을 담은 Depth PNG를 저장했습니다.':'촬영 카메라의 PNG를 저장했습니다.');
  }
  function poseThumbnail(model){
    if(!model)return '';
    const size=preview.getSize(new THREE.Vector2()),hidden=[];
    const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),height=Math.max(0.5,box.getSize(new THREE.Vector3()).length());
    const camera=new THREE.PerspectiveCamera(35,0.75,0.01,50);camera.position.copy(center).add(new THREE.Vector3(0.55,0.2,1).normalize().multiplyScalar(height*1.8));camera.lookAt(center);
    for(const object of [...api.mannequins,...api.importedModels,environment,stage.ground])if(object!==model){hidden.push([object,object.visible]);object.visible=false;}
    try{preview.setSize(180,240,false);cleanRender(()=>preview.render(stage.scene,camera));return preview.domElement.toDataURL('image/png');}
    finally{hidden.forEach(([object,visible])=>object.visible=visible);preview.setSize(size.x,size.y,false);}
  }
  function clearEnvironment() {
    for(const child of [...environment.children]) {
      environment.remove(child);
      child.traverse(n=> {n.geometry?.dispose(); if(n.material){for(const m of [n.material].flat())m.dispose();}});
    }
  }
  function rebuildRoom() {
    clearEnvironment();
    const [w,h,d]=document.room.size;
    const material=new THREE.MeshStandardMaterial({color:document.room.color,roughness:0.9,side:THREE.DoubleSide});
    const add=(size,position,wall)=> {const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material.clone());m.position.set(...position);m.receiveShadow=true;if(wall)m.userData.editingWall=wall;environment.add(m);};
    add([w,0.08,d],[0,-0.04,0]);
    if(document.room.walls) {add([w,h,0.08],[0,h/2,-d/2],'back');add([0.08,h,d],[-w/2,h/2,0],'left');}
    material.dispose();
    stage.scene.background=new THREE.Color('#252b34');
    stage.ground.visible=false;
    const light=document.lighting;
    stage.light.position.fromArray(light.position); stage.light.color.set(light.color);stage.light.intensity=light.intensity;
    stage.light.target.position.fromArray(light.target);stage.scene.add(stage.light.target);
    stage.light.shadow.camera.left=-w;stage.light.shadow.camera.right=w;
    stage.light.shadow.camera.top=Math.max(w,d);stage.light.shadow.camera.bottom=-Math.max(w,d);stage.light.shadow.camera.updateProjectionMatrix();
    if(ambient)ambient.intensity=light.ambient;
  }
  function createProp(def) {
    const group=new THREE.Group();group.name=def.name;group.userData.primitive=structuredClone(def);
    const [w,h,d]=def.size;
    const material=new THREE.MeshStandardMaterial({color:def.color,roughness:0.8});
    const box=(size,p)=> {const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...p);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);};
    if(def.type==='sphere') {const mesh=new THREE.Mesh(new THREE.SphereGeometry(0.5,24,16),material);mesh.scale.set(w,h,d);mesh.position.y=h/2;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
    else if(def.type==='table'||def.type==='chair') {
      const seat=def.type==='chair'?h*0.48:h;
      box([w,0.06,d],[0,seat-0.03,0]);
      for(const x of [-1,1])for(const z of [-1,1])box([0.06,Math.max(0.02,seat-0.06),0.06],[x*(w/2-0.04),(seat-0.06)/2,z*(d/2-0.04)]);
      if(def.type==='chair')box([w,h-seat,0.06],[0,seat+(h-seat)/2,-d/2+0.03]);
    } else box([w,h,d],[0,h/2,0]);
    group.position.fromArray(def.position);group.rotation.y=THREE.MathUtils.degToRad(def.yaw);return group;
  }
  function loadScene(raw) {
    const next=validateScene(raw); // Validate the entire proposal before changing the scene.
    const data={mannequins:[],importedModels:[],activeIndex:0,activeImportIndex:-1,selectedBodyPart:'Root'};
    for(const actor of next.actors) {
      const m=api.createFullMannequin({height:actor.height,headUnits:actor.headUnits,...(actor.chest?{chest:actor.chest}:{})});
      // Mannequin.js adds new instances to its shared scene automatically.
      stage.scene.remove(m);
      // Scale the standing body first; bending must not change the person's height.
      m.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(m);
      // Height and head-unit proportions are configured before applying the pose.
      for(const [joint,values] of Object.entries(POSES[actor.pose]))for(const [key,v]of Object.entries(values))m[joint][key]=v;
      for(const [joint,values] of Object.entries(actor.joints))for(const [key,v]of Object.entries(values))m[joint][key]=v;
      constrainBody(m);m.rotation.y=THREE.MathUtils.degToRad(actor.yaw);m.updateMatrixWorld(true);
      const bottom=new THREE.Box3().setFromObject(m).min.y;
      m.position.x=actor.position[0];m.position.z=actor.position[2];m.position.y+=actor.position[1]-bottom;
      data.mannequins.push({name:actor.name,studioId:actor.id,bodyProfile:m.userData.bodyProfile,boneLayout:captureBoneLayout(m),joints:snapshotBodyJoints(m),position:m.position.toArray(),rotation:m.rotation.toArray(),scale:m.scale.toArray(),posture:m.posture});
    }
    data.importedModels=next.props.map(p=>({name:p.name,primitive:p,position:p.position,rotation:[0,THREE.MathUtils.degToRad(p.yaw),0,'XYZ'],scale:[1,1,1]}));
    const camera=new THREE.PerspectiveCamera();setCamera(camera,next.camera);
    data.camera={...next.camera,rotation:camera.rotation.toArray()};
    data.studio={document:next,initialProposal:structuredClone(next),proposalOrigin:'scene-import',shots:next.shots.length?next.shots:[{id:'initial',name:'첫 구도',purpose:'초기 추천 구도',camera:next.camera}],activeShot:0,aspect};
    api.applyState(JSON.stringify(data));api.commit();
    status(`「${next.title}」 · 인물 ${next.actors.length}명, 소품 ${next.props.length}개를 배치했습니다.`);
  }
  function showImportError(error,text='',source='불러오기',scenePreserved=true) {
    const report={reportVersion:1,source,originalJSON:text,inputKind:'project',valid:false,applied:false,scenePreserved,visualReview:false,errors:error.issues||[{severity:'error',path:'$',code:'IMPORT_FAILED',message:error.message}],warnings:[]};
    feedback.show(report);status(error.message,true);
  }
  function importText(text,source='붙여넣기',sceneOnly=true,apply=true) {
    const report=analyzeInputText(text,source,sceneOnly);
    feedback.show(report);
    if(!report.valid){status('JSON 오류 '+report.errors.length+'개 · 입력을 적용하지 않았습니다.',true);return false;}
    if(!apply){status('검사 완료 · 오류 0개 / 경고 '+report.warnings.length+'개 · 아직 적용하지 않았습니다.');return true;}
    const previous=api.getState();
    try {
      if(report.inputKind==='scene')loadScene(report.value);
      else if(report.inputKind==='object')api.addObject(report.value);
      else {api.applyState(JSON.stringify(report.value));api.commit();}
      report.applied=true;feedback.show(report);
      const counts=report.inputKind==='scene'?' · 인물 '+report.value.actors.length+'명, 소품 '+report.value.props.length+'개':'';
      status('입력 적용 완료'+counts+' · 오류 0개 / 경고 '+report.warnings.length+'개');return true;
    }catch(error){
      let preserved=true;try{api.applyState(JSON.stringify(previous));}catch{preserved=false;}
      report.valid=false;report.scenePreserved=preserved;report.errors.push({severity:'error',path:'$',code:'APPLY_FAILED',message:error.message});
      feedback.show(report);status('입력 적용에 실패했습니다. 검사 보고서를 확인하세요.',true);return false;
    }
  }
  function renderShots() {
    const list=$('studio-shots');list.replaceChildren();
    shots.forEach((shot,i)=> {
      const row=window.document.createElement('div');row.className='studio-shot-row';
      const btn=window.document.createElement('button');btn.className=`btn ${i===activeShot?'primary':''}`;btn.textContent=`${i+1}. ${shot.name}`;btn.title=shot.purpose;
      btn.onclick=()=>run(()=> {activeShot=i;setCamera(stage.camera,shot.camera);stage.controls.target.fromArray(shot.camera.target);stage.controls.update();syncUI();api.commit();});
      const replace=window.document.createElement('button');replace.className='btn';replace.textContent='갱신';replace.title='현재 작업 카메라를 이 컷에 저장';
      replace.onclick=()=>run(()=>{shot.camera=readCamera();activeShot=i;syncUI();api.commit();status('현재 카메라로 컷을 갱신했습니다.');});
      const remove=window.document.createElement('button');remove.className='btn';remove.textContent='×';remove.setAttribute('aria-label',`${shot.name} 삭제`);
      remove.onclick=()=>run(()=>{shots.splice(i,1);if(i<activeShot)activeShot--;activeShot=Math.min(activeShot,shots.length-1);syncUI();api.commit();});
      row.append(btn,replace,remove);list.appendChild(row);
    });
    $('studio-caption').textContent=`${currentShot().name} · 인물과 포즈는 공유 · ${aspect.toFixed(2)}:1`;
  }
  function syncUI() {
    $('studio-title').value=document.title;$('studio-source').value=document.sourceText;$('studio-assumptions').value=document.assumptions;
    ['x','y','z'].forEach((a,i)=>$(`studio-room-${a}`).value=document.room.size[i]);
    $('studio-walls').checked=document.room.walls;$('studio-light').value=document.lighting.intensity;
    $('studio-light-color').value=document.lighting.color;$('studio-ambient').value=document.lighting.ambient;
    $('studio-light-direction').value=Object.keys(lightPresets).find(key=>lightPresets[key].every((v,i)=>Math.abs(v-document.lighting.position[i])<1e-8))||'custom';
    $('studio-fov').value=stage.camera.fov;$('studio-aspect').value=String(aspect);renderShots();
  }
  function promptText() {
    const shot=currentShot();
    return `장면: ${document.title}\n원문: ${document.sourceText}\n연출상 추정: ${document.assumptions}\n컷: ${shot.name}\n목적: ${shot.purpose}\n\n첨부 color PNG는 구도·원근·인원·포즈·가림·접지·광원 방향의 기준입니다. 캐릭터 정본 이미지는 얼굴·머리·체형·복식·화풍의 기준입니다. 정본의 정면 조명이나 배경을 장면에 복사하지 마세요. 장면의 명암과 그림자에 맞춰 캐릭터를 적용하세요. 말풍선·해설·라벨을 추가하지 마세요.\n\n가슴 형태 참조가 있다면 어깨·흉곽에 대한 높이·좌우 간격·돌출·원근을 캡처대로 유지하세요. anatomyReferences의 체적 중심은 유두 표시가 아닙니다. 의상·팔에 가려진 부분을 임의로 드러내거나 재배치하지 마세요.\n\n실제 수정 상태는 editorState에 있습니다. proposalOrigin=${proposalOrigin}; scene-import는 최초 제안이고 legacy-current-state는 구형 파일을 연 시점의 값입니다. Depth PNG는 카메라 공간 선형 깊이이며 가까울수록 밝습니다. 생성기가 해당 조건 입력을 지원할 때 사용하세요. 일반 이미지 참조만으로 구도와 포즈의 완전한 보존을 보장하지 않습니다.`;
  }
  $('studio-example').onclick=()=>importText(JSON.stringify(EXAMPLE_SCENE,null,2),'예제 장면',true);
  $('studio-check').onclick=()=>importText($('studio-json').value,'붙여넣기',true,false);
  $('studio-apply').onclick=()=>importText($('studio-json').value,'붙여넣기',true);
  $('studio-file').onchange=async e=>{
    const f=e.target.files[0];if(!f)return;
    try{if(f.size>2_000_000)throw new Error('장면 JSON은 2MB 이하로 넣어주세요.');importText(await f.text(),f.name,true);}
    catch(error){showImportError(error,'',f.name);}
    finally{e.target.value='';}
  };
  for(const [id,key]of [['studio-title','title'],['studio-source','sourceText'],['studio-assumptions','assumptions']])$(id).onchange=()=>{document[key]=$(id).value;api.commit();};
  for(const axis of ['x','y','z'])$(`studio-room-${axis}`).onchange=()=>run(()=>{
    const room={...document.room,size:['x','y','z'].map(a=>Number($(`studio-room-${a}`).value))};
    document=validateScene({...document,room});rebuildRoom();api.commit();
  });
  $('studio-walls').onchange=()=>{document.room.walls=$('studio-walls').checked;rebuildRoom();api.commit();};
  $('studio-light').oninput=()=>{document.lighting.intensity=Number($('studio-light').value);stage.light.intensity=document.lighting.intensity;};
  $('studio-light').onchange=()=>api.commit();
  $('studio-light-color').onchange=()=>{document.lighting.color=$('studio-light-color').value;rebuildRoom();api.commit();};
  $('studio-ambient').onchange=()=>run(()=>{const v=Number($('studio-ambient').value);if(v<0||v>3||!Number.isFinite(v))throw new Error('주변광은 0~3입니다.');document.lighting.ambient=v;rebuildRoom();api.commit();});
  $('studio-light-direction').onchange=()=>{const position=lightPresets[$('studio-light-direction').value];if(!position)return;document.lighting.position=[...position];rebuildRoom();api.commit();};
  panel.querySelectorAll('[data-prop]').forEach(btn=>btn.onclick=()=>run(()=>{
    const type=btn.dataset.prop;
    const def={id:`prop-${crypto.randomUUID()}`,name:{box:'상자',table:'탁자',chair:'의자',sphere:'구체'}[type],type,position:[0,0,0],size:{box:[0.4,0.4,0.4],table:[1.4,0.75,0.8],chair:[0.5,0.95,0.5],sphere:[0.4,0.4,0.4]}[type],yaw:0,color:'#8c7965'};
    const prop=createProp(def);api.importedModels.push(prop);stage.scene.add(prop);api.select(prop);api.commit();
  }));
  $('studio-fov').onchange=()=>run(()=>{const v=Number($('studio-fov').value);if(v<10||v>100||!Number.isFinite(v))throw new Error('화각은 10~100도입니다.');stage.camera.fov=v;stage.camera.updateProjectionMatrix();api.commit();status('작업 카메라 화각을 바꿨습니다. 컷의 갱신을 누르면 촬영에 반영합니다.');});
  $('studio-aspect').onchange=()=>{aspect=Number($('studio-aspect').value);syncUI();api.commit();};
  $('studio-shot-add').onclick=()=>run(()=>{if(shots.length>=24)throw new Error('카메라 컷은 최대 24개입니다.');shots.push({id:crypto.randomUUID(),name:$('studio-shot-name').value||`컷 ${shots.length+1}`,purpose:'사용자가 조정한 구도',camera:readCamera()});activeShot=shots.length-1;$('studio-shot-name').value='';syncUI();api.commit();});
  $('studio-color').onclick=()=>run(()=>savePNG(false));$('studio-depth').onclick=()=>run(()=>savePNG(true));
  $('studio-prompt').onclick=()=>download('cutscene-direction.txt',promptText(),'text/plain;charset=utf-8');
  $('studio-packet').onclick=()=>run(()=>{
    const color=renderPNG(),depth=renderPNG(true);
    const anatomyReferences=api.mannequins.flatMap((m,actorIndex)=>{
      const chest=chestLandmarks(m);if(!chest)return [];
      const project=point=>{const p=new THREE.Vector3(...point).project(shotCamera);return {point:[(p.x+1)/2,(1-p.y)/2],inFrame:p.z>=-1&&p.z<=1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1};};
      return [{actorIndex,actorId:m.userData.studioId||null,name:m.name,chest:{...chest,leftImage:project(chest.left),rightImage:project(chest.right)},imageCoordinates:'normalized, origin top-left; inFrame does not test occlusion'}];
    });
    const packet={version:1,proposal:structuredClone(initialProposal),proposalOrigin,editorState:api.getState(),anatomyReferences,activeShot:currentShot(),render:{aspect,near:shotCamera.near,far:shotCamera.far,depthEncoding:'linear-view-z-near-white-far-black',resolution:[preview.domElement.width,preview.domElement.height]},images:{color,depth},direction:promptText()};
    // Actual export size is independent from the on-screen preview dimensions.
    packet.render.resolution=aspect>=1?[1600,Math.round(1600/aspect)]:[Math.round(1600*aspect),1600];
    download('cutscene-handoff.json',JSON.stringify(packet,null,2));status('이미지·카메라·정밀 편집 상태·작화 지시문을 한 파일에 저장했습니다.');
  });
  rebuildRoom();syncUI();
  // The third-party library points its favicon at an unbundled asset.
  window.document.querySelectorAll('link[rel="icon"]').forEach(link=>link.href='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="%236366f1"/><text x="5" y="23" fill="white" font-size="22">C</text></svg>');
  return {
    snapshot:()=>structuredClone({document,initialProposal,proposalOrigin,shots,activeShot,aspect}),
    restore(state) {if(!state)return;document=validateScene(state.document);initialProposal=validateScene(state.initialProposal||state.document);proposalOrigin=state.initialProposal?(state.proposalOrigin||'scene-import'):'legacy-current-state';shots=structuredClone(state.shots||[]);activeShot=state.activeShot ?? -1;aspect=state.aspect||16/9;rebuildRoom();syncUI();},
    createProp,loadScene,importText,showImportError,poseThumbnail,
    saveProject(state) {download('cutscene-project.json',JSON.stringify(state,null,2));status('정밀 프로젝트를 저장했습니다. Load로 다시 열 수 있습니다.');},
    tick() {
      if(performance.now()-lastFrame<120)return;lastFrame=performance.now();
      for(const wall of environment.children)if(wall.userData.editingWall)wall.visible=wall.userData.editingWall==='left'?stage.camera.position.x>=-document.room.size[0]/2:stage.camera.position.z>=-document.room.size[2]/2;
      const w=288,h=Math.round(w/aspect);if(preview.domElement.width!==w||preview.domElement.height!==h)preview.setSize(w,h,false);
      updateShotCamera();cleanRender(()=>preview.render(stage.scene,shotCamera));
    },
  };
}
