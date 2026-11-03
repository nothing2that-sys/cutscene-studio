import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStudyCage,cageGeometry} from './body-study-cage.js';
const $=id=>document.getElementById(id),host=$('render');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(480,640,false);renderer.setClearColor(0xffffff,1);host.prepend(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-.75,.75,2,0,.01,20);
scene.add(new THREE.HemisphereLight(0xffffff,0x656575,2));const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(-3,4,5);scene.add(key);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,1,0);orbit.enablePan=false;orbit.enableZoom=false;orbit.enabled=false;orbit.addEventListener('change',render);
const group=new THREE.Group();scene.add(group);let cage,meshMap=new Map(),cache=new Map(),marker;
function world(p){return new THREE.Vector3((p[0]-480)/640,(1280-p[1])/640,p[2]/640);}
function material(){return new THREE.MeshStandardMaterial({color:$('style').value==='silhouette'?0x111111:0xbfc3c8,roughness:1,metalness:0,side:THREE.DoubleSide,wireframe:$('style').value==='wire'});}
function clear(){for(const obj of [...group.children]){obj.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [o.material].flat())m.dispose();});group.remove(obj);}meshMap.clear();}
function build(){
 clear();const mat=material();for(const part of cage.parts){const mesh=new THREE.Mesh(cageGeometry(part.rings),mat.clone());mesh.name=part.name;group.add(mesh);meshMap.set(part.name,mesh);
 if($('style').value==='line'){
  const hull=mesh.geometry.clone(),pos=hull.attributes.position,norm=hull.attributes.normal;
  for(let i=0;i<pos.count;i++)pos.setXYZ(i,pos.getX(i)+norm.getX(i)*.0018,pos.getY(i)+norm.getY(i)*.0018,pos.getZ(i)+norm.getZ(i)*.0018);
  mesh.add(new THREE.Mesh(hull,new THREE.MeshBasicMaterial({color:0x36404b,side:THREE.BackSide})));mesh.material.color.set(0xf1f1ef);
 }
 }
 mat.dispose();
 if($('joints').checked)for(const [name,p]of Object.entries(cage.joints)){if(['crown','chin'].includes(name))continue;const radius=name.includes('shoulder')?34:name.includes('elbow')?20:name.includes('wrist')?13:name.includes('knee')?28:name.includes('ankle')?19:40;const geo=new THREE.TorusGeometry(radius/640,1.3/640,6,32),m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x3d687d,depthTest:false}));m.position.copy(world(p));m.position.z+=.16;m.renderOrder=5;group.add(m);}
 marker=new THREE.Mesh(new THREE.SphereGeometry(3/640,8,6),new THREE.MeshBasicMaterial({color:0xc22b69,depthTest:false}));marker.renderOrder=10;group.add(marker);selection(false);render();
}
function frame(){const view=$('view').value;orbit.enabled=view==='free';const dirs={front:[0,0,6],side:[6,0,0],back:[0,0,-6],oblique:[4,.25,6]};if(dirs[view]){camera.position.set(...dirs[view]).add(new THREE.Vector3(0,1,0));camera.lookAt(0,1,0);}camera.left=-.75;camera.right=.75;camera.top=1;camera.bottom=-1;camera.updateProjectionMatrix();render();}
function render(){if(!cage)return;const overlay=$('overlay').checked;$('reference-overlay').hidden=!overlay;renderer.domElement.style.opacity=overlay?'.55':'1';renderer.render(scene,camera);let vertices=0,triangles=0;for(const m of meshMap.values()){vertices+=m.geometry.attributes.position.count;triangles+=m.geometry.index.count/3;}$('stats').textContent=`${cage.pose} · ${vertices} vertices · ${triangles} triangles · ${renderer.info.render.calls} draws`;}
function options(el,values){el.replaceChildren(...values.map(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;return o;}));}
function selectPart(){const p=cage.parts[Number($('part').value)];options($('ring'),p.rings.map((_,i)=>[i,`${i} · Y ${Math.round(p.rings[i][0][1])}`]));selectRing();}
function selectRing(){const p=cage.parts[Number($('part').value)],r=p.rings[Number($('ring').value)];options($('point'),r.map((_,i)=>[i,i]));selection();}
function selection(draw=true){const p=cage.parts[Number($('part').value)||0]?.rings[Number($('ring').value)||0]?.[Number($('point').value)||0];if(!p)return;['x','y','z'].forEach((id,i)=>$(id).value=Math.round(p[i]*100)/100);if(marker){marker.position.copy(world(p));marker.visible=$('style').value==='wire';}if(draw)render();}
function pose(){cage=cache.get($('pose').value)||createStudyCage($('pose').value);cache.set(cage.pose,cage);options($('part'),cage.parts.map((p,i)=>[i,p.name]));selectPart();build();frame();}
for(const id of ['x','y','z'])$(id).addEventListener('change',()=>{const values=['x','y','z'].map(id=>Number($(id).value));if(values.some(v=>!Number.isFinite(v)||Math.abs(v)>5000))return;const p=cage.parts[Number($('part').value)];p.rings[Number($('ring').value)][Number($('point').value)]=values;build();});
$('part').onchange=selectPart;$('ring').onchange=selectRing;$('point').onchange=()=>selection();$('pose').onchange=pose;$('view').onchange=frame;$('style').onchange=build;$('joints').onchange=build;$('overlay').onchange=render;
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
$('save').onclick=()=>download(new Blob([JSON.stringify(cage,null,2)],{type:'application/json'}),`body-study-${cage.pose}.json`);
$('capture').onclick=()=>{render();renderer.domElement.toBlob(b=>download(b,`body-study-${cage.pose}-${$('view').value}.png`));};
$('reset').onclick=()=>{cache.delete(cage.pose);pose();};
$('load').onchange=async()=>{try{const data=JSON.parse(await $('load').files[0].text());if(data.version!==1||!['reference','neutral'].includes(data.pose)||!data.joints||!Array.isArray(data.parts)||!data.parts.length||data.parts.length>100)throw Error('지원하지 않는 조형 파일');for(const p of data.parts){if(typeof p.name!=='string'||!Array.isArray(p.rings)||p.rings.length<2||p.rings.length>100||p.rings.some(r=>!Array.isArray(r)||r.length!==16||r.some(v=>!Array.isArray(v)||v.length!==3||v.some(n=>!Number.isFinite(n)||Math.abs(n)>5000))))throw Error('잘못된 제어점');}cache.set(data.pose,data);$('pose').value=data.pose;pose();$('error').textContent='';}catch(e){$('error').textContent=e.message;}};
pose();
// Review automation exposes the actual rendered geometry, not a synthetic image.
window.bodyStudy={get cage(){return cage;},renderer,scene,camera,render,geometry:()=>[...meshMap.values()].map(m=>({name:m.name,positions:Array.from(m.geometry.attributes.position.array),indices:Array.from(m.geometry.index.array)}))};
