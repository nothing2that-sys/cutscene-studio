import {displayedObjectBounds} from './body-surface.js';
// Cutscene Studio extension to fanverseio/pose-toolkit. GPL-3.0.
import { validateScene, EXAMPLE_SCENE, POSES, PROP_TYPES, PROP_NAMES, PROP_DEFAULT_SIZES } from './scene-format.js';
import './studio.css';
import { constrainBody, captureBoneLayout, snapshotBodyJoints, chestLandmarks } from './body-rig.js';
import { analyzeInputText } from './scene-feedback.js';
import { createValidationPanel } from './validation-panel.js';
import {bodySurfaceMode} from './body-surface.js';
import {describeObjects,inspectObjectOverlaps} from './scene-object-info.js';
import {serializeBodyV1} from './body-v1-main.js';
import {extractShotFacts,describeShot} from './shot-description.js';
import {objectNotes} from './scene-object-info.js';
import {buildLabels,renderPasses,analyzePasses,depthRange,passImages,drawPose,lightingNotes,lightSource,buildShotJson,buildPrompt,packageZip,packageAllZip,assignLabelColors,encodePNG,DEFAULT_STYLE} from './llm-package.js';
import {dataUrlBytes} from './package-files.js';
import {drawRange,drawPlan} from './depth-views.js';
import {fitViewToAspect} from './camera-view.js';
import {aimHead,lookTarget} from './look-at.js';
import {ensureBodyTypes,bodyTypeReady} from './body-v1-adapter.js';
import {BODY_TYPES,bodyTypeOf} from './doll-profiles.js';

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
  let previewDirty=true;
  let captureObserver=null;
  let shotProjection=null;
  // Character sheets / references per object id. Kept out of undo history (large images);
  // saved with the project file.
  let references={},referencesObserver=null;
  const referencesChanged=()=>referencesObserver?.();
  let passView='color',lastDepthRange=null,passTimer=0;
  const environment = new THREE.Group();
  environment.name = 'Cutscene room';
  stage.scene.add(environment);
  stage.ground.visible = false;
  stage.light.shadow.mapSize.set(1024,1024);
  stage.light.shadow.camera.near = 0.1;
  stage.light.shadow.camera.far = 60;
  stage.light.shadow.camera.updateProjectionMatrix();
  // Lamp (point) and spot alternatives to the stage's directional key light; one is visible.
  const lamps={lamp:new THREE.PointLight(0xffffff,1,0,2),spot:new THREE.SpotLight(0xffffff,1,0,Math.PI/6,.3,2)};
  for(const l of Object.values(lamps)){l.visible=false;l.castShadow=true;l.shadow.mapSize.set(1024,1024);l.shadow.camera.near=.05;l.shadow.camera.far=60;l.shadow.normalBias=.005;stage.scene.add(l);}
  stage.scene.add(lamps.spot.target);
  // Extra lights from lighting.extras; rebuilt with the room. No shadows (the key light casts them).
  const extraGroup=new THREE.Group();extraGroup.name='Extra lights';stage.scene.add(extraGroup);
  // Editing-only marker: light source and a line to the point it lights. Hidden in captures.
  const lightMarker=new THREE.Group();lightMarker.name='Light marker';
  const markerBulb=new THREE.Mesh(new THREE.SphereGeometry(.09,16,10),new THREE.MeshBasicMaterial({color:0xffd54a}));
  const markerLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineDashedMaterial({color:0xffd54a,dashSize:.12,gapSize:.08}));
  lightMarker.add(markerBulb,markerLine);lightMarker.traverse(n=>{n.userData.exportHideWhenGizmoDisabled=true;n.raycast=()=>{};});stage.scene.add(lightMarker);
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
      <label class="studio-label">화풍 (LLM 패키지 지시문 맨 앞에 들어감)<textarea id="studio-style" rows="2" maxlength="2000"></textarea></label>
      <details><summary>원문과 연출 의도</summary><label class="studio-label">소설 원문<textarea id="studio-source"></textarea></label><label class="studio-label">연출을 위해 추정한 정보<textarea id="studio-assumptions"></textarea></label></details>
      <details open><summary>공간과 조명</summary>
        <div class="studio-row"><span>방 크기 m</span><input id="studio-room-x" type="number" aria-label="방 너비" min="1" max="30" step="0.5"><input id="studio-room-y" type="number" aria-label="방 높이" min="1" max="30" step="0.5"><input id="studio-room-z" type="number" aria-label="방 깊이" min="1" max="30" step="0.5"></div>
        <label class="studio-check"><input id="studio-walls" type="checkbox"> 뒤쪽 벽 표시</label>
        <label class="studio-label">조명 종류 <select id="studio-light-type"><option value="sun">태양광 · 평행광</option><option value="lamp">전등 · 점광원</option><option value="spot">스포트</option></select></label>
        <label class="studio-label">빛 세기 (비추는 곳 기준) <input id="studio-light" type="range" min="0" max="6" step="0.1"></label>
        <div class="studio-row"><span>광원 위치 m</span><input id="studio-light-x" type="number" step="0.1" aria-label="광원 X"><input id="studio-light-y" type="number" step="0.1" aria-label="광원 높이"><input id="studio-light-z" type="number" step="0.1" aria-label="광원 Z"></div>
        <div class="studio-row"><span>비추는 곳 m</span><input id="studio-light-tx" type="number" step="0.1" aria-label="비추는 곳 X"><input id="studio-light-ty" type="number" step="0.1" aria-label="비추는 곳 높이"><input id="studio-light-tz" type="number" step="0.1" aria-label="비추는 곳 Z"></div>
        <div id="studio-extra-lights"></div>
        <label class="studio-label" id="studio-light-cone-row">스포트 퍼짐 각도 ° <input id="studio-light-cone" type="number" min="5" max="170" step="1"></label>
        <label class="studio-label">주광 방향 <select id="studio-light-direction"><option value="custom" disabled>사용자 지정</option><option value="left">왼쪽 앞</option><option value="right">오른쪽 앞</option><option value="back">뒤쪽 역광</option><option value="top">위에서</option></select></label>
        <div class="studio-row"><label>빛 색 <input id="studio-light-color" type="color"></label><label>주변광 <input id="studio-ambient" type="number" min="0" max="3" step="0.1"></label></div>
      </details>
      <details><summary>소품 추가</summary><div class="studio-row studio-prop-buttons">${PROP_TYPES.map(t=>`<button class="btn" data-prop="${t}">${PROP_NAMES[t]}</button>`).join('')}</div><p class="studio-help">오른쪽 목록에서 선택한 뒤 Move / Rotate로 옮깁니다. 크기는 선택한 소품의 속성 패널(가로·높이·깊이)이나 장면 JSON의 size로 바꿉니다. 문·창문은 벽 앞에 세우는 판입니다.</p></details>
      <div class="studio-section"><h3>카메라 컷</h3><p class="studio-help">작업 화면을 돌려 구도를 찾고 저장하세요. 인물·포즈는 모든 카메라 컷이 공유합니다.</p>
        <div class="studio-row"><input id="studio-shot-name" aria-label="새 컷 이름" placeholder="컷 이름"><button id="studio-shot-add" class="btn">구도 저장</button></div>
        <div class="studio-row"><label>화각 <input id="studio-fov" type="number" min="10" max="100" value="40"></label><select id="studio-aspect" aria-label="촬영 화면비"><option value="1.7777777777777777">16:9</option><option value="1.3333333333333333">4:3</option><option value="1">1:1</option><option value="0.75">3:4</option><option value="0.5625">9:16</option></select></div>
        <div id="studio-shots"></div>
      </div>
      <details id="studio-refs-section"><summary>설정화 · 레퍼런스 연결</summary><p class="studio-help">인물·소품마다 설정화(얼굴·전신·의상 등)를 연결하면 LLM 패키지에 함께 들어가고 라벨 색과 짝지어집니다.</p><div id="studio-refs"></div></details>
      <div class="studio-section"><h3>촬영 미리보기</h3><label class="studio-label">미리보기 패스 <select id="studio-pass-view" aria-label="미리보기 패스"><option value="color">컬러</option><option value="label">라벨</option><option value="depth">뎁스(카메라 거리)</option><option value="range">거리 색·링 (라이다)</option><option value="plan">위에서 본 배치</option><option value="light">직사광·그림자</option><option value="pose">포즈 뼈대</option></select></label><div id="studio-preview"><img id="studio-pass-image" alt="패스 미리보기" hidden></div><p id="studio-caption" class="studio-help">컷을 저장하면 이곳에 촬영 구도가 표시됩니다.</p><p id="studio-preview-state" class="studio-help"></p><button id="studio-preview-refresh" class="btn">미리보기 갱신</button>
        <div class="studio-row"><button id="studio-color" class="btn primary">PNG 캡처</button><button id="studio-depth" class="btn">Depth PNG</button></div>
        <div class="studio-row"><button id="studio-llm-package" class="btn primary">LLM 패키지 (zip)</button><button id="studio-llm-package-all" class="btn">모든 컷 패키지</button></div>
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
  function readCamera() { beforeReadCamera?.();const original=api.workingCamera?.();return original?{position:original.position,target:original.target,fov:original.fov,zoom:original.zoom,view:original.view}:{position:stage.camera.position.toArray(),target:stage.controls.target.toArray(),fov:stage.camera.fov,zoom:stage.camera.zoom,view:stage.camera.view?{...stage.camera.view}:null}; }
  function setCamera(camera,def) {
    camera.position.fromArray(def.position); camera.fov=def.fov;camera.zoom=def.zoom||1;camera.view=def.view?{...def.view}:null;camera.lookAt(new THREE.Vector3(...def.target)); camera.updateProjectionMatrix();
  }
  function currentShot() { return shots[activeShot] || {name:'현재 작업 구도',purpose:'',camera:readCamera()}; }
  function updateShotCamera() {
    setCamera(shotCamera,currentShot().camera);
    if(shotProjection?.key===JSON.stringify(currentShot().camera)){shotCamera.zoom=shotProjection.zoom;shotCamera.view=shotProjection.view?{...shotProjection.view}:null;}
    shotCamera.aspect=aspect;
    if(shotCamera.view?.enabled)shotCamera.view=fitViewToAspect(shotCamera.view,aspect);
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
  let beforeCapture=null,beforeReadCamera=null;
  function exportSize(){const width=aspect>=1?1600:Math.round(1600*aspect);return {width,height:Math.round(width/aspect)};}
  function sceneItems(){
    const actors=api.mannequins.map((m,i)=>({id:m.userData.studioId||'actor-'+(i+1),name:m.name||'인물 '+(i+1),root:m,height:m.userData.bodyProfile?.height,headUnits:m.userData.bodyProfile?.bodyType?BODY_TYPES[bodyTypeOf(m.userData.bodyProfile)].headUnits:m.userData.bodyProfile?.headUnits}));
    const props=api.importedModels.map((p,i)=>({id:p.userData.primitive?.id||p.userData.studioId||'prop-'+(i+1),name:p.name||'소품 '+(i+1),root:p}));
    return {actors,props};
  }
  // Label, camera distance, direct light and pose all come from one shot-camera evaluation.
  // only: a preview view ('label'|'depth'|'light'|'pose') computes just what it shows;
  // the package (only=null) computes everything.
  function computePasses(width,height,{commit=true,only=null}={}){
    if(commit)beforeCapture?.();updateShotCamera();
    const {actors,props}=sceneItems();
    return cleanRender(()=>{
      const environmentMeshes=[];environment.traverse(n=>{if(!n.isMesh)return;for(let q=n;q;q=q.parent)if(!q.visible)return;environmentMeshes.push(n);});
      const labels=buildLabels({actors,props,environmentMeshes});
      const facts=!only||['pose','range','plan'].includes(only)?extractShotFacts({camera:shotCamera,aspect,actors,props,environmentMeshes,lighting:document.lighting}):null;
      if(only==='pose'||only==='plan')return {width,height,facts,labels};
      const description=facts?describeShot(facts,{shotName:currentShot().name,purpose:currentShot().purpose}):null;
      // light.png is the key light alone: extra lights are switched off for the passes.
      extraGroup.visible=false;let passes;try{passes=renderPasses({renderer:preview,scene:stage.scene,camera:shotCamera,width,height,labels,light:keyLight(),lightTarget:document.lighting.target,ambient});}finally{extraGroup.visible=true;}
      const stats=analyzePasses(passes,labels),range=depthRange(passes,labels,stats),labelWarnings=assignLabelColors(labels,stats);
      return {width,height,facts,description,labels,passes,stats,range,labelWarnings,images:passImages(passes,labels,range),lightNotes:facts?lightingNotes({facts,lighting:document.lighting,labels}):null,actors,props};
    });
  }
  function canvasFrom(width,height,fill){const c=window.document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d'),img=ctx.createImageData(width,height);fill(img.data);ctx.putImageData(img,0,0);return c;}
  const grayCanvas=(w,h,g)=>canvasFrom(w,h,d=>{for(let i=0;i<g.length;i++){d[i*4]=d[i*4+1]=d[i*4+2]=g[i];d[i*4+3]=255;}});
  function passCanvas(kind,r){
    const {width,height}=r;
    if(kind==='label')return canvasFrom(width,height,d=>d.set(r.images.rgba));
    if(kind==='depth')return grayCanvas(width,height,r.images.depth8);
    if(kind==='light')return grayCanvas(width,height,r.images.light8);
    const c=window.document.createElement('canvas');
    if(kind==='plan'){c.width=c.height=Math.max(width,height);drawPlan(c,{facts:r.facts,labels:r.labels,lighting:document.lighting,room:document.room,camera:shotCamera,aspect});return c;}
    c.width=width;c.height=height;
    if(kind==='range'){drawRange(c,{passes:r.passes,labels:r.labels,facts:r.facts,range:r.range});return c;}
    drawPose(c,r.facts,r.labels,lightSource(document.lighting,shotCamera,r.facts));return c;
  }
  function renderPNG(depth=false) {
    if(depth){const {width,height}=exportSize(),r=computePasses(width,height);lastDepthRange=r.range;captureObserver?.('depth');return passCanvas('depth',r).toDataURL('image/png');}
    beforeCapture?.();updateShotCamera();
    const width=aspect>=1?1600:Math.round(1600*aspect),height=Math.round(width/aspect);
    const previousSize=preview.getSize(new THREE.Vector2());
    const bg=stage.scene.background,override=stage.scene.overrideMaterial;
    let depthMaterial;
    try {
      preview.setSize(width,height,false);
      if(depth) {
        depthMaterial=new THREE.ShaderMaterial({
          side:THREE.DoubleSide,
          uniforms:{near:{value:shotCamera.near},far:{value:shotCamera.far}},
          vertexShader:'#include <common>\n#include <skinning_pars_vertex>\nvarying float distanceZ;\nvoid main(){\n#include <skinbase_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\nvec4 v=modelViewMatrix*vec4(transformed,1.);distanceZ=-v.z;gl_Position=projectionMatrix*v;}',
          fragmentShader:'uniform float near; uniform float far; varying float distanceZ; void main(){float d=1.-clamp((distanceZ-near)/(far-near),0.,1.); gl_FragColor=vec4(vec3(d),1.);}',
        });
        stage.scene.overrideMaterial=depthMaterial; stage.scene.background=new THREE.Color(0x000000);
      }
      // Captures let people cast shadows (editing view keeps them off) so color.png matches light.png.
      const casters=[];for(const m of api.mannequins)m.traverse(n=>{if(n.isMesh&&!n.castShadow&&!n.userData.bodyOutline){casters.push(n);n.castShadow=true;}});preview.shadowMap.needsUpdate=true;
      try{cleanRender(()=>preview.render(stage.scene,shotCamera));}finally{casters.forEach(n=>n.castShadow=false);}
      captureObserver?.(depth?'depth':'color');
      return preview.domElement.toDataURL('image/png');
    } finally {
      stage.scene.background=bg; stage.scene.overrideMaterial=override;
      depthMaterial?.dispose(); preview.setSize(previousSize.x,previousSize.y,false);
    }
  }
  function savePNG(depth) {
    const url=renderPNG(depth); const a=window.document.createElement('a');
    a.download=`cutscene-${depth?'depth':'color'}.png`; a.href=url; a.click();
    status(depth?`카메라 거리 Depth PNG를 저장했습니다 (흰색 ${lastDepthRange?.nearM}m → 어두움 ${lastDepthRange?.farM}m).`:'촬영 카메라의 PNG를 저장했습니다.');
  }
  function poseThumbnail(model){
    if(!model)return '';
    const size=preview.getSize(new THREE.Vector2()),hidden=[];
    const box=displayedObjectBounds(model),center=box.getCenter(new THREE.Vector3()),height=Math.max(0.5,box.getSize(new THREE.Vector3()).length());
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
  function keyLight(){return lamps[document.lighting.type]||stage.light;}
  // Intensity means the brightness reached at the target point, so lamps are scaled by
  // distance² to match a sun of the same number there.
  function applyLight(){
    const l=document.lighting,key=keyLight(),pos=new THREE.Vector3(...l.position),target=new THREE.Vector3(...l.target),d=pos.distanceTo(target)||1;
    stage.light.visible=key===stage.light;for(const x of Object.values(lamps))x.visible=x===key;
    key.position.copy(pos);key.color.set(l.color);key.intensity=key.isDirectionalLight?l.intensity:l.intensity*d*d;
    if(key.isSpotLight){key.angle=THREE.MathUtils.degToRad(l.coneDeg/2);key.penumbra=l.softness;key.target.position.copy(target);key.target.updateMatrixWorld();}
    for(const child of [...extraGroup.children]){extraGroup.remove(child);child.dispose?.();child.traverse?.(n=>{n.geometry?.dispose();n.material?.dispose?.();});}
    for(const x of l.extras||[]){
      const at=new THREE.Vector3(...x.position),aim=new THREE.Vector3(...x.target),dist=at.distanceTo(aim)||1;
      const light=x.type==='sun'?new THREE.DirectionalLight(x.color,x.intensity):x.type==='spot'?new THREE.SpotLight(x.color,x.intensity*dist*dist,0,THREE.MathUtils.degToRad(x.coneDeg/2),x.softness,2):new THREE.PointLight(x.color,x.intensity*dist*dist,0,2);
      light.position.copy(at);light.userData.extraLight=true;extraGroup.add(light);
      if(light.target){light.target.position.copy(aim);extraGroup.add(light.target);light.target.updateMatrixWorld();}
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(.06,12,8),new THREE.MeshBasicMaterial({color:0x7dd3fc}));bulb.position.copy(at);bulb.userData.exportHideWhenGizmoDisabled=true;bulb.raycast=()=>{};extraGroup.add(bulb);
    }
    lightMarker.position.copy(pos);markerBulb.material.color.set(l.type==='sun'?0xffd54a:0xfff3c4);markerLine.geometry.setFromPoints([new THREE.Vector3(),target.clone().sub(pos)]);markerLine.computeLineDistances();
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
    stage.light.target.position.fromArray(light.target);stage.scene.add(stage.light.target);applyLight();
    stage.light.shadow.camera.left=-w;stage.light.shadow.camera.right=w;
    stage.light.shadow.camera.top=Math.max(w,d);stage.light.shadow.camera.bottom=-Math.max(w,d);stage.light.shadow.camera.updateProjectionMatrix();
    if(ambient)ambient.intensity=light.ambient;
  }
  // Geometry of a primitive prop from its type and size; rebuilt in place when the size changes.
  function buildPropMeshes(group,def){
    for(const child of [...group.children]){group.remove(child);child.geometry?.dispose();}
    const [w,h,d]=def.size;
    const material=new THREE.MeshStandardMaterial({color:def.color,roughness:0.8});
    const add=(geometry,p,m=material)=>{const mesh=new THREE.Mesh(geometry,m);mesh.position.set(...p);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
    const box=(size,p,m)=>add(new THREE.BoxGeometry(...size.map(v=>Math.max(v,0.005))),p,m);
    const frame=Math.min(0.06,w/6,h/6);
    if(def.type==='sphere'){add(new THREE.SphereGeometry(0.5,24,16),[0,h/2,0]).scale.set(w,h,d);}
    else if(def.type==='cylinder'){add(new THREE.CylinderGeometry(0.5,0.5,1,24),[0,h/2,0]).scale.set(w,h,d);}
    else if(def.type==='table'||def.type==='chair') {
      const seat=def.type==='chair'?h*0.48:h;
      box([w,0.06,d],[0,seat-0.03,0]);
      for(const x of [-1,1])for(const z of [-1,1])box([0.06,Math.max(0.02,seat-0.06),0.06],[x*(w/2-0.04),(seat-0.06)/2,z*(d/2-0.04)]);
      if(def.type==='chair')box([w,h-seat,0.06],[0,seat+(h-seat)/2,-d/2+0.03]);
    } else if(def.type==='door'){
      for(const x of [-1,1])box([frame,h,d],[x*(w/2-frame/2),h/2,0]);box([w,frame,d],[0,h-frame/2,0]);
      box([w-frame*2,h-frame,d*0.6],[0,(h-frame)/2,0]);add(new THREE.SphereGeometry(0.03,12,8),[w/2-frame-0.08,h*0.47,d*0.3+0.03]);
    } else if(def.type==='window'){
      for(const x of [-1,0,1])box([frame*(x?1:0.6),h,d],[x*(w/2-frame/2),h/2,0]);for(const y of [0,0.5,1])box([w,frame*(y===0.5?0.6:1),d],[0,frame/2+y*(h-frame),0]);
      box([w-frame*2,h-frame*2,0.01],[0,h/2,0],new THREE.MeshStandardMaterial({color:'#bcd7e8',roughness:0.1,transparent:true,opacity:0.35}));
    } else if(def.type==='bed'){
      box([w,h*0.3,d],[0,h*0.15,0]);box([w*0.96,h*0.18,d*0.94],[0,h*0.39,d*0.02]);box([w,h,0.06],[0,h/2,-d/2+0.03]);box([w*0.45,h*0.08,d*0.18],[0,h*0.52,-d/2+0.06+d*0.09]);
    } else if(def.type==='sofa'){
      const seat=h*0.48,arm=Math.min(0.18,w*0.1);
      box([w,seat,d],[0,seat/2,0]);box([w,h,d*0.22],[0,h/2,-d/2+d*0.11]);for(const x of [-1,1])box([arm,h*0.68,d],[x*(w/2-arm/2),h*0.34,0]);
    } else if(def.type==='stairs'){
      const n=Math.max(2,Math.round(h/0.18)),run=d/n;
      for(let i=0;i<n;i++){const top=h*(i+1)/n;box([w,top,run],[0,top/2,d/2-run*(i+0.5)]);}
    } else box([w,h,d],[0,h/2,0]);
  }
  function createProp(def) {
    const group=new THREE.Group();group.name=def.name;group.userData.primitive=structuredClone(def);
    buildPropMeshes(group,def);
    group.position.fromArray(def.position);group.rotation.y=THREE.MathUtils.degToRad(def.yaw);return group;
  }
  // Size edits from the properties panel: rebuild the same group, position and turn stay.
  function resizeProp(group,size){
    const def=group.userData.primitive;if(!def)throw new Error('단순 소품만 크기를 바꿀 수 있습니다.');
    def.size=size.map(v=>Math.min(20,Math.max(0.02,Number(v)||0.02)));buildPropMeshes(group,def);group.updateMatrixWorld(true);
  }
  function loadScene(raw) {
    const next=validateScene(raw); // Validate the entire proposal before changing the scene.
    const data={mannequins:[],importedModels:[],activeIndex:0,activeImportIndex:-1,selectedBodyPart:'Root'};
    const built=[];
    for(const actor of next.actors) {
      const m=api.createFullMannequin({height:actor.height,headUnits:actor.headUnits,...(actor.chest?{chest:actor.chest}:{}),...(actor.bodyType?{bodyType:actor.bodyType}:{})});
      // Mannequin.js adds new instances to its shared scene automatically.
      stage.scene.remove(m);
      // Scale the standing body first; bending must not change the person's height.
      m.updateMatrixWorld(true);
      const box=displayedObjectBounds(m);
      // Height and head-unit proportions are configured before applying the pose.
      for(const [joint,values] of Object.entries(POSES[actor.pose]))for(const [key,v]of Object.entries(values))m[joint][key]=v;
      for(const [joint,values] of Object.entries(actor.joints))for(const [key,v]of Object.entries(values))m[joint][key]=v;
      constrainBody(m);m.rotation.y=THREE.MathUtils.degToRad(actor.yaw);m.updateMatrixWorld(true);
      const bottom=displayedObjectBounds(m).min.y;
      m.position.x=actor.position[0];m.position.z=actor.position[2];m.position.y+=actor.position[1]-bottom;
      built.push({actor,m});
    }
    // Gaze: turn neck and head toward the target once everyone stands in place.
    const lookIssues=[];
    const lookScene={actors:built.map(b=>({id:b.actor.id,root:b.m})),props:next.props.map(p=>({id:p.id,center:new THREE.Vector3(p.position[0],p.position[1]+p.size[1]/2,p.position[2])}))};
    for(const {actor,m} of built){
      if(actor.lookAt===undefined||actor.pose==='lying')continue;
      const target=lookTarget(actor.lookAt,lookScene),result=target&&aimHead(m,target,{constrain:constrainBody});
      if(result?.clamped)lookIssues.push(actor.name+'의 시선은 목·머리 회전 한계까지만 돌렸습니다. 몸 방향(yaw)도 돌리세요.');
    }
    for(const {actor,m} of built){
      data.mannequins.push({name:actor.name,studioId:actor.id,sceneNotes:{role:actor.role,intent:actor.intent,description:actor.description,...(actor.lookAt!==undefined?{lookAt:actor.lookAt}:{}),...(actor.expression?{expression:actor.expression}:{})},bodyProfile:m.userData.bodyProfile,...serializeBodyV1(m),boneLayout:captureBoneLayout(m),joints:snapshotBodyJoints(m),position:m.position.toArray(),rotation:m.rotation.toArray(),scale:m.scale.toArray(),posture:m.posture});
    }
    data.importedModels=next.props.map(p=>({name:p.name,primitive:p,position:p.position,rotation:[0,THREE.MathUtils.degToRad(p.yaw),0,'XYZ'],scale:[1,1,1]}));
    const camera=new THREE.PerspectiveCamera();setCamera(camera,next.camera);
    data.camera={...next.camera,rotation:camera.rotation.toArray()};
    data.studio={document:next,initialProposal:structuredClone(next),proposalOrigin:'scene-import',shots:next.shots.length?next.shots:[{id:'initial',name:'첫 구도',purpose:'초기 추천 구도',camera:next.camera}],activeShot:0,aspect};
    api.applyState(JSON.stringify(data));api.commit();
    status(`「${next.title}」 · 인물 ${next.actors.length}명, 소품 ${next.props.length}개를 배치했습니다.`);
    return lookIssues;
  }
  function showImportError(error,text='',source='불러오기',scenePreserved=true) {
    const report={reportVersion:1,source,originalJSON:text,inputKind:'project',valid:false,applied:false,scenePreserved,visualReview:false,errors:error.issues||[{severity:'error',path:'$',code:'IMPORT_FAILED',message:error.message}],warnings:[]};
    feedback.show(report);status(error.message,true);
  }
  // Character sheets live outside undo history, so a new scene or a project file must
  // replace them explicitly; otherwise sheets from the previous work stay attached to
  // any person or prop that happens to share an id (e.g. the example scene's 'jihoon').
  function clearReferences(){
    const before=Object.values(references).reduce((n,list)=>n+list.length,0);
    references={};renderReferences();
    return before?' · 이전 설정화 '+before+'장을 비웠습니다':'';
  }
  function importText(text,source='붙여넣기',sceneOnly=true,apply=true) {
    const report=analyzeInputText(text,source,sceneOnly);
    feedback.show(report);
    if(report.valid&&apply&&report.inputKind==='scene'){const types=report.value.actors.map(a=>a.bodyType);if(!types.every(bodyTypeReady)){status('체형 메시를 준비하는 중…');return ensureBodyTypes(types).then(()=>importText(text,source,sceneOnly,apply),error=>{status(error.message,true);return false;});}}
    if(!report.valid){status('JSON 오류 '+report.errors.length+'개 · 입력을 적용하지 않았습니다.',true);return false;}
    if(!apply){status('검사 완료 · 오류 0개 / 경고 '+report.warnings.length+'개 · 아직 적용하지 않았습니다.');return true;}
    const previous=api.getState();
    try {
      if(report.inputKind==='scene')for(const message of loadScene(report.value)||[])report.warnings.push({severity:'warning',path:'actors',code:'LOOK_AT_LIMIT',message});
      else if(report.inputKind==='object')api.addObject(report.value);
      else {const applied=api.applyState(JSON.stringify(report.value));if(applied?.then)return applied.then(()=>{api.commit();report.applied=true;feedback.show(report);const cleared=report.value.characterReferences?'':clearReferences();status('입력 적용 완료 · 오류 0개 / 경고 '+report.warnings.length+'개'+cleared);return true;},error=>{report.valid=false;report.scenePreserved=true;report.errors.push({severity:'error',path:'$',code:'APPLY_FAILED',message:error.message});feedback.show(report);status('복원 실패 · 기존 장면을 유지했습니다.',true);return false;});api.commit();}
      report.applied=true;feedback.show(report);
      const cleared=report.inputKind==='scene'||(report.inputKind==='project'&&!report.value.characterReferences)?clearReferences():'';
      const counts=report.inputKind==='scene'?' · 인물 '+report.value.actors.length+'명, 소품 '+report.value.props.length+'개':'';
      status('입력 적용 완료'+counts+' · 오류 0개 / 경고 '+report.warnings.length+'개'+cleared);return true;
    }catch(error){
      let preserved=true;if(report.inputKind!=='project'&&!error.scenePreserved)try{api.applyState(JSON.stringify(previous));}catch{preserved=false;}
      report.valid=false;report.scenePreserved=preserved;report.errors.push({severity:'error',path:'$',code:'APPLY_FAILED',message:error.message});
      feedback.show(report);status('입력 적용에 실패했습니다. 검사 보고서를 확인하세요.',true);return false;
    }
  }
  function renderShots() {
    const list=$('studio-shots');list.replaceChildren();
    shots.forEach((shot,i)=> {
      const row=window.document.createElement('div');row.className='studio-shot-row';
      const btn=window.document.createElement('button');btn.className=`btn ${i===activeShot?'primary':''}`;btn.textContent=`${i+1}. ${shot.name}`;btn.title=shot.purpose;
      btn.onclick=()=>run(()=> {activeShot=i;if(api.setWorkingCamera)api.setWorkingCamera(shot.camera);else{setCamera(stage.camera,shot.camera);stage.controls.target.fromArray(shot.camera.target);stage.controls.update();}syncUI();api.commit();});
      const replace=window.document.createElement('button');replace.className='btn';replace.textContent='갱신';replace.title='현재 작업 카메라를 이 컷에 저장';
      replace.dataset.shotUpdate='true';
      replace.onclick=()=>run(()=>{shot.camera=readCamera();activeShot=i;syncUI();api.commit();status('현재 카메라로 컷을 갱신했습니다.');});
      const remove=window.document.createElement('button');remove.className='btn';remove.textContent='×';remove.setAttribute('aria-label',`${shot.name} 삭제`);
      remove.onclick=()=>run(()=>{shots.splice(i,1);if(i<activeShot)activeShot--;activeShot=Math.min(activeShot,shots.length-1);syncUI();api.commit();});
      row.append(btn,replace,remove);list.appendChild(row);
    });
    $('studio-caption').textContent=`${currentShot().name} · 인물과 포즈는 공유 · ${aspect.toFixed(2)}:1`;
  }
  function syncUI() {
    $('studio-title').value=document.title;$('studio-style').value=document.style||'';$('studio-style').placeholder=DEFAULT_STYLE;$('studio-source').value=document.sourceText;$('studio-assumptions').value=document.assumptions;
    ['x','y','z'].forEach((a,i)=>$(`studio-room-${a}`).value=document.room.size[i]);
    $('studio-walls').checked=document.room.walls;$('studio-light').value=document.lighting.intensity;
    $('studio-light-color').value=document.lighting.color;$('studio-ambient').value=document.lighting.ambient;
    $('studio-light-type').value=document.lighting.type;['x','y','z'].forEach((a,i)=>{$('studio-light-'+a).value=document.lighting.position[i];$('studio-light-t'+a).value=document.lighting.target[i];});
    renderExtraLights();
    $('studio-light-cone-row').hidden=document.lighting.type!=='spot';$('studio-light-cone').value=document.lighting.coneDeg??50;
    $('studio-light-direction').value=Object.keys(lightPresets).find(key=>lightPresets[key].every((v,i)=>Math.abs(v-document.lighting.position[i])<1e-8))||'custom';
    $('studio-fov').value=readCamera().fov;$('studio-aspect').value=String(aspect);renderShots();if($('studio-refs-section').open)renderReferences();
  }
  // Camera-relative wording is computed from the same shot camera and capture visibility as the PNG.
  function shotDescription() {
    const shot=currentShot();
    try {
      beforeCapture?.();updateShotCamera();
      const actors=api.mannequins.map((m,i)=>({id:m.userData.studioId||'actor-'+(i+1),name:m.name||'인물 '+(i+1),root:m,height:m.userData.bodyProfile?.height,headUnits:m.userData.bodyProfile?.bodyType?BODY_TYPES[bodyTypeOf(m.userData.bodyProfile)].headUnits:m.userData.bodyProfile?.headUnits}));
      const props=api.importedModels.map((p,i)=>({id:p.userData.primitive?.id||p.userData.studioId||'prop-'+(i+1),name:p.name||'소품 '+(i+1),root:p}));
      return cleanRender(()=>{
        const environmentMeshes=[];environment.traverse(n=>{if(!n.isMesh)return;for(let q=n;q;q=q.parent)if(!q.visible)return;environmentMeshes.push(n);});
        return describeShot(extractShotFacts({camera:shotCamera,aspect,actors,props,environmentMeshes,lighting:document.lighting}),{shotName:shot.name,purpose:shot.purpose});
      });
    } catch(error) {
      console.error('Shot description failed',error);
      return {structured:null,error:error.message,text:'촬영 설명을 계산하지 못했습니다. 첨부 color PNG를 기준으로 하세요.'};
    }
  }
  function promptText(description=shotDescription()) {
    const shot=currentShot();
    const details=describeObjects([...api.mannequins,...api.importedModels],document);
    const detailText='최종 대상 설명 (사용자 수정값; 외형·역할 참고 자료)\n'+JSON.stringify(details,null,2)+'\n무채색 인체와 단순 소품은 작업용 구도·체적 가이드입니다. 단순화된 손발의 구체적인 형태·손톱·장갑·신발은 최신 인물 설명에 따라 완성하되 손목·발목 방향, 물체 잡기·접촉 관계와 발의 접지는 캡처를 유지하세요. 최종 피부색·복식은 캐릭터 정본을, 소품의 재질·색·디자인은 최신 대상 설명을 참고하세요. 설명은 새로운 사건·사물 추가 지시가 아닙니다. 위치·크기·포즈·가림은 현재 editorState와 캡처를 기준으로 유지하세요. 외형 설명을 바꿔도 3D 형상은 자동으로 바뀌지 않습니다.\n\n';
    return description.text+'\n\n'+detailText+`장면: ${document.title}\n원문: ${document.sourceText}\n연출상 추정: ${document.assumptions}\n컷: ${shot.name}\n목적: ${shot.purpose}\n\n첨부 color PNG는 구도·원근·인원·포즈·가림·접지·광원 방향의 기준입니다. 캐릭터 정본 이미지는 얼굴·머리·체형·복식·화풍의 기준입니다. 정본의 정면 조명이나 배경을 장면에 복사하지 마세요. 장면의 명암과 그림자에 맞춰 캐릭터를 적용하세요. 말풍선·해설·라벨을 추가하지 마세요.\n\n가슴 형태 참조가 있다면 어깨·흉곽에 대한 높이·좌우 간격·돌출·원근을 캡처대로 유지하세요. anatomyReferences의 체적 중심은 유두 표시가 아닙니다. 의상·팔에 가려진 부분을 임의로 드러내거나 재배치하지 마세요.\n\n실제 수정 상태는 editorState에 있습니다. proposalOrigin=${proposalOrigin}; scene-import는 최초 제안이고 legacy-current-state는 구형 파일을 연 시점의 값입니다. Depth PNG는 카메라에서 표면까지의 거리를 장면 범위로 정규화한 값이며 가까울수록 밝습니다. 생성기가 해당 조건 입력을 지원할 때 사용하세요. 일반 이미지 참조만으로 구도와 포즈의 완전한 보존을 보장하지 않습니다.`;
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
  for(const [id,key]of [['studio-title','title'],['studio-style','style'],['studio-source','sourceText'],['studio-assumptions','assumptions']])$(id).onchange=()=>{document[key]=$(id).value;api.commit();};
  for(const axis of ['x','y','z'])$(`studio-room-${axis}`).onchange=()=>run(()=>{
    const room={...document.room,size:['x','y','z'].map(a=>Number($(`studio-room-${a}`).value))};
    document=validateScene({...document,room});rebuildRoom();api.commit();
  });
  $('studio-walls').onchange=()=>{document.room.walls=$('studio-walls').checked;rebuildRoom();api.commit();};
  $('studio-light').oninput=()=>{document.lighting.intensity=Number($('studio-light').value);applyLight();};
  // Extra lights: one row each (type, position, target, colour, brightness, remove) plus add.
  function renderExtraLights(){
    const host=$('studio-extra-lights');if(!host)return;const extras=document.lighting.extras||[];
    host.innerHTML='<p class="studio-help">보조광(최대 2개) · color.png에 반영되고 지시문에 글로 들어갑니다. light.png는 주광만 보여 줍니다.</p>'+extras.map((x,i)=>`<div class="studio-extra-light" data-extra="${i}"><div class="studio-row"><select data-k="type" aria-label="보조광 ${i+1} 종류">${['lamp','spot','sun'].map(t=>`<option value="${t}" ${t===x.type?'selected':''}>${{lamp:'전등',spot:'스포트',sun:'평행광'}[t]}</option>`).join('')}</select><input data-k="color" type="color" value="${x.color}" aria-label="보조광 ${i+1} 색"><input data-k="intensity" type="number" min="0" max="10" step="0.1" value="${x.intensity}" aria-label="보조광 ${i+1} 세기"><button class="btn" data-remove="${i}">삭제</button></div><div class="studio-row"><span>위치</span>${x.position.map((v,k)=>`<input data-k="p${k}" type="number" step="0.1" value="${v}" aria-label="보조광 ${i+1} 위치 ${'XYZ'[k]}">`).join('')}</div><div class="studio-row"><span>비추는 곳</span>${x.target.map((v,k)=>`<input data-k="t${k}" type="number" step="0.1" value="${v}" aria-label="보조광 ${i+1} 목표 ${'XYZ'[k]}">`).join('')}</div></div>`).join('')+(extras.length<2?'<button class="btn" id="studio-extra-add">+ 보조광 추가</button>':'');
    host.querySelectorAll('.studio-extra-light').forEach(row=>{const i=Number(row.dataset.extra);row.querySelectorAll('[data-k]').forEach(input=>input.onchange=()=>{const next=structuredClone(document.lighting.extras);const x=next[i],k=input.dataset.k;
      if(k==='type'||k==='color')x[k]=input.value;else if(k==='intensity')x.intensity=Number(input.value);else (k[0]==='p'?x.position:x.target)[Number(k[1])]=Number(input.value);
      if(x.type!=='spot'){delete x.coneDeg;delete x.softness;}setLighting({extras:next});});});
    host.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const next=structuredClone(document.lighting.extras);next.splice(Number(b.dataset.remove),1);setLighting({extras:next});});
    const add=$('studio-extra-add');if(add)add.onclick=()=>{const t=document.lighting.target;setLighting({extras:[...(document.lighting.extras||[]),{type:'lamp',position:[t[0]+1.5,t[1]+0.8,t[2]+1.5],target:[...t],color:'#ffd9a0',intensity:0.8}]});};
  }
  function setLighting(change){run(()=>{const next=validateScene({...document,lighting:{...document.lighting,...change}});document=next;rebuildRoom();syncUI();api.commit();});}
  $('studio-light-type').onchange=()=>setLighting({type:$('studio-light-type').value});
  for(const a of ['x','y','z']){$('studio-light-'+a).onchange=()=>setLighting({position:['x','y','z'].map(k=>Number($('studio-light-'+k).value))});$('studio-light-t'+a).onchange=()=>setLighting({target:['x','y','z'].map(k=>Number($('studio-light-t'+k).value))});}
  $('studio-light-cone').onchange=()=>setLighting({coneDeg:Number($('studio-light-cone').value)});
  $('studio-light').onchange=()=>api.commit();
  $('studio-light-color').onchange=()=>{document.lighting.color=$('studio-light-color').value;rebuildRoom();api.commit();};
  $('studio-ambient').onchange=()=>run(()=>{const v=Number($('studio-ambient').value);if(v<0||v>3||!Number.isFinite(v))throw new Error('주변광은 0~3입니다.');document.lighting.ambient=v;rebuildRoom();api.commit();});
  $('studio-light-direction').onchange=()=>{const position=lightPresets[$('studio-light-direction').value];if(!position)return;document.lighting.position=[...position];rebuildRoom();api.commit();};
  panel.querySelectorAll('[data-prop]').forEach(btn=>btn.onclick=()=>run(()=>{
    const type=btn.dataset.prop;
    const def={id:`prop-${crypto.randomUUID()}`,name:PROP_NAMES[type],type,position:[0,0,0],size:[...PROP_DEFAULT_SIZES[type]],yaw:0,color:'#8c7965'};
    const prop=createProp(def);api.importedModels.push(prop);stage.scene.add(prop);api.select(prop);api.commit();
  }));
  $('studio-fov').onchange=()=>run(()=>{const v=Number($('studio-fov').value);if(v<10||v>100||!Number.isFinite(v))throw new Error('화각은 10~100도입니다.');if(api.setWorkingFov)api.setWorkingFov(v);else {stage.camera.fov=v;stage.camera.updateProjectionMatrix();}api.commit();status('작업 카메라 화각을 바꿨습니다. 컷의 갱신을 누르면 촬영에 반영합니다.');});
  $('studio-aspect').onchange=()=>{aspect=Number($('studio-aspect').value);syncUI();api.commit();};
  $('studio-shot-add').onclick=()=>run(()=>{if(shots.length>=24)throw new Error('카메라 컷은 최대 24개입니다.');shots.push({id:crypto.randomUUID(),name:$('studio-shot-name').value||`컷 ${shots.length+1}`,purpose:'사용자가 조정한 구도',camera:readCamera()});activeShot=shots.length-1;$('studio-shot-name').value='';syncUI();api.commit();});
  $('studio-color').onclick=()=>run(()=>savePNG(false));$('studio-depth').onclick=()=>run(()=>savePNG(true));
  $('studio-preview-refresh').onclick=()=>run(()=>{previewDirty=true;tickPreview({force:true});});
  $('studio-prompt').onclick=()=>download('cutscene-direction.txt',promptText(),'text/plain;charset=utf-8');
  const REF_LABELS=['전신','얼굴','의상','헤어','표정','소품','기타'];
  async function loadReference(file){
    if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw new Error('PNG·JPEG·WEBP 이미지만 연결할 수 있습니다: '+file.name);
    const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('이미지를 읽지 못했습니다: '+file.name));i.src=url;});
    const scale=Math.min(1,2048/Math.max(img.naturalWidth,img.naturalHeight));
    if(scale===1&&file.size<=3_000_000)return {dataUrl:url,mime:file.type};
    const c=window.document.createElement('canvas');c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    return {dataUrl:c.toDataURL('image/jpeg',.92),mime:'image/jpeg'};
  }
  function renderReferences(){
    const host=$('studio-refs');if(!host)return;host.replaceChildren();
    const {actors,props}=sceneItems(),targets=[...actors.map(a=>({...a,kind:'인물'})),...props.map(p=>({...p,kind:'소품'}))];
    if(!targets.length){host.textContent='장면에 인물이나 소품이 없습니다.';return;}
    for(const t of targets){
      const item=window.document.createElement('div');item.className='studio-ref-item';item.dataset.refTarget=t.id;
      const head=window.document.createElement('div');head.className='studio-ref-head';head.textContent=`${t.kind} · ${t.name}`;item.appendChild(head);
      const list=references[t.id]||[];
      list.forEach((ref,i)=>{
        const row=window.document.createElement('div');row.className='studio-ref-row';
        const thumb=window.document.createElement('img');thumb.src=ref.dataUrl;thumb.alt=ref.name;thumb.title=ref.name;
        const kind=window.document.createElement('select');kind.setAttribute('aria-label','설정화 종류');for(const l of REF_LABELS){const o=window.document.createElement('option');o.value=o.textContent=l;kind.appendChild(o);}kind.value=ref.label;kind.onchange=()=>{ref.label=kind.value;referencesChanged();};
        const note=window.document.createElement('input');note.placeholder='메모 (예: 비 오는 장면 의상)';note.value=ref.note||'';note.maxLength=500;note.setAttribute('aria-label','설정화 메모');note.onchange=()=>{ref.note=note.value;referencesChanged();};
        const remove=window.document.createElement('button');remove.className='btn';remove.textContent='×';remove.setAttribute('aria-label',ref.name+' 연결 해제');remove.onclick=()=>{list.splice(i,1);if(!list.length)delete references[t.id];renderReferences();referencesChanged();};
        row.append(thumb,kind,note,remove);item.appendChild(row);
      });
      const add=window.document.createElement('label');add.className='btn';add.textContent='+ 설정화 이미지';
      const input=window.document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.multiple=true;input.hidden=true;input.dataset.refInput=t.id;
      input.onchange=async()=>{try{for(const file of input.files){const loaded=await loadReference(file);(references[t.id]??=[]).push({id:crypto.randomUUID(),name:file.name,label:(references[t.id]?.length)?'기타':'전신',note:'',...loaded});}status(`${t.name}에 설정화 ${references[t.id]?.length||0}장 연결됨 · 프로젝트 Save에 함께 저장됩니다.`);}catch(e){status(e.message,true);}finally{input.value='';renderReferences();referencesChanged();}};
      add.appendChild(input);item.appendChild(add);host.appendChild(item);
    }
  }
  $('studio-refs-section').ontoggle=()=>{if($('studio-refs-section').open)renderReferences();};
  async function createShotPackage(){return buildShot().then(async s=>({zip:await packageZip(s),json:s.json,prompt:s.prompt,folder:s.folder}));}
  // All cuts in one zip; the active shot is restored afterwards.
  async function createAllShotsPackage(){
    if(!shots.length)throw new Error('저장한 카메라 컷이 없습니다. 컷을 추가한 뒤 다시 시도하세요.');
    const keep=activeShot,built=[];
    try{for(let i=0;i<shots.length;i++){activeShot=i;built.push(await buildShot(i+1));}}
    finally{activeShot=keep;updateShotCamera();previewDirty=true;}
    const folder=safeName(document.title||'scene');
    return {zip:await packageAllZip(document,built),shots:built,folder};
  }
  const safeName=t=>String(t||'cut').replace(/[\\/:*?"<>|\s]+/g,'_').slice(0,40);
  async function buildShot(order=null){
    const {width,height}=exportSize(),shot=currentShot();
    const color=renderPNG(false),r=computePasses(width,height);lastDepthRange=r.range;
    const notes=new Map([...r.actors,...r.props].map(item=>[item.id,objectNotes(item.root,document)]));
    const {json,refFiles}=buildShotJson({shot,scene:document,camera:shotCamera,facts:r.facts,description:r.description,labels:r.labels,stats:r.stats,range:r.range,lightNotes:r.lightNotes,references,objectNotes:notes,width,height,lighting:document.lighting,warnings:r.labelWarnings||[]});
    const images={'color.png':dataUrlBytes(color),'label.png':await encodePNG({width,height,channels:4,data:r.images.rgba}),'depth.png':await encodePNG({width,height,channels:1,data:r.images.depth8}),'depth16.png':await encodePNG({width,height,channels:1,bitDepth:16,data:r.images.depth16}),'light.png':await encodePNG({width,height,channels:1,data:r.images.light8}),'pose.png':dataUrlBytes(passCanvas('pose',r).toDataURL('image/png')),'range.png':dataUrlBytes(passCanvas('range',r).toDataURL('image/png'))};
    const folder='shot-'+(order?String(order).padStart(2,'0')+'_':'')+safeName(shot.name);
    const prompt=buildPrompt(json);
    return {folder,images,json,prompt,refFiles};
  }
  $('studio-llm-package').onclick=async()=>{
    try{status('LLM 패키지를 만드는 중…');const {zip,folder,json}=await createShotPackage();download(folder+'.zip',zip,'application/zip');
      const missing=json.labels.filter(l=>l.kind==='person'&&!l.references.length).map(l=>l.name);
      status(`${folder}.zip 저장 · 라벨 ${json.labels.length}개 · 설정화 ${json.labels.reduce((n,l)=>n+l.references.length,0)}장`+(missing.length?` · 설정화 없는 인물: ${missing.join(', ')}`:'')+(json.warnings?.length?' · 경고: '+json.warnings.map(w=>w.message).join(' / '):''),!!json.warnings?.length);
    }catch(e){status(e.message,true);console.error(e);}
  };
  $('studio-llm-package-all').onclick=async()=>{
    try{status('모든 컷의 LLM 패키지를 만드는 중…');const {zip,shots:built,folder}=await createAllShotsPackage();download(folder+'-all-shots.zip',zip,'application/zip');
      status(`${folder}-all-shots.zip 저장 · 컷 ${built.length}개`+(built.some(s=>s.json.warnings?.length)?' · 경고가 있는 컷: '+built.filter(s=>s.json.warnings?.length).map(s=>s.json.shot.name).join(', '):''));
    }catch(e){status(e.message,true);console.error(e);}
  };
  function showPassView(){
    const img=$('studio-pass-image');
    if(passView==='color'){img.hidden=true;preview.domElement.hidden=false;return;}
    const w=576,h=Math.round(w/aspect),r=computePasses(w,h,{commit:false,only:passView});
    img.src=passCanvas(passView,r).toDataURL('image/png');img.hidden=false;preview.domElement.hidden=true;
  }
  $('studio-pass-view').onchange=()=>run(()=>{passView=$('studio-pass-view').value;showPassView();});
  function createHandoffPacket(){
    const color=renderPNG(),depth=renderPNG(true);
    const anatomyReferences=api.mannequins.flatMap((m,actorIndex)=>{
      const chest=chestLandmarks(m);if(!chest)return [];
      const project=point=>{const p=new THREE.Vector3(...point).project(shotCamera);return {point:[(p.x+1)/2,(1-p.y)/2],inFrame:p.z>=-1&&p.z<=1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1};};
      return [{actorIndex,actorId:m.userData.studioId||null,name:m.name,chest:{...chest,leftImage:project(chest.left),rightImage:project(chest.right)},imageCoordinates:'normalized, origin top-left; inFrame does not test occlusion'}];
    });
    const description=shotDescription();
    const objectDescriptions=describeObjects([...api.mannequins,...api.importedModels],document),spatialReview=inspectObjectOverlaps([...api.mannequins,...api.importedModels]);
    spatialReview.issues.forEach(issue=>issue.objectIds=issue.objects.map(index=>objectDescriptions[index].id));
    const packet={version:1,objectDescriptions,spatialReview,proposal:structuredClone(initialProposal),proposalOrigin,editorState:api.getState(),anatomyReferences,activeShot:{...currentShot(),camera:{...currentShot().camera,position:shotCamera.position.toArray(),fov:shotCamera.fov,zoom:shotCamera.zoom,view:shotCamera.view?{...shotCamera.view}:null}},render:{figureSurface:bodySurfaceMode(),aspect,near:shotCamera.near,far:shotCamera.far,depthEncoding:'euclidean-camera-distance; nearM=255 (white), farM and beyond=40, background=0',depthRangeM:lastDepthRange,resolution:[preview.domElement.width,preview.domElement.height]},images:{color,depth},shotDescription:description.structured,...(description.error?{shotDescriptionError:description.error}:{}),direction:promptText(description)};
    // Actual export size is independent from the on-screen preview dimensions.
    packet.render.resolution=aspect>=1?[1600,Math.round(1600/aspect)]:[Math.round(1600*aspect),1600];
    captureObserver?.('handoff');
    return packet;
  }
  $('studio-packet').onclick=()=>run(()=>{download('cutscene-handoff.json',JSON.stringify(createHandoffPacket(),null,2));status('이미지·카메라·정밀 편집 상태·작화 지시문을 한 파일에 저장했습니다.');});
  rebuildRoom();syncUI();updateShotCamera();
  // The third-party library points its favicon at an unbundled asset.
  window.document.querySelectorAll('link[rel="icon"]').forEach(link=>link.href='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="%236366f1"/><text x="5" y="23" fill="white" font-size="22">C</text></svg>');
  function updateEditingWalls(){for(const wall of environment.children)if(wall.userData.editingWall)wall.visible=wall.userData.editingWall==='left'?stage.camera.position.x>=-document.room.size[0]/2:stage.camera.position.z>=-document.room.size[2]/2;}
  function tickPreview({paused=false,force=false}={}){
    if((paused||!previewDirty)&&!force)return;
    if(!force&&performance.now()-lastFrame<250)return;lastFrame=performance.now();previewDirty=false;
    const w=288,h=Math.round(w/aspect);if(preview.domElement.width!==w||preview.domElement.height!==h)preview.setSize(w,h,false);
    updateShotCamera();cleanRender(()=>preview.render(stage.scene,shotCamera));
    if(passView!=='color'){clearTimeout(passTimer);passTimer=setTimeout(()=>{try{showPassView();}catch(e){console.error(e);}},500);}
  }
  return {
    setBeforeCapture(fn){beforeCapture=fn;},setBeforeReadCamera(fn){beforeReadCamera=fn;},setCaptureObserver(fn){captureObserver=fn;},
    rememberShotProjection(){shotProjection={key:JSON.stringify(currentShot().camera),zoom:shotCamera.zoom,view:shotCamera.view?{...shotCamera.view}:null};},
    environmentMeshes(role='working'){const meshes=[];const visible=(node)=>{for(let p=node;p;p=p.parent){if(role==='shot'&&p===node&&p.userData.editingWall)continue;if(!p.visible)return false;}return true;};environment.traverse(n=>{if(n.isMesh&&visible(n))meshes.push(n);});if(stage.ground?.isMesh&&visible(stage.ground))meshes.push(stage.ground);return [...new Set(meshes)];},
    shotCamera,previewRenderer:preview,updateShotCamera,cleanRender,renderPNG,createHandoffPacket,createShotPackage,createAllShotsPackage,computePasses,shotDescription,
    // Top-down plan for people and experiments; not part of the LLM package.
    planPNG(){const {width,height}=exportSize();return passCanvas('plan',computePasses(width,height,{only:'plan'})).toDataURL('image/png');},
    references:()=>references,setReferencesObserver(fn){referencesObserver=fn;},
    restoreReferences(value){if(!value||typeof value!=='object')return;const next={};for(const [id,list]of Object.entries(value)){if(!Array.isArray(list))continue;const ok=list.filter(r=>r&&typeof r.dataUrl==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(r.dataUrl)).map(r=>({id:String(r.id||crypto.randomUUID()),name:String(r.name||'reference'),label:REF_LABELS.includes(r.label)?r.label:'기타',note:String(r.note||'').slice(0,500),mime:r.dataUrl.slice(5,r.dataUrl.indexOf(';')),dataUrl:r.dataUrl}));if(ok.length)next[id]=ok;}references=next;renderReferences();},
    snapshot:()=>structuredClone({document,initialProposal,proposalOrigin,shots,activeShot,aspect,shotProjection}),
    restore(state) {if(!state)return;document=validateScene(state.document);initialProposal=validateScene(state.initialProposal||state.document);proposalOrigin=state.initialProposal?(state.proposalOrigin||'scene-import'):'legacy-current-state';shots=structuredClone(state.shots||[]);activeShot=state.activeShot ?? -1;aspect=state.aspect||16/9;shotProjection=state.shotProjection?structuredClone(state.shotProjection):null;rebuildRoom();syncUI();updateShotCamera();},
    createProp,resizeProp,loadScene,importText,showImportError,poseThumbnail,
    saveProject(state) {state.characterReferences=structuredClone(references);download('cutscene-project.json',JSON.stringify(state,null,2));status('정밀 프로젝트를 저장했습니다. Load로 다시 열 수 있습니다.');},
    invalidatePreview(){previewDirty=true;},updateEditingWalls,tick:tickPreview,
  };
}
