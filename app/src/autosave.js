// Cutscene Studio additions, 2026-11-11. Distributed under GPL-3.0.
// Autosave: the latest editor state (with character sheets, which live outside undo
// history) is kept in IndexedDB after real changes, so a crash or a closed tab does
// not lose work. Opening the app never overwrites the previous session's copy: nothing
// is written until the user changes something, and a banner offers to restore it.
const DB='cutscene-studio-autosave',STORE='state',KEY='last';

function openDb(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
    request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);
  });
}
function run(mode,work){
  return openDb().then(db=>new Promise((resolve,reject)=>{
    const t=db.transaction(STORE,mode),request=work(t.objectStore(STORE));
    t.oncomplete=()=>{db.close();resolve(request?.result);};t.onerror=()=>{db.close();reject(t.error);};t.onabort=()=>{db.close();reject(t.error||Error('자동 저장이 취소되었습니다.'));};
  }));
}
export const readAutosave=()=>run('readonly',s=>s.get(KEY)).then(v=>v||null);
export const writeAutosave=record=>run('readwrite',s=>s.put(record,KEY));
export const clearAutosave=()=>run('readwrite',s=>s.delete(KEY));

const when=t=>new Date(t).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});

// snapshot(): the state to keep (plain object, already including characterReferences).
// restore(state): applies a kept state; returns a promise.
export function installAutosave({snapshot,restore,delay=1500}){
  let dirty=false,timer=null,saving=Promise.resolve(),failed=false;
  const status=document.createElement('div');status.id='autosave-banner';status.hidden=true;document.body.appendChild(status);
  const show=(html,buttons=[])=>{status.innerHTML=html;for(const [id,label,fn]of buttons){const b=document.createElement('button');b.className='btn';b.id=id;b.textContent=label;b.onclick=fn;status.appendChild(b);}status.hidden=false;};
  const write=()=>{timer=null;saving=saving.then(()=>writeAutosave({savedAt:Date.now(),json:JSON.stringify(snapshot())})).then(()=>{failed=false;},error=>{if(!failed)console.warn('자동 저장 실패',error);failed=true;});};
  function changed(){dirty=true;clearTimeout(timer);timer=setTimeout(write,delay);}
  // The file on disk now matches the editor (Save, or a project just loaded).
  function markSaved(){dirty=false;}
  addEventListener('beforeunload',event=>{if(timer){clearTimeout(timer);write();}if(!dirty)return;event.preventDefault();event.returnValue='';});
  readAutosave().then(record=>{
    if(!record?.json)return;
    show(`<span>저장하지 않은 이전 작업이 있습니다 (${when(record.savedAt)}).</span>`,[
      ['autosave-restore','복원',async()=>{status.hidden=true;try{await restore(JSON.parse(record.json));dirty=true;}catch(error){show('<span>이전 작업을 복원하지 못했습니다: '+String(error.message).replace(/[<&]/g,'')+'</span>',[['autosave-close','닫기',()=>{status.hidden=true;}]]);}}],
      ['autosave-dismiss','버리기',()=>{status.hidden=true;clearAutosave().catch(()=>{});}],
    ]);
  }).catch(error=>console.warn('자동 저장을 읽지 못했습니다',error));
  return {changed,markSaved,flush:()=>{if(timer){clearTimeout(timer);write();}return saving;},get dirty(){return dirty;}};
}
