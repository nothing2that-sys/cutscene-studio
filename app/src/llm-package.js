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
export function renderPasses({renderer,scene,camera,width,height,labels,light,ambient}){
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
  // surface facing the light read exactly 1 with Lambert's 1/π BRDF.
  const lit=new THREE.MeshLambertMaterial({color:0xffffff});materials.push(lit);
  for(const [mesh,, , ,label]of swaps){mesh.material=lit;mesh.castShadow=label.kind==='person'||label.kind==='prop';mesh.receiveShadow=true;}
  if(ambient)ambient.visible=false;light.intensity=Math.PI;light.color.set(0xffffff);light.castShadow=true;
  if(light.shadow.mapSize.x<2048){light.shadow.map?.dispose();light.shadow.map=null;light.shadow.mapSize.set(2048,2048);}
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
 const {width,height,label,distance,direct}=passes,stats=new Map(labels.map(l=>[l.index,{pixels:0,x0:width,y0:height,x1:-1,y1:-1,depths:[],lit:0,shadow:0,sum:0}]));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x,s=stats.get(label[i]);if(!s)continue;s.pixels++;if(x<s.x0)s.x0=x;if(y<s.y0)s.y0=y;if(x>s.x1)s.x1=x;if(y>s.y1)s.y1=y;s.depths.push(distance[i]);s.sum+=direct[i];if(direct[i]>.25)s.lit++;if(direct[i]<.05)s.shadow++;}
 const total=width*height,out=new Map();
 for(const [index,s]of stats){if(!s.pixels){out.set(index,null);continue;}s.depths.sort((a,b)=>a-b);const q=f=>s.depths[Math.min(s.depths.length-1,Math.floor(f*s.depths.length))];
  out.set(index,{pixelShare:r3(s.pixels/total),bbox:[r3(s.x0/width),r3(s.y0/height),r3((s.x1+1)/width),r3((s.y1+1)/height)],depthM:{min:r2(q(0)),median:r2(q(.5)),max:r2(q(.999))},direct:{mean:r2(s.sum/s.pixels),litShare:r2(s.lit/s.pixels),darkShare:r2(s.shadow/s.pixels)}});}
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
 for(const actor of facts.actors){const label=labels.find(l=>l.kind==='person'&&l.id===actor.id);if(!label)continue;const base=hex(label.color),P=actor.points,xy=p=>[p.screen[0]*W,p.screen[1]*H];
  const side=k=>k.endsWith('L')?mix(base,[255,255,255],.45):k.endsWith('R')?mix(base,[0,0,0],.45):base;
  for(const [a,b]of BONES){const pa=P[a],pb=P[b];if(!pa||!pb)continue;const c=side(b.endsWith('L')||b.endsWith('R')?b:a);ctx.strokeStyle=`rgb(${c})`;ctx.lineWidth=s*2;ctx.setLineDash(pa.occludedBy||pb.occludedBy?[s*3,s*3]:[]);ctx.beginPath();ctx.moveTo(...xy(pa));ctx.lineTo(...xy(pb));ctx.stroke();}
  ctx.setLineDash([]);
  for(const [k,p]of Object.entries(P)){const [x,y]=xy(p),c=side(k);ctx.beginPath();ctx.arc(x,y,s*2.2,0,Math.PI*2);if(p.occludedBy){ctx.strokeStyle=`rgb(${c})`;ctx.lineWidth=s;ctx.stroke();}else{ctx.fillStyle=`rgb(${c})`;ctx.fill();}}
  ctx.fillStyle='#fff';for(const k of ['wristL','wristR','ankleL','ankleR'])if(P[k]){const [x,y]=xy(P[k]);ctx.fillText(k.endsWith('L')?'L':'R',x+s*4,y);}
  const top=xy(P.headTop);ctx.fillStyle=label.color;ctx.textAlign='center';ctx.fillText(actor.name,top[0],top[1]-s*8);ctx.textAlign='left';
 }
}

// Light condition per person: which side faces the light, whether the camera sees the
// lit or the dark side, and which joints sit in another object's cast shadow.
export function lightingNotes({facts,lighting,labels}){
 if(!lighting?.position)return new Map();
 const toLight=new THREE.Vector3(...lighting.position).sub(new THREE.Vector3(...(lighting.target||[0,0,0]))).normalize();
 const cam=new THREE.Vector3(...facts.camera.position),ray=new THREE.Raycaster(),out=new Map();
 const meshOwner=new Map();for(const l of labels)if(l.kind==='person'||l.kind==='prop')for(const m of labelMeshes(l))meshOwner.set(m,l);const meshes=[...meshOwner.keys()];
 for(const actor of facts.actors){
  const self=labels.find(l=>l.kind==='person'&&l.id===actor.id);if(!self)continue;
  const forward=new THREE.Vector3(...actor.forward),flatL=toLight.clone().setY(0),flatF=forward.clone().setY(0);
  const facing=flatL.lengthSq()<.02||flatF.lengthSq()<.02?null:flatF.normalize().dot(flatL.normalize());
  const pelvis=new THREE.Vector3(...actor.points.pelvis.world),toCam=cam.clone().sub(pelvis).setY(0).normalize(),seen=flatL.lengthSq()<.02?null:toCam.dot(flatL.clone().normalize());
  const shadowed={};
  for(const key of ['head','chest','pelvis','wristL','wristR','kneeL','kneeR']){const p=actor.points[key];if(!p)continue;ray.set(new THREE.Vector3(...p.world),toLight);ray.far=40;const hit=ray.intersectObjects(meshes,false).find(h=>meshOwner.get(h.object)!==self&&h.distance>.02);if(hit)(shadowed[meshOwner.get(hit.object).name]??=[]).push(key);}
  const facingText=facing==null?'빛이 거의 바로 위에서 내려옴':facing>.5?'빛을 정면으로 받음(얼굴·가슴 쪽이 밝고 등은 어두움)':facing<-.5?'빛을 등지고 있음(등·뒤통수가 밝고 얼굴 쪽은 그늘)':'빛을 옆에서 받음(한쪽 옆면만 밝음)';
  const seenText=seen==null?'':seen>.3?'카메라는 빛을 받는 면을 봄':seen<-.3?'카메라는 그늘진 면을 봄(역광, 윤곽만 밝음)':'카메라는 밝은 면과 그늘의 경계를 봄';
  const JOINT={head:'머리',chest:'가슴',pelvis:'골반',wristL:'왼손',wristR:'오른손',kneeL:'왼무릎',kneeR:'오른무릎'};
  const shadowText=Object.entries(shadowed).map(([name,keys])=>`${keys.map(k=>JOINT[k]).join('·')}은 ${name}의 그림자 안`).join(', ');
  out.set(actor.id,{facingLight:facing==null?null:r2(facing),cameraSeesLitSide:seen==null?null:r2(seen),castShadowFrom:Object.fromEntries(Object.entries(shadowed)),text:[facingText,seenText,shadowText].filter(Boolean).join(' · ')});
 }
 return out;
}

function cameraFrameDirection(camera,world){const v=new THREE.Vector3(...world).transformDirection(camera.matrixWorldInverse);return v.toArray().map(r2);}
function lightDirectionText(d){const [x,y,z]=d,h=x>.3?'화면 오른쪽':x<-.3?'화면 왼쪽':'화면 가운데',v=y>.5?' 위':y<-.2?' 아래':'',f=z>.3?'카메라 쪽(순광)':z<-.3?'피사체 뒤쪽(역광)':'옆쪽';return `빛은 ${h}${v}, ${f}에서 들어옴`;}
const REF_SLUG={전신:'fullbody',얼굴:'face',의상:'costume',헤어:'hair',표정:'expression',소품:'prop',기타:'other'};
const safe=s=>String(s||'item').replace(/[^\w.-]+/g,'_').slice(0,48);
const ext=mime=>({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[mime]||'bin');

export function buildShotJson({shot,scene,camera,facts,description,labels,stats,range,lightNotes,references,objectNotes,width,height,lighting}){
 const toLight=new THREE.Vector3(...lighting.position).sub(new THREE.Vector3(...(lighting.target||[0,0,0]))).normalize().toArray(),camDir=cameraFrameDirection(camera,toLight);
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
  lighting:{type:'directional (sun-like, parallel rays)',positionWorld:lighting.position,targetWorld:lighting.target,directionToLightCamera:camDir,cameraFrame:'+x screen right, +y screen up, +z toward the viewer',text:lightDirectionText(camDir),color:lighting.color,intensity:lighting.intensity,ambient:lighting.ambient,
   lightPng:'direct light only: surface facing the light with nothing in between = white; turned away or in a cast shadow = black. Ambient light is excluded. Background is also black; use label.png to tell them apart.'},
  labels:entries,
  shotDescription:description?.text||'',
 };
 return {json,refFiles};
}
export function buildPrompt(json){
 const people=json.labels.filter(l=>l.kind==='person'),props=json.labels.filter(l=>l.kind==='prop');
 const line=l=>{const refs=l.references.length?l.references.map(r=>`${r.file}(${r.label}${r.note?': '+r.note:''})`).join(', '):'없음';return `- ${l.color} = ${l.name}${l.notes?.description?` — ${l.notes.description}`:''}\n  설정화: ${refs}${l.pose?.text?`\n  포즈: ${l.pose.text}`:''}${l.lightCondition?`\n  조명: ${l.lightCondition.text}`:''}${l.visible?'':'\n  (이 컷에서는 화면에 보이지 않음)'}`;};
 return [`# 컷 작화 지시 · ${json.scene.title} / ${json.shot.name}`,
 '첨부 파일은 하나의 컷을 같은 카메라에서 분해한 자료입니다. 구도·원근·인물 위치·포즈·가림·명암은 아래 파일을 그대로 따르고, 얼굴·머리·복식·화풍은 각 인물의 설정화를 따르세요.',
 '',
 '## 파일 읽는 법',
 '- label.png: 객체별 단색 영역. 색과 대상은 아래 목록 및 shot.json의 labels 참조. 검은색은 배경.',
 `- depth.png: 카메라에서의 거리. 흰색일수록 가깝고 어두울수록 멂(${json.depth.depthPng.nearM}m → ${json.depth.depthPng.farM}m). 검은색은 배경.`,
 '- light.png: 주광의 직사광만 표시. 흰색은 빛을 정면으로 받는 면, 검은색은 빛을 등진 면이나 다른 물체의 그림자. 이 명암과 그림자 위치를 최종 그림에 유지하세요.',
 '- pose.png: 인물별 관절 뼈대. 인물 기준 왼쪽 팔다리는 밝은 색, 오른쪽은 어두운 색이고 L/R 표시가 있음. 속이 빈 점과 점선은 다른 물체에 가려진 부위.',
 '- color.png: 무채색 마네킹 작업 렌더(구도 확인용). 마네킹의 형태·색을 그대로 그리지 마세요.',
 '- shot.json: 위 내용의 수치 정보(카메라, 거리, 화면 내 위치, 관절 좌표, 조명 방향).',
 '',
 `## 카메라와 조명`,`- 렌즈 약 ${json.camera.focal35mm}mm(35mm 환산), 카메라 높이 ${json.camera.heightM}m, 피치 ${json.camera.pitchDeg}°`,`- ${json.lighting.text}. 빛 색 ${json.lighting.color}.`,
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
