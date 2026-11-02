export function openPoseStore(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('cutscene-studio-poses',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('poses',{keyPath:'id'});
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;
      function tx(mode,work){return new Promise((done,fail)=>{const t=db.transaction('poses',mode),store=t.objectStore('poses');let result;try{result=work(store);}catch(e){t.abort();fail(e);return;}t.oncomplete=()=>done(result?.result);t.onerror=()=>fail(t.error);t.onabort=()=>fail(t.error||Error('포즈 저장이 취소되었습니다.'));});}
      resolve({all:()=>tx('readonly',s=>s.getAll()),put:record=>tx('readwrite',s=>s.put(record)),putMany:records=>tx('readwrite',s=>{records.forEach(r=>s.put(r));}),remove:id=>tx('readwrite',s=>s.delete(id))});
    };
  });
}
