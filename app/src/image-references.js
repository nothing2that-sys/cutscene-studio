export function installImageReferences(editor,api){
  const root='/local-pose-references/',button=document.createElement('button');button.id='image-references-open';button.className='btn';button.textContent='이미지 레퍼런스';editor.poseSlot.appendChild(button);
  const panel=document.createElement('section');panel.id='image-references-panel';panel.className='glass-panel';panel.hidden=true;
  panel.innerHTML='<div class="pose-library-heading"><h3>이미지 레퍼런스</h3><button class="btn" id="image-references-close">닫기</button></div><p>2D 자세·시점 참고 자료입니다. 카드를 선택해 옆에 띄우고 3D 포즈를 조정하세요.</p><div class="pose-library-tools"><input id="image-references-search" placeholder="번호 · 자세 · 장면 검색" aria-label="이미지 포즈 검색"><select id="image-references-category" aria-label="포즈 분류"><option value="">전체 분류</option></select></div><output id="image-references-status"></output><div id="image-references-grid"></div><div class="pose-library-tools"><button class="btn" id="image-references-prev">이전</button><button class="btn" id="image-references-next">다음</button></div>';
  panel.querySelector('p').textContent='3D 변환 카드 선택 시 선택 인물에 추정 자세를 적용합니다. 가려진 관절·깊이·접촉은 확인하세요.';
  const pinned=document.createElement('aside');pinned.id='image-reference-pinned';pinned.className='glass-panel';pinned.hidden=true;
  pinned.innerHTML='<button class="btn" id="image-reference-hide">닫기</button><h4></h4><img alt="선택한 포즈 이미지"><p></p><button class="btn" id="image-reference-link">현재 3D 자세를 연결해 저장</button><small>이미지를 자동 변환하지 않습니다. 직접 맞춘 현재 관절을 저장합니다.</small>';
  pinned.querySelector('small').textContent='자동 추정은 검수 전입니다. 직접 보정한 현재 관절을 저장합니다.';
  document.getElementById('app').append(panel,pinned);
  const $=id=>document.getElementById(id),search=$('image-references-search'),category=$('image-references-category'),status=$('image-references-status'),grid=$('image-references-grid');
  let catalog=null,loading=null,page=0,selected=null;const size=36;
  const qualityFilter=document.createElement('select');qualityFilter.id='image-references-quality';qualityFilter.setAttribute('aria-label','변환 품질');qualityFilter.innerHTML='<option value="">전체 품질</option><option value="estimated">일반 추정 · 검수 전</option><option value="needs-correction">보정 필요</option>';category.after(qualityFilter);qualityFilter.onchange=()=>{page=0;render();};
  const applyButton=document.createElement('button');applyButton.id='image-reference-apply';applyButton.className='btn primary';applyButton.textContent='추정 3D 포즈 적용';applyButton.hidden=true;pinned.querySelector('#image-reference-link').before(applyButton);
  const convertedCache=new Map();
  async function applyConverted(record){
    applyButton.disabled=true;document.getElementById('image-reference-link').disabled=true;
    try{
      let result=convertedCache.get(record.id);if(!result){const response=await fetch(root+record.conversion.file);if(!response.ok)throw Error('변환 포즈 파일을 열지 못했습니다.');result=await response.json();if(result.source?.imageSha256!==record.sha256||result.source?.poseId!==record.id)throw Error('원본 이미지와 변환 포즈가 일치하지 않습니다.');convertedCache.set(record.id,result);}
      if(selected!==record)return;api.applyConverted(result.pose);editor.status(record.id+' 자동 추정 포즈 적용 · '+(record.conversion.status==='needs-correction'?'보정 필요':'검수 전')+' · 가려진 관절·좌우·손발 접촉을 확인하세요.');
    }catch(error){editor.status('3D 포즈를 적용하지 못했습니다: '+error.message);}
    finally{if(selected===record){applyButton.disabled=false;document.getElementById('image-reference-link').disabled=false;}}
  }
  applyButton.onclick=()=>selected?.conversion&&applyConverted(selected);
  const normalize=text=>text.toLocaleLowerCase().replace(/\s/g,'');
  function render(){
    if(!catalog)return;const terms=normalize(search.value).split(/[,+]/).filter(Boolean);
    const concepts=Object.entries(catalog.aliases||{}).filter(([,aliases])=>aliases.some(a=>terms.some(t=>t.includes(normalize(a))))).map(([key])=>key);
    const matches=catalog.poses.filter(r=>(!category.value||r.name===category.value)&&(!qualityFilter.value||r.conversion?.status===qualityFilter.value)&&(!terms.length||terms.every(t=>normalize([r.id,r.name,r.summary,...r.tags,...r.concepts,...r.scenes].join(' ')).includes(t))||concepts.some(c=>[...r.concepts,...r.scenes].includes(c))));
    const pages=Math.max(1,Math.ceil(matches.length/size));page=Math.min(page,pages-1);grid.replaceChildren();
    for(const record of matches.slice(page*size,(page+1)*size)){
      const card=document.createElement('button');card.className='image-reference-card';card.dataset.referenceId=record.id;
      const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.src=root+record.image.split('/').map(encodeURIComponent).join('/');img.alt=record.id+' '+record.summary;
      const label=document.createElement('span');label.textContent=record.id+' · '+record.name;const text=document.createElement('small');text.textContent=record.summary+(record.conversion?' · 3D 추정'+(record.conversion.status==='needs-correction'?' / 보정 필요':' / 검수 전'):' · 이미지 참조');card.append(img,label,text);
      card.onclick=()=>{selected=record;pinned.querySelector('h4').textContent=record.id+' · '+record.name;pinned.querySelector('img').src=img.src;pinned.querySelector('p').textContent=record.summary+(record.note?' · '+record.note:'');pinned.hidden=false;panel.hidden=true;editor.setMode('pose');applyButton.hidden=!record.conversion;if(record.conversion)applyConverted(record);else editor.status('2D 이미지를 참고해 관절을 조정한 뒤 현재 3D 자세를 연결해 저장하세요.');};grid.appendChild(card);
    }
    status.textContent='등록 '+catalog.poses.length+'개 · 검색 '+matches.length+'개 · '+(page+1)+' / '+pages+'쪽';$('image-references-prev').disabled=page===0;$('image-references-next').disabled=page+1===pages;
  }
  button.onclick=async()=>{panel.hidden=!panel.hidden;if(panel.hidden)return;try{if(!catalog){loading ||= fetch(root+'catalog.json').then(async r=>{if(!r.ok)throw Error('로컬 레퍼런스 자료가 없습니다. docs/IMAGE_REFERENCES.md의 등록 절차를 확인하세요.');const data=await r.json();if(data.kind!=='image-reference'||!Array.isArray(data.poses))throw Error('이미지 목록 형식이 잘못됐습니다.');return data;});catalog=await loading;for(const value of [...new Set(catalog.poses.map(r=>r.name))]){const option=document.createElement('option');option.value=value;option.textContent=value;category.appendChild(option);}}render();}catch(error){loading=null;status.textContent=error.message;}};
  $('image-references-close').onclick=()=>panel.hidden=true;$('image-reference-hide').onclick=()=>pinned.hidden=true;
  search.oninput=category.onchange=()=>{page=0;render();};$('image-references-prev').onclick=()=>{page--;render();};$('image-references-next').onclick=()=>{page++;render();};
  $('image-reference-link').onclick=async()=>{if(!selected)return;try{await api.saveLinked(selected.id+' '+selected.name,{collection:'drive-image-reference',poseId:selected.id});}catch(error){editor.status(error.message);}};
}
