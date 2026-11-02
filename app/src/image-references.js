export function installImageReferences(editor,api){
  const root='/local-pose-references/',button=document.createElement('button');button.id='image-references-open';button.className='btn';button.textContent='이미지 레퍼런스';editor.poseSlot.appendChild(button);
  const panel=document.createElement('section');panel.id='image-references-panel';panel.className='glass-panel';panel.hidden=true;
  panel.innerHTML='<div class="pose-library-heading"><h3>이미지 레퍼런스</h3><button class="btn" id="image-references-close">닫기</button></div><p>2D 자세·시점 참고 자료입니다. 카드를 선택해 옆에 띄우고 3D 포즈를 조정하세요.</p><div class="pose-library-tools"><input id="image-references-search" placeholder="번호 · 자세 · 장면 검색" aria-label="이미지 포즈 검색"><select id="image-references-category" aria-label="포즈 분류"><option value="">전체 분류</option></select></div><output id="image-references-status"></output><div id="image-references-grid"></div><div class="pose-library-tools"><button class="btn" id="image-references-prev">이전</button><button class="btn" id="image-references-next">다음</button></div>';
  panel.querySelector('p').textContent='카드를 누르면 선택 인물에 적용합니다. 원본 대조 보정본과 검수 전 추정을 구분했습니다. 미해결 포즈는 별도 목록에서 확인하세요.';
  const pinned=document.createElement('aside');pinned.id='image-reference-pinned';pinned.className='glass-panel';pinned.hidden=true;
  pinned.innerHTML='<button class="btn" id="image-reference-hide">닫기</button><h4></h4><img alt="선택한 포즈 이미지"><p></p><button class="btn" id="image-reference-link">현재 3D 자세를 연결해 저장</button><small>이미지를 자동 변환하지 않습니다. 직접 맞춘 현재 관절을 저장합니다.</small>';
  pinned.querySelector('small').textContent='보정본도 단일 이미지의 근사 자세입니다. 직접 조정한 현재 관절을 원본 번호에 연결해 저장할 수 있습니다.';
  document.getElementById('app').append(panel,pinned);
  const $=id=>document.getElementById(id),search=$('image-references-search'),category=$('image-references-category'),status=$('image-references-status'),grid=$('image-references-grid');
  let catalog=null,loading=null,page=0,selected=null;const size=36;
  const qualityFilter=document.createElement('select');qualityFilter.id='image-references-quality';qualityFilter.setAttribute('aria-label','변환 품질');qualityFilter.innerHTML='<option value="usable">바로 적용 가능</option><option value="reviewed">원본 대조 · 보정본</option><option value="estimated">일반 추정 · 검수 전</option><option value="unresolved">미해결 · 수동 확인</option><option value="">전체 품질</option>';category.after(qualityFilter);qualityFilter.onchange=()=>{page=0;render();};
  const applyButton=document.createElement('button');applyButton.id='image-reference-apply';applyButton.className='btn primary';applyButton.textContent='추정 3D 포즈 적용';applyButton.hidden=true;pinned.querySelector('#image-reference-link').before(applyButton);
  const convertedCache=new Map();
  async function applyConverted(record){
    applyButton.disabled=true;document.getElementById('image-reference-link').disabled=true;
    try{
      let result=convertedCache.get(record.id);if(!result){const response=await fetch(root+record.conversion.file);if(!response.ok)throw Error('변환 포즈 파일을 열지 못했습니다.');result=await response.json();if(result.source?.imageSha256!==record.sha256||result.source?.poseId!==record.id)throw Error('원본 이미지와 변환 포즈가 일치하지 않습니다.');convertedCache.set(record.id,result);}
      if(selected!==record)return;api.applyConverted(result.pose,{direction:result.previewDirection,up:result.previewUp});editor.status(record.id+' 포즈 적용 · '+qualityLabel(record)+' · 가려진 깊이와 접촉은 확인하세요.');
    }catch(error){editor.status('3D 포즈를 적용하지 못했습니다: '+error.message);}
    finally{if(selected===record){applyButton.disabled=false;document.getElementById('image-reference-link').disabled=false;}}
  }
  applyButton.onclick=()=>selected?.conversion&&applyConverted(selected);
  const qualityLabel=record=>record.conversion?.status==='reviewed'?'원본 대조 보정':record.conversion?.status==='unresolved'?'미해결 초안':record.conversion?.status==='needs-correction'?'보정 필요':'검수 전 추정';
  const usable=record=>!['unresolved','needs-correction'].includes(record.conversion?.status);
  const normalize=text=>text.toLocaleLowerCase().replace(/\s/g,'');
  function render(){
    if(!catalog)return;const terms=normalize(search.value).split(/[,+]/).filter(Boolean);
    const concepts=Object.entries(catalog.aliases||{}).filter(([,aliases])=>aliases.some(a=>terms.some(t=>t.includes(normalize(a))))).map(([key])=>key);
    const matches=catalog.poses.filter(r=>(!category.value||r.name===category.value)&&(!qualityFilter.value||(qualityFilter.value==='usable'?usable(r):r.conversion?.status===qualityFilter.value))&&(!terms.length||terms.every(t=>normalize([r.id,r.name,r.summary,...r.tags,...r.concepts,...r.scenes].join(' ')).includes(t))||concepts.some(c=>[...r.concepts,...r.scenes].includes(c))));
    const pages=Math.max(1,Math.ceil(matches.length/size));page=Math.min(page,pages-1);grid.replaceChildren();
    for(const record of matches.slice(page*size,(page+1)*size)){
      const card=document.createElement('button');card.className='image-reference-card';card.dataset.referenceId=record.id;
      const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.src=root+record.image.split('/').map(encodeURIComponent).join('/');img.alt=record.id+' '+record.summary;
      const label=document.createElement('span');label.textContent=record.id+' · '+record.name;const text=document.createElement('small');text.textContent=record.summary+(record.conversion?' · '+qualityLabel(record):' · 이미지 참조');card.append(img,label,text);
      card.onclick=()=>{selected=record;pinned.querySelector('h4').textContent=record.id+' · '+record.name;pinned.querySelector('img').src=img.src;pinned.querySelector('p').textContent=record.summary+(record.conversion?.reviewReason?' · '+record.conversion.reviewReason:'')+(record.note?' · '+record.note:'');pinned.hidden=false;panel.hidden=true;editor.setMode('pose');applyButton.hidden=!record.conversion;applyButton.textContent=usable(record)?'3D 포즈 다시 적용':'미해결 초안 직접 적용';if(record.conversion&&usable(record))applyConverted(record);else if(record.conversion)editor.status(record.id+' 미해결: '+(record.conversion.reviewReason||'원본과 큰 관절 차이가 남았습니다.')+' · 초안을 쓰려면 직접 적용 버튼을 누르세요.');else editor.status('2D 이미지를 참고해 관절을 조정한 뒤 현재 3D 자세를 연결해 저장하세요.');};grid.appendChild(card);
    }
    status.textContent='등록 '+catalog.poses.length+'개 · 보정 '+catalog.poses.filter(r=>r.conversion?.status==='reviewed').length+'개 · 미해결 '+catalog.poses.filter(r=>r.conversion?.status==='unresolved').length+'개 · 검색 '+matches.length+'개 · '+(page+1)+' / '+pages+'쪽';$('image-references-prev').disabled=page===0;$('image-references-next').disabled=page+1===pages;
  }
  button.onclick=async()=>{panel.hidden=!panel.hidden;if(panel.hidden)return;try{if(!catalog){loading ||= fetch(root+'catalog.json').then(async r=>{if(!r.ok)throw Error('로컬 레퍼런스 자료가 없습니다. docs/IMAGE_REFERENCES.md의 등록 절차를 확인하세요.');const data=await r.json();if(data.kind!=='image-reference'||!Array.isArray(data.poses))throw Error('이미지 목록 형식이 잘못됐습니다.');return data;});catalog=await loading;for(const value of [...new Set(catalog.poses.map(r=>r.name))]){const option=document.createElement('option');option.value=value;option.textContent=value;category.appendChild(option);}}render();}catch(error){loading=null;status.textContent=error.message;}};
  $('image-references-close').onclick=()=>panel.hidden=true;$('image-reference-hide').onclick=()=>pinned.hidden=true;
  search.oninput=category.onchange=()=>{page=0;render();};$('image-references-prev').onclick=()=>{page--;render();};$('image-references-next').onclick=()=>{page++;render();};
  $('image-reference-link').onclick=async()=>{if(!selected)return;try{await api.saveLinked(selected.id+' '+selected.name,{collection:'drive-image-reference',poseId:selected.id});}catch(error){editor.status(error.message);}};
}
