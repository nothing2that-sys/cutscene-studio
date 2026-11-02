import * as THREE from 'three';
import {constrainBody,manipulationChain,solveConstrainedIK} from './body-rig.js';

const POINTS=[
  ['head','Head','머리','center'],['torso','Torso','허리·몸통','center'],
  ['l_elbow','Left_Elbow','왼 팔꿈치','left'],['r_elbow','Right_Elbow','오른 팔꿈치','right'],
  ['l_wrist','Left_Wrist','왼 손목','left'],['r_wrist','Right_Wrist','오른 손목','right'],
  ['l_knee','Left_Knee','왼 무릎','left'],['r_knee','Right_Knee','오른 무릎','right'],
  ['l_ankle','Left_Ankle','왼 발목','left'],['r_ankle','Right_Ankle','오른 발목','right'],
];

export function initDirectEditor(api){
  const {stage}=api,canvas=stage.renderer.domElement;
  let mode=null,drag=null,lastModel=null,lastTick=0,lastRevision=-1,frameRect=null,lastHover=0;
  const toolbar=document.createElement('section');toolbar.id='direct-editor';toolbar.className='glass-panel';
  toolbar.innerHTML=`<div class="direct-mode-row"><button class="btn primary" data-edit-mode="move">인물 이동</button><button class="btn" data-edit-mode="pose">포즈 잡기</button><button class="btn" data-edit-mode="advanced">세부 조정</button><span id="direct-selection"></span></div>
    <div class="direct-view-row"><span>보기</span><button class="btn" data-direct-view="front">정면</button><button class="btn" data-direct-view="side">옆면</button><button class="btn" data-direct-view="top">위</button><span id="direct-pose-slot"></span></div>
    <p id="direct-help"></p><output id="direct-status" role="status"></output>`;
  document.getElementById('app').appendChild(toolbar);
  const overlay=document.createElement('div');overlay.id='pose-points';document.getElementById('app').appendChild(overlay);
  const aim=document.createElement('div');aim.id='pose-aim';aim.hidden=true;overlay.appendChild(aim);
  const stems=document.createElementNS('http://www.w3.org/2000/svg','svg');stems.id='pose-point-stems';overlay.prepend(stems);
  const outline=new THREE.Box3Helper(new THREE.Box3(),0x60a5fa);outline.userData.exportHideWhenGizmoDisabled=true;outline.visible=false;stage.scene.add(outline);
  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(),plane=new THREE.Plane(),normal=new THREE.Vector3();
  const status=message=>{toolbar.querySelector('#direct-status').textContent=message;};
  const world=joint=>joint.getWorldPosition(new THREE.Vector3());
  const stop=event=>{event.preventDefault();event.stopImmediatePropagation();};
  function cast(event){const r=canvas.getBoundingClientRect();mouse.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,stage.camera);}
  function screen(point){const p=point.clone().project(stage.camera),r=frameRect||canvas.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height,z:p.z};}
  function captureStart(event,object,kind,key){
    const p=kind==='joint'?world(object[key]):object.position.clone();
    stage.camera.getWorldDirection(normal);plane.setFromNormalAndCoplanarPoint(normal,p);
    cast(event);const hit=raycaster.ray.intersectPlane(plane,new THREE.Vector3());
    drag={id:event.pointerId,object,kind,key,startX:event.clientX,startY:event.clientY,startPosition:object.position.clone(),target:p.clone(),offset:hit?hit.sub(p):new THREE.Vector3(),moved:false,
      needsSolve:true,lastError:Infinity,stalled:0,rotations:Object.entries(object).filter(([_key,v])=>v?.isObject3D&&v!==object.parent).map(([name,joint])=>[name,joint.quaternion.clone()])};
    api.invalidate();
    const r=canvas.getBoundingClientRect();drag.units=2*Math.max(0.1,stage.camera.position.distanceTo(p))*Math.tan(THREE.MathUtils.degToRad(stage.camera.fov/2))/r.height;
    drag.right=new THREE.Vector3().setFromMatrixColumn(stage.camera.matrixWorld,0);drag.right.y=0;drag.right.normalize();
    drag.forward=stage.camera.getWorldDirection(new THREE.Vector3());drag.forward.y=0;
    if(drag.forward.lengthSq()<1e-8)drag.forward.set(0,0,-1);drag.forward.normalize();
    if(drag.right.lengthSq()<1e-8)drag.right.set(1,0,0);
    api.setDragging(true);canvas.style.cursor='grabbing';
    status(kind==='joint'?'원을 끌어 목표를 지정하세요. 발목은 다리 전체가, 무릎은 아래 다리가 함께 따라옵니다.':'인물 전체 이동 · 위아래 드래그는 앞뒤 이동 · Shift를 누르면 높이 이동');
  }
  function end(cancel=false){
    if(!drag)return;
    const current=drag;drag=null;aim.hidden=true;
    if(cancel){current.object.position.copy(current.startPosition);for(const [key,q]of current.rotations)current.object[key].quaternion.copy(q);if(current.object.torso)constrainBody(current.object);}
    api.setDragging(false);canvas.style.cursor='';api.refresh();api.invalidate();
    if(current.moved&&!cancel)api.commit();
    status(cancel?'드래그를 취소했습니다.':current.kind==='joint'?'이 위치까지 포즈를 조정했습니다. 닿지 않는 목표에는 뼈를 늘리지 않습니다.':'인물 전체를 이동했습니다.');
  }
  function setMode(next){
    if(!['move','pose','advanced'].includes(next))return;
    if(next===mode)return;
    end(true);mode=next;document.body.dataset.editMode=mode;
    toolbar.querySelectorAll('[data-edit-mode]').forEach(btn=>{btn.classList.toggle('primary',btn.dataset.editMode===mode);btn.setAttribute('aria-pressed',String(btn.dataset.editMode===mode));});
    toolbar.querySelector('#direct-help').textContent=mode==='move'?'인물의 어느 부분이든 잡아 통째로 옮기세요. 빈 곳을 끌면 화면이 회전합니다.':mode==='pose'?'이름이 붙은 원을 잡아 움직이세요. 좌우는 인물 기준입니다. 다른 방향은 정면·옆면·위 보기를 사용하세요.':'관절 수치와 이동·회전 기즈모로 미세 조정합니다.';
    api.modeChanged(mode);status('');
  }
  toolbar.querySelectorAll('[data-edit-mode]').forEach(btn=>btn.onclick=()=>setMode(btn.dataset.editMode));
  toolbar.querySelectorAll('[data-direct-view]').forEach(btn=>btn.onclick=()=>{
    const m=api.getSelection();if(!m){status('먼저 인물을 선택하세요.');return;}
    const box=new THREE.Box3().setFromObject(m),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),distance=Math.max(size.y,size.x,size.z)*2.5;
    // Leave room above the model for the editing toolbar.
    center.y+=size.y*0.12;
    let offset=new THREE.Vector3(1,0,0);if(m.body)offset.applyQuaternion(m.body.getWorldQuaternion(new THREE.Quaternion()));else offset.applyQuaternion(m.quaternion);
    offset.y=0;if(offset.lengthSq()<1e-8)offset.set(0,0,1);offset.normalize();
    if(btn.dataset.directView==='side')offset.cross(new THREE.Vector3(0,1,0)).normalize();
    if(btn.dataset.directView==='top')offset.set(0,1,0.001).normalize();
    stage.camera.position.copy(center).addScaledVector(offset,distance);stage.controls.target.copy(center);stage.controls.update();api.commit();
  });
  const buttons=POINTS.map(([key,part,label,side])=>{
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');stems.appendChild(line);
    const btn=document.createElement('button');btn.className='pose-point '+side;btn.dataset.posePoint=key;btn.setAttribute('aria-label',label+' 위치 조정');btn.innerHTML='<i></i><span>'+label+'</span>';
    btn.onpointerdown=event=>{if(event.button!==0)return;const m=api.getSelection();if(!m?.[key])return;stop(event);api.select(m,part);captureStart(event,m,'joint',key);};overlay.appendChild(btn);return {btn,line,key,part,label,side};
  });
  canvas.addEventListener('pointerdown',event=>{
    if(mode==='advanced'||event.button!==0)return;
    cast(event);const objects=api.objects();const hit=raycaster.intersectObjects(objects,true)[0];if(!hit)return;
    let node=hit.object;while(node&&!objects.includes(node))node=node.parent;if(!node)return;
    stop(event);api.select(node,'Root');
    if(mode==='move')captureStart(event,node,'object');else status('인물을 선택했습니다. 이름이 붙은 원을 잡아 포즈를 바꾸세요.');
  },true);
  canvas.addEventListener('pointermove',event=>{if(drag||mode==='advanced'||performance.now()-lastHover<50)return;lastHover=performance.now();cast(event);canvas.style.cursor=raycaster.intersectObjects(api.objects(),true).length?(mode==='move'?'grab':'pointer'):'';});
  window.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;stop(event);
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;drag.moved ||= Math.hypot(dx,dy)>2;
    if(drag.kind==='object'){
      drag.object.position.copy(drag.startPosition).addScaledVector(drag.right,dx*drag.units);
      if(event.shiftKey)drag.object.position.y-=dy*drag.units;else drag.object.position.addScaledVector(drag.forward,-dy*drag.units);
      drag.object.updateMatrixWorld(true);
    }else{cast(event);const hit=raycaster.ray.intersectPlane(plane,new THREE.Vector3());if(hit){drag.target.copy(hit).sub(drag.offset);drag.needsSolve=true;drag.stalled=0;drag.lastError=Infinity;}}
    api.invalidate();
  },true);
  window.addEventListener('pointerup',event=>{if(drag&&event.pointerId===drag.id){stop(event);end();}},true);
  window.addEventListener('pointercancel',()=>end(true));window.addEventListener('blur',()=>end(true));
  window.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag){stop(event);end(true);}},true);
  function tick(now){
    requestAnimationFrame(tick);if(now-lastTick<32)return;lastTick=now;const m=api.getSelection();
    const revision=api.revision();if(revision===lastRevision&&m===lastModel&&!drag?.needsSolve)return;lastRevision=revision;
    frameRect=canvas.getBoundingClientRect();stage.camera.updateMatrixWorld();
    if(drag&&drag.object!==m)end(true);
    if(m!==lastModel){lastModel=m;status('');}
    toolbar.querySelector('#direct-selection').textContent=m?m.name||'선택한 인물':'인물을 클릭하세요';
    outline.visible=!!m&&mode==='move';if(outline.visible)outline.box.setFromObject(m);
    if(drag?.kind==='joint'&&drag.needsSolve){
      const result=solveConstrainedIK(m,manipulationChain(drag.key),drag.target,{iterations:8});
      drag.stalled=Math.abs(result.error-drag.lastError)<1e-6?drag.stalled+1:0;drag.lastError=result.error;
      if(result.error<0.001||drag.stalled>=2)drag.needsSolve=false;
      api.invalidate();
      const p=screen(drag.target);aim.hidden=false;aim.style.left=p.x+'px';aim.style.top=p.y+'px';aim.dataset.reached=String(result.reached);
    }
    const placed=[];
    const centerX=m?.torso?screen(world(m.torso)).x:0;
    for(const {btn,line,key,side}of buttons){
      btn.hidden=mode!=='pose'||!m?.[key];line.style.display='none';if(btn.hidden)continue;
      const p=screen(world(m[key]));btn.hidden=p.z< -1||p.z>1||p.x<0||p.x>innerWidth||p.y<0||p.y>innerHeight;
      if(btn.hidden)continue;
      const display={x:p.x,y:p.y};let attempts=0;
      while(placed.some(other=>Math.hypot(other.x-display.x,other.y-display.y)<36)&&attempts++<8)display.x+=(side==='right'?-1:1)*38;
      placed.push(display);
      if(attempts){line.style.display='';line.setAttribute('x1',p.x);line.setAttribute('y1',p.y);line.setAttribute('x2',display.x);line.setAttribute('y2',display.y);}
      btn.style.left=display.x+'px';btn.style.top=display.y+'px';btn.classList.toggle('active',drag?.key===key);
      btn.classList.toggle('label-left',display.x<centerX-10);
    }
    frameRect=null;
  }
  setMode('move');requestAnimationFrame(tick);
  return {get mode(){return mode;},setMode,status,poseSlot:toolbar.querySelector('#direct-pose-slot'),cancel:()=>end(true)};
}
