// LLM shot package: label / depth / direct-light / pose passes rendered from the
// shot camera, plus a shot.json legend that ties every label to its notes,
// pose wording, light condition and character reference images.
import * as THREE from 'three';
import {encodePNG,createZip,dataUrlBytes} from './package-files.js';

// Distinct, saturated colours that stay apart for a vision model. Index 0 is background.
export const LABEL_PALETTE=['#e6194b','#3cb44b','#4363d8','#f58231','#911eb4','#42d4f4','#f032e6','#bfef45','#ffe119','#469990','#9a6324','#fabed4','#800000','#aaffc3','#000075','#dcbeff','#808000','#ffd8b1'];
export const ENV_COLORS={floor:'#505050',wall:'#8c8c8c'};
const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const r2=v=>Math.round(v*100)/100,r3=v=>Math.round(v*1000)/1000;

// labels: [{index,id,name,kind,color,root|meshes}]
export function buildLabels({actors=[],props=[],environmentMeshes=[]}){
 const labels=[];let k=0;
 for(const a of actors)labels.push({index:labels.length+1,kind:'person',id:a.id,name:a.name,color:LABEL_PALETTE[k++%LABEL_PALETTE.length],root:a.root,source:a});
 for(const p of props)labels.push({index:labels.length+1,kind:'prop',id:p.id,name:p.name,color:LABEL_PALETTE[k++%LABEL_PALETTE.length],root:p.root,source:p});
 const floor=[],wall=[];for(const m of environmentMeshes)(m.userData.editingWall?wall:floor).push(m);
 if(floor.length)labels.push({index:labels.length+1,kind:'floor',id:'floor',name:'바닥',color:ENV_COLORS.floor,meshes:floor});
 if(wall.length)labels.push({index:labels.length+1,kind:'wall',id:'wall',name:'벽',color:ENV_COLORS.wall,meshes:wall});
 return labels;
}
function shown(node){for(let p=node;p;p=p.parent)if(!p.visible)return false;return true;}
function labelMeshes(label){const out=[];if(label.meshes)return label.meshes.filter(shown);label.root.traverse(n=>{if(n.isMesh&&!n.userData.bodyOutline&&shown(n))out.push(n);});return out;}

const VERTEX='#include <common>\n#include <skinning_pars_vertex>\nvarying vec3 viewPos;\nvoid main(){\n#include <skinbase_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\nvec4 v=modelViewMatrix*vec4(transformed,1.);viewPos=v.xyz;gl_Position=projectionMatrix*v;}';
// R = label index, G = euclidean distance from the camera centre in metres.
const FRAGMENT='uniform float labelId; varying vec3 viewPos; void main(){gl_FragColor=vec4(labelId,length(viewPos),0.,1.);}';

// Renders into float targets (no MSAA) so label ids and distances are exact.
export function renderPasses({renderer,scene,camera,width,height,labels,light,lightTarget=null,ambient}){
 const target=new THREE.WebGLRenderTarget(width,height,{type:THREE.FloatType,depthBuffer:true,samples:0});
 const swaps=[],hidden=[],materials=[];const owned=new Set();
 for(const label of labels)for(const mesh of labelMeshes(label)){owned.add(mesh);swaps.push([mesh,mesh.material,mesh.castShadow,mesh.receiveShadow,label]);}
 scene.traverse(n=>{if(owned.has(n)||!n.visible)return;if(n.isMesh||n.isLine||n.isPoints||n.isSprite){hidden.push(n);n.visible=false;}});
 const otherLights=[];scene.traverse(n=>{if(n.isLight&&n!==light&&n.visible){otherLights.push(n);n.visible=false;}});
 const background=scene.background,override=scene.overrideMaterial,clear=renderer.getClearColor(new THREE.Color()),clearAlpha=renderer.getClearAlpha(),previousTarget=renderer.getRenderTarget();
 const lightState={intensity:light.intensity,color:light.color.clone(),mapSize:light.shadow.mapSize.clone(),castShadow:light.castShadow},shadowEnabled=renderer.shadowMap.enabled;
 const read=()=>{const buffer=new Float32Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,buffer);return buffer;};
 try{
  scene.background=null;scene.overrideMaterial=null;renderer.setClearColor(0x000000,0);renderer.setRenderTarget(target);
  const byLabel=new Map();
  for(const [mesh,, , ,label]of swaps){let m=byLabel.get(label);if(!m){m=new THREE.ShaderMaterial({uniforms:{labelId:{value:label.index}},vertexShader:VERTEX,fragmentShader:FRAGMENT,side:THREE.DoubleSide});byLabel.set(label,m);materials.push(m);}mesh.material=m;}
  renderer.clear();renderer.render(scene,camera);const ids=read();
  // Direct light only: N·L × shadow visibility, ambient excluded. Intensity π makes a
  // surface facing the light read exactly 1 with Lambert's 1/π BRDF; a lamp or spot is
  // scaled by distance² so a surface at the target reads 1 and nearer/farther ones differ.
  const lit=new THREE.MeshLambertMaterial({color:0xffffff});materials.push(lit);
  for(const [mesh,, , ,label]of swaps){mesh.material=lit;mesh.castShadow=label.kind==='person'||label.kind==='prop';mesh.receiveShadow=true;}
  if(ambient)ambient.visible=false;const reference=light.isDirectionalLight||!lightTarget?1:light.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(...lightTarget))||1;
  light.intensity=Math.PI*reference*reference;light.color.set(0xffffff);light.castShadow=true;
  if(!light.isPointLight&&light.shadow.mapSize.x<2048){light.shadow.map?.dispose();light.shadow.map=null;light.shadow.mapSize.set(2048,2048);}
  renderer.shadowMap.enabled=true;renderer.shadowMap.needsUpdate=true;
  renderer.clear();renderer.render(scene,camera);const shade=read();
  // Flip rows to top-left origin.
  const n=width*height,label=new Uint8Array(n),distance=new Float32Array(n),direct=new Float32Array(n);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const s=((height-1-y)*width+x)*4,d=y*width+x;label[d]=ids[s+3]>0?Math.round(ids[s]):0;distance[d]=label[d]?ids[s+1]:0;direct[d]=label[d]?Math.min(1,Math.max(0,shade[s])):0;}
  return {width,height,label,distance,direct};
 }finally{
  for(const [mesh,material,cast,receive]of swaps){mesh.material=material;mesh.castShadow=cast;mesh.receiveShadow=receive;}
  hidden.forEach(n=>n.visible=true);otherLights.forEach(n=>n.visible=true);
  light.intensity=lightState.intensity;light.color.copy(lightState.color);light.castShadow=lightState.castShadow;
  if(!light.shadow.mapSize.equals(lightState.mapSize)){light.shadow.map?.dispose();light.shadow.map=null;light.shadow.mapSize.copy(lightState.mapSize);}
  renderer.shadowMap.enabled=shadowEnabled;renderer.shadowMap.needsUpdate=true;
  scene.background=background;scene.overrideMaterial=override;renderer.setClearColor(clear,clearAlpha);renderer.setRenderTarget(previousTarget);
  materials.forEach(m=>m.dispose());target.dispose();
 }
}

// Per-label screen statistics from the pass buffers.
export function analyzePasses(passes,labels){
 const {width,height,label,distance,direct}=passes,n=width*height,stats=new Map(labels.map(l=>[l.index,{pixels:0,x0:width,y0:height,x1:-1,y1:-1,lit:0,shadow:0,sum:0}]));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x,s=stats.get(label[i]);if(!s)continue;s.pixels++;if(x<s.x0)s.x0=x;if(y<s.y0)s.y0=y;if(x>s.x1)s.x1=x;if(y>s.y1)s.y1=y;s.sum+=direct[i];if(direct[i]>.25)s.lit++;if(direct[i]<.05)s.shadow++;}
 // Typed arrays sort numerically in native code; far faster than Array#sort for every pixel.
 const depths=new Map();for(const [index,s]of stats)if(s.pixels)depths.set(index,{values:new Float32Array(s.pixels),n:0});
 for(let i=0;i<n;i++){const d=depths.get(label[i]);if(d)d.values[d.n++]=distance[i];}
 const out=new Map();
 for(const [index,s]of stats){if(!s.pixels){out.set(index,null);continue;}const v=depths.get(index).values.sort(),q=f=>v[Math.min(v.length-1,Math.floor(f*v.length))];
  out.set(index,{pixelShare:r3(s.pixels/n),bbox:[r3(s.x0/width),r3(s.y0/height),r3((s.x1+1)/width),r3((s.y1+1)/height)],depthM:{min:r2(q(0)),median:r2(q(.5)),max:r2(q(.999))},direct:{mean:r2(s.sum/s.pixels),litShare:r2(s.lit/s.pixels),darkShare:r2(s.shadow/s.pixels)}});}
 return out;
}
// Near/far for the 8-bit depth view are fitted to the people and props, so the
// subjects spread over the full grey range; floor/walls outside it clamp.
export function depthRange(passes,labels,stats){
 let nearAll=Infinity,farAll=0,nearObject=Infinity,farObject=0;
 for(const l of labels){const s=stats.get(l.index);if(!s)continue;nearAll=Math.min(nearAll,s.depthM.min);farAll=Math.max(farAll,s.depthM.max);if(l.kind==='person'||l.kind==='prop'){nearObject=Math.min(nearObject,s.depthM.min);farObject=Math.max(farObject,s.depthM.max);}}
 if(!Number.isFinite(nearAll))return {nearM:0,farM:1};
 const near=Number.isFinite(nearObject)?Math.max(nearAll,nearObject-.3):nearAll,far=farObject?Math.min(farAll,farObject+.5):farAll;
 return {nearM:r2(near),farM:r2(Math.max(far,near+.5))};
}
export const DEPTH_NEAR_VALUE=255,DEPTH_FAR_VALUE=40;
export function passImages(passes,labels,range){
 const {width,height,label,distance,direct}=passes,n=width*height,colors=new Map(labels.map(l=>[l.index,hex(l.color)]));
 const rgba=new Uint8Array(n*4),depth8=new Uint8Array(n),depth16=new Uint16Array(n),light8=new Uint8Array(n);
 const span=range.farM-range.nearM;
 for(let i=0;i<n;i++){const id=label[i];if(!id){rgba[i*4+3]=255;continue;}const c=colors.get(id)||[255,255,255];rgba.set([...c,255],i*4);
  const t=Math.min(1,Math.max(0,(distance[i]-range.nearM)/span));depth8[i]=Math.round(DEPTH_NEAR_VALUE-t*(DEPTH_NEAR_VALUE-DEPTH_FAR_VALUE));
  depth16[i]=Math.min(65535,Math.max(1,Math.round(distance[i]*1000)));light8[i]=Math.round(255*Math.pow(direct[i],1/2.2));}
 return {rgba,depth8,depth16,light8};
}

const BONES=[['headTop','head'],['head','neck'],['neck','chest'],['chest','pelvis'],['neck','shoulderL'],['shoulderL','elbowL'],['elbowL','wristL'],['neck','shoulderR'],['shoulderR','elbowR'],['elbowR','wristR'],['pelvis','hipL'],['hipL','kneeL'],['kneeL','ankleL'],['pelvis','hipR'],['hipR','kneeR'],['kneeR','ankleR']];
const mix=(c,t,w)=>c.map((v,i)=>Math.round(v+(t[i]-v)*w));
// Stick figures in each person's label colour: figure-left limbs light, figure-right
// limbs dark, hidden joints hollow.
export function drawPose(canvas,facts,labels){
 const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,s=Math.max(2,Math.round(H/220));
 ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.lineCap='round';ctx.font=`bold ${s*7}px sans-serif`;ctx.textBaseline='middle';
 const names=[];
 for(const actor of facts.actors){const label=labels.find(l=>l.kind==='person'&&l.id===actor.id);if(!label)continue;const base=hex(label.color),P=actor.points,xy=p=>[p.screen[0]*W,p.screen[1]*H];
  const side=k=>k.endsWith('L')?mix(base,[255,255,255],.45):k.endsWith('R')?mix(base,[0,0,0],.45):base;
  for(const [a,b]of BONES){const pa=P[a],pb=P[b];if(!pa||!pb)continue;const c=side(b.endsWith('L')||b.endsWith('R')?b:a);ctx.strokeStyle=`rgb(${c})`;ctx.lineWidth=s*2;ctx.setLineDash(pa.occludedBy||pb.occludedBy?[s*3,s*3]:[]);ctx.beginPath();ctx.moveTo(...xy(pa));ctx.lineTo(...xy(pb));ctx.stroke();}
  ctx.setLineDash([]);
  for(const [k,p]of Object.entries(P)){const [x,y]=xy(p),c=side(k);ctx.beginPath();ctx.arc(x,y,s*2.2,0,Math.PI*2);if(p.occludedBy){ctx.strokeStyle=`rgb(${c})`;ctx.lineWidth=s;ctx.stroke();}else{ctx.fillStyle=`rgb(${c})`;ctx.fill();}}
  ctx.fillStyle='#fff';for(const k of ['wristL','wristR','ankleL','ankleR'])if(P[k]){const [x,y]=xy(P[k]);ctx.fillText(k.endsWith('L')?'L':'R',x+s*4,y);}
  names.push({text:actor.name,color:label.color,x:xy(P.headTop)[0],y:xy(P.headTop)[1]-s*8});
 }
 // Name tags: kept inside the image and stacked upward when they would overlap.
 const lineH=s*9,placed=[];
 for(const n of names.sort((a,b)=>b.y-a.y)){const w=ctx.measureText(n.text).width,x=Math.min(Math.max(n.x-w/2,2),W-w-2);let y=Math.max(n.y,lineH/2);
  for(let guard=0;guard<20&&placed.some(r=>x<r.x+r.w+4&&r.x<x+w+4&&Math.abs(r.y-y)<lineH);guard++)y-=lineH;
  y=Math.max(lineH/2,y);placed.push({x,y,w});ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(x-2,y-lineH/2,w+4,lineH);ctx.fillStyle=n.color;ctx.fillText(n.text,x,y);}
}

// Light condition per person: which side faces the light, whether the camera sees the
// lit or the dark side, which joints sit in another object's cast shadow, and for a
// lamp/spot how far the light is and whether the person is inside the cone.
const JOINT={head:'머리',chest:'가슴',pelvis:'골반',wristL:'왼손',wristR:'오른손',kneeL:'왼무릎',kneeR:'오른무릎'};
export function lightingNotes({facts,lighting,labels}){
 if(!lighting?.position)return new Map();
 const type=lighting.type||'sun',L=new THREE.Vector3(...lighting.position),T=new THREE.Vector3(...(lighting.target||[0,0,0])),sunDir=L.clone().sub(T).normalize(),reference=L.distanceTo(T)||1,axis=T.clone().sub(L).normalize();
 const half=(lighting.coneDeg??50)*Math.PI/360,inner=half*(1-(lighting.softness??.3));
 const toLight=p=>type==='sun'?sunDir.clone():L.clone().sub(p).normalize();
 const cam=new THREE.Vector3(...facts.camera.position),ray=new THREE.Raycaster(),out=new Map();
 const meshOwner=new Map();for(const l of labels)if(l.kind==='person'||l.kind==='prop')for(const m of labelMeshes(l))meshOwner.set(m,l);const meshes=[...meshOwner.keys()];
 for(const actor of facts.actors){
  const self=labels.find(l=>l.kind==='person'&&l.id===actor.id);if(!self)continue;
  const V=k=>new THREE.Vector3(...actor.points[k].world),pelvis=V('pelvis'),chest=actor.points.chest?V('chest'):pelvis;
  const forward=new THREE.Vector3(...actor.forward),flatL=toLight(chest).setY(0),flatF=forward.clone().setY(0);
  const facing=flatL.lengthSq()<.02||flatF.lengthSq()<.02?null:flatF.normalize().dot(flatL.clone().normalize());
  const toCam=cam.clone().sub(pelvis).setY(0).normalize(),seen=flatL.lengthSq()<.02?null:toCam.dot(flatL.clone().normalize());
  const shadowed={};
  for(const key of Object.keys(JOINT)){const p=actor.points[key];if(!p)continue;const from=new THREE.Vector3(...p.world);ray.set(from,toLight(from));ray.far=type==='sun'?40:Math.max(0,L.distanceTo(from)-.05);const hit=ray.intersectObjects(meshes,false).find(h=>meshOwner.get(h.object)!==self&&h.distance>.02);if(hit)(shadowed[meshOwner.get(hit.object).name]??=[]).push(key);}
  const facingText=facing==null?'빛이 거의 바로 위에서 내려옴':facing>.5?'빛을 정면으로 받음(얼굴·가슴 쪽이 밝고 등은 어두움)':facing<-.5?'빛을 등지고 있음(등·뒤통수가 밝고 얼굴 쪽은 그늘)':'빛을 옆에서 받음(한쪽 옆면만 밝음)';
  const seenText=seen==null?'':seen>.3?'카메라는 빛을 받는 면을 봄':seen<-.3?'카메라는 그늘진 면을 봄(역광, 윤곽만 밝음)':'카메라는 밝은 면과 그늘의 경계를 봄';
  const josa=w=>{const c=w.charCodeAt(w.length-1)-0xac00;return c>=0&&c<11172&&c%28?'은':'는';};
  const shadowText=Object.entries(shadowed).map(([name,keys])=>{const words=keys.map(k=>JOINT[k]).join('·');return `${words}${josa(words)} ${name}의 그림자 안`;}).join(', ');
  const extra={},texts=[];
  if(type!=='sun'){
   const distance=L.distanceTo(chest),relative=(reference/distance)**2;extra.distanceToLightM=r2(distance);extra.brightnessVsTarget=r2(relative);
   texts.push(`광원에서 ${Math.round(distance*10)/10}m · 비추는 곳 대비 밝기 ${Math.round(Math.min(relative,9.99)*100)}%`);
   if(actor.points.head&&L.y<V('head').y-.15)texts.push('광원이 머리보다 낮아 아래에서 올려 비춤');
   if(type==='spot'){const angle=axis.angleTo(chest.clone().sub(L));extra.inCone=angle<=inner?'inside':angle<=half?'edge':'outside';if(extra.inCone==='outside')texts.push('스포트 빛 원 밖(직사광 없음)');else if(extra.inCone==='edge')texts.push('스포트 빛 원 가장자리(약하게 받음)');}
  }
  out.set(actor.id,{facingLight:facing==null?null:r2(facing),cameraSeesLitSide:seen==null?null:r2(seen),castShadowFrom:Object.fromEntries(Object.entries(shadowed)),...extra,text:[facingText,seenText,...texts,shadowText].filter(Boolean).join(' · ')});
 }
 return out;
}

function cameraFrameDirection(camera,world){const v=new THREE.Vector3(...world).transformDirection(camera.matrixWorldInverse);return v.toArray().map(r2);}
export const LIGHT_TYPE_TEXT={sun:'태양광(평행광): 장면 전체에 같은 방향·같은 세기로 비추고 그림자가 서로 평행하게 떨어짐',lamp:'전등(점광원): 광원에서 사방으로 퍼짐. 광원에 가까울수록 밝고 멀수록 어두워지며, 그림자는 광원 반대쪽으로 방사형으로 퍼지고 멀수록 커짐',spot:'스포트: 광원에서 원뿔 모양으로만 비춤. 원 밖은 직사광이 없고, 원 안도 거리에 따라 어두워짐'};
function lightDirectionText(d){const [x,y,z]=d,h=x>.3?'화면 오른쪽':x<-.3?'화면 왼쪽':'화면 가운데',v=y>.5?' 위':y<-.2?' 아래':'',f=z>.3?'카메라 쪽(순광)':z<-.3?'피사체 뒤쪽(역광)':'옆쪽';return `빛은 ${h}${v}, ${f}에서 들어옴`;}
const REF_SLUG={전신:'fullbody',얼굴:'face',의상:'costume',헤어:'hair',표정:'expression',소품:'prop',기타:'other'};
const safe=s=>String(s||'item').replace(/[^\w.-]+/g,'_').slice(0,48);
const ext=mime=>({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[mime]||'bin');

export function buildShotJson({shot,scene,camera,facts,description,labels,stats,range,lightNotes,references,objectNotes,width,height,lighting}){
 const type=lighting.type||'sun',toLight=new THREE.Vector3(...lighting.position).sub(new THREE.Vector3(...(lighting.target||[0,0,0]))).normalize().toArray(),camDir=cameraFrameDirection(camera,toLight);
 let source=null;
 if(type!=='sun'){const p=new THREE.Vector3(...lighting.position),ndc=p.clone().project(camera),depth=-p.clone().applyMatrix4(camera.matrixWorldInverse).z;source={xy:[r3((ndc.x+1)/2),r3((1-ndc.y)/2)],inFrame:depth>0&&Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1,distanceFromCameraM:r2(p.distanceTo(camera.getWorldPosition(new THREE.Vector3())))};}
 const refFiles=[];
 const entries=labels.map(l=>{
  const s=stats.get(l.index),notes=objectNotes.get(l.id)||{},actor=facts.actors.find(a=>a.id===l.id),descActor=description?.structured?.actors?.find(a=>a.id===l.id),descProp=description?.structured?.props?.find(p=>p.id===l.id);
  const refs=(references[l.id]||[]).map((r,i)=>{const file=`refs/${safe(l.id)}/${i+1}-${REF_SLUG[r.label]||'other'}.${ext(r.mime)}`;refFiles.push({name:file,dataUrl:r.dataUrl});return {file,label:r.label,note:r.note||'',originalName:r.name};});
  return {index:l.index,color:l.color,kind:l.kind,id:l.id,name:l.name,...(notes.role||notes.intent||notes.description?{notes}:{}),references:refs,visible:!!s,
   ...(s?{screen:{bbox:s.bbox,pixelShare:s.pixelShare},distanceM:s.depthM,directLight:s.direct}:{}),
   ...(actor?{pose:{text:Array.isArray(descActor?.text)?descActor.text.join('. '):(descActor?.text||''),stance:descActor?.stance||'',yawToCameraDeg:actor.yawToCamera,joints:Object.fromEntries(Object.entries(actor.points).map(([k,p])=>[k,{xy:p.screen,distanceM:p.depth,visible:p.inFrame&&!p.occludedBy,...(p.occludedBy?{hiddenBy:p.occludedBy}:{}),...(!p.inFrame?{outOfFrame:true}:{})}]))}}:{}),
   ...(lightNotes.get(l.id)?{lightCondition:lightNotes.get(l.id)}:{}),
   ...(descProp?{placement:descProp.text}:{})};
 });
 const json={format:'cutscene-shot-package',version:1,
  scene:{title:scene.title,sourceText:scene.sourceText||'',assumptions:scene.assumptions||''},
  shot:{name:shot.name,purpose:shot.purpose||''},
  image:{width,height,aspect:r3(width/height),origin:'top-left, x right, y down, coordinates normalized 0..1'},
  files:{color:'color.png',label:'label.png',depth:'depth.png',depth16:'depth16.png',light:'light.png',pose:'pose.png'},
  camera:{...facts.camera,lookAt:shot.camera?.target||null},
  depth:{metric:'euclidean distance from the camera centre to the surface, metres',depthPng:{nearM:range.nearM,farM:range.farM,mapping:`linear: nearM=${DEPTH_NEAR_VALUE} (white), farM and beyond=${DEPTH_FAR_VALUE}, background=0`},depth16Png:{unit:'millimetres',background:0}},
  lighting:{type,typeText:LIGHT_TYPE_TEXT[type],positionWorld:lighting.position,targetWorld:lighting.target,...(type==='spot'?{coneDeg:lighting.coneDeg,softness:lighting.softness}:{}),...(source?{source}:{}),directionToLightCamera:camDir,cameraFrame:'+x screen right, +y screen up, +z toward the viewer; direction measured from the lit target point',text:(type==='sun'?'':'비추는 곳 기준으로 ')+lightDirectionText(camDir)+(source?.inFrame?` · 광원이 화면 안 (${source.xy.map(v=>Math.round(v*100)+'%').join(', ')})에 보임`:''),color:lighting.color,intensity:lighting.intensity,intensityMeaning:'brightness reached at targetWorld',ambient:lighting.ambient,
   lightPng:'direct light only: surface facing the light with nothing in between = white; turned away or in a cast shadow = black. Ambient light is excluded. Background is also black; use label.png to tell them apart.'+(type==='sun'?'':' A lamp/spot fades with distance: the lit target reads white, nearer surfaces clip to white, farther ones are greyer.')},
  labels:entries,
  shotDescription:description?.text||'',
 };
 return {json,refFiles};
}
export function buildPrompt(json){
 const people=json.labels.filter(l=>l.kind==='person'),props=json.labels.filter(l=>l.kind==='prop');
 const line=l=>{const refs=l.references.length?l.references.map(r=>`${r.file}(${r.label}${r.note?': '+r.note:''})`).join(', '):'없음';return `- ${l.color} = ${l.name}${l.notes?.description?` — ${l.notes.description}`:''}\n  설정화: ${refs}${l.pose?.text?`\n  포즈: ${l.pose.text}`:''}${l.lightCondition?`\n  조명: ${l.lightCondition.text}`:''}${l.visible?'':'\n  (이 컷에서는 화면에 보이지 않음)'}`;};
 return [`# 컷 작화 지시 · ${json.scene.title} / ${json.shot.name}`,
 `첨부 파일은 하나의 컷을 같은 카메라에서 분해한 자료입니다. 구도·원근·인물 위치·포즈·가림·명암은 아래 파일을 그대로 따르고, 얼굴·머리·복식은 ${json.labels.some(l=>l.references.length)?'각 인물의 설정화(없으면 인물 설명)':'아래 인물 설명'}을 따르세요.`,
 '',
 '## 파일 읽는 법',
 '- label.png: 객체별 단색 영역. 색과 대상은 아래 목록 및 shot.json의 labels 참조. 검은색은 배경.',
 `- depth.png: 카메라에서의 거리. 흰색일수록 가깝고 어두울수록 멂(${json.depth.depthPng.nearM}m → ${json.depth.depthPng.farM}m). 검은색은 배경.`,
 '- light.png: 주광의 직사광만 표시. 흰색은 빛을 정면으로 받는 면, 검은색은 빛을 등진 면이나 다른 물체의 그림자. 이 명암과 그림자 위치를 최종 그림에 유지하세요.',
 '- pose.png: 인물별 관절 뼈대. 인물 기준 왼쪽 팔다리는 밝은 색, 오른쪽은 어두운 색이고 L/R 표시가 있음. 속이 빈 점과 점선은 다른 물체에 가려진 부위.',
 '- color.png: 무채색 마네킹 작업 렌더(구도 확인용). 마네킹의 형태·색을 그대로 그리지 마세요.',
 '- shot.json: 위 내용의 수치 정보(카메라, 거리, 화면 내 위치, 관절 좌표, 조명 방향).',
 '',
 `## 카메라와 조명`,`- 렌즈 약 ${json.camera.focal35mm}mm(35mm 환산), 카메라 높이 ${json.camera.heightM}m, 피치 ${json.camera.pitchDeg}°`,`- 광원 종류: ${json.lighting.typeText}`,`- ${json.lighting.text}. 빛 색 ${json.lighting.color}.`,
 '',
 '## 인물',...people.map(line),...(props.length?['','## 소품',...props.map(line)]:[]),
 '','## 장면 설명',json.shotDescription,
 ...(json.scene.sourceText?['','## 원문',json.scene.sourceText]:[]),
 '','라벨 색·뼈대·글자는 최종 그림에 넣지 마세요. 말풍선·자막을 추가하지 마세요.'].join('\n');
}

export async function packageZip({folder,images,json,prompt,refFiles}){
 const files=[];const add=(name,data)=>files.push({name:`${folder}/${name}`,data});
 for(const [name,bytes]of Object.entries(images))add(name,bytes);
 add('shot.json',JSON.stringify(json,null,2));add('prompt.txt',prompt);
 for(const ref of refFiles)add(ref.name,dataUrlBytes(ref.dataUrl));
 return createZip(files);
}
export {encodePNG};
