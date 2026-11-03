import * as THREE from 'three';
import {coreShapeKey} from './doll-core-geometry.js';
const cache=new Map(),requests=new Map(),previews=new Map();let worker,sequence=0;
function fromPayload(p){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(p.positions),3));g.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(p.normals),3));g.setIndex(new THREE.BufferAttribute(p.indices instanceof Uint32Array?new Uint32Array(p.indices):new Uint16Array(p.indices),1));g.userData=structuredClone(p.metadata);g.computeBoundingBox();g.computeBoundingSphere();return g;}
function getWorker(){if(worker)return worker;worker=new Worker(new URL('./doll-core-worker.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const request=requests.get(data.id);if(!request)return;requests.delete(data.id);if(data.error)request.reject(Error(data.error));else request.resolve(data);};worker.onerror=()=>{for(const r of requests.values())r.reject(Error('백그라운드 조형 계산에 실패했습니다.'));requests.clear();worker.terminate();worker=undefined;};return worker;}
async function getPreview(bundle){const base=bundle==='full'?'/doll-full-core':bundle==='gallery-p015'?'/doll-gallery-p015':'/doll-core';if(!previews.has(base))previews.set(base,Promise.all([fetch(base+'/preview.json').then(r=>{if(!r.ok)throw Error('No preview');return r.json();}),fetch(base+'/preview.bin').then(r=>{if(!r.ok)throw Error('No preview');return r.arrayBuffer();})]).then(([manifest,buffer])=>({manifest,buffer})).catch(()=>null));return previews.get(base);}
export async function loadCoreMesh(design,name){const quality=design.displayQuality||'balanced',key=coreShapeKey(design,name)+':'+quality;if(cache.has(key)){const g=cache.get(key);cache.delete(key);cache.set(key,g);return g.clone();}
 let payload;
 if(quality==='balanced'){
  const built=await getPreview(design.previewBundle),entry=built?.manifest.version===1&&built.manifest.entries.find(p=>p.name===name&&p.shapeKey===coreShapeKey(design,name)&&p.quality===quality);
  if(entry){try{const read=k=>{const s=entry[k];if(!s||!Number.isInteger(s.offset)||!Number.isInteger(s.length)||s.length<1)throw Error('Invalid preview');return s.type==='Uint16Array'?new Uint16Array(built.buffer,s.offset,s.length):new Float32Array(built.buffer,s.offset,s.length);};payload={positions:read('positions'),normals:read('normals'),indices:read('indices'),metadata:entry.metadata};}catch{payload=undefined;}}
 }
 if(!payload){const id=++sequence;payload=await new Promise((resolve,reject)=>{requests.set(id,{resolve,reject});getWorker().postMessage({id,design,name});});}
 const g=fromPayload(payload);cache.set(key,g.clone());while(cache.size>12){const first=cache.keys().next().value;cache.get(first).dispose();cache.delete(first);}return g;
}
