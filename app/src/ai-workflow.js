// Model calls are made by the local server, never by the browser or a third-party relay.
const STORAGE='cutscene-ai-last-job';
export function initAiWorkflow({host,importScene,buildShot,useWorkingCamera}){
  const doc=host.ownerDocument,section=doc.createElement('details');section.id='studio-ai';section.open=true;
  section.innerHTML=`<summary>소설 → 장면 → 이미지</summary>
    <label class="studio-label">소설 원문<textarea id="ai-story" maxlength="60000" placeholder="그림으로 만들 소설 장면을 넣으세요"></textarea></label>
    <label class="studio-label">인물 설정·연출 요청<textarea id="ai-notes" maxlength="6000" placeholder="외형, 복식, 분위기, 중요한 동작 등"></textarea></label>
    <details><summary>모델 연결 설정</summary>
      <label class="studio-label">장면 구성 방식<select id="ai-plan-provider"></select></label>
      <label class="studio-label">장면 모델<input id="ai-plan-model" maxlength="160" placeholder="CLI는 비우면 로그인 계정의 기본 모델"></label>
      <label class="studio-label">이미지 생성 방식<select id="ai-image-provider"></select></label>
      <label class="studio-label">이미지 요청 모델<input id="ai-image-model" maxlength="160" placeholder="CLI는 비우면 로그인 계정의 기본 모델"></label>
      <p class="studio-help" id="ai-connections"></p>
      <p class="studio-help">CLI는 로그인 계정의 사용량을 이용합니다. API는 서버의 기존 키를 사용하며 별도 요금이 발생할 수 있습니다. 원문과 촬영 참조는 선택한 제공자에게 전송됩니다.</p>
      <button class="btn" id="ai-refresh" type="button">연결 상태 새로고침</button>
    </details>
    <div class="studio-row"><button class="btn primary" id="ai-auto" type="button">한 번에 이미지까지</button><button class="btn" id="ai-plan" type="button">장면만 구성</button></div>
    <p class="studio-help">장면만 구성한 뒤 인물·포즈·카메라와 설정화를 수정하고 아래 버튼으로 이어서 생성하세요. 한 번에 생성은 첫 번째 추천 컷을 사용합니다.</p>
    <label class="studio-check"><input type="checkbox" id="ai-working-camera" checked>수정한 현재 작업 시점으로 촬영</label>
    <div class="studio-row"><button class="btn" id="ai-image" type="button">현재 구도로 이미지 생성</button><button class="btn" id="ai-cancel" type="button" disabled>취소</button></div>
    <p id="ai-status" class="studio-help" role="status" aria-live="polite">연결 상태 확인 중…</p>
    <div id="ai-result" hidden><img id="ai-result-image" alt="생성된 컷신 이미지"><p class="studio-help" id="ai-result-caption"></p><a id="ai-download" class="btn" download>이미지 저장</a><button class="btn" id="ai-restore-plan" type="button" hidden>완료된 장면 불러오기</button></div>`;
  host.prepend(section);
  const $=id=>section.querySelector('#'+id);
  let providers=[],busy=false,currentId=null,controller=null,lastScene=null;
  const say=(text,error=false)=>{$('ai-status').textContent=text;$('ai-status').classList.toggle('error',error);};
  const setBusy=value=>{busy=value;for(const id of ['ai-auto','ai-plan','ai-image','ai-refresh','ai-restore-plan','ai-plan-provider','ai-image-provider','ai-plan-model','ai-image-model','ai-story','ai-notes','ai-working-camera'])$(id).disabled=value;$('ai-cancel').disabled=!value;section.setAttribute('aria-busy',String(value));};
  const choice=operation=>({provider:$(`ai-${operation}-provider`).value,model:$(`ai-${operation}-model`).value.trim()});
  const check=operation=>{const selection=choice(operation),provider=providers.find(p=>p.id===selection.provider);if(!provider?.[operation])throw Error(provider?.reason||'연결 상태를 확인하세요.');return selection;};
  async function request(url,options={}){
    const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers}});
    let body;try{body=await response.json();}catch{throw Error('생성 서버에 연결하지 못했습니다. start.cmd 또는 최신 개발 서버로 실행하세요.');}
    if(!response.ok)throw Error(body.error||'생성 서버 요청에 실패했습니다.');return body;
  }
  function connectionText(){
    $('ai-connections').textContent=providers.map(p=>`${p.name}${p.version?' ('+p.version+')':''}: ${p.reason}`).join('\n');
  }
  async function refresh(){
    try{
      const data=await request('/api/ai/capabilities');providers=data.providers;
      for(const operation of ['plan','image']){
        const select=$(`ai-${operation}-provider`),previous=select.value;select.replaceChildren();
        for(const p of providers){const option=doc.createElement('option');option.value=p.id;option.textContent=p.name+(p[operation]?'':' · 설정 필요');select.append(option);}
        select.value=previous||'codex-cli';
      }
      connectionText();say('원문을 넣고 한 번에 생성하거나, 장면만 구성해 구도를 수정하세요.');
    }catch(error){say(error.message,true);}
  }
  for(const operation of ['plan','image'])$(`ai-${operation}-provider`).onchange=()=>{
    const selected=providers.find(p=>p.id===choice(operation).provider);$(`ai-${operation}-model`).value=selected?.models?.[operation]||'';connectionText();
  };
  function remember(id){try{localStorage.setItem(STORAGE,id);}catch{}}
  async function poll(id){
    currentId=id;remember(id);
    for(;;){
      controller?.signal.throwIfAborted();const job=await request(`/api/ai/jobs/${id}`,{signal:controller?.signal});
      if(job.status==='completed'){currentId=null;return job;}
      if(job.status==='failed'||job.status==='cancelled'){currentId=null;throw Error(job.error||'작업을 완료하지 못했습니다.');}
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
  }
  async function runJob(input){
    controller.signal.throwIfAborted();
    // Do not abort POST: preserve the returned ID even when Cancel is clicked in flight.
    const job=await request('/api/ai/jobs',{method:'POST',body:JSON.stringify(input)});
    if(controller.signal.aborted){await request(`/api/ai/jobs/${job.id}`,{method:'DELETE'});throw Error('작업을 취소했습니다.');}
    return poll(job.id);
  }
  function showImage(job){
    $('ai-result').hidden=false;$('ai-result-image').hidden=false;$('ai-result-image').src=job.result.imageUrl;
    $('ai-download').hidden=false;$('ai-download').href=job.result.imageUrl;$('ai-download').download=job.result.filename;
    $('ai-result-caption').textContent=`${job.provider} · ${new Date(job.createdAt).toLocaleString()} · 생성 당시 구도 기준`;
    $('ai-restore-plan').hidden=true;
  }
  async function plan(){
    const story=$('ai-story').value.trim();if(!story)throw Error('소설 원문을 입력하세요.');
    const selection=check('plan');say('1/3 · 소설에서 인물·공간·카메라를 구성하는 중…');
    const job=await runJob({operation:'plan',...selection,story,notes:$('ai-notes').value});lastScene=job.result.scene;
    controller.signal.throwIfAborted();
    if(!await importScene(JSON.stringify(lastScene)))throw Error('생성된 장면을 적용하지 못했습니다. 검사 보고서를 확인하세요.');
    $('ai-restore-plan').hidden=true;return job;
  }
  const dataUrl=(data,mime='image/png')=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('촬영 참조를 읽지 못했습니다.'));reader.readAsDataURL(new Blob([data],{type:mime}));});
  async function generate({working=true}={}){
    const selection=check('image');say('2/3 · 현재 구도·포즈·조명과 설정화를 촬영하는 중…');
    if(working&&$('ai-working-camera').checked)useWorkingCamera();
    const shot=await buildShot();controller.signal.throwIfAborted();
    const images=[];for(const name of ['color.png','label.png','depth.png','light.png','pose.png'])images.push({name,dataUrl:await dataUrl(shot.images[name])});
    for(const ref of shot.refFiles)images.push({name:ref.name,dataUrl:ref.dataUrl});
    if(images.length>20)throw Error('참조 이미지가 너무 많습니다. 인물·소품 설정화를 합계 15장 이하로 정리하세요.');
    say('3/3 · 최종 이미지를 생성하는 중… 최대 10분 정도 걸릴 수 있습니다.');
    // The planner may keep appearance out of a neutral mannequin proposal. Carry
    // the user's current character/direction notes directly into the art request.
    const notes=$('ai-notes').value.trim();
    const prompt=shot.prompt+(notes?'\n\n사용자가 입력한 인물 설정·연출 요청 (현재 값):\n'+notes+'\n외형·복식·화풍은 이 설정을 반영하고, 위치·포즈·카메라 구도는 첨부한 현재 장면을 유지하세요.':'');
    const job=await runJob({operation:'image',...selection,prompt,shot:shot.json,images});
    showImage(job);say('이미지가 완성됐습니다. 구도를 더 수정한 뒤 다시 생성할 수 있습니다.');
  }
  async function perform(action){
    if(busy)return;setBusy(true);controller=new AbortController();
    try{await action();}catch(error){say(error.name==='AbortError'?'작업을 취소했습니다. 현재 장면은 계속 편집할 수 있습니다.':error.message,true);}
    finally{currentId=null;setBusy(false);}
  }
  $('ai-auto').onclick=()=>perform(async()=>{check('plan');check('image');await plan();await generate({working:false});});
  $('ai-plan').onclick=()=>perform(async()=>{await plan();say('장면을 구성했습니다. 구도·포즈·설정화를 수정하고 현재 구도로 이미지 생성을 누르세요.');});
  $('ai-image').onclick=()=>perform(()=>generate());
  $('ai-refresh').onclick=refresh;
  $('ai-cancel').onclick=async()=>{
    controller?.abort();$('ai-cancel').disabled=true;say('취소 요청 중…');
    if(currentId)try{await request(`/api/ai/jobs/${currentId}`,{method:'DELETE'});}catch(error){say(error.message,true);}
  };
  $('ai-restore-plan').onclick=()=>perform(async()=>{if(lastScene&&await importScene(JSON.stringify(lastScene)))say('완료된 장면을 불러왔습니다. 구도를 수정하고 이어서 생성하세요.');});
  async function restore(){
    let id;try{id=localStorage.getItem(STORAGE);}catch{}if(!/^[a-f0-9-]{36}$/.test(id||''))return;
    await perform(async()=>{
      say('최근 생성 작업 확인 중…');const job=await poll(id);
      if(job.operation==='image'){showImage(job);say('최근 생성 이미지를 불러왔습니다.');}
      else{lastScene=job.result.scene;$('ai-result').hidden=false;$('ai-result-image').hidden=true;$('ai-download').hidden=true;$('ai-restore-plan').hidden=false;$('ai-result-caption').textContent='이전에 생성한 장면이 있습니다. 불러오면 현재 편집 장면을 교체합니다.';say('이전에 구성한 장면을 불러올 수 있습니다.');}
    });
  }
  refresh().then(restore);
  return {section};
}
