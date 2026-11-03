import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {defaultCoreDesign,coreNames,coreLabels,toWorld,coreField} from './doll-core-geometry.js';
import {loadCoreMesh} from './doll-core-mesh-loader.js';
import {createFixedView} from './doll-fixed-view.js';
const $=id=>document.getElementById(id),host=$('viewport'),renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:false});
renderer.setSize(600,800,false);renderer.setClearColor(0xffffff);host.prepend(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-.9,.9,1.2,-1.2,.01,30);scene.add(new THREE.HemisphereLight(0xffffff,0x78808b,2));const key=new THREE.DirectionalLight(0xffffff,2.2);key.position.set(-3,4,5);scene.add(key);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enablePan=false;orbit.enableZoom=false;orbit.enabled=false;orbit.addEventListener('change',render);
let design=defaultCoreDesign(),ready=false,meshes=new Map(),generationMs=0,buildPending=false,buildSequence=0,fixedView;const dirtyParts=new Set();
const pivotAuthor={pelvis:[0,545,0],abdomen:[0,481,0],thorax:[0,419,0]},pivots={};
for(const name of ['pelvis','abdomen','thorax']){pivots[name]=new THREE.Group();pivots[name].rotation.order='ZYX';}const placement=new THREE.Group();scene.add(placement);placement.add(pivots.pelvis);pivots.pelvis.add(pivots.abdomen);pivots.abdomen.add(pivots.thorax);
const helpers=new Map();
for(const [part,regex]of [['thorax',/^shoulder/],['pelvis',/^hip/]])for(const socket of design[part].sockets.filter(s=>regex.test(s.name))){const ball=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshStandardMaterial({color:0xa7b8c7,roughness:1}));ball.position.copy(toWorld(socket.center).sub(toWorld(pivotAuthor[part])));ball.scale.set(...socket.radius.map(n=>(n-1)/200));pivots[part].add(ball);helpers.set(socket.name,ball);}
function disposeMesh(mesh){mesh.geometry.dispose();mesh.material.dispose();mesh.removeFromParent();}
async function rebuild(names=coreNames){const start=performance.now(),sequence=++buildSequence,snapshot=structuredClone(design);buildPending=true;$('save-obj').disabled=true;if(ready)render();
 for(const name of names)dirtyParts.add(name);const requested=[...dirtyParts];
 const settled=await Promise.allSettled(requested.map(async name=>[name,await loadCoreMesh(snapshot,name)]));
 if(sequence!==buildSequence){for(const r of settled)if(r.status==='fulfilled')r.value[1].dispose();return;}
 try{const failed=settled.find(r=>r.status==='rejected');if(failed){for(const r of settled)if(r.status==='fulfilled')r.value[1].dispose();throw failed.reason;}
  for(const r of settled){const [name,g]=r.value,origin=toWorld(pivotAuthor[name]);g.translate(-origin.x,-origin.y,-origin.z);const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xc5c7cb,roughness:1,side:THREE.FrontSide}));mesh.name=name;if(meshes.has(name))disposeMesh(meshes.get(name));pivots[name].add(mesh);meshes.set(name,mesh);}
  for(const name of requested)dirtyParts.delete(name);generationMs=performance.now()-start;ready=true;updateAssembly();
 }finally{buildPending=false;$('save-obj').disabled=false;frame();}
}
function safeRebuild(names){$('error').textContent='';return rebuild(names).catch(e=>{$('error').textContent=e.message;});}
function updateAssembly(){
 const reference=$('pose').value==='reference',base={pelvis:reference?-6:0,abdomen:reference?-16:0,thorax:reference?24.4:0};
 // Calibrate the shoulder centers with a rigid yaw/roll, instead of shearing
 // the sculpture into the drawing. Hidden joint depths remain assumptions.
 pivots.pelvis.position.copy(toWorld(pivotAuthor.pelvis));if(reference)pivots.pelvis.position.add(new THREE.Vector3(-43.3/200,9.5/200,0));
 pivots.abdomen.position.copy(toWorld(pivotAuthor.abdomen).sub(toWorld(pivotAuthor.pelvis)));pivots.thorax.position.copy(toWorld(pivotAuthor.thorax).sub(toWorld(pivotAuthor.abdomen)));
 for(const name of coreNames)pivots[name].rotation.set(0,0,THREE.MathUtils.degToRad(base[name]));
 pivots.thorax.rotation.x=THREE.MathUtils.degToRad(Number($('bend').value));pivots.thorax.rotation.y=THREE.MathUtils.degToRad((reference?25:0)+Number($('turn').value));
 const e=Number($('explode').value)/100,selected=$('part').value;
 for(const [name,mesh]of meshes){mesh.visible=selected==='assembly'||selected===name;mesh.position.set(0,(name==='thorax'?55:name==='pelvis'?-55:0)*e/200,0);}
 for(const [name,ball]of helpers){const part=name.startsWith('hip')?'pelvis':'thorax';ball.visible=$('balls').checked&&(selected==='assembly'||selected===part);const socket=design[part].sockets.find(s=>s.name===name);ball.position.copy(toWorld(socket.center).sub(toWorld(pivotAuthor[part])));ball.position.y+=(part==='thorax'?55:-55)*e/200;ball.scale.set(...socket.radius.map(n=>(n-1)/200));}
 $('bend-value').textContent=$('bend').value+'°';$('turn-value').textContent=$('turn').value+'°';scene.updateMatrixWorld(true);
}
function frame(){if(!ready)return;const selected=$('part').value,whole=$('framing').value==='whole';let center=new THREE.Vector3(0,whole?.05:1.1,0),fit=whole?3.2:1.2;
 if(selected!=='assembly'){scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(meshes.get(selected));center=box.getCenter(new THREE.Vector3());const size=box.getSize(new THREE.Vector3());fit=Math.max(size.y/2,size.x/.75/2,size.z/.75/2)*1.18;}
 else if(Number($('explode').value)>0)fit=1.45;
 const view=$('view').value,dirs={front:[0,0,6],side:[6,0,0],back:[0,0,-6],oblique:[4,.2,6]};orbit.enabled=!fixedView?.enabled&&view==='free';if(dirs[view]){camera.position.copy(center).add(new THREE.Vector3(...dirs[view]));camera.lookAt(center);}orbit.target.copy(center);
 camera.left=-fit*.75;camera.right=fit*.75;camera.top=fit;camera.bottom=-fit;camera.updateProjectionMatrix();
 $('source-frame').classList.toggle('crop',!whole);$('overlay-frame').classList.toggle('crop',!whole);render();
}
function render(){if(!ready)return;const style=$('style').value;for(const [i,name]of coreNames.entries()){const m=meshes.get(name);if(!m)continue;m.material.color.set(style==='silhouette'?0x141414:style==='color'?[0xb99ba9,0xd1bc99,0x9bb6ac][i]:0xc5c7cb);m.material.wireframe=style==='wire';}
 updateCompare();
 const offset=placement.position.clone();if(fixedView?.enabled)placement.position.set(0,0,0);scene.updateMatrixWorld(true);
 try{renderer.render(scene,camera);if(fixedView?.enabled)fixedView.capture();}finally{placement.position.copy(offset);scene.updateMatrixWorld(true);}updateStats();
}
function updateCompare(){
 const canCompare=$('pose').value==='reference'&&$('part').value==='assembly'&&$('view').value==='front'&&Number($('explode').value)===0&&Number($('bend').value)===0&&Number($('turn').value)===0&&placement.position.lengthSq()<1e-12&&Math.abs(camera.zoom-1)<1e-12&&(!fixedView?.enabled||fixedView.identity);
 $('overlay').disabled=!canCompare;$('overlay-frame').hidden=!canCompare||!$('overlay').checked;renderer.domElement.style.opacity=!$('overlay-frame').hidden?'.65':'1';if(fixedView)fixedView.canvas.style.opacity=!$('overlay-frame').hidden?'.65':'1';
 $('compare-note').textContent=canCompare?'원본 비교용 강체 조립 자세. 동일 프레임의 겹침이며 카메라/깊이 복원 결과는 아닙니다.':'원본 겹침: 중심 조립체 + 원본 비교용 기울임 + 정면 + 분해/추가 회전 0에서 사용합니다.';
}
function updateStats(){const triangles=[...meshes.values()].reduce((sum,m)=>sum+m.geometry.index.count/3,0);$('stats').textContent=fixedView?.enabled?`2.5D 고정 · 투영 ${fixedView.captures}회 · ${Math.round(fixedView.zoom*100)}% · 이동/확대는 이미지 재사용`:`${triangles.toLocaleString()} shell triangles · ${renderer.info.render.calls} draws · mesh ${Math.round(generationMs)} ms`;if(buildPending)$('stats').textContent+=' · 재조형 계산 중';$('render-title').textContent=(fixedView?.enabled?'2.5D 고정 앵글 · ':'실제 3D · ')+(coreLabels[$('part').value]||'중심 조립체');
}
function sectionEditor(){const name=$('edit-part').value;$('section-rows').replaceChildren(...design[name].sections.map((row,i)=>{const tr=document.createElement('tr'),td=document.createElement('td');td.textContent=row[0];tr.append(td);for(let k=1;k<4;k++){const cell=document.createElement('td'),input=document.createElement('input');input.type='number';input.min='.5';input.max='130';input.step='1';input.value=row[k];input.setAttribute('aria-label',`${name} Y${row[0]} ${['','반폭','앞','뒤'][k]}`);input.onchange=()=>{const n=Number(input.value);if(!Number.isFinite(n)||n<.5||n>130){input.value=row[k];return;}design[name].sections[i][k]=n;void safeRebuild([name]);};cell.append(input);tr.append(cell);}return tr;}));$('projection').value=design.thorax.relief.projection;}
let paintPending=false;function requestRender(){if(paintPending)return;paintPending=true;requestAnimationFrame(()=>{paintPending=false;render();});}
function surfaceGuides(){const curves=[],r=design.thorax.relief;
 const add=(name,coordinates)=>{const m=meshes.get(name);if(!m?.visible)return;const field=coreField(design,name),origin=toWorld(pivotAuthor[name]);curves.push(coordinates.map(([x,y])=>{let hi=250,lo=null;for(let z=246;z>=0;z-=4){if(field(x,y,z)<0){lo=z;break;}hi=z;}if(lo===null)return null;for(let k=0;k<10;k++){const mid=(lo+hi)/2;if(field(x,y,mid)<0)lo=mid;else hi=mid;}return m.localToWorld(toWorld([x,y,(lo+hi)/2+.12]).sub(origin));}));};
 const line=(count,fn)=>Array.from({length:count},(_,i)=>fn(i/(count-1)));
 add('thorax',line(48,t=>[0,251+t*146]));
 for(const side of [-1,1]){add('thorax',line(42,t=>[side*r.spacing+36*Math.cos(t*Math.PI),r.centerY+35*Math.sin(t*Math.PI)]));add('thorax',line(24,t=>[side*(18+t*56),254+t*16+2*Math.sin(t*Math.PI)]));}
 add('abdomen',line(32,t=>[0,409+t*79]));add('pelvis',line(40,t=>[0,496+t*113]));return curves;
}
fixedView=createFixedView({renderer,scene,camera,orbit,host,getGuides:surfaceGuides,getOccluders:()=>[...meshes.values(),...helpers.values()].filter(m=>m.visible),onTransform:({offset,zoom})=>{placement.position.copy(offset);scene.updateMatrixWorld(true);$('fixed-zoom').value=Math.round(zoom*100);$('fixed-zoom-value').textContent=Math.round(zoom*100)+'%';updateCompare();updateStats();},onMode:active=>{$('navigation').value=active?'fixed':'live';$('fixed-tools').hidden=!active;if(!active){$('view').value='free';orbit.enabled=true;}render();}});
$('navigation').onchange=()=>fixedView.setEnabled($('navigation').value==='fixed');
$('fixed-style').onchange=()=>{fixedView.style=$('fixed-style').value;render();};
$('fixed-guides').onchange=()=>{fixedView.guides=$('fixed-guides').checked;render();};
$('fixed-zoom').oninput=()=>fixedView.zoomAt(Number($('fixed-zoom').value)/100);
for(const id of ['move-x','move-y','move-z'])$(id).onchange=()=>fixedView.setOffset(...['move-x','move-y','move-z'].map(id=>Number($(id).value)));
$('fixed-reset').onclick=()=>{fixedView.setOffset(0,0,0);fixedView.resetView();for(const id of ['move-x','move-y','move-z'])$(id).value=0;};
$('fixed-refresh').onclick=render;
$('view-png').onclick=()=>{if(!ready)return;render();const c=fixedView.enabled?fixedView.exportCanvas():renderer.domElement,a=document.createElement('a');a.href=c.toDataURL('image/png');a.download=fixedView.enabled?'doll-fixed-view.png':'doll-3d-view.png';a.click();};
orbit.removeEventListener('change',render);orbit.addEventListener('change',requestRender);
for(const id of ['part','view','framing'])$(id).onchange=()=>{updateAssembly();frame();};for(const id of ['style','overlay','balls'])$(id).onchange=()=>{updateAssembly();render();};for(const id of ['explode','bend','turn'])$(id).oninput=()=>{updateAssembly();if(id==='explode')frame();else requestRender();};
$('quality').onchange=()=>{design.displayQuality=$('quality').value;void safeRebuild();};
$('pose').onchange=()=>{$('bend').value=$('pose').value==='bend'?22:0;$('turn').value=$('pose').value==='twist'?25:0;updateAssembly();frame();};$('edit-part').onchange=sectionEditor;
$('projection').onchange=()=>{const n=Number($('projection').value);if(Number.isFinite(n)&&n>=0&&n<=75){design.thorax.relief.projection=n;void safeRebuild(['thorax']);}};
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
$('save-design').onclick=()=>download(new Blob([JSON.stringify(design,null,2)],{type:'application/json'}),'doll-core-design.json');
function obj(){scene.updateMatrixWorld(true);let out='# Actual displayed core geometry; world units = author pixels / 200\n',offset=1;for(const [name,m]of meshes){out+=`o ${name}\n`;const pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i++){const p=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);out+=`v ${p.x} ${p.y} ${p.z}\n`;}const idx=m.geometry.index;for(let i=0;i<idx.count;i+=3)out+=`f ${idx.getX(i)+offset} ${idx.getX(i+1)+offset} ${idx.getX(i+2)+offset}\n`;offset+=pos.count;}return out;}
$('save-obj').onclick=()=>download(new Blob([obj()],{type:'text/plain'}),'doll-core.obj');
function validate(data){if(data?.version!==1||data.kind!=='articulated-doll-core'||![64,72,80].includes(data.resolution))throw Error('지원하지 않는 조형 파일');if(data.displayQuality!==undefined&&!['light','balanced','source'].includes(data.displayQuality))throw Error('잘못된 표시 품질');data.displayQuality??='balanced';for(const name of coreNames){const p=data[name];if(!p||!Array.isArray(p.sections)||p.sections.length<3||p.sections.length>30||!Array.isArray(p.sockets)||p.sockets.length>8)throw Error('잘못된 부품');for(let i=0;i<p.sections.length;i++){const r=p.sections[i];if(!Array.isArray(r)||r.length!==4||r.some(n=>!Number.isFinite(n))||r[0]<220||r[0]>640||r.slice(1).some(n=>n<.5||n>130)||(i&&r[0]<=p.sections[i-1][0]))throw Error('잘못된 단면');}for(const s of p.sockets){if(typeof s.name!=='string'||!Array.isArray(s.center)||s.center.length!==3||s.center.some(n=>!Number.isFinite(n)||Math.abs(n)>650)||!Array.isArray(s.radius)||s.radius.length!==3||s.radius.some(n=>!Number.isFinite(n)||n<1||n>120))throw Error('잘못된 소켓');}}
 const r=data.thorax.relief;if(!r||['projection','spacing','width','upper','lower','centerY','clavicle'].some(k=>!Number.isFinite(r[k]))||r.projection<0||r.projection>75||[r.width,r.upper,r.lower].some(n=>n<5||n>120))throw Error('잘못된 가슴 형상');
 if(r.profile!==undefined&&(!Array.isArray(r.profile)||r.profile.length<3||r.profile.length>20||r.profile.some((row,i)=>!Array.isArray(row)||row.length!==3||row.some(n=>!Number.isFinite(n))||Math.abs(row[0])>150||row[1]<5||row[1]>100||row[2]<0||row[2]>1.5||(i&&row[0]<=r.profile[i-1][0]))))throw Error('잘못된 가슴 제어 곡선');
 for(const [part,names]of [['thorax',['shoulderL','shoulderR']],['pelvis',['hipL','hipR']]])for(const n of names)if(!data[part].sockets.some(s=>s.name===n))throw Error('필수 소켓 누락');return data;}
$('file').onchange=async()=>{try{design=validate(JSON.parse(await $('file').files[0].text()));$('quality').value=design.displayQuality;sectionEditor();await rebuild();$('error').textContent='';}catch(e){$('error').textContent=e.message;}};
$('reset').onclick=()=>{design=defaultCoreDesign();$('quality').value=design.displayQuality;$('pose').value='neutral';$('bend').value=0;$('turn').value=0;$('explode').value=0;sectionEditor();void safeRebuild();};
new ResizeObserver(()=>{const w=Math.max(240,Math.min(600,Math.round(host.clientWidth))),h=Math.round(w*4/3);if(renderer.domElement.width!==w||renderer.domElement.height!==h){renderer.setSize(w,h,false);requestRender();}}).observe(host);
sectionEditor();setTimeout(async()=>{try{await rebuild();window.dollCore={get design(){return design;},get pending(){return buildPending;},meshes,pivots,camera,renderer,scene,render,rebuild,obj,coreField,fixedView,placement};}catch(e){$('error').textContent=e.message;console.error(e);}},20);

