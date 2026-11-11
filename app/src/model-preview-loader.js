// The native in-app browser may disable WebGL even when Chrome can render locally.
// Keep the authored model visible there instead of leaving a blank comparison page.
import('./model-preview.js').catch(error=>{
 console.error('Model preview unavailable:',error);
 const host=document.querySelector('#preview');host.querySelectorAll('canvas').forEach(canvas=>canvas.remove());host.classList.add('single');
 const image=document.createElement('img');image.id='preview-fallback';image.src='/model-preview/gallery-8-head.png';image.alt='175cm 8등신 여성형 인체의 정면·측면·사선 실제 렌더';image.style.cssText='display:block;width:100%;height:100%;object-fit:contain';host.prepend(image);
 document.getElementById('preview-status').textContent='현재 브라우저에서 3D를 사용할 수 없어 8등신 정적 미리보기를 표시합니다. 3D 조작은 Chrome에서 여세요.';
 document.querySelectorAll('.toolbar select,.toolbar input').forEach(input=>input.disabled=true);
 document.getElementById('preview-capture').onclick=()=>{const link=document.createElement('a');link.download='gallery-body-8-head.png';link.href=image.src;link.click();};
});
