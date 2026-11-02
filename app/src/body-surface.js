import * as THREE from 'three';
import {buildHumanSkin,HUMAN_SKIN_STATS,skinPartBounds} from './human-skin.js';
export {HUMAN_SKIN_STATS};
const surfaces=new WeakMap(),empty=new THREE.BufferGeometry();empty.setAttribute('position',new THREE.Float32BufferAttribute([],3));empty.computeBoundingBox();
let mode='human';try{mode=localStorage.getItem('cutscene-body-surface')==='rig'?'rig':'human';}catch{}
let guides=true;try{guides=localStorage.getItem('cutscene-body-guides')!=='false';}catch{}
export const bodyGuidesVisible=()=>guides;
export function setBodyGuides(value,models=[]){guides=!!value;try{localStorage.setItem('cutscene-body-guides',String(guides));}catch{}for(const m of models){const material=surfaces.get(m)?.material;if(material?.userData.bodyGuides)material.userData.bodyGuides.value=guides?1:0;}}
export const bodySurfaceMode=()=>mode;
export const surfaceColor=()=>mode==='human'?'#d9e4f3':'#b59a76';
function stateFor(m){let state=surfaces.get(m);if(!state){state={sources:[],mesh:null,bones:null,mode:'rig',paused:false,material:new THREE.MeshStandardMaterial({color:'#fafafa',vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide,emissive:'#ffffff',emissiveIntensity:.18})};surfaces.set(m,state);}return state;}
function collect(m,state){m.traverse(image=>{if(image.isMesh&&image!==state.mesh&&!image.userData.bodyOutline&&!state.sources.some(p=>p.image===image))state.sources.push({image,geometry:image.geometry,visible:image.visible,raycast:image.raycast});});}
function restoreSources(state){for(const p of state.sources){p.image.geometry=p.geometry;p.image.visible=p.visible;p.image.raycast=p.raycast;}}
function hideSources(state){for(const p of state.sources){p.image.geometry=empty;p.image.visible=false;p.image.raycast=()=>{};}}
export function setBodySurface(m,value=mode){
 if(!m?.torso)return;const state=stateFor(m);if(state.paused)return;collect(m,state);restoreSources(state);state.mode=value==='rig'?'rig':'human';
 if(state.mode==='human'){if(!state.mesh){const built=buildHumanSkin(m,state.material,state.bones);state.mesh=built.mesh;state.bones=built.bones;}else m.add(state.mesh);hideSources(state);}else state.mesh?.removeFromParent();
 if(state.material.userData.bodyGuides)state.material.userData.bodyGuides.value=guides?1:0;
 m.userData.bodySurface=state.mode;invalidateBodySurface(m);
}
export function invalidateBodySurface(m){const state=surfaces.get(m);if(state?.mesh&&!state.paused)state.mesh.traverse(part=>{if(part.isSkinnedMesh){part.boundingBox=null;part.boundingSphere=null;}});}
export function suspendBodySurface(m){const state=surfaces.get(m);if(!state)return null;state.paused=true;state.mesh?.removeFromParent();restoreSources(state);return state.mode;}
export function resumeBodySurface(m,previous){const state=surfaces.get(m);if(!state)return;if(state.mesh){state.mesh.traverse(part=>{if(part.userData.bodyOutline)part.material.dispose();});state.mesh.geometry.dispose();state.mesh.skeleton.dispose();state.mesh=null;}state.paused=false;setBodySurface(m,previous);}
export function getHumanSkin(m){return surfaces.get(m)?.mesh||null;}
export function bodyPartBounds(m,key){const mesh=getHumanSkin(m);return mesh?.parent===m?skinPartBounds(mesh,key):new THREE.Box3().setFromObject(m[key]);}
export function setBodySurfaceMode(value,models=[]){mode=value==='rig'?'rig':'human';try{localStorage.setItem('cutscene-body-surface',mode);}catch{}models.forEach(m=>setBodySurface(m,mode));}
