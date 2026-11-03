import {GALLERY_P015} from './doll-profiles.js';

// The selected source stays on the user's machine. It is not bundled, copied
// into the public directory, or included in pose/PNG exports.
export function installDollReference({study,onChange}){
 const image=document.getElementById('reference-image'),overlay=document.getElementById('overlay-image'),note=document.getElementById('reference-note'),input=document.getElementById('reference-file');let ready=image.complete&&image.naturalWidth>0,objectUrl;
 const state={poseName:study?'gallery-p015':'reference',get ready(){return ready;}};
 image.onload=()=>{ready=true;image.hidden=false;onChange?.();};image.onerror=()=>{ready=false;image.hidden=true;if(study)note.textContent='P015 로컬 PNG를 선택하면 같은 프레임에서 비교할 수 있습니다.';onChange?.();};
 if(!study)return state;
 document.title='갤러리 P015 · 전신 3D / 2.5D';document.querySelector('h1').textContent='갤러리 P015 · 콘트라포스토 비교';document.querySelector('header > p').textContent='표준 전신 P015 한 장을 기준으로 자세와 체형을 맞춘 시안입니다. 골반·다리의 숨은 깊이는 3D 설계 추정입니다.';
 document.getElementById('reference-title').textContent='AI Pose Gallery · P015 · 900 × 1200';note.textContent='한 손을 허리에 둔 표준 전신. 원본은 로컬 참고용이며 내보내는 PNG에는 포함되지 않습니다.';input.hidden=false;
 const link=document.createElement('a');link.href=GALLERY_P015.imageUrl;link.target='_blank';link.rel='noopener';link.textContent='공식 P015 원본 열기';note.after(link);
 const option=document.createElement('option');option.value=GALLERY_P015.id;option.textContent='P015 · 한 손 허리';document.getElementById('pose').prepend(option);document.querySelector('#pose option[value="reference"]').hidden=true;
 input.onchange=async()=>{try{const file=input.files[0];if(!file)return;const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer()),hash=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==GALLERY_P015.sha256)throw Error('선택한 파일이 공식 P015 정면 원본과 다릅니다.');if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);ready=false;image.src=overlay.src=objectUrl;note.textContent='선택한 P015 로컬 원본과 비교 중 · 원본 이미지는 저장/내보내기에 포함되지 않습니다.';}catch(e){note.textContent=e.message;}};
 ready=false;if(location.hostname==='127.0.0.1'||location.hostname==='localhost'){image.src=overlay.src=GALLERY_P015.localReference;}else{image.removeAttribute('src');overlay.removeAttribute('src');image.hidden=true;note.textContent='공식 P015 PNG를 로컬에서 선택해 비교하세요.';}
 return state;
}
