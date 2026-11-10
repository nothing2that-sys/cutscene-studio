import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {toWorld} from './doll-core-geometry.js';
import {loadCoreMesh} from './doll-core-mesh-loader.js';
import {fullDollDesign} from './doll-full-design.js';
import {createDollContacts} from './doll-contact.js';
import {createTorsoSkin} from './doll-torso-skin.js';
import {applyWorldSourceRequest,isSupportedSourceOrigin} from './body-v1-source-request.js';
import {dollProfile,galleryAuthor} from './doll-profiles.js';

const D=THREE.MathUtils.degToRad,R=THREE.MathUtils.radToDeg,S=200;
const mainPoseRestorers=new WeakMap();
export function restoreFullDollMainPose(rig,data){const restore=mainPoseRestorers.get(rig);if(!restore)throw Error('실제 공통 인체 인스턴스가 필요합니다.');return restore(data);}
export const FULL_DOLL_REST_REVISION=2;
export const shoulderRestQuaternion=side=>{const cant=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),(side==='L'?-18:18)*Math.PI/180);return cant.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),side==='L'?-Math.PI/2:Math.PI/2)).multiply(cant.invert());};
export function migrateFullDollPose(input){
 const data=structuredClone(input);if(data?.restRevision!==undefined&&![1,2].includes(data.restRevision))throw Error('지원하지 않는 전신 rest revision');
 if((data?.restRevision??1)===1&&data?.quaternions){for(const side of ['L','R']){const q=data.quaternions['upper'+side];if(Array.isArray(q)&&q.length===4&&q.every(Number.isFinite))data.quaternions['upper'+side]=shoulderRestQuaternion(side).invert().multiply(new THREE.Quaternion().fromArray(q)).toArray();}data.restRevision=2;}return data;
}

const profiles={
 upper:[[18,0,0,25,26,23],[38,2,0,29,29,25],[72,3,1,31,32,26],[114,1,0,26,28,23],[145,0,0,20,22,18],[155,0,0,20,21,20],[167,0,0,23,23,22],[179,0,0,19,19,18],[188,0,0,5,5,5]],
 fore:[[8,0,0,16,16,15],[32,2,1,26,26,21],[54,4,1,26,26,21],[85,3,0,21,22,17],[114,1,0,13,15,11],[126,0,0,11.5,11.5,11],[131,0,0,12.5,12.5,12],[141,0,0,9,9,8.5],[146,0,0,3,3,3]],
 thigh:[[-15,0,0,36,36,34],[0,0,0,40,40,38],[25,0,0,44,43,32],[40,1,0,49,47,34],[58,3,0,56,52,36],[109,5,0,64,58,50],[168,2,0,52,48,41],[219,-1,0,36,36,31],[248,0,0,26,28,24],[259,0,0,30,30,29],[267,0,0,31,31,30],[284,0,0,25,25,24],[297,0,0,6,6,6]],
 shin:[[10,0,0,23,24,23],[49,-2,-2,38.5,34.1,40.7],[86,-4,-3,45.5,36.8,51.1],[126,-3,-4,42.9,31.9,47.3],[179,-1,-2,28,24,32],[227,0,0,20,19,23],[258,0,0,18,18,18],[275,0,0,22,22,22],[291,0,0,17,17,17],[298,0,0,3,3,3]],
 palm:[[5,0,0,10,7,7],[15,1,0,15,8,7],[28,3,1,23,11,8],[40,2,1,25,10,7],[51,0,0,23,7.5,6.5],[65,0,0,22,7,6],[83,-1,0,17,6,5],[97,-1,0,8,3.5,3],[101,-1,0,2,1,1]],
 head:[[-131,0,-2,1,1,1],[-126,0,-1,28,24,28],[-111,0,0,47,42,46],[-88,0,0,57,49,52],[-58,0,0,56,49,52],[-30,0,1,48,45,46],[-4,0,3,33,33,34],[15,0,4,11,15,17],[22,0,4,2,3,4]],
 neck:[[-28,0,0,18,17,18],[-18,0,0,17.5,17,17.5],[-5,0,0,19,18,19],[0,0,0,22,21,22]],
};
function loft(stations,sides=20,sub=2,medial=0,medialEnd=Infinity,density=null){const curves=Array.from({length:sides},(_,j)=>{const a=j/sides*Math.PI*2,u=Math.sin(a),v=Math.cos(a);return new THREE.CatmullRomCurve3(stations.map(([d,x,z,w,f,b])=>new THREE.Vector3((x+w*u*(u*medial>0?1-.22*(Number.isFinite(medialEnd)?1-THREE.MathUtils.smoothstep(d,25,medialEnd):1):1))/S,-d/S,(z+(v>=0?v*f:v*b))/S)),false,'centripetal');}),parameters=[];for(let i=0;i<stations.length-1;i++){const n=density?density(i):sub;for(let k=0;k<n;k++)parameters.push((i+k/n)/(stations.length-1));}parameters.push(1);const rows=parameters.length-1,positions=[],indices=[];
 for(let i=0;i<=rows;i++)for(const c of curves)positions.push(...c.getPoint(parameters[i]).toArray());
 for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;indices.push(a,c,b,b,c,d);}
 for(const [row,reverse]of [[0,false],[rows,true]]){const center=[0,0,0],id=positions.length/3;for(let j=0;j<sides;j++)for(let k=0;k<3;k++)center[k]+=positions[(row*sides+j)*3+k]/sides;positions.push(...center);for(let j=0;j<sides;j++){const a=row*sides+j,b=row*sides+(j+1)%sides;indices.push(id,reverse?b:a,reverse?a:b);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.userData.contactComponents=[{id:'shell',start:0,count:indices.length}];g.userData.interfaceRims=[{id:'start',patchTriangles:Array.from({length:sides},(_,j)=>rows*sides*2+j),loop:Array.from({length:sides},(_,j)=>j)},{id:'end',patchTriangles:Array.from({length:sides},(_,j)=>rows*sides*2+sides+j),loop:Array.from({length:sides},(_,j)=>rows*sides+j)}];g.userData.guides=[Array.from({length:rows+1},(_,i)=>curves[0].getPoint(parameters[i]).add(new THREE.Vector3(0,0,.0006))),curves.map(c=>c.getPoint(.5))];return g;
}
// The UV-sphere generator's known grid aliases are welded by index provenance,
// never rounded positions. One actual index now joins each pole and meridian.
function sphere(r,segments=16,rings=10){
 const source=new THREE.SphereGeometry(1,segments,rings),p=source.attributes.position,positions=[],map=[],canonical=new Map();
 for(let row=0;row<=rings;row++)for(let col=0;col<=segments;col++){
  const key=row===0?'north':row===rings?'south':row+','+(col%segments);
  if(!canonical.has(key)){canonical.set(key,positions.length/3);const id=row*(segments+1)+(col%segments);positions.push(p.getX(id)*r[0]/S,p.getY(id)*r[1]/S,p.getZ(id)*r[2]/S);}
  map.push(canonical.get(key));
 }
 const indices=Array.from(source.index.array,i=>map[i]),g=new THREE.BufferGeometry();source.dispose();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();g.userData.contactComponents=[{id:'solid',start:0,count:indices.length}];return g;
}
function hinge(radius,depth){return sphere([radius,radius,depth/2],24,10);}
function combine(...geometries){
 for(const g of geometries)g.deleteAttribute('uv');const out=mergeGeometries(geometries,false);let start=0,vertex=0;
 out.userData.contactComponents=[];out.userData.interfaceRims=[];
 for(let piece=0;piece<geometries.length;piece++){const g=geometries[piece];
  for(const c of g.userData.contactComponents||[{id:'shell',start:0,count:g.index.count}])out.userData.contactComponents.push({...c,id:piece+':'+c.id,start:start+c.start,weldGroups:c.weldGroups?.map(group=>group.map(i=>i+vertex))});
  for(const rim of g.userData.interfaceRims||[])out.userData.interfaceRims.push({...rim,id:piece+':'+rim.id,component:piece+':shell',patchTriangles:rim.patchTriangles.map(t=>t+start/3),loop:rim.loop.map(i=>i+vertex)});
  vertex+=g.attributes.position.count;start+=g.index.count;g.dispose();
 }return out;
}
function footGeometry(side){
 // One closed ankle-to-sole exterior. The full upper cap is the ankle rim;
 // the foot has no intersecting collar component hidden in its instep.
 const sign=side==='L'?1:-1;
 return loft([[-8,0,0,14,14,14],[0,0,2,17,18,20],[12,0,15,22,45,33],[24,-sign,29,29,65,52],[34,-sign*2,34,34,64,55],[42,0,35,28,60,52],[44,0,35,16,45,40]],24,2);
}
const limits={free:{x:[-180,180],y:[-180,180],z:[-180,180]},head:{x:[-55,55],y:[-85,85],z:[-45,45]},neck:{x:[-35,35],y:[-50,50],z:[-30,30]},hip:{x:[-115,65],y:[-80,80],z:[-65,65]},ankle:{x:[-100,100],y:[-70,70],z:[-50,50]}};

// Async resource loading happens once; editor character creation is synchronous.
const fullAssets=new Map();
export async function preloadFullDollAssets({profile='default'}={}){
 if(!fullAssets.has(profile))fullAssets.set(profile,loadCoreMesh(fullDollDesign(profile),'torso').catch(error=>{fullAssets.delete(profile);throw error;}));
 readyAssets.set(profile,await fullAssets.get(profile));return profile;
}
const readyAssets=new Map();
export async function createFullDoll(options={}){
 const profile=options.profile||'default';await preloadFullDollAssets({profile});
 if(!readyAssets.has(profile))readyAssets.set(profile,await fullAssets.get(profile));
 return assembleFullDoll(options);
}
export async function prepareFullDoll(options={}){
 const profile=options.profile||'default';await preloadFullDollAssets({profile});readyAssets.set(profile,await fullAssets.get(profile));
 return ()=>assembleFullDoll(options);
}
export function assembleFullDoll({profile='default',protection:enableProtection=true,initialState='neutral'}={}){
 if(!readyAssets.has(profile))throw Error('전신 인체 자산을 먼저 preload 하세요.');
 const metrics=dollProfile(profile),{upperLength,foreLength,shoulderRadius,headOffset}=metrics,thighLength=metrics.thighLength??267,shinLength=metrics.shinLength??275,armWidth=metrics.armWidth??1,legWidth=metrics.legWidth??1,thighUpper=metrics.thighUpper??1,headWidth=metrics.headWidth??1,design=fullDollDesign(profile),root=new THREE.Group(),joints=new Map(),bones=new Map(),meshes=new Map(),links=[],localGuides=[],jointGuides=[],bakers=[],curlState={L:8,R:8,toeL:0,toeR:0},fingerSets={},toeSets={};let currentPreset='neutral',contacts,protection=Boolean(enableProtection),lastConstraint=null,characterDescription='',sourceRequestRevision=null,sourceRequestInterpretation=null;
 root.userData.bodyAsset={id:'body-v1-default',rigVersion:'body-v1',restRevision:FULL_DOLL_REST_REVISION};const materials=[];function mesh(name,g,parent){const material=new THREE.MeshStandardMaterial({color:0xc5c7cb,roughness:1});materials.push(material);const m=new THREE.Mesh(g,material);m.name=name;parent.add(m);meshes.set(name,m);return m;}
 function bone(name,label,parent,p,range=limits.free,selectable=true){const b=new THREE.Group();b.name=name;b.position.copy(p);b.rotation.order='XYZ';parent.add(b);bones.set(name,b);if(selectable)joints.set(name,{name,label,bone:b,limits:structuredClone(range)});if(parent!==root)links.push({name,parent,child:b,length:p.length()});return b;}
 const pelvis=bone('pelvis','골반',root,toWorld([0,545,0])),abdomen=bone('abdomen','복부',pelvis,new THREE.Vector3(0,64/S,0),{x:[-35,35],y:[-45,45],z:[-35,35]}),thorax=bone('thorax','흉곽',abdomen,new THREE.Vector3(0,62/S,0),{x:[-35,35],y:[-90,90],z:[-35,35]});for(const b of [pelvis,abdomen,thorax])b.rotation.order='ZYX';
 const coreOrigins={pelvis:[0,545,0],abdomen:[0,481,0],thorax:[0,419,0]};
 const torsoSource=readyAssets.get(profile).clone();torsoSource.userData.contactComponents=[{id:'shell',start:0,count:torsoSource.index.count}];const torsoGeometry=combine(torsoSource),torsoMesh=mesh('thorax',torsoGeometry,pelvis);torsoMesh.userData.torsoSkin=true;const torsoSkin=createTorsoSkin(torsoMesh,bones,design);bakers.push(torsoSkin.update);
 function addGuide(g,owner){for(const curve of g.userData.guides||[])localGuides.push({owner,points:curve.map(p=>p.clone())});}
 function addBallGuide(owner,r){jointGuides.push({owner,r:r.map(n=>n/S)});}
 const neck=bone('neck','목',thorax,toWorld([0,239,0]).sub(toWorld(coreOrigins.thorax)),limits.neck),neckG=loft(profiles.neck.map((r,i)=>[r[0]*headOffset/28,r[1],r[2],...r.slice(3).map(v=>v*(profile==='gallery-p015'?(i===0?.72:i===1?.9:1):1))]),20,2);mesh('neck',neckG,neck);
 const head=bone('head','머리',neck,new THREE.Vector3(metrics.headShiftX/S,headOffset/S,0),limits.head),headG=loft(profiles.head.map(r=>[metrics.headGrowsUp?(r[0]-22)*metrics.headScale+22:r[0]*metrics.headScale,r[1],r[2]*headWidth,...r.slice(3).map(v=>v*headWidth)]),28,2);addGuide(headG,head);mesh('head',combine(headG,sphere([17*headWidth,17*headWidth,17*headWidth])),head);addBallGuide(head,[17,17,17]);
 function localMatrix(node,ancestor=root){const chain=[];for(let n=node;n&&n!==ancestor;n=n.parent)chain.unshift(n);const result=new THREE.Matrix4();for(const n of chain){n.updateMatrix();result.multiply(n.matrix);}return result;}
 function articulatedCluster(name,owner,bodyGeometries){
  const pieces=bodyGeometries.map(g=>({g,bone:owner}));
  return {pieces,add(g,b){pieces.push({g,bone:b});},finish(){const all=combine(...pieces.map(p=>p.g.clone())),m=mesh(name,all,owner),slices=[];let offset=0;for(const p of pieces){slices.push({bone:p.bone,start:offset,positions:Float32Array.from(p.g.attributes.position.array),normals:Float32Array.from(p.g.attributes.normal.array)});offset+=p.g.attributes.position.count;p.g.dispose();}
   const inverse=new THREE.Matrix4(),matrix=new THREE.Matrix4(),v=new THREE.Vector3(),normal=new THREE.Vector3();let previous=null;bakers.push(()=>{inverse.copy(owner.matrixWorld).invert();const transforms=slices.map(p=>localMatrix(p.bone,owner)),signature=transforms.flatMap(m=>m.elements);if(previous&&signature.every((n,i)=>Math.abs(n-previous[i])<1e-7))return;previous=signature;const out=m.geometry.attributes.position,norm=m.geometry.attributes.normal;for(let k=0;k<slices.length;k++){const p=slices[k];matrix.copy(transforms[k]);for(let i=0;i<p.positions.length;i+=3){v.fromArray(p.positions,i).applyMatrix4(matrix);normal.fromArray(p.normals,i).transformDirection(matrix);out.setXYZ(p.start+i/3,v.x,v.y,v.z);norm.setXYZ(p.start+i/3,normal.x,normal.y,normal.z);}}out.needsUpdate=true;norm.needsUpdate=true;m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();});return m;}};
 }
 function addSimpleCurl(m,owner,angleFor,kind){const rest=Float32Array.from(m.geometry.attributes.position.array);let previous=null;const v=new THREE.Vector3();bakers.push(()=>{const angle=angleFor();if(previous===angle)return;previous=angle;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromArray(rest,i*3);const distance=kind==='hand'?-v.y*S:v.z*S,weight=THREE.MathUtils.smoothstep(distance,kind==='hand'?50:75,kind==='hand'?95:98);if(weight){const pivot=kind==='hand'?new THREE.Vector3(0,-50/S,0):new THREE.Vector3(0,-34/S,75/S);v.sub(pivot).applyAxisAngle(new THREE.Vector3(1,0,0),angle*weight).add(pivot);}p.setXYZ(i,v.x,v.y,v.z);}p.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();});}
 for(const side of ['L','R']){
  const sign=side==='L'?-1:1,shoulderFrame=new THREE.Group();shoulderFrame.name='shoulder-rest-'+side;shoulderFrame.quaternion.copy(shoulderRestQuaternion(side));thorax.add(shoulderFrame);const shoulderOffset=toWorld(design.thorax.sockets.find(s=>s.name==='shoulder'+side).center).sub(toWorld(coreOrigins.thorax)).applyQuaternion(shoulderFrame.quaternion.clone().invert()),arm=bone('upper'+side,side==='L'?'화면 왼팔 · 어깨':'화면 오른팔 · 어깨',shoulderFrame,shoulderOffset),upperG=loft(profiles.upper.map(r=>[r[0]*upperLength/167,r[1]*sign,...r.slice(2).map(v=>v*armWidth)]),24,2,-sign,Infinity,i=>i>=1?6:2);addGuide(upperG,arm);mesh('upper'+side,combine(upperG),arm);addBallGuide(arm,[shoulderRadius,shoulderRadius,shoulderRadius]);
  const elbowRange={x:[0,0],y:[0,0],z:side==='L'?[0,155]:[-155,0]},fore=bone('fore'+side,side==='L'?'화면 왼팔 · 팔꿈치':'화면 오른팔 · 팔꿈치',arm,new THREE.Vector3(0,-upperLength/S,0),elbowRange),foreG=loft(profiles.fore.map(r=>[r[0]*foreLength/131,r[1]*sign,...r.slice(2).map(v=>v*armWidth)]),24,2,0,Infinity,i=>i===0?8:i===3?6:(i===5||i===7)?1:2);addGuide(foreG,fore);mesh('fore'+side,combine(foreG),fore);jointGuides.push({owner:fore,r:[18/S,18/S,15/S],disk:true});
  const wrist=bone('wrist'+side,side==='L'?'화면 왼손 · 손목':'화면 오른손 · 손목',fore,new THREE.Vector3(0,-foreLength/S,0)),palmG=loft(profiles.palm.map(r=>[r[0],r[1]*sign,...r.slice(2)]),20,2),hand=articulatedCluster('hand'+side,wrist,[palmG]);addBallGuide(wrist,[11,11,9]);fingerSets[side]=[];
  const lengths=[[23,16,11],[26,18,12],[24,17,11],[19,13,10]];
  for(let f=0;f<5;f++){
   const thumb=f===4,lens=thumb?[21,16]:lengths[f],x=thumb?sign*21:(f-1.5)*11,base=bone(`finger${side}${f}`,'',wrist,new THREE.Vector3(x/S,-(thumb?29:51)/S,1/S),limits.free,false);if(thumb)base.rotation.z=D(sign*42);const chain=[];let parent=base;
   for(let k=0;k<lens.length;k++){const b=k===0?base:bone(`finger${side}${f}_${k}`,'',parent,new THREE.Vector3(0,-lens[k-1]/S,0),limits.free,false),rad=thumb?(k===0?7:5.5):[5.2,4.5,3.8][k]*(f===3?.83:1),g=loft([[0,0,0,rad,rad*.9,rad*.8],[lens[k]*.55,0,0,rad*.9,rad*.85,rad*.7],[lens[k],0,0,rad*.65,rad*.65,rad*.6]],10,1);g.dispose();const ball=sphere([rad*.97,rad*.97,rad*.85],8,4);ball.dispose();chain.push(b);parent=b;}
   const tip=bone(`finger${side}${f}_tip`,'',parent,new THREE.Vector3(0,-lens.at(-1)/S,0),limits.free,false);fingerSets[side].push({chain,thumb,baseZ:thumb?sign*42:0});
  }const handMesh=hand.finish();addSimpleCurl(handMesh,wrist,()=>bones.get('finger'+side+'1').rotation.x*2.4,'hand');
  const hip=bone('thigh'+side,side==='L'?'화면 왼다리 · 고관절':'화면 오른다리 · 고관절',pelvis,toWorld(design.pelvis.sockets.find(s=>s.name==='hip'+side).center).sub(toWorld(coreOrigins.pelvis)),limits.hip),thighG=loft(profiles.thigh.map(r=>{const k=legWidth*(1+(thighUpper-1)*Math.min(1,Math.max(0,(160-r[0])/160)));return [r[0]*thighLength/267,r[1]*sign,...r.slice(2).map(v=>v*k)];}),24,2,-sign,105*thighLength/267,i=>i>=6?8:2);addGuide(thighG,hip);mesh('thigh'+side,combine(thighG),hip);addBallGuide(hip,[44.5,44.5,44.5]);
  const shin=bone('shin'+side,side==='L'?'화면 왼다리 · 무릎':'화면 오른다리 · 무릎',hip,new THREE.Vector3(0,-thighLength/S,0),{x:[0,150],y:[0,0],z:[0,0]}),shinG=loft(profiles.shin.map(r=>{const k=1+(legWidth-1)*Math.min(1,Math.max(0,(250-r[0])/170));return [r[0]*shinLength/275,r[1]*sign,...r.slice(2).map(v=>v*k)];}),24,2,0,Infinity,i=>i===0?16:2);addGuide(shinG,shin);mesh('shin'+side,combine(shinG),shin);addBallGuide(shin,[25,28,26]);
  const ankle=bone('ankle'+side,side==='L'?'화면 왼발 · 발목':'화면 오른발 · 발목',shin,new THREE.Vector3(0,-shinLength/S,0),limits.ankle),foot=articulatedCluster('foot'+side,ankle,[footGeometry(side)]);addBallGuide(ankle,[16,16,16]);toeSets[side]=[];
  const toeLengths=[[25,17],[23,15],[21,14],[18,12],[15,10]];
  for(let f=0;f<5;f++){const inner=-sign,x=inner*[23,10,-3,-15,-26][f],base=bone(`toe${side}${f}`,'',ankle,new THREE.Vector3(x/S,-34/S,82/S),limits.free,false);base.rotation.x=-Math.PI/2;const chain=[];let parent=base;
   for(let k=0;k<2;k++){const b=k===0?base:bone(`toe${side}${f}_${k}`,'',parent,new THREE.Vector3(0,-toeLengths[f][k-1]/S,0),limits.free,false),r=[8,6.7,6.2,5.5,4.8][f]*(k?.8:1),len=toeLengths[f][k];chain.push(b);parent=b;}
   const tip=bone(`toe${side}${f}_tip`,'',parent,new THREE.Vector3(0,-toeLengths[f][1]/S,0),limits.free,false);toeSets[side].push(chain);
  }const footMesh=foot.finish();addSimpleCurl(footMesh,ankle,()=>bones.get('toe'+side+'0_1').rotation.x*.7,'foot');
 }
 const clearanceRest=new Map(['L','R'].flatMap(side=>['upper','fore','thigh','shin'].map(part=>{const m=meshes.get(part+side);return [m,Float32Array.from(m.geometry.attributes.position.array)];})));const clearanceCache=new Map(),bodyClearanceBase=new Map(),bodyClearanceCache=new Map();
 function updateLimbClearance(){
  for(const side of ['L','R'])for(const [a,b,end,preserve,region]of [['upper','fore','wrist',24,28],['thigh','shin','ankle',32,37]]){
   const parent=bones.get(a+side),joint=bones.get(b+side),distal=bones.get(end+side),key=a+side,signature=[...joint.position.toArray(),...joint.quaternion.toArray(),...distal.position.toArray()],previous=clearanceCache.get(key);if(previous&&signature.every((v,i)=>Math.abs(v-previous[i])<1e-12))continue;clearanceCache.set(key,signature);
   joint.updateMatrix();const J=joint.position.clone(),u=J.clone().negate().normalize(),v=distal.position.clone().applyQuaternion(joint.quaternion).normalize(),n=v.sub(u);if(n.lengthSq()<1e-12)continue;n.normalize();
   for(const [part,sign]of [[a,-1],[b,1]]){const m=meshes.get(part+side),p=m.geometry.attributes.position,before=Float32Array.from(p.array),toParent=localMatrix(m,parent),toLocal=toParent.clone().invert(),point=new THREE.Vector3(),delta=new THREE.Vector3();p.array.set(clearanceRest.get(m));for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(toParent);delta.copy(point).sub(J);const radius=delta.length()*S,weight=THREE.MathUtils.smoothstep(radius,preserve,region*.94),signed=n.dot(delta)*sign;if(weight&&signed<.0002)point.addScaledVector(n,sign*(.0002-signed)*weight);point.applyMatrix4(toLocal);p.setXYZ(i,point.x,point.y,point.z);}if(part===a||part==='fore'){const prior=bodyClearanceBase.get(m);if(prior&&p.array.every((v,i)=>v===prior[i]))p.array.set(before);else{bodyClearanceBase.set(m,Float32Array.from(p.array));bodyClearanceCache.delete(m);}}if(p.array.some((v,i)=>v!==before[i])){p.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();}}
  }
 }
 function updateBodyClearance(){if(!contacts)return;const body=contacts.solids.get('thorax'),bodyMesh=meshes.get('thorax'),bodyToRoot=localMatrix(bodyMesh),inverseBody=bodyToRoot.clone().invert();let refreshed=false;
  for(const side of ['L','R'])for(const [part,preserve,region]of [['upper',34,38],['fore',24,28],['thigh',44,58]]){const m=meshes.get(part+side),base=bodyClearanceBase.get(m);if(!base)continue;const toRoot=localMatrix(m),toBody=new THREE.Matrix4().multiplyMatrices(inverseBody,toRoot),fromBody=toBody.clone().invert(),joint=new THREE.Vector3().setFromMatrixPosition(localMatrix(bones.get(part+side))),signature=[bodyMesh.geometry.attributes.position.version,...toBody.elements],previous=bodyClearanceCache.get(m);if(previous&&signature.every((v,i)=>Math.abs(v-previous[i])<1e-12))continue;bodyClearanceCache.set(m,signature);if(!refreshed){body.refit();refreshed=true;}
   const p=m.geometry.attributes.position,before=Float32Array.from(p.array),point=new THREE.Vector3(),rootPoint=new THREE.Vector3();p.array.set(base);if(part==='fore'){const sides=m.geometry.userData.interfaceRims[0].loop.length,rows=(p.count-2)/sides,sign=side==='L'?-1:1,edge=sign*(Math.max(Math.abs(body.nodes[0].box.min.x),Math.abs(body.nodes[0].box.max.x))+.1);for(let row=0;row<rows;row++){let shift=0;for(let j=0;j<sides;j++){point.fromBufferAttribute(p,row*sides+j);rootPoint.copy(point).applyMatrix4(toRoot);if(rootPoint.distanceTo(joint)*S<region)continue;point.applyMatrix4(toBody);if(body.nodes[0].box.distanceToPoint(point)>.008)continue;if(!body.containsLocalPoint(point)){const near=body.closestLocalPoint(point);if(!near||point.distanceTo(near)>=.008)continue;}const origin=point.clone();origin.x=edge;const hit=body.firstLocalHit(new THREE.Ray(origin,new THREE.Vector3(-sign,0,0)));if(hit)shift=Math.max(shift,sign*(hit.x-point.x)+.008);}if(shift>0)for(let j=0;j<sides;j++){point.fromBufferAttribute(p,row*sides+j).applyMatrix4(toBody);point.x+=sign*shift;point.applyMatrix4(fromBody);p.setXYZ(row*sides+j,point.x,point.y,point.z);}}}for(let i=0;i<(part==='fore'?0:p.count);i++){point.fromBufferAttribute(p,i);rootPoint.copy(point).applyMatrix4(toRoot);const radius=rootPoint.distanceTo(joint)*S,weight=THREE.MathUtils.smoothstep(radius,preserve,region*.94)*(1-THREE.MathUtils.smoothstep(radius,110,145));if(!weight)continue;point.applyMatrix4(toBody);if(body.nodes[0].box.distanceToPoint(point)>.008)continue;const inside=body.containsLocalPoint(point),nearest=body.closestLocalPoint(point);if(!nearest)continue;const distance=point.distanceTo(nearest);if(!inside&&distance>=.008)continue;const normal=inside?nearest.clone().sub(point):point.clone().sub(nearest);if(normal.lengthSq()<1e-20)continue;const sign=side==='L'?-1:1,origin=point.clone();origin.x=sign*(Math.max(Math.abs(body.nodes[0].box.min.x),Math.abs(body.nodes[0].box.max.x))+.1);const lateral=body.firstLocalHit(new THREE.Ray(origin,new THREE.Vector3(-sign,0,0))),desired=lateral&&sign*(lateral.x-point.x)>=0?new THREE.Vector3(lateral.x+sign*.008,point.y,point.z):nearest.addScaledVector(normal.normalize(),.008);point.lerp(desired,weight).applyMatrix4(fromBody);p.setXYZ(i,point.x,point.y,point.z);}if(p.array.some((v,i)=>v!==before[i])){p.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();}
  }
 }
 function update(){root.updateMatrixWorld(true);for(const bake of bakers)bake();root.updateMatrixWorld(true);updateLimbClearance();updateBodyClearance();}

 function setCurl(side,value,fan=0){value=THREE.MathUtils.clamp(Number.isFinite(value)?value:0,0,80);curlState[side]=value;for(const [f,digit]of fingerSets[side].entries())for(let k=0;k<digit.chain.length;k++){const b=digit.chain[k];b.rotation.set(-D(value*[.25,.65,.45][k]),0,D(k===0?digit.baseZ+(digit.thumb?0:fan+(f-1.5)*2):0));}}
 function setToeCurl(side,value){value=THREE.MathUtils.clamp(Number.isFinite(value)?value:0,0,50);curlState['toe'+side]=value;for(const chain of toeSets[side]){chain[0].rotation.x=-Math.PI/2+D(value*.25);chain[1].rotation.x=D(value*.8);}}
 function worldQuaternion(b,q){const parent=b.parent.getWorldQuaternion(new THREE.Quaternion());b.quaternion.copy(parent.invert().multiply(q));root.updateMatrixWorld(true);}
 function orientHand(b,dir){const y=dir.clone().normalize().negate(),z=new THREE.Vector3(0,0,1).addScaledVector(y,-y.z).normalize(),x=y.clone().cross(z).normalize();worldQuaternion(b,new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)));}
 function solveChain(side,kind,elbow,wrist){const upper=bones.get((kind==='arm'?'upper':'thigh')+side),lower=bones.get((kind==='arm'?'fore':'shin')+side),a=upper.getWorldPosition(new THREE.Vector3()),u=elbow.clone().sub(a).normalize(),f=wrist.clone().sub(elbow).normalize(),cos=THREE.MathUtils.clamp(u.dot(f),-1,1),p=f.clone().addScaledVector(u,-cos).normalize(),y=u.clone().negate();let x,z;
  if(kind==='arm'){const sign=side==='L'?1:-1;x=p.multiplyScalar(sign);z=x.clone().cross(y).normalize();worldQuaternion(upper,new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)));lower.rotation.set(0,0,sign*Math.acos(cos));}
  else{z=p.negate();x=y.clone().cross(z).normalize();worldQuaternion(upper,new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)));lower.rotation.set(Math.acos(cos),0,0);}root.updateMatrixWorld(true);
 }
 function pointAtXY(start,xy,length,zSign){const offset=root.parent?.getWorldPosition(new THREE.Vector3())||new THREE.Vector3();let dx=(xy[0]-480)/S+offset.x-start.x,dy=(650-xy[1])/S+offset.y-start.y;const max=length/S,planar=Math.hypot(dx,dy);if(planar>max*.999){dx*=max*.999/planar;dy*=max*.999/planar;}return new THREE.Vector3(start.x+dx,start.y+dy,start.z+zSign*Math.sqrt(Math.max(0,max*max-dx*dx-dy*dy)));}
 function stanceLeg(side,xy,depth,heading){const upper=bones.get('thigh'+side),hip=upper.getWorldPosition(new THREE.Vector3()),offset=root.parent?.getWorldPosition(new THREE.Vector3())||new THREE.Vector3(),ankle=new THREE.Vector3((xy[0]-480)/S,(650-xy[1])/S,depth/S).add(offset),a=thighLength/S,b=shinLength/S;
  const planar=(ankle.x-hip.x)**2+(ankle.y-hip.y)**2,maxDepth=Math.sqrt(Math.max(0,(a+b-.0001)**2-planar));ankle.z=THREE.MathUtils.clamp(ankle.z,hip.z-maxDepth,hip.z+maxDepth);const delta=ankle.clone().sub(hip),distance=delta.length(),axis=delta.normalize(),pole=new THREE.Vector3(Math.sin(D(heading)),0,Math.cos(D(heading)));pole.addScaledVector(axis,-pole.dot(axis)).normalize();const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along)),knee=hip.clone().addScaledVector(axis,along).addScaledVector(pole,height);solveChain(side,'leg',knee,ankle);
 }
 function preset(name){lastConstraint=null;sourceRequestRevision=null;sourceRequestInterpretation=null;if(name==='gallery-p015'&&profile!=='gallery-p015')throw Error('P015 체형 화면에서 여세요.');currentPreset=name;for(const b of bones.values())b.rotation.set(0,0,0);pelvis.position.copy(toWorld([0,545,0]));
  for(const side of ['L','R']){const sign=side==='L'?-1:1;bones.get('upper'+side).rotation.z=D(sign*18);bones.get('fore'+side).rotation.z=D(-sign*8);bones.get('thigh'+side).rotation.z=D(sign*3);setCurl(side,8);setToeCurl(side,0);}root.updateMatrixWorld(true);
  for(const side of ['L','R'])worldQuaternion(bones.get('ankle'+side),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,D(side==='L'?-7:7),0)));
  if(name==='gallery-p015'){
   pelvis.rotation.set(0,D(32),D(-12));root.updateMatrixWorld(true);worldQuaternion(abdomen,new THREE.Quaternion().setFromEuler(new THREE.Euler(0,D(25),D(-8),'ZYX')));worldQuaternion(thorax,new THREE.Quaternion().setFromEuler(new THREE.Euler(0,D(18),D(-4),'ZYX')));
   const left=bones.get('upperL').getWorldPosition(new THREE.Vector3()),right=bones.get('upperR').getWorldPosition(new THREE.Vector3()),mid=left.add(right).multiplyScalar(.5),l=galleryAuthor('upperL'),r=galleryAuthor('upperR'),offset=root.parent?.getWorldPosition(new THREE.Vector3())||new THREE.Vector3(),target=new THREE.Vector3(((l[0]+r[0])*.5-480)/S,(650-(l[1]+r[1])*.5)/S,mid.z).add(new THREE.Vector3(offset.x,offset.y,0));pelvis.position.add(target.sub(mid));root.updateMatrixWorld(true);worldQuaternion(head,new THREE.Quaternion());
   for(const side of ['L','R']){const a=bones.get('upper'+side).getWorldPosition(new THREE.Vector3()),elbow=pointAtXY(a,galleryAuthor('fore'+side),upperLength,side==='L'?1:-1),wrist=pointAtXY(elbow,galleryAuthor('wrist'+side),foreLength,1);solveChain(side,'arm',elbow,wrist);orientHand(bones.get('wrist'+side),side==='L'?new THREE.Vector3(1,.08,0):new THREE.Vector3(.1,-1,.05));setCurl(side,side==='L'?30:25,side==='L'?-20:5);stanceLeg(side,galleryAuthor('ankle'+side),side==='L'?-130:110,side==='L'?0:18);worldQuaternion(bones.get('ankle'+side),new THREE.Quaternion().setFromEuler(new THREE.Euler(D(side==='L'?42:46),D(side==='L'?0:32),0,'YXZ')));setToeCurl(side,5);}
  }else if(name==='reference'){
   pelvis.position.add(new THREE.Vector3(-32.5/S,6.2/S,0));pelvis.rotation.set(0,D(32),D(-6));head.rotation.z=D(7);head.rotation.y=D(-8);root.updateMatrixWorld(true);worldQuaternion(abdomen,new THREE.Quaternion().setFromEuler(new THREE.Euler(0,D(30),D(-11.5),'ZYX')));worldQuaternion(thorax,new THREE.Quaternion().setFromEuler(new THREE.Euler(0,D(34.3),D(2.4),'ZYX')));
   for(const side of ['L','R']){const arm=bones.get('upper'+side),a=arm.getWorldPosition(new THREE.Vector3()),elbow=pointAtXY(a,side==='L'?[258,387]:[637,166],upperLength,1),wrist=pointAtXY(elbow,side==='L'?[352,476]:[522,108],foreLength,1);solveChain(side,'arm',elbow,wrist);orientHand(bones.get('wrist'+side),new THREE.Vector3(side==='L'?46:-48,side==='L'?14:28,0));setCurl(side,side==='L'?30:25,side==='L'?-25:35);
    // Screen-right foot leads; screen-left foot trails. Knee poles and foot
    // headings follow the turned body, rather than independent depth branches.
    stanceLeg(side,side==='L'?[406,1085]:[674,1067],side==='L'?-130:115,side==='L'?8:32);worldQuaternion(bones.get('ankle'+side),new THREE.Quaternion().setFromEuler(new THREE.Euler(D(side==='L'?50:56),D(side==='L'?8:32),0,'YXZ')));setToeCurl(side,5);
   }
  }else if(name==='raised'){
   for(const side of ['L','R']){const sign=side==='L'?-1:1,a=bones.get('upper'+side).getWorldPosition(new THREE.Vector3()),elbow=a.clone().add(new THREE.Vector3(sign*.6,.8,.15).normalize().multiplyScalar(upperLength/S)),wrist=elbow.clone().add(new THREE.Vector3(-sign*.5,.8,.1).normalize().multiplyScalar(foreLength/S));solveChain(side,'arm',elbow,wrist);orientHand(bones.get('wrist'+side),new THREE.Vector3(-sign*.2,1,0));setCurl(side,5);}
  }else if(name==='step'||name==='squat'){
   const squat=name==='squat';if(squat){pelvis.position.y-=1.15;thorax.rotation.x=D(18);}
   for(const side of ['L','R']){const sign=side==='L'?-1:1;bones.get('thigh'+side).rotation.x=D(squat?-65:side==='L'?-28:12);bones.get('shin'+side).rotation.x=D(squat?110:side==='L'?35:12);bones.get('upper'+side).rotation.x=D(squat?-75:sign*20);bones.get('fore'+side).rotation.z=D(-sign*(squat?25:30));root.updateMatrixWorld(true);worldQuaternion(bones.get('ankle'+side),new THREE.Quaternion());}
  }update();if(contacts&&protection)resolvePose();
 }
 function affected(name){const set=new Set();if(['thorax','abdomen'].includes(name))set.add('thorax');const group=bones.get(name);for(const [part,m]of meshes){let p=m.parent;while(p){if(p===group){set.add(part);break;}p=p.parent;}}return set;}
 const collisionCost=r=>r.pairs.reduce((s,p)=>s+p.count*(p.maxDepthPixels+.2)**2,0);
 function inspect(options={}){update();let low=Infinity,high=-Infinity;const point=new THREE.Vector3();for(const m of meshes.values()){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);low=Math.min(low,point.y);high=Math.max(high,point.y);}}const height=high-low,tolerance=.002*height;return {...contacts.audit({stride:4,margin:tolerance,...options}),height,tolerance,scope:'actual vertex penetration diagnostic; independent triangle audit remains required'};}
 function resolvePose(){const report=inspect();lastConstraint=report.total?{kind:'unresolved-contact',reason:'explicit-pose-preserved',adjusted:[],remaining:report.total,maxDepthPixels:report.maxDepthPixels,maxDepthWorld:report.maxDepthPixels/200,report}:null;update();}
 function setJoint(name,axis,degrees){
  const j=joints.get(name);if(!j||!['x','y','z'].includes(axis)||!Number.isFinite(degrees))throw Error('지원하지 않는 관절 입력입니다.');
  const [min,max]=j.limits[axis],fromEuler=j.bone.rotation.clone(),fromQ=j.bone.quaternion.clone(),from=fromEuler[axis],target=D(THREE.MathUtils.clamp(degrees,min,max)),only=affected(name),apply=angle=>{j.bone.rotation.copy(fromEuler);j.bone.rotation[axis]=angle;update();};
  currentPreset='custom';lastConstraint=null;
  if(!contacts||!protection){apply(target);lastConstraint={kind:'joint',joint:name,axis,requested:degrees,target:R(target),applied:R(target),accepted:Math.abs(R(target)-degrees)<.001,contactChecked:false,reason:Math.abs(R(target)-degrees)>.001?'numeric-limit':'protection-disabled'};return lastConstraint;}
  const baseline=inspect({only,stride:1}),base=collisionCost(baseline);apply(target);const requested=inspect({only,stride:1}),endpointWorse=collisionCost(requested)>base+.001,steps=Math.max(1,Math.ceil(Math.abs(R(target-from))/5));let safe=from,bad=null,pathWitness=null,pathSamples=0;
  for(let i=1;i<=steps;i++){pathSamples++;const angle=from+(target-from)*i/steps;apply(angle);const report=i===steps?requested:inspect({only,stride:4});if(collisionCost(report)>base+.001){bad=angle;pathWitness={angle:R(angle),pairs:report.pairs,maxDepthWorld:report.maxDepthPixels/200};break;}safe=angle;}
  let applied=target,report=requested;
  if(endpointWorse){if(bad===null)bad=target;for(let i=0;i<8;i++){const mid=(safe+bad)/2;apply(mid);const r=inspect({only,stride:1});if(collisionCost(r)>base+.001)bad=mid;else safe=mid;}applied=safe;apply(applied);report=inspect({only,stride:1});if(collisionCost(report)>base+.001){j.bone.quaternion.copy(fromQ);update();applied=from;report=inspect({only,stride:1});}}
  else apply(target);
  const accepted=Math.abs(R(applied)-degrees)<.001;lastConstraint={kind:'joint',joint:name,axis,requested:degrees,target:R(target),applied:R(applied),accepted,contactChecked:true,reason:endpointWorse?'contact-rollback':Math.abs(R(target)-degrees)>.001?'numeric-limit':pathWitness?'endpoint-applied-intermediate-contact':'endpoint-applied',pairs:requested.pairs.map(p=>[p.a,p.b]),requestedContact:requested,appliedContact:report,pathWitness,intermediateSamples:pathSamples,plannedIntermediateSamples:steps,remaining:report.total,maxDepthWorld:report.maxDepthPixels/200,unrelatedJointAdjustment:false};return lastConstraint;
 }
 function guardedDigit(side,value,toe=false){if(!['L','R'].includes(side)||!Number.isFinite(value))throw Error('올바르지 않은 손발 굽힘 입력');const key=toe?'toe'+side:side,from=curlState[key],target=THREE.MathUtils.clamp(value,0,toe?50:80),only=new Set([(toe?'foot':'hand')+side]),baseline=protection?collisionCost(inspect({only})):Infinity,set=toe?setToeCurl:setCurl;let safe=from;lastConstraint=null;for(let i=1,n=Math.max(1,Math.ceil(Math.abs(target-from)/4));i<=n;i++){const proposed=from+(target-from)*i/n;set(side,proposed);update();const report=protection?inspect({only}):null;if(report&&collisionCost(report)>baseline+.001){set(side,safe);update();lastConstraint={kind:'joint',joint:key,axis:'curl',requested:value,target,applied:safe,accepted:false,contactChecked:true,reason:'contact-rollback',requestedContact:report};break;}safe=proposed;}if(!lastConstraint)lastConstraint={kind:'joint',joint:key,axis:'curl',requested:value,target,applied:safe,accepted:Math.abs(safe-value)<.001,contactChecked:protection,reason:Math.abs(target-value)>.001?'numeric-limit':protection?'endpoint-applied':'protection-disabled'};currentPreset='custom';return lastConstraint;}
 const appliedListeners=new Set();let lastAppliedState=null;function committedJoint(name,axis,degrees){const from=R(joints.get(name)?.bone.rotation[axis]??0),result=setJoint(name,axis,degrees);lastAppliedState={operation:'setJoint',originalRequest:{joint:name,axis,degrees},actualApplied:{degrees:result.applied},limited:!result.accepted,rejected:!result.accepted&&Math.abs(result.applied-from)<.001,reason:result.reason,phase:'committed',intermediate:false,atomic:true};for(const listener of appliedListeners)listener(lastAppliedState);return result;}
 function poseData(){return {version:1,restRevision:FULL_DOLL_REST_REVISION,kind:'articulated-full-doll-pose',rigProfile:profile,preset:currentPreset,description:characterDescription,sourceRequestRevision,sourceRequestInterpretation,root:pelvis.position.toArray(),quaternions:Object.fromEntries([...bones].map(([n,b])=>[n,b.quaternion.toArray()])),curls:{...curlState}};}
 function applyPose(data,mainRestore=false){data=migrateFullDollPose(data);if(data?.sourceRequestRevision!=null&&!isSupportedSourceOrigin(data.sourceRequestRevision))throw Error('지원하지 않는 source request origin');if(data?.rigProfile!==undefined&&data.rigProfile!==profile)throw Error('이 포즈는 '+data.rigProfile+' 체형 화면에서 열어야 합니다.');if(data?.description!==undefined&&(typeof data.description!=='string'||data.description.length>12000))throw Error('인물 설명은 12000자 이하 문자열이어야 합니다.');if(data?.version!==1||data.kind!=='articulated-full-doll-pose'||!Array.isArray(data.root)||data.root.length!==3||data.root.some(v=>!Number.isFinite(v)||Math.abs(v)>10)||!data.quaternions)throw Error('지원하지 않는 전신 포즈 파일');for(const [n,b]of bones){const q=data.quaternions[n];if(!Array.isArray(q)||q.length!==4||q.some(v=>!Number.isFinite(v))||Math.abs(Math.hypot(...q)-1)>.01)throw Error('관절 데이터가 올바르지 않습니다: '+n);
   if(!mainRestore&&(/^(fore|shin)[LR]$/.test(n)||['abdomen','thorax'].includes(n))){const e=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().fromArray(q).normalize(),b.rotation.order),range=joints.get(n).limits;for(const axis of ['x','y','z'])if(R(e[axis])<range[axis][0]-.001||R(e[axis])>range[axis][1]+.001)throw Error('굽힘축 또는 관절 범위를 벗어났습니다: '+n);}
  }if(data.curls)for(const k of Object.keys(curlState)){const v=data.curls[k];if(!Number.isFinite(v)||v<0||v>(k.startsWith('toe')?50:80))throw Error('손발 굽힘 값이 올바르지 않습니다.');}
  lastConstraint=null;sourceRequestRevision=data.sourceRequestRevision??null;sourceRequestInterpretation=data.sourceRequestInterpretation??null;characterDescription=data.description??'';pelvis.position.fromArray(data.root);for(const [n,b]of bones)b.quaternion.fromArray(data.quaternions[n]).normalize();if(data.curls)for(const k of ['L','R','toeL','toeR'])curlState[k]=data.curls[k];currentPreset=data.preset||'custom';update();if(contacts&&protection)resolvePose();}
 function applyCanonicalPose(data){
  if(!data||typeof data.revision!=='string'||!Array.isArray(data.root)||data.root.length!==3||!data.root.every(Number.isFinite)||!data.worldQuaternions||!Object.keys(data.worldQuaternions).length)throw Error('올바르지 않은 canonical world pose');
  for(const [name,q]of Object.entries(data.worldQuaternions))if(!bones.has(name)||!Array.isArray(q)||q.length!==4||!q.every(Number.isFinite)||Math.abs(Math.hypot(...q)-1)>.01)throw Error('올바르지 않은 canonical world joint: '+name);
  pelvis.position.fromArray(data.root);root.updateMatrixWorld(true);const rootQ=root.getWorldQuaternion(new THREE.Quaternion()),depth=b=>{let n=0;for(let p=b;p&&p!==root;p=p.parent)n++;return n;};
  for(const [name,q]of Object.entries(data.worldQuaternions).sort((a,b)=>depth(bones.get(a[0]))-depth(bones.get(b[0])))){const b=bones.get(name),desired=rootQ.clone().multiply(new THREE.Quaternion().fromArray(q));b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired));root.updateMatrixWorld(true);}currentPreset='custom';update();
 }
 const guideSurfaceCache=new Map();
 function bindSurfaceCurve(id,m,points,lineKind='torso'){
  const position=m.geometry.attributes.position,index=m.geometry.index,key=id+':'+position.version;let local=guideSurfaceCache.get(key);
  if(!local){const inverse=m.matrixWorld.clone().invert(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),q=new THREE.Vector3(),triangle=new THREE.Triangle();local=points.map(p=>{if(!p)return null;const wanted=p.clone().applyMatrix4(inverse);return contacts.solids.get(m.name).closestLocalPoint(wanted);});for(const k of guideSurfaceCache.keys())if(k.startsWith(id+':'))guideSurfaceCache.delete(k);guideSurfaceCache.set(key,local);}
  const curve=local.map(p=>p?m.localToWorld(p.clone()):null);curve.lineKind=lineKind;curve.guideId=id;curve.surfaceMesh=m;curve.surfaceBound=true;curve.missingSurfaceSamples=curve.filter(p=>!p).length;return curve;
 }
 function jointSurfaceCurve(id,m,frame,center,rx,ry){
  const inverse=m.matrixWorld.clone().invert(),toMesh=new THREE.Matrix4().multiplyMatrices(inverse,frame.matrixWorld),localCenter=frame.worldToLocal(center.clone()),p=m.geometry.attributes.position,index=m.geometry.index,key=id+':'+p.version+':'+toMesh.elements.join(','),cached=guideSurfaceCache.get(key);let local=cached;
  if(!local){const ray=new THREE.Ray(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),hit=new THREE.Vector3();local=Array.from({length:65},(_,i)=>{const angle=i/64*Math.PI*2,x=localCenter.x+Math.cos(angle)*rx/S,y=localCenter.y+Math.sin(angle)*ry/S,origin=new THREE.Vector3(x,y,localCenter.z+1).applyMatrix4(toMesh),end=new THREE.Vector3(x,y,localCenter.z-1).applyMatrix4(toMesh);ray.set(origin,end.sub(origin).normalize());return contacts.solids.get(m.name).firstLocalHit(ray);});for(const k of guideSurfaceCache.keys())if(k.startsWith(id+':'))guideSurfaceCache.delete(k);guideSurfaceCache.set(key,local);}
  const curve=local.map(p=>p?m.localToWorld(p.clone()):null);curve.lineKind='joint';curve.guideId=id;curve.surfaceMesh=m;curve.surfaceBound=true;curve.missingSurfaceSamples=curve.filter(p=>!p).length;return curve;
 }
 function guides(camera){
  root.updateMatrixWorld(true);contacts.refresh();const result=[],counts=new Map();
  for(const g of localGuides){const m=meshes.get(g.owner.name);if(!m)continue;const n=counts.get(m.name)||0;counts.set(m.name,n+1);result.push(bindSurfaceCurve(m.name+'.structure.'+n,m,g.points.map(p=>g.owner.localToWorld(p.clone()))));}
  for(const side of ['L','R'])for(const [id,joint,part,frame,rx,ry]of [['shoulder','upper','thorax','thorax',21,22],['elbow','fore','upper','upper',14,16],['wrist','wrist','fore','fore',8,9],['hip','thigh','thorax','pelvis',23,25],['knee','shin','thigh','thigh',18,21],['ankle','ankle','shin','shin',11,13]]){
   const name=frame==='thorax'||frame==='pelvis'?frame:frame+side;result.push(jointSurfaceCurve(id+'.'+side,meshes.get(part==='thorax'?'thorax':part+side),bones.get(name),bones.get(joint+side).getWorldPosition(new THREE.Vector3()),rx,ry));
  }
  torsoSkin.guides().forEach((points,i)=>result.push(bindSurfaceCurve('torso.structure.'+i,torsoMesh,points)));return result;
 }
 function rimSource(part,id='0:start'){
  const m=meshes.get(part),r=m.geometry.userData.interfaceRims.find(r=>r.id===id);if(!r)throw Error('Missing actual interface '+part+':'+id);
  return {mesh:m,part,component:r.component||'shell',patchTriangles:[...r.patchTriangles],loop:[...r.loop]};
 }
 function solidTarget(part,id){const m=meshes.get(part),c=m.geometry.userData.contactComponents.find(c=>c.id===id);if(!c)throw Error('Missing actual component '+part+':'+id);return {mesh:m,part,component:id,triangles:Array.from({length:c.count/3},(_,i)=>c.start/3+i)};}
 function junction(id,source,target){return {id,kind:'rim-to-solid',sources:[source],targets:[target],requiredSourceParts:[source.part],oneSidedRole:'end-cap-into-closed-solid'};}
 const contactBinding={assetId:'body-v1-default',rigVersion:'body-v1',junctions:[
  junction('head-neck',rimSource('neck','start'),solidTarget('head','0:shell')),
  junction('neck-torso',rimSource('neck','end'),solidTarget('thorax','0:shell')),
  ...['L','R'].flatMap(side=>[
   junction('shoulder.'+side,rimSource('upper'+side),solidTarget('thorax','0:shell')),
   junction('elbow.'+side,rimSource('fore'+side),solidTarget('upper'+side,'0:shell')),
   junction('wrist.'+side,rimSource('hand'+side),solidTarget('fore'+side,'0:shell')),
   junction('hip.'+side,rimSource('thigh'+side),solidTarget('thorax','0:shell')),
   junction('knee.'+side,rimSource('shin'+side),solidTarget('thigh'+side,'0:shell')),
   junction('ankle.'+side,rimSource('foot'+side),solidTarget('shin'+side,'0:shell'))
  ])]};
 // Anchor triangles are selected once on the neutral authored palm/sole shell,
 // then sampled through actual CPU deformation; bind IDs never follow a pivot.
 function surfaceAnchor(id,part,target,normal){const m=meshes.get(part),p=m.geometry.attributes.position,idx=m.geometry.index,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),center=new THREE.Vector3(),n=new THREE.Vector3();let best=null;
  const component=m.geometry.userData.contactComponents[0];for(let t=component.start/3;t<(component.start+component.count)/3;t++){
   a.fromBufferAttribute(p,idx.getX(t*3));b.fromBufferAttribute(p,idx.getX(t*3+1));c.fromBufferAttribute(p,idx.getX(t*3+2));n.crossVectors(b.clone().sub(a),c.clone().sub(a)).normalize();if(n.dot(normal)<.5)continue;
   center.copy(a).add(b).add(c).multiplyScalar(1/3);const score=center.distanceToSquared(target);if(!best||score<best.score)best={triangle:t,score};
  }if(!best)throw Error('No actual surface anchor '+id);return {id,actorId:'full-doll',part,mesh:m,triangle:best.triangle,barycentric:[1/3,1/3,1/3],normalSign:1};
 }
 const surfaceAnchors=['L','R'].flatMap(side=>[surfaceAnchor('palm.'+side,'hand'+side,new THREE.Vector3(0,-32/S,10/S),new THREE.Vector3(0,0,1)),surfaceAnchor('sole.'+side,'foot'+side,new THREE.Vector3(0,-40/S,40/S),new THREE.Vector3(0,-1,0))]);
 preset('neutral');if(initialState==='rest'){for(const b of bones.values())b.rotation.set(0,0,0);setCurl('L',0);setCurl('R',0);setToeCurl('L',0);setToeCurl('R',0);update();}contacts=createDollContacts(meshes,bones);if(protection)resolvePose();const api={root,design,profile,metrics,applySourceRequest(request){sourceRequestRevision=applyWorldSourceRequest(api,request);sourceRequestInterpretation=request.interpretation;currentPreset='custom';if(protection)resolvePose();return sourceRequestRevision;},get sourceRequestRevision(){return sourceRequestRevision;},applyCanonicalPose,get sourceRequestFrame(){root.updateMatrixWorld(true);return {schema:1,restRevision:FULL_DOLL_REST_REVISION,canonicalToDisplay:root.matrixWorld.clone()};},contactBinding,surfaceAnchors,createOracleRequestRig:()=>assembleFullDoll({profile,protection:false,initialState:'rest'}),dispose(){appliedListeners.clear();for(const m of meshes.values())m.geometry.dispose();for(const material of materials)material.dispose();root.removeFromParent();},get description(){return characterDescription;},set description(value){if(typeof value!=='string'||value.length>12000)throw Error('인물 설명이 올바르지 않습니다.');characterDescription=value;},joints,bones,meshes,links,curlState,preset,setJoint:committedJoint,onAppliedState(listener){if(typeof listener!=='function')throw Error('적용 관측자는 함수여야 합니다.');appliedListeners.add(listener);return()=>appliedListeners.delete(listener);},get lastAppliedState(){return lastAppliedState;},setCurl:(side,v)=>guardedDigit(side,v),setToeCurl:(side,v)=>guardedDigit(side,v,true),update,poseData,applyPose:data=>applyPose(data),guides,contacts,auditContacts:inspect,get protection(){return protection;},setProtection(value){protection=Boolean(value);if(protection)resolvePose();},get lastConstraint(){return lastConstraint;},get presetName(){return currentPreset;},get jointValues(){return Object.fromEntries([...joints].map(([n,j])=>[n,{x:R(j.bone.rotation.x),y:R(j.bone.rotation.y),z:R(j.bone.rotation.z)}]));}};mainPoseRestorers.set(api,data=>applyPose(data,true));return api;
}
