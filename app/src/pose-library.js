import * as THREE from 'three';
import {POSES} from './scene-format.js';
import {constrainBody,snapshotBodyJoints} from './body-rig.js';
import {STARTER_POSES} from './starter-poses.js';
import {openPoseStore} from './pose-store.js';
import {installImageReferences} from './image-references.js';

import {POSE_NAMES,readReferencePoses} from './pose-format.js';
export {readReferencePoses} from './pose-format.js';
function footY(m){m.updateMatrixWorld(true);return Math.min(new THREE.Box3().setFromObject(m.l_ankle).min.y,new THREE.Box3().setFromObject(m.r_ankle).min.y);}
export function applyReferencePose(m,reference,ground=true){
  if(!m?.torso)throw Error('포즈를 적용할 인물을 선택하세요.');
  // Verify every source key before touching the target model.
  const allowed=snapshotBodyJoints(m);
  if(reference.kind==='rotations')for(const key of Object.keys(reference.rotations))if(!Object.hasOwn(allowed,key))throw Error('이 인물에 없는 관절입니다: '+key);
  const before=footY(m),saved=Object.fromEntries(Object.entries(snapshotBodyJoints(m)).map(([key,j])=>[key,j.rotation]));
  const position=m.position.clone();
  try{
    for(const [key,q]of m.userData.bodyBase.rotations)m[key].quaternion.copy(q);
    if(reference.kind==='rotations')for(const [key,r]of Object.entries(reference.rotations))m[key].rotation.fromArray(r.length===3?[...r,'XYZ']:r);
    else {for(const source of [POSES[reference.pose],reference.joints])for(const [key,values]of Object.entries(source||{}))for(const [prop,v]of Object.entries(values))m[key][prop]=v;}
    constrainBody(m);if(ground)m.position.y+=before-footY(m);m.updateMatrixWorld(true);
  }catch(error){m.position.copy(position);for(const [key,r]of Object.entries(saved))m[key].rotation.fromArray(r);constrainBody(m);throw error;}
}
export function exportReferencePose(m){
  if(!m?.torso)throw Error('저장할 인물을 선택하세요.');constrainBody(m);
  return {type:'pose-reference',version:1,name:(m.name||'인물')+' 포즈',rotationUnit:'radians',rotations:Object.fromEntries(Object.entries(snapshotBodyJoints(m)).map(([key,j])=>[key,j.rotation]))};
}
export function poseFingerprint(pose){
  return JSON.stringify(Object.entries(pose.rotations).sort(([a],[b])=>a.localeCompare(b)).map(([key,r])=>{const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...r.slice(0,3),r[3]||'XYZ'));const sign=q.w<0?-1:1;return [key,...q.toArray().map(v=>Math.round(v*sign*1000))];}));
}
const fingerprint=poseFingerprint;
export function installPoseLibrary(editor,api){
  editor.poseSlot.innerHTML=`<select id="quick-pose" aria-label="기본 포즈">${Object.entries(POSE_NAMES).map(([k,n])=>`<option value="${k}">${n}</option>`).join('')}</select><button class="btn" id="quick-pose-apply">포즈 적용</button><label class="btn">포즈 JSON 불러오기<input id="pose-reference-file" type="file" accept=".json" hidden></label><button class="btn" id="pose-reference-save">포즈 저장</button><label class="pose-ground"><input id="pose-ground" type="checkbox" checked>발 높이 유지</label>`;
  const run=fn=>{try{fn();}catch(error){editor.status(error.message);}};
  let store,records=[],ready=false;
  const known=new Set();let auto=true;try{auto=localStorage.getItem('pose-auto-record')!=='false';}catch{}
  const apply=(reference,record,{groundVolume=false,referenceView=null}={})=>{editor.cancel();const model=api.getSelection(),ground=document.getElementById('pose-ground').checked,floor=ground&&groundVolume&&model?.torso?footY(model):null;applyReferencePose(model,reference,ground&&!groundVolume);
    if(floor!==null){model.updateMatrixWorld(true);model.position.y+=floor-new THREE.Box3().setFromObject(model).min.y;model.updateMatrixWorld(true);}
    if(record){record.fingerprint=fingerprint(exportReferencePose(api.getSelection()));known.add(record.fingerprint);record.thumbnail=api.thumbnail();store?.put(record).catch(error=>editor.status('저장 실패: '+error.message));render();}
    editor.setMode('pose');api.afterApply?.(referenceView);api.refresh();api.commit();editor.status('선택한 인물에 「'+reference.name+'」 포즈를 적용했습니다. 체형·수평 위치를 유지합니다.');};
  document.getElementById('quick-pose-apply').onclick=()=>run(()=>{const pose=document.getElementById('quick-pose').value;apply({name:POSE_NAMES[pose],kind:'semantic',pose,joints:{}});});
  const dialog=document.createElement('dialog');dialog.id='pose-source-dialog';dialog.innerHTML='<h3>가져올 포즈의 인물을 고르세요</h3><select id="pose-source-select" aria-label="참조 인물"></select><div><button class="btn primary" id="pose-source-apply">선택 인물에 적용</button><button class="btn" id="pose-source-cancel">취소</button></div>';document.body.appendChild(dialog);
  let candidates=[];
  document.getElementById('pose-source-cancel').onclick=()=>dialog.close();
  document.getElementById('pose-source-apply').onclick=()=>run(()=>{apply(candidates[Number(document.getElementById('pose-source-select').value)]);dialog.close();});
  document.getElementById('pose-reference-file').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    try{if(file.size>5_000_000)throw Error('포즈 JSON은 5MB 이하로 넣어주세요.');candidates=readReferencePoses(await file.text());
      if(candidates.length===1)apply(candidates[0]);else{const select=document.getElementById('pose-source-select');select.replaceChildren();candidates.forEach((ref,i)=>{const o=document.createElement('option');o.value=i;o.textContent=ref.name;select.appendChild(o);});dialog.showModal();}
    }catch(error){editor.status(error.message);}finally{event.target.value='';}
  };
  document.getElementById('pose-reference-save').onclick=()=>run(()=>{
    const data=exportReferencePose(api.getSelection()),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='cutscene-pose.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);editor.status('포즈를 저장했습니다. 다른 인물을 고른 뒤 같은 파일을 불러올 수 있습니다.');
  });
  const button=document.createElement('button');button.id='pose-library-open';button.className='btn primary';button.textContent='내 포즈';editor.poseSlot.prepend(button);
  const panel=document.createElement('section');panel.id='pose-library-panel';panel.className='glass-panel';panel.hidden=true;
  panel.innerHTML='<div class="pose-library-heading"><h3>내 포즈 라이브러리</h3><button class="btn" id="pose-library-close">닫기</button></div><p>카드를 누르면 선택 인물에 적용합니다. 체형은 그대로 유지됩니다.</p><div class="pose-library-tools"><input id="pose-library-name" placeholder="저장할 포즈 이름" maxlength="100"><button class="btn primary" id="pose-library-record">현재 포즈 담기</button><label><input id="pose-auto-record" type="checkbox"> 작업 포즈 자동 모음</label></div><p class="body-hint">관절 자세가 바뀐 작업만 중복 없이 기록합니다. 이 브라우저에 보관되므로 정기적으로 백업하세요.</p><div class="pose-library-tools"><button class="btn" id="pose-library-backup">라이브러리 백업</button><label class="btn">백업 가져오기<input id="pose-library-restore" type="file" accept=".json" hidden></label></div><div id="pose-library-grid"></div><output id="pose-library-status"></output>';
  document.getElementById('app').appendChild(panel);
  const search=document.createElement('input');search.id='pose-library-search';search.placeholder='포즈 이름 검색';search.setAttribute('aria-label','포즈 이름 검색');panel.querySelector('.pose-library-tools').prepend(search);search.oninput=render;
  button.onclick=()=>{panel.hidden=!panel.hidden;render();};document.getElementById('pose-library-close').onclick=()=>panel.hidden=true;
  const autoInput=document.getElementById('pose-auto-record');autoInput.checked=auto;autoInput.onchange=()=>{auto=autoInput.checked;try{localStorage.setItem('pose-auto-record',String(auto));}catch{}};
  function render(){
    const grid=document.getElementById('pose-library-grid');grid.replaceChildren();
    const starterOrder=new Map(STARTER_POSES.map((r,i)=>[r.id,i]));
    const visible=records.filter(r=>r.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())).sort((a,b)=>{
      const ai=starterOrder.get(a.id),bi=starterOrder.get(b.id);if(ai!==undefined&&bi!==undefined)return ai-bi;if(ai!==undefined)return 1;if(bi!==undefined)return -1;return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    for(const record of visible){
      const card=document.createElement('div');card.className='pose-card';card.dataset.poseId=record.id;
      const applyBtn=document.createElement('button');applyBtn.className='pose-card-apply';applyBtn.title=record.name+' 적용';
      if(record.thumbnail){const img=document.createElement('img');img.src=record.thumbnail;img.alt=record.name;applyBtn.appendChild(img);}
      const label=document.createElement('span');label.textContent=record.name;applyBtn.appendChild(label);
      applyBtn.onclick=()=>run(()=>{apply({...readReferencePoses(JSON.stringify(record.pose))[0],name:record.name},record);panel.hidden=true;});
      const remove=document.createElement('button');remove.className='pose-card-remove';remove.textContent='삭제';remove.setAttribute('aria-label',record.name+' 삭제');remove.onclick=async()=>{try{await store.remove(record.id);records=records.filter(r=>r.id!==record.id);if(record.fingerprint)known.delete(record.fingerprint);render();}catch(e){editor.status(e.message);}};
      card.append(applyBtn,remove);grid.appendChild(card);
    }
    document.getElementById('pose-library-status').textContent=ready?records.length+'개 · 브라우저 로컬 보관':'라이브러리 여는 중…';
  }
  async function recordCurrent(manual=false,reference=null){
    if(!ready||(!manual&&!auto)||!api.getSelection()?.torso)return;
    const pose=exportReferencePose(api.getSelection()),key=fingerprint(pose);
    if(known.has(key)){
      if(manual){const existing=records.find(r=>r.fingerprint===key),name=document.getElementById('pose-library-name').value.trim();if(existing&&name){existing.name=name;if(reference)existing.reference=reference;await store.put(existing);render();editor.status('저장된 포즈 이름을 「'+name+'」으로 바꿨습니다.');}else editor.status('같은 포즈가 이미 라이브러리에 있습니다. 이름을 입력해 정리할 수 있습니다.');}
      return;
    }
    known.add(key);
    const name=manual?(document.getElementById('pose-library-name').value.trim()||pose.name):'작업 포즈 '+new Date().toLocaleString('ko-KR');
    const record={id:crypto.randomUUID(),name,source:manual?'user-saved':'auto-recorded',pose,fingerprint:key,thumbnail:api.thumbnail(),createdAt:new Date().toISOString(),...(reference?{reference}:{})};
    try{await store.put(record);records.push(record);if(!panel.hidden)render();if(manual)editor.status('라이브러리에 「'+name+'」을 저장했습니다.');}
    catch(error){known.delete(key);editor.status('포즈 저장 실패. 포즈 JSON 저장으로 보관하세요: '+error.message);}
  }
  document.getElementById('pose-library-record').onclick=()=>recordCurrent(true).catch(e=>editor.status(e.message));
  document.getElementById('pose-library-backup').onclick=()=>run(()=>{
    if(!ready)throw Error('라이브러리를 여는 중입니다.');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({type:'pose-library',version:1,poses:records},null,2)],{type:'application/json'}));a.href=url;a.download='cutscene-pose-library.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  document.getElementById('pose-library-restore').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(!ready)throw Error('라이브러리를 여는 중입니다.');if(file.size>50_000_000)throw Error('라이브러리 백업은 50MB 이하로 넣어주세요.');
      const data=JSON.parse(await file.text());if(data.type!=='pose-library'||data.version!==1||!Array.isArray(data.poses)||data.poses.length>2000)throw Error('지원하는 라이브러리 백업이 아닙니다.');
      const imported=data.poses.map(r=>{if(!r||typeof r.id!=='string'||!r.id.length||typeof r.name!=='string'||r.name.length>200||r.id.length>100)throw Error('잘못된 포즈 정보입니다.');readReferencePoses(JSON.stringify(r.pose));if(r.thumbnail&&!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(r.thumbnail)&&!/^\/pose-library\/[a-z0-9-]+\.png$/.test(r.thumbnail))throw Error('지원하지 않는 썸네일입니다.');
        const reference=r.reference?.collection==='drive-image-reference'&&/^POSE-\d{4}(-VAR\d+)?$/.test(r.reference.poseId)?{collection:'drive-image-reference',poseId:r.reference.poseId}:null;
        return {id:r.id,name:r.name,pose:r.pose,thumbnail:r.thumbnail||'',source:'restored',createdAt:r.createdAt||'',fingerprint:r.pose.type==='pose-reference'?fingerprint(r.pose):undefined,...(reference?{reference}:{})};});
      await store.putMany(imported);records=await store.all();known.clear();records.forEach(r=>r.fingerprint&&known.add(r.fingerprint));render();editor.status(imported.length+'개 포즈를 복원했습니다.');
    }catch(error){editor.status('백업을 적용하지 못했습니다: '+error.message);}finally{e.target.value='';}
  };
  openPoseStore().then(async db=>{store=db;records=await store.all();let seeded=false;try{seeded=localStorage.getItem('pose-starters-seeded')==='true';}catch{}if(!records.length&&!seeded){records=structuredClone(STARTER_POSES);await store.putMany(records);}try{localStorage.setItem('pose-starters-seeded','true');}catch{}records.forEach(r=>r.fingerprint&&known.add(r.fingerprint));ready=true;render();}).catch(error=>{editor.status('브라우저 저장소를 열지 못했습니다. 포즈 JSON 저장을 이용하세요: '+error.message);});
  installImageReferences(editor,{applyConverted:(pose,referenceView)=>{const references=readReferencePoses(JSON.stringify(pose));if(references.length!==1)throw Error('단일 변환 포즈가 필요합니다.');apply(references[0],null,{groundVolume:true,referenceView});},saveLinked:async(name,reference)=>{if(!ready)throw Error('라이브러리를 여는 중입니다.');if(!api.getSelection()?.torso)throw Error('먼저 저장할 인물을 선택하세요.');document.getElementById('pose-library-name').value=name;await recordCurrent(true,reference);}});
  return {recordCurrent:()=>recordCurrent().catch(error=>editor.status(error.message))};
}
