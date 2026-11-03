import {displayedObjectBounds} from './body-surface.js';
import * as THREE from 'three';
import {bodySurfaceMode,setBodySurfaceMode,bodyGuidesVisible,setBodyGuides} from './body-surface.js';

export function initViewPerformance(api){
  const {stage}=api,renderer=stage.renderer;
  let dirty=true,revision=1,lastRender=0,lastControlsRevision=-1,savedCamera=null,soloModel=null,restoring=false,fixedController=null;
  let lightweight=true;try{lightweight=localStorage.getItem('cutscene-lightweight')!=='false';}catch{}
  const options=document.createElement('div');options.className='view-performance';
  options.innerHTML='<label><input id="pose-solo" type="checkbox" checked> 포즈는 선택 인물만</label><label><input id="edit-lightweight" type="checkbox"> 가벼운 화면</label><details id="render-info"><summary>렌더링 정보</summary><pre id="render-info-text"></pre></details>';
  document.querySelector('#direct-editor').appendChild(options);
  const surfaceLabel=document.createElement('label');surfaceLabel.textContent='인체 표시 ';
  const surfaceSelect=document.createElement('select');surfaceSelect.id='body-surface-mode';surfaceSelect.setAttribute('aria-label','인체 표시 방식');surfaceSelect.innerHTML='<option value="human">관절별 작화 인체</option><option value="rig">기존 관절 마네킹</option>';surfaceSelect.value=bodySurfaceMode();surfaceLabel.appendChild(surfaceSelect);options.prepend(surfaceLabel);
  surfaceSelect.onchange=()=>{setBodySurfaceMode(surfaceSelect.value,api.objects());guideInput.disabled=surfaceSelect.value==='rig';invalidate();};
  const modelPreview=document.createElement('a');modelPreview.href='/model-preview.html';modelPreview.target='_blank';modelPreview.rel='noopener';modelPreview.className='btn';modelPreview.textContent='인체 외형 비교';options.appendChild(modelPreview);
  const guideLabel=document.createElement('label');guideLabel.innerHTML='<input id="body-guides" type="checkbox"> 인체 구조선';options.appendChild(guideLabel);const guideInput=guideLabel.querySelector('input');guideInput.checked=bodyGuidesVisible();guideInput.disabled=surfaceSelect.value==='rig';guideInput.onchange=()=>{setBodyGuides(guideInput.checked,api.objects());invalidate();};
  const soloInput=options.querySelector('#pose-solo'),lightInput=options.querySelector('#edit-lightweight');lightInput.checked=lightweight;
  const originalDamping=stage.controls.enableDamping,stats={renders:0,lastDrawCalls:0,lastTriangles:0,lastVisibleActors:0};
  function invalidate(){dirty=true;revision++;api.invalidatePreview();fixedController?.invalidate();}
  function cameraState(){return {position:stage.camera.position.toArray(),rotation:stage.camera.rotation.toArray(),target:stage.controls.target.toArray(),fov:stage.camera.fov,up:stage.camera.up.toArray(),zoom:stage.camera.zoom,view:stage.camera.view?{...stage.camera.view}:null};}
  function restoreCamera(state){stage.camera.position.fromArray(state.position);stage.camera.rotation.fromArray(state.rotation);stage.camera.up.fromArray(state.up||[0,1,0]);stage.camera.fov=state.fov;stage.camera.zoom=state.zoom||1;stage.camera.view=state.view?{...state.view}:null;stage.camera.updateProjectionMatrix();stage.controls.target.fromArray(state.target);stage.controls.update();}
  function focus(model,view){
    model.updateMatrixWorld(true);const box=displayedObjectBounds(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());center.y+=size.y*0.12;
    const valid=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite)&&a.some(n=>Math.abs(n)>1e-8);
    const direction=valid(view?.direction)?new THREE.Vector3(...view.direction):stage.camera.position.clone().sub(center);
    if(valid(view?.direction))stage.camera.up.fromArray(valid(view?.up)?view.up:[0,1,0]).normalize();
    if(direction.lengthSq()<1e-8)direction.set(0.5,0.2,1);
    stage.camera.position.copy(center).addScaledVector(direction.normalize(),Math.max(size.x,size.y,size.z,0.5)*2.5);stage.controls.target.copy(center);stage.controls.update();
  }
  function sync(){
    const selected=api.getSelection(),next=!restoring&&api.getMode()==='pose'&&soloInput.checked&&selected?.torso?selected:null;
    if(next!==soloModel){
      if(next){if(!savedCamera)savedCamera=cameraState();soloModel=next;focus(next);}
      else {soloModel=null;if(savedCamera){const previous=savedCamera;savedCamera=null;restoreCamera(previous);}}
      invalidate();
    }
    if(lastControlsRevision!==revision){
      lastControlsRevision=revision;document.body.dataset.poseSolo=String(!!soloModel);
      for(const el of document.querySelectorAll('#studio-shot-add,#studio-fov,[data-shot-update]')){el.disabled=!!soloModel;el.title=soloModel?'구도 편집은 인물 이동 모드에서 하세요. 단독 시점은 포즈 작업용입니다.':'';}
      const label=document.getElementById('studio-preview-state');if(label)label.textContent=soloModel?'단독 포즈 편집 중 · 미리보기 일시 정지':'장면이 바뀔 때 미리보기를 갱신합니다.';
      updateInfo();
    }
  }
  function resize(){
    const w=innerWidth,h=innerHeight,scale=lightweight?Math.min(1,1024/w,768/h):1;
    renderer.setPixelRatio(1);renderer.setSize(Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)),false);
    stage.camera.aspect=w/h;stage.camera.updateProjectionMatrix();renderer.shadowMap.enabled=!lightweight;stage.controls.enableDamping=lightweight?false:originalDamping;invalidate();
  }
  function draw(){
    const hidden=[];
    if(soloModel){
      for(const object of api.objects())if(object!==soloModel){hidden.push([object,object.visible]);object.visible=false;}
      stage.scene.children.forEach(object=>{if(object.name==='Cutscene room'||object===stage.ground||object.type==='GridHelper'||object.type==='AxesHelper'){hidden.push([object,object.visible]);object.visible=false;}});
    }
    try{renderer.render(stage.scene,fixedController?.displayCamera||stage.camera);stats.renders++;stats.lastDrawCalls=renderer.info.render.calls;stats.lastTriangles=renderer.info.render.triangles;stats.lastVisibleActors=api.objects().filter(m=>m.torso&&m.visible).length;updateInfo();}
    finally{for(const [object,visible]of hidden)object.visible=visible;}
  }
  lightInput.onchange=()=>{lightweight=lightInput.checked;try{localStorage.setItem('cutscene-lightweight',String(lightweight));}catch{}resize();};
  soloInput.onchange=()=>{sync();invalidate();};
  const gl=renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');
  const rendererName=extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  function updateInfo(){if(!options.querySelector('#render-info').open)return;const output=options.querySelector('#render-info-text'),value=rendererName+'\n'+(/SwiftShader|llvmpipe|Software/i.test(rendererName)?'소프트웨어 렌더링 감지':'그래픽 장치 렌더링')+'\n편집 해상도: '+renderer.domElement.width+'×'+renderer.domElement.height+'\n편집 그림자: '+(lightweight?'끔':'켬')+'\n선택 인물 단독: '+(soloModel?'켬':'끔')+'\n최근 그리기 호출: '+stats.lastDrawCalls;if(output.textContent!==value)output.textContent=value;}
  options.querySelector('#render-info').ontoggle=updateInfo;
  window.addEventListener('resize',resize);stage.controls.addEventListener('change',invalidate);
  for(const event of ['click','input','change','keydown','pointerdown','pointerup','load'])window.addEventListener(event,invalidate,true);
  document.addEventListener('visibilitychange',invalidate);
  // Replace the library's unconditional full-scene loop with changed-frame rendering.
  renderer.setAnimationLoop(null);const started=performance.now();
  function frame(now){
    requestAnimationFrame(frame);if(document.hidden)return;
    if(fixedController?.enabled){fixedController.tick();return;}
    sync();stage.controls.update();api.tickPreview(!!soloModel||api.isDragging());
    const interval=1000/(lightweight?30:60);
    if((!dirty&&now-started>600)||now-lastRender<interval)return;
    dirty=false;lastRender=now-(now-lastRender)%interval;stage.animationLoop?.((now-started)/1000);api.updateWalls();draw();
  }
  resize();requestAnimationFrame(frame);
  return {
    setFixedController(controller){fixedController=controller;},
    invalidate,revision:()=>revision,sync,stats,
    isSolo:()=>!!soloModel,
    refocus(view){sync();if(soloModel){focus(soloModel,view);invalidate();}},
    editingObjects:()=>soloModel?[soloModel]:api.objects(),
    snapshotCamera(){if(!savedCamera)return null;const {up,...state}=savedCamera;return structuredClone(state);},
    beforeRestore(){restoring=true;if(savedCamera){const original=savedCamera;savedCamera=null;soloModel=null;restoreCamera(original);}},
    afterRestore(){restoring=false;sync();invalidate();},
    setWorkingCamera(def){
      if(savedCamera){const camera=new THREE.PerspectiveCamera(def.fov);camera.position.fromArray(def.position);camera.lookAt(new THREE.Vector3(...def.target));savedCamera={...savedCamera,position:[...def.position],target:[...def.target],rotation:camera.rotation.toArray(),fov:def.fov};}
      else restoreCamera({...cameraState(),...def,rotation:cameraState().rotation});invalidate();
    },
    setWorkingFov(value){if(savedCamera)savedCamera.fov=value;else {stage.camera.fov=value;stage.camera.updateProjectionMatrix();}invalidate();}
  };
}
