// Keeps the 3D view inside the space left by the docked panels and the top tool strip.
// The canvas size follows CSS variables; a window resize event lets the renderer catch up.
export function installLayout(){
  const root=document.documentElement,body=document.body;
  const stored=key=>{try{return localStorage.getItem(key)==='1';}catch{return false;}};
  const store=(key,value)=>{try{localStorage.setItem(key,value?'1':'0');}catch{}};
  function measure(){
    const overlay=document.getElementById('ui-overlay'),editor=document.getElementById('direct-editor');
    const toolbar=overlay?Math.round(overlay.getBoundingClientRect().bottom):0;
    const editorHeight=editor&&editor.offsetParent?Math.round(editor.getBoundingClientRect().height):0;
    root.style.setProperty('--direct-top',toolbar+'px');
    const next=toolbar+editorHeight+'px';
    if(root.style.getPropertyValue('--top-h')===next)return;
    root.style.setProperty('--top-h',next);window.dispatchEvent(new Event('resize'));
  }
  for(const [side,key]of [['left','cutscene-left-collapsed'],['right','cutscene-right-collapsed']]){
    const button=document.getElementById(`toggle-${side}-panel`);
    const apply=collapsed=>{body.classList.toggle(side+'-collapsed',collapsed);button?.setAttribute('aria-pressed',String(!collapsed));window.dispatchEvent(new Event('resize'));};
    apply(stored(key));
    if(button)button.onclick=()=>{const collapsed=!body.classList.contains(side+'-collapsed');store(key,collapsed);apply(collapsed);measure();};
  }
  const observer=new ResizeObserver(()=>measure());
  for(const id of ['ui-overlay','direct-editor'])if(document.getElementById(id))observer.observe(document.getElementById(id));
  // Panels hidden by the fixed-view tools change the strip height without resizing it.
  new MutationObserver(()=>{measure();window.dispatchEvent(new Event('resize'));}).observe(body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',measure);measure();
  return {measure};
}
