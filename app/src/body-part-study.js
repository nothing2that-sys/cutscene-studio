import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStudyCage,cageGeometry} from './body-study-cage.js';

// A structural inspection of the previous cage, not a new accepted body surface.
// Separating at shared authored rings makes each proposed shell inspectable.
const $=id=>document.getElementById(id);
const definitions=[
 ['head','머리','턱으로 좁아지는 달걀형. 얼굴 중심선·눈높이선은 표면 보조선이다.','고개 회전 중심과 외형의 턱 끝을 분리해서 설계한다.',[395,79,121,150]],
 ['neck','목','단순 원통보다 목 밑이 쇄골로 넓어지는 형상.','머리 아래와 흉곽 위의 연결. 쇄골은 목 부품 바깥 흉곽에도 이어진다.',[436,215,63,56]],
 ['thorax','흉곽·가슴','상부가 넓은 흉곽에 가슴의 넓은 뿌리·바깥 곡선·아랫면을 함께 조형한다.','어깨 소켓을 가진 중심 부품. 가슴 두 개를 회전하는 독립 구로 만들지 않는다.',[409,251,182,164]],
 ['abdomen','복부·허리','늑골 아래에서 좁아졌다가 장골로 퍼지는 연결. 원본에서는 중심선이 휘어 있다.','제안: 흉곽과 골반 사이 기울임/비틀기용 중간 부품. 그림의 모든 선이 분할선은 아니다.',[429,392,136,105]],
 ['pelvis','골반','장골의 옆 폭, 복부 앞면, 서혜부의 사선, 두 허벅지 입구를 가진다.','구형 덩어리 대신 두 고관절의 소켓을 가진 부품으로 설계한다.',[313,478,245,138]],
 ['upperL','상완 · 화면 왼쪽','삼각근 쪽이 넓고 팔꿈치로 좁아짐. 앞뒤 곡선과 폭의 최대 위치가 다르다.','어깨 구관절 + 팔꿈치 굽힘축. 어깨 덮개는 상완의 근위부 형상으로 검토한다.',[238,240,181,167]],
 ['foreL','전완 · 화면 왼쪽','팔꿈치 가까이가 넓고 손목은 납작하고 가늘다. 대칭 캡슐로 만들지 않는다.','팔꿈치 굽힘과 전완의 비틀림을 별도로 계획한다.',[246,379,114,112]],
 ['palmL','손 · 화면 왼쪽','손바닥은 납작한 쐐기. 손등→손가락 뿌리→각 마디가 이어진다.','손목 회전 중심을 손바닥 외형에 묻고, 엄지 방향과 손가락 마디를 나눈다.',[339,445,109,59]],
 ['upperR','상완 · 화면 오른쪽','들린 팔의 삼각근·겨드랑이 모양을 반대쪽과 함께 확인해야 한다.','어깨 회전 시 소켓이 노출되는 정도와 겨드랑이 간섭을 점검한다.',[518,157,143,151]],
 ['foreR','전완 · 화면 오른쪽','머리 위 손목으로 갈수록 가늘어지는 비대칭 형상.','그림의 팔꿈치 원은 회전부의 외형을 읽는 기준이다.',[510,90,147,96]],
 ['palmR','손 · 화면 오른쪽','머리 표면에 놓인 손은 손바닥과 손가락이 꺾여 있다.','손목 각도와 손가락 굽힘이 모두 필요하다. 숨은 손바닥 깊이는 추정이다.',[420,66,116,59]],
 ['thighL','허벅지 · 화면 왼쪽','골반 아래의 넓은 뿌리에서 무릎으로 좁아짐. 안쪽과 바깥쪽 곡선이 다르다.','고관절과 무릎 사이의 단단한 부품. 중간의 가로 보조선에서 나누지 않는다.',[313,550,134,291]],
 ['shinL','종아리 · 화면 왼쪽','위쪽 종아리 볼륨과 가는 발목. 정강이 앞면은 별도 방향을 읽게 한다.','무릎의 원형 회전부와 발목 사이 부품. 무릎 덮개를 피부 위에 붙이지 않는다.',[340,806,92,295]],
 ['footL','발 · 화면 왼쪽','발뒤꿈치·발등·앞꿈치·발가락을 구분한 비대칭 쐐기.','발목 중심은 발등 위. 정면 폭과 측면 아치/뒤꿈치를 함께 조형한다.',[375,1066,79,150]],
 ['thighR','허벅지 · 화면 오른쪽','벌어진 다리에서는 안쪽 서혜부와 바깥 대퇴 윤곽이 다르게 보인다.','중간 가로선은 보조선으로 보고 무릎 중심까지 한 부품으로 검토한다.',[445,576,190,263]],
 ['shinR','종아리 · 화면 오른쪽','바깥 볼륨의 최대 높이가 안쪽과 다르게 읽힌다.','앞뒤 깊이와 근육의 중심 이동은 한 장에서 확정할 수 없다.',[567,803,128,283]],
 ['footR','발 · 화면 오른쪽','발꿈치가 옆으로 드러나고 앞꿈치는 다른 방향을 향한다.','왼발을 화면상 좌우 반전한 모양만으로 만들 수 없다. 회전과 깊이를 확인한다.',[625,1045,101,174]],
];
const palette=['#73869c','#a9b6bc','#bd91a3','#d5b785','#94afa1','#a3a9d0','#83b2c6','#c3a17e'];
const source=createStudyCage('neutral'),parts=[];
const add=(name,rings,shift)=>parts.push({name,rings,shift});
const trunk=source.parts.find(p=>p.name==='trunk').rings;
add('head',source.parts.find(p=>p.name==='head').rings,[0,95,0]);
add('neck',trunk.slice(0,3),[0,60,0]);add('thorax',trunk.slice(2,11),[0,30,0]);
add('abdomen',trunk.slice(10,14),[0,0,0]);add('pelvis',trunk.slice(13),[0,-30,0]);
for(const s of ['L','R']){
 const side=s==='L'?-1:1,arm=source.parts.find(p=>p.name==='arm'+s).rings,leg=source.parts.find(p=>p.name==='leg'+s).rings;
 add('upper'+s,arm.slice(0,8),[side*75,30,0]);add('fore'+s,arm.slice(7),[side*100,0,0]);
 add('thigh'+s,leg.slice(0,7),[side*30,-65,0]);add('shin'+s,leg.slice(6),[side*40,-105,0]);
 for(const p of source.parts.filter(p=>p.name.endsWith(s)&&/^(palm|foot)/.test(p.name)))add(p.name,p.rings,p.name.startsWith('palm')?[side*115,-10,0]:[side*40,-140,0]);
 // Fingers and toes move with their corresponding shell in exploded inspection.
 for(const p of source.parts.filter(p=>new RegExp(`^(finger${s}|thumb${s}|toe${s})`).test(p.name)))add(p.name,p.rings,p.name.startsWith('toe')?[side*40,-140,0]:[side*115,-10,0]);
}
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(480,640,false);renderer.setClearColor(0xffffff);$('viewport').append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-.95,.95,1.267,-1.267,.01,30);camera.position.set(0,1,6);camera.lookAt(0,1,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x67737f,2));const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(-3,4,5);scene.add(light);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,1,0);orbit.update();orbit.enablePan=false;orbit.enableZoom=false;orbit.addEventListener('change',render);
const meshes=new Map();parts.forEach((p,i)=>{const mesh=new THREE.Mesh(cageGeometry(p.rings),new THREE.MeshStandardMaterial({color:palette[i%palette.length],roughness:1,side:THREE.DoubleSide}));mesh.name=p.name;scene.add(mesh);meshes.set(p.name,mesh);});
const pivots=new THREE.Group();scene.add(pivots);
for(const [name,p]of Object.entries(source.joints)){if(['crown','chin'].includes(name))continue;const m=new THREE.Mesh(new THREE.SphereGeometry(4/640,10,6),new THREE.MeshBasicMaterial({color:0x353d49,depthTest:false}));m.position.set((p[0]-480)/640,(1280-p[1])/640,p[2]/640+.14);m.renderOrder=10;pivots.add(m);}
function family(name){if(name.startsWith('finger')||name.startsWith('thumb'))return 'palm'+(name.includes('L')?'L':'R');if(name.startsWith('toe'))return 'foot'+(name.includes('L')?'L':'R');return name;}
function render(){const selected=$('part').value,explode=Number($('explode').value)/100;for(const p of parts){const m=meshes.get(p.name);m.position.set(p.shift[0]*explode/640,p.shift[1]*explode/640,p.shift[2]*explode/640);m.visible=selected==='all'||!$('isolate').checked||family(p.name)===selected;m.material.opacity=selected==='all'||family(p.name)===selected?1:.18;m.material.transparent=m.material.opacity<1;m.material.depthWrite=m.material.opacity===1;}pivots.visible=$('pivots').checked&&explode===0&&!$('isolate').checked;renderer.render(scene,camera);}
function select(name){$('part').value=name;const d=definitions.find(d=>d[0]===name);$('detail').textContent=d?d[2]: '부품별 색상은 구조 구분용입니다. 기존 시제품 표면을 분할했으며 새 외형 완성본은 아닙니다.';$('joint-detail').textContent=d?d[3]:'분해 보기는 부품의 경계를 드러냅니다. 실제 구관절·소켓·힌지의 접촉면과 가동 구조는 아직 설계하지 않았습니다.';
 document.querySelectorAll('[data-part]').forEach(el=>{el.classList.toggle('selected',el.dataset.part===name);});render();}
for(const [name,label,,,box]of definitions){const option=document.createElement('option');option.value=name;option.textContent=label;$('part').append(option);const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x',box[0]);rect.setAttribute('y',box[1]);rect.setAttribute('width',box[2]);rect.setAttribute('height',box[3]);rect.setAttribute('rx',8);rect.dataset.part=name;rect.setAttribute('tabindex','0');rect.setAttribute('role','button');rect.setAttribute('aria-label',label);rect.addEventListener('click',()=>select(name));rect.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(name);}});$('source-map').append(rect);}
$('part').onchange=()=>select($('part').value);for(const id of ['explode','pivots','isolate'])$(id).oninput=render;
$('view').onchange=()=>{const d={front:[0,0,6],side:[6,0,0],back:[0,0,-6],oblique:[4,.25,6]}[$('view').value];camera.position.set(...d).add(new THREE.Vector3(0,1,0));camera.lookAt(0,1,0);render();};
select('all');window.bodyPartStudy={parts,meshes,renderer,render,select};
