// Camera-relative shot description for image generators (GPT / Gemini).
// extractShotFacts reads the 3D scene; describeShot turns plain facts into
// structured data and Korean prose, so the wording can be tested without WebGL.
import * as THREE from 'three';
import {getBodyV1,displayedObjectBounds} from './body-v1-adapter.js';

const JOINTS={pelvis:'body',chest:'torso',neck:'neck',head:'head'};
const PAIRS={shoulder:['l_arm','r_arm'],elbow:['l_elbow','r_elbow'],wrist:['l_wrist','r_wrist'],hip:['l_leg','r_leg'],knee:['l_knee','r_knee'],ankle:['l_ankle','r_ankle']};
const LABEL={headTop:'머리 위',head:'머리',neck:'목',chest:'가슴',pelvis:'골반',shoulderL:'왼쪽 어깨',shoulderR:'오른쪽 어깨',elbowL:'왼쪽 팔꿈치',elbowR:'오른쪽 팔꿈치',wristL:'왼손',wristR:'오른손',hipL:'왼쪽 엉덩이',hipR:'오른쪽 엉덩이',kneeL:'왼쪽 무릎',kneeR:'오른쪽 무릎',ankleL:'왼발',ankleR:'오른발'};
const UP=new THREE.Vector3(0,1,0),r1=v=>Math.round(v*10)/10,r2=v=>Math.round(v*100)/100,deg=r=>r*180/Math.PI;

function visibleMeshes(root){
 const meshes=[];root.updateMatrixWorld(true);
 root.traverse(n=>{if(!n.isMesh||!n.geometry?.attributes?.position)return;for(let p=n;p;p=p.parent)if(!p.visible)return;meshes.push(n);});
 return meshes;
}
// Facing comes from the feet (toes point forward in every rig), not from joint
// names; anatomical left/right then follow from geometry.
function actorFrame(m,P){
 const up=P.neck.clone().sub(P.pelvis).normalize(),a=getBodyV1(m);let forward=null;
 const feet=a?a.bodyMeshes.filter(mesh=>/^foot[LR]$/.test(mesh.name)):[];
 if(feet.length===2){
  forward=new THREE.Vector3();
  for(const foot of feet){foot.geometry.computeBoundingBox();const c=foot.geometry.boundingBox.getCenter(new THREE.Vector3());foot.localToWorld(c);const ankle=[P.a0,P.a1].sort((x,y)=>x.distanceTo(c)-y.distanceTo(c))[0];forward.add(c.sub(ankle));}
 }
 if(!forward||forward.lengthSq()<1e-8)forward=new THREE.Vector3(0,0,1).applyQuaternion(m.getWorldQuaternion(new THREE.Quaternion()));
 forward.addScaledVector(up,-forward.dot(up)).normalize();
 return {up,forward,left:new THREE.Vector3().crossVectors(up,forward).normalize()};
}
export function extractShotFacts({camera,aspect,actors=[],props=[],environmentMeshes=[],lighting=null,floorY=0}){
 camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
 const owners=[];const raycaster=new THREE.Raycaster();
 const shown=item=>{for(let p=item.root;p;p=p.parent)if(!p.visible)return false;return true;};
 actors=actors.filter(shown);props=props.filter(shown);
 for(const item of [...actors,...props])for(const mesh of visibleMeshes(item.root))owners.push([mesh,item]);
 const environment={name:'벽·바닥'};for(const mesh of environmentMeshes)owners.push([mesh,environment]);
 const ownerOf=new Map(owners),meshes=owners.map(o=>o[0]);
 const camPos=camera.getWorldPosition(new THREE.Vector3()),view=camera.matrixWorldInverse;
 function point(world,self){
  const ndc=world.clone().project(camera),cam=world.clone().applyMatrix4(view),depth=-cam.z;
  const inFrame=depth>camera.near&&Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1;
  let occludedBy=null;
  if(inFrame){
   const dir=world.clone().sub(camPos),dist=dir.length();raycaster.set(camPos,dir.normalize());raycaster.far=dist;
   const hit=raycaster.intersectObjects(meshes,false).find(h=>ownerOf.get(h.object)!==self&&h.distance<dist-.05);
   if(hit){const o=ownerOf.get(hit.object);occludedBy=o.name||o.id;}
  }
  return {world:world.toArray().map(r2),screen:[r2((ndc.x+1)/2),r2((1-ndc.y)/2)],depth:r2(depth),inFrame,occludedBy};
 }
 const forwardDir=camera.getWorldDirection(new THREE.Vector3());
 const view0=camera.view?.enabled?camera.view.fullHeight/camera.view.height:1;
 const vfov=2*Math.atan(Math.tan(camera.fov*Math.PI/360)/(camera.zoom||1)/view0),half=Math.tan(vfov/2),diag=Math.atan(Math.hypot(half,half*aspect));
 const facts={camera:{position:camPos.toArray().map(r2),heightM:r2(camPos.y-floorY),pitchDeg:r1(deg(Math.asin(THREE.MathUtils.clamp(forwardDir.y,-1,1)))),verticalFovDeg:r1(deg(vfov)),focal35mm:Math.round(21.63/Math.tan(diag)),aspect:r2(aspect)},actors:[],props:[],lighting:null};
 for(const item of actors){
  const m=item.root,W=k=>m[k].getWorldPosition(new THREE.Vector3());
  const P=Object.fromEntries(Object.entries(JOINTS).map(([k,j])=>[k,W(j)]));P.a0=W('l_ankle');P.a1=W('r_ankle');
  const frame=actorFrame(m,P),height=item.height||1.7,headLength=height/(item.headUnits||8);
  const points={headTop:point(P.head.clone().addScaledVector(P.head.clone().sub(P.neck).normalize(),headLength),item)};
  for(const [k]of Object.entries(JOINTS))points[k]=point(P[k],item);
  for(const [name,[a,b]]of Object.entries(PAIRS)){
   const pa=W(a),pb=W(b),aIsLeft=pa.clone().sub(pb).dot(frame.left)>0;
   points[name+'L']=point(aIsLeft?pa:pb,item);points[name+'R']=point(aIsLeft?pb:pa,item);
  }
  const toCamera=camPos.clone().sub(P.pelvis);toCamera.y=0;toCamera.normalize();const flat=frame.forward.clone();flat.y=0;
  let yawToCamera=null,screenTurn=0;
  if(flat.lengthSq()>.04){flat.normalize();yawToCamera=r1(deg(Math.acos(THREE.MathUtils.clamp(flat.dot(toCamera),-1,1))));const a=P.pelvis.clone().project(camera),b=P.pelvis.clone().addScaledVector(flat,.3).project(camera);screenTurn=Math.sign(b.x-a.x);}
  facts.actors.push({id:item.id,name:item.name,height,floorY,forward:frame.forward.toArray().map(r2),up:frame.up.toArray().map(r2),yawToCamera,screenTurn,points});
 }
 for(const item of props){
  const box=displayedObjectBounds(item.root),corners=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(point(new THREE.Vector3(x,y,z),item));
  const center=point(box.getCenter(new THREE.Vector3()),item);
  facts.props.push({id:item.id,name:item.name,box:{min:box.min.toArray().map(r2),max:box.max.toArray().map(r2)},center,cornersInFrame:corners.filter(c=>c.inFrame).length});
 }
 if(lighting?.position){
  const focus=facts.actors.length?new THREE.Vector3(...facts.actors.reduce((s,a)=>s.map((v,i)=>v+a.points.chest.world[i]/facts.actors.length),[0,0,0])):new THREE.Vector3(...(lighting.target||[0,1,0]));
  const L=new THREE.Vector3(...lighting.position).applyMatrix4(view),F=focus.clone().applyMatrix4(view);
  facts.lighting={offset:L.sub(F).toArray().map(r2)};
 }
 return facts;
}

const horizontal=u=>u<1/3?'왼쪽':u<2/3?'가운데':'오른쪽',vertical=v=>v<1/3?'위':v<2/3?'가운데':'아래';
const area=(u,v)=>horizontal(u)==='가운데'&&vertical(v)==='가운데'?'중앙':horizontal(u)==='가운데'?vertical(v)+' 가운데':vertical(v)==='가운데'?horizontal(u):horizontal(u)+' '+vertical(v);
const V=a=>new THREE.Vector3(...a);
const angleAt=(a,b,c)=>deg(V(a).sub(V(b)).angleTo(V(c).sub(V(b))));
function shotSize(points,screenHeight){
 const seen=k=>points[k]?.inFrame;
 const head=seen('head')||seen('headTop'),feet=seen('ankleL')||seen('ankleR'),knees=seen('kneeL')||seen('kneeR');
 if(!head&&!seen('chest'))return {key:'partial',text:'인물 일부만 화면에 걸침'};
 if(feet&&seen('headTop'))return screenHeight<.3?{key:'long',text:'롱샷(인물이 작게 보이는 원경)'}:{key:'full',text:'풀샷(전신)'};
 if(feet)return {key:'full-cropped',text:'전신이지만 머리 위가 잘림'};
 if(knees)return {key:'knee',text:'니샷(무릎 위)'};
 if(seen('pelvis'))return {key:'medium',text:'미디엄샷(허리 위)'};
 if(seen('chest'))return {key:'bust',text:'바스트샷(가슴 위)'};
 return {key:'close',text:'클로즈업(얼굴 중심)'};
}
function cameraText(c,main){
 const p=c.pitchDeg,angle=p<-70?'바로 위에서 내려다보는 버드아이 앵글':p<-30?'높은 곳에서 크게 내려다보는 하이 앵글(부감)':p<-8?'약간 내려다보는 앵글':p<=8?'수평에 가까운 앵글':p<=30?'약간 올려다보는 로우 앵글':'아래에서 크게 올려다보는 로우 앵글(앙각)';
 const f=c.focal35mm,lens=f<24?'초광각(원근 왜곡이 큼)':f<35?'광각':f<70?'표준 화각':f<135?'중망원(원근이 압축됨)':'망원(원근이 강하게 압축됨)';
 let eye='';
 if(main){const eyeY=main.points.head.world[1]+(main.points.headTop.world[1]-main.points.head.world[1])*.45;const d=c.position[1]-eyeY;eye=Math.abs(d)<.15?', '+main.name+'의 눈높이':d>0?`, ${main.name}의 눈높이보다 ${r1(d)}m 위`:`, ${main.name}의 눈높이보다 ${r1(-d)}m 아래`;}
 return `${angle}(카메라 높이 ${r1(c.heightM)}m${eye}, ${p<0?'아래로':'위로'} ${Math.abs(Math.round(p))}°), ${lens} · 35mm 환산 약 ${f}mm`;
}
function facingText(a){
 if(a.yawToCamera===null)return null;
 const y=a.yawToCamera,side=a.screenTurn>0?'화면 오른쪽':'화면 왼쪽';
 if(y<22.5)return '몸이 카메라 정면을 향함';
 if(y<67.5)return `몸이 ${side}을 향한 3/4 정면`;
 if(y<112.5)return `${side}을 향한 옆모습(프로필)`;
 if(y<157.5)return `${side}을 향해 돌아선 3/4 뒷모습`;
 return '카메라에 등을 보임(뒷모습)';
}
function stance(a,props){
 const P=k=>a.points[k].world,H=a.height,floor=a.floorY;
 const torsoTilt=deg(V(P('neck')).sub(V(P('pelvis'))).angleTo(UP));
 const knee=s=>180-angleAt(P('hip'+s),P('knee'+s),P('ankle'+s));
 const bends={L:knee('L'),R:knee('R')},pelvisRatio=(P('pelvis')[1]-floor)/H;
 if(torsoTilt>60){const f=a.forward[1];return {key:'lying',text:f>.5?'등을 대고 누움(얼굴이 위)':f<-.5?'엎드림':'옆으로 누움',bends};}
 const lean=torsoTilt>15?(V(P('neck')).sub(V(P('pelvis'))).dot(V(a.forward))>0?`상체를 앞으로 ${Math.round(torsoTilt)}° 숙임`:`상체를 뒤로 ${Math.round(torsoTilt)}° 젖힘`):null;
 const seat=props.find(p=>{const pe=P('pelvis'),b=p.box;return pe[0]>b.min[0]-.1&&pe[0]<b.max[0]+.1&&pe[2]>b.min[2]-.1&&pe[2]<b.max[2]+.1&&pe[1]-b.max[1]>-.05&&pe[1]-b.max[1]<.3;});
 const kneesDown=['L','R'].filter(s=>P('knee'+s)[1]-floor<.08*H);
 const thighLift=s=>deg(V(P('knee'+s)).sub(V(P('hip'+s))).angleTo(UP.clone().negate())),sitting=thighLift('L')>55&&thighLift('R')>55;
 let text;
 if(seat&&(pelvisRatio<.5||sitting))text=`${seat.name}에 앉음`;
 else if(kneesDown.length===2)text='두 무릎을 꿇음';
 else if(kneesDown.length===1)text=`${kneesDown[0]==='L'?'왼쪽':'오른쪽'} 무릎을 꿇음`;
 else if(pelvisRatio<.4&&(bends.L+bends.R)/2>115)text='쪼그려 앉음';
 else if(sitting&&pelvisRatio<.12)text='바닥에 앉음';
 else if(sitting)text='앉은 자세(엉덩이 아래 받침 없음)';
 else if(pelvisRatio<.47&&Math.max(bends.L,bends.R)>30)text='무릎을 굽혀 몸을 낮춤';
 else if(Math.abs(bends.L-bends.R)>35)text=`서 있음, ${bends.L>bends.R?'왼쪽':'오른쪽'} 다리를 굽혀 듦`;
 else text='서 있음';
 return {key:'upright',text:lean?text+', '+lean:text,bends};
}
function armText(a,s){
 const P=k=>a.points[k].world,H=a.height,name=s==='L'?'왼팔':'오른팔';
 const upper=V(P('elbow'+s)).sub(V(P('shoulder'+s))).normalize(),lift=deg(upper.angleTo(UP.clone().negate()));
 const bend=180-angleAt(P('shoulder'+s),P('elbow'+s),P('wrist'+s));
 const outward=V(a.forward).cross(V(a.up)).multiplyScalar(s==='L'?-1:1),fwd=upper.dot(V(a.forward)),side=upper.dot(outward);
 const dir=lift<25?null:fwd>.5?'앞으로':fwd<-.5?'뒤로':side>.4?'옆으로':'앞옆으로';
 const lifted=lift<25?'내림':lift<60?`${dir} 약간 듦`:lift<100?`${dir} 어깨 높이까지 듦`:lift<135?`${dir} 어깨보다 높이 듦`:'위로 높이 듦';
 const elbow=bend<20?'팔을 폄':bend<70?'팔꿈치를 약간 굽힘':bend<120?'팔꿈치를 직각 정도로 굽힘':'팔꿈치를 깊게 굽힘';
 const h=(P('wrist'+s)[1]-a.floorY)/H,hand=h>.95?'머리 위':h>.82?'얼굴 높이':h>.65?'가슴 높이':h>.5?'허리 높이':'허리 아래';
 return `${name}: ${lifted}, ${elbow}, 손은 ${hand}`;
}
function screenSide(a,s,part){const own=a.points[part+s].screen[0],center=a.points.chest.screen[0];return own<center?'화면 왼쪽':'화면 오른쪽';}
function contacts(a,others,props){
 const out=[];
 for(const s of ['L','R']){
  const w=V(a.points['wrist'+s].world),hand=s==='L'?'왼손':'오른손';
  if(w.distanceTo(V(a.points.head.world))<.22){out.push(`${hand}이 얼굴 가까이 있음`);continue;}
  let best=null;
  for(const o of others)for(const [k,p]of Object.entries(o.points)){const d=w.distanceTo(V(p.world));if(d<.25&&(!best||d<best.d))best={d,text:`${hand}이 ${o.name}의 ${LABEL[k]} 근처(${Math.round(d*100)}cm)`};}
  for(const p of props){const box=new THREE.Box3(V(p.box.min),V(p.box.max)),d=box.distanceToPoint(w);if(d<.06&&(!best||d<best.d))best={d,text:`${hand}이 ${p.name}에 닿음`};}
  if(best)out.push(best.text);
 }
 return out;
}
function feetText(a){
 if(!a.points.ankleL.inFrame&&!a.points.ankleR.inFrame)return null;
 const lifted=['L','R'].filter(s=>a.points['ankle'+s].world[1]-a.floorY>.15);
 return lifted.length===0?'두 발 모두 바닥에 닿음':lifted.length===2?'두 발이 바닥에서 떨어짐':`${lifted[0]==='L'?'왼발':'오른발'}이 바닥에서 떨어짐`;
}
function framingText(a){
 const pts=Object.values(a.points),inside=pts.filter(p=>p.inFrame);
 if(!inside.length)return {inFrame:false,text:'화면 밖'};
 const us=inside.map(p=>p.screen[0]),vs=inside.map(p=>p.screen[1]),u=(Math.min(...us)+Math.max(...us))/2;
 const height=Math.min(1,Math.max(...vs)-Math.min(...vs)),missing=Object.entries(a.points).filter(([,p])=>!p.inFrame).map(([k])=>LABEL[k]);
 return {inFrame:true,u:r2(u),screenHeight:r2(height),text:`화면 ${horizontal(u)}(가로 ${Math.round(u*100)}%), 화면 높이의 ${Math.round(height*100)}%`+(missing.length?`, 화면 밖: ${missing.join('·')}`:'')};
}
function occlusionText(a){
 const by={};for(const [k,p]of Object.entries(a.points))if(p.occludedBy)(by[p.occludedBy]??=[]).push(LABEL[k]);
 return Object.entries(by).map(([o,parts])=>`${o}에 가려짐: ${parts.join('·')}`);
}
function lightText(l){
 if(!l)return null;const [x,y,z]=l.offset,len=Math.hypot(x,y,z)||1;
 const side=x/len>.3?'화면 오른쪽':x/len<-.3?'화면 왼쪽':'화면 정면 쪽',depth=z>0?'카메라 쪽(앞)':'인물 뒤쪽(역광)',height=y/len>.4?' 위':'';
 const shadow=[x/len>.3?'화면 왼쪽':x/len<-.3?'화면 오른쪽':null,z>0?'인물 뒤쪽':'카메라 쪽'].filter(Boolean).join(' ');
 return `주광은 ${side}${height}, ${depth}에서 비춤 → 그림자는 ${shadow}으로 떨어짐`;
}
export function describeShot(facts,{shotName='',purpose=''}={}){
 const actors=facts.actors.map(a=>({a,framing:framingText(a)}));
 const visible=actors.filter(x=>x.framing.inFrame).sort((x,y)=>y.framing.screenHeight-x.framing.screenHeight);
 const main=visible[0]?.a||null,size=main?shotSize(main.points,visible[0].framing.screenHeight):{key:'none',text:'화면 안에 인물 없음'};
 const lines=['촬영 설명 (편집기 3D 장면의 촬영 카메라에서 계산한 값입니다. 첨부 color PNG와 같은 카메라입니다.)'];
 if(shotName)lines.push(`- 컷: ${shotName}${purpose?' — '+purpose:''}`);
 lines.push(`- 카메라: ${size.text} · ${cameraText(facts.camera,main)} · 화면비 ${facts.camera.aspect}:1`);
 const structured={shotSize:size.key,camera:facts.camera,actors:[],props:[],lighting:null};
 for(const {a,framing}of actors){
  const others=facts.actors.filter(o=>o!==a);
  if(!framing.inFrame){lines.push(`- ${a.name}: 화면 밖(촬영 범위에 보이지 않음)`);structured.actors.push({id:a.id,name:a.name,inFrame:false});continue;}
  const st=stance(a,facts.props),facing=facingText(a),arms=['R','L'].map(s=>`${armText(a,s)}(${screenSide(a,s,'wrist')})`);
  const parts=[framing.text,facing,st.text,...arms,feetText(a),...contacts(a,others,facts.props),...occlusionText(a)].filter(Boolean);
  lines.push(`- ${a.name}: ${parts.join('. ')}.`);
  structured.actors.push({id:a.id,name:a.name,inFrame:true,screenX:framing.u,screenHeight:framing.screenHeight,distanceM:a.points.pelvis.depth,yawToCamera:a.yawToCamera,stance:st.text,kneeBend:{left:Math.round(st.bends.L),right:Math.round(st.bends.R)},text:parts});
 }
 if(visible.length>1){
  const order=[...visible].sort((x,y)=>x.a.points.pelvis.depth-y.a.points.pelvis.depth);
  lines.push(`- 앞뒤 관계: 카메라에서 가까운 순서로 ${order.map(x=>`${x.a.name}(${r1(x.a.points.pelvis.depth)}m)`).join(' → ')}.`);
 }
 for(const p of facts.props){
  if(!p.cornersInFrame&&!p.center.inFrame){structured.props.push({id:p.id,name:p.name,inFrame:false});continue;}
  const box=new THREE.Box3(V(p.box.min),V(p.box.max)),overlapXZ=(a,b)=>a.min[0]<b.max[0]&&a.max[0]>b.min[0]&&a.min[2]<b.max[2]&&a.max[2]>b.min[2];
  const under=facts.props.find(o=>o!==p&&overlapXZ(p.box,o.box)&&Math.abs(p.box.min[1]-o.box.max[1])<.05&&o.box.max[1]>p.box.min[1]-.05&&(o.box.max[0]-o.box.min[0])*(o.box.max[2]-o.box.min[2])>(p.box.max[0]-p.box.min[0])*(p.box.max[2]-p.box.min[2]));
  let near=null;for(const a of facts.actors){const d=box.distanceToPoint(V(a.points.pelvis.world));if(d<1.2&&(!near||d<near.d))near={d,name:a.name};}
  const text=`화면 ${area(...p.center.screen)}, 카메라에서 ${r1(p.center.depth)}m`+(under?`, ${under.name} 위에 놓임`:'')+(near?`, ${near.name}에게서 ${r1(near.d)}m`:'')+(p.cornersInFrame<8?', 일부가 화면 밖':'')+(p.center.occludedBy?`, ${p.center.occludedBy}에 일부 가려짐`:'');
  lines.push(`- 소품 ${p.name}: ${text}.`);structured.props.push({id:p.id,name:p.name,inFrame:true,text});
 }
 const light=lightText(facts.lighting);if(light){lines.push(`- 빛: ${light}.`);structured.lighting=light;}
 lines.push('좌우 표기: "화면 왼쪽/오른쪽"은 이미지 기준, "왼팔/오른팔·왼발/오른발"은 인물 자신 기준입니다. 시선·표정·손가락 모양은 계산하지 않았으니 원문과 캐릭터 설명을 따르세요.');
 return {structured,text:lines.join('\n')};
}
