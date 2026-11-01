import { publicReport, repairRequest } from './scene-feedback.js';

export function createValidationPanel(container,download,status) {
  const node=window.document.createElement('section');node.id='studio-validation';node.hidden=true;
  node.innerHTML='<h3 id="studio-validation-title"></h3><p id="studio-validation-source"></p><p id="studio-validation-state"></p><ul id="studio-validation-issues"></ul><p class="studio-help">수치 검사입니다. 접지·접촉·시선·가림·최종 구도는 렌더에서 확인하세요.</p><div class="studio-row"><button id="studio-repair-copy" class="btn">LLM 수정 요청 복사</button><button id="studio-report-download" class="btn">보고서 저장</button></div><textarea id="studio-repair-text" aria-label="복사할 LLM 수정 요청" readonly hidden></textarea>';
  container.prepend(node);
  const $=id=>window.document.getElementById(id);
  let current=null;
  $('studio-repair-copy').onclick=async()=>{
    if(!current)return;const text=repairRequest(current),fallback=$('studio-repair-text');
    try{await navigator.clipboard.writeText(text);status('원본 JSON과 검사 결과를 복사했습니다. 코덱스에 붙여넣어 주세요.');}
    catch{fallback.hidden=false;fallback.value=text;fallback.focus();fallback.select();status('클립보드 접근이 제한되어 수정 요청을 표시했습니다. Ctrl+C로 복사하세요.');}
  };
  $('studio-report-download').onclick=()=>{if(current)download('cutscene-validation-report.json',JSON.stringify(publicReport(current),null,2));};
  return {
    show(report) {
      current=report;node.hidden=false;node.dataset.level=report.errors.length?'error':report.warnings.length?'warning':'ok';
      $('studio-validation-title').textContent='JSON 검사 · 오류 '+report.errors.length+'개 / 경고 '+report.warnings.length+'개';
      $('studio-validation-source').textContent='최근 입력: '+report.source;
      $('studio-validation-state').textContent=report.errors.length?(report.scenePreserved===false?'적용 실패 · 복원 상태를 확인하세요.':'입력 적용 안 됨 · 기존 장면 유지'):(report.applied?'장면 적용됨':'적용 전 검사');
      const list=$('studio-validation-issues');list.replaceChildren();
      for(const item of [...report.errors,...report.warnings]){
        const li=window.document.createElement('li'),path=window.document.createElement('code'),message=window.document.createElement('p');
        li.dataset.severity=item.severity;path.textContent=(item.severity==='error'?'오류':'경고')+' · '+item.path+' · '+item.code;
        message.textContent=item.message+(item.line?' ('+item.line+'행 '+item.column+'열)':'');li.append(path,message);
        if(item.expected!==undefined){const detail=window.document.createElement('small');detail.textContent='허용: '+(typeof item.expected==='string'?item.expected:JSON.stringify(item.expected))+(item.actual!==undefined?' / 입력: '+(typeof item.actual==='string'?item.actual:JSON.stringify(item.actual)):'');li.appendChild(detail);}
        list.appendChild(li);
      }
      $('studio-repair-text').hidden=true;
      if(report.errors.length||report.warnings.length)node.scrollIntoView({block:'nearest'});
    },
  };
}
