import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {getStage} from 'mannequin-js/src/mannequin.js';
import {createCharacter,constrainBody,solveConstrainedIK} from './body-rig.js';
import {setBodySurface,getHumanSkin} from './body-surface.js';

const stage=getStage(),renderer=stage.renderer,scene=stage.scene,host=document.querySelector('#preview');
renderer.setAnimationLoop(null);renderer.domElement.style.cssText='width:100%;height:100%;position:static';host.prepend(renderer.domElement);renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;scene.background=new THREE.Color('#fafafa');
for(const child of [...scene.children])child.removeFromParent();
const ambient=new THREE.AmbientLight('white',.65),key=new THREE.DirectionalLight('white',2.8);key.position.set(4,5,4);key.target.position.set(0,1,0);scene.add(ambient,key,key.target);
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,30),orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=false;orbit.addEventListener('change',()=>render());
let model,range=1,span=1,center=new THREE.Vector3(),width=1,height=1,ready=false;
const value=id=>document.getElementById(id).value;
function build(){
 const stature=Number(value('preview-height'))/100;if(!Number.isFinite(stature)||stature<.5||stature>3){document.getElementById('preview-status').textContent='키는 50~300cm로 입력하세요.';return;}
 if(model){const geometries=new Set(),materials=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const material of [o.material].flat())materials.add(material);});getHumanSkin(model)?.skeleton.dispose();model.removeFromParent();for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();}
 model=createCharacter({height:stature,headUnits:Number(value('preview-heads')),...(value('preview-body')==='feminine'?{chest:{height:.65,spacing:.46,projection:1}}:{})});setBodySurface(model,'human');
 for(const part of ['body','torso','neck','head'])model[part].rotation.set(0,0,0);
 if(value('preview-pose')==='hips'){
  for(const side of ['l','r']){model[side+'_arm'].raise=-5;model[side+'_arm'].straddle=55;model[side+'_elbow'].bend=100;}
  constrainBody(model);
  for(const side of ['l','r']){const target=model.torso.imageWrapper.localToWorld(new THREE.Vector3(4,1.5,side==='l'?-5:5));for(let i=0;i<25;i++)solveConstrainedIK(model,[side+'_arm',side+'_elbow',side+'_wrist'],target);}
 }else if(value('preview-pose')==='raised'){model.l_arm.raise=150;model.l_arm.straddle=25;model.l_elbow.bend=105;model.r_elbow.bend=75;}
 else if(value('preview-pose')==='squat'){for(const side of ['l','r']){model[side+'_leg'].raise=100;model[side+'_leg'].straddle=20;model[side+'_knee'].bend=130;model[side+'_arm'].raise=80;}model.torso.bend=20;}
 constrainBody(model);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());center=bounds.getCenter(new THREE.Vector3());range=Math.max(size.y*.57,.45);span=Math.max(size.x,size.z);orbit.target.copy(center);frame(new THREE.Vector3(6,.35,4));ready=true;resize();document.getElementById('preview-status').textContent=`${Math.round(stature*100)}cm · ${value('preview-heads')}등신 · 동일한 체형·자세의 방향 비교`;
}
function frame(direction){camera.position.copy(center).add(direction);camera.lookAt(center);}
function viewport(x,w,direction){if(direction)frame(direction);const aspect=w/height,fit=Math.max(range,span*.57/aspect);camera.left=-fit*aspect;camera.right=fit*aspect;camera.top=fit;camera.bottom=-fit;camera.updateProjectionMatrix();renderer.setViewport(x,0,w,height);renderer.setScissor(x,0,w,height);renderer.render(scene,camera);}
function render(){
 if(!ready)return;const mode=value('preview-view'),compare=mode==='compare';host.classList.toggle('single',!compare);orbit.enabled=mode==='free';renderer.setScissorTest(true);renderer.clear();
 if(compare){const part=Math.floor(width/3);viewport(0,part,new THREE.Vector3(6,.02,0));viewport(part,part,new THREE.Vector3(0,.02,6));viewport(part*2,width-part*2,new THREE.Vector3(6,.35,4));}
 else viewport(0,width,mode==='front'?new THREE.Vector3(6,.02,0):mode==='side'?new THREE.Vector3(0,.02,6):null);
 renderer.setScissorTest(false);
}
function resize(){width=Math.min(1600,Math.max(1,host.clientWidth));height=Math.min(1000,Math.max(1,host.clientHeight));renderer.setSize(width,height,false);render();}
for(const id of ['preview-body','preview-height','preview-heads','preview-pose'])document.getElementById(id).addEventListener('change',build);
document.getElementById('preview-view').addEventListener('change',()=>{frame(new THREE.Vector3(6,.35,4));render();});
document.getElementById('preview-capture').onclick=()=>{render();const link=document.createElement('a');link.download='gallery-body-comparison.png';link.href=renderer.domElement.toDataURL('image/png');link.click();};
new ResizeObserver(resize).observe(host);build();
