import * as THREE from 'three';

// Visible region boundaries from the actual posed model. No reference-image
// tracing and no normal-map triangle creases; paths are rebuilt only on capture.
function simplify(points,tolerance){const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;const stack=[[0,points.length-1]],t2=tolerance*tolerance;while(stack.length){const [a,b]=stack.pop(),p=points[a],q=points[b],dx=q[0]-p[0],dy=q[1]-p[1],length=dx*dx+dy*dy;let best=t2,index=-1;for(let i=a+1;i<b;i++){const v=points[i],t=length?Math.max(0,Math.min(1,((v[0]-p[0])*dx+(v[1]-p[1])*dy)/length)):0,d=(v[0]-p[0]-t*dx)**2+(v[1]-p[1]-t*dy)**2;if(d>best){best=d;index=i;}}if(index>=0){keep[index]=1;stack.push([a,index],[index,b]);}}return points.filter((_,i)=>keep[i]);}
export function createContourRenderer(){let target;const materials=new WeakMap();
 return function draw({renderer,scene,camera,occluders,ctx,w,h,style,scale}){
  if(!target||target.width!==w||target.height!==h){target?.dispose();target=new THREE.WebGLRenderTarget(w,h,{depthBuffer:true});}
  const previous=occluders.map(m=>m.material),oldTarget=renderer.getRenderTarget(),oldOverride=scene.overrideMaterial,oldColor=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha(),pixels=new Uint8Array(w*h*4);
  try{scene.overrideMaterial=null;occluders.forEach((m,i)=>{let material=materials.get(m);if(!material){material=new THREE.MeshBasicMaterial({toneMapped:false});materials.set(m,material);}material.color.setRGB((i+1)/255,0,0);m.material=material;});renderer.setRenderTarget(target);renderer.setClearColor(0,0);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,w,h,pixels);}
  finally{occluders.forEach((m,i)=>m.material=previous[i]);scene.overrideMaterial=oldOverride;renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldColor,oldAlpha);}
  const labels=new Uint8Array(w*h),regions=new Map(),stride=w+1;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((h-1-y)*w+x)*4;labels[y*w+x]=pixels[i+3]>127?pixels[i]:0;}
  ctx.fillStyle='white';ctx.fillRect(0,0,w,h);if(style==='flat'){const im=ctx.createImageData(w,h);for(let i=0;i<labels.length;i++){const v=labels[i]?237:255;im.data.set([v,v,v,255],i*4);}ctx.putImageData(im,0,0);}
  function edge(id,a,b){let map=regions.get(id);if(!map){map=new Map();regions.set(id,map);}if(!map.has(a))map.set(a,[]);map.get(a).push(b);}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const id=labels[y*w+x];if(!id)continue;const a=y*stride+x,b=a+1,c=a+stride,d=c+1;if(y===0||labels[(y-1)*w+x]!==id)edge(id,a,b);if(x===w-1||labels[y*w+x+1]!==id)edge(id,b,d);if(y===h-1||labels[(y+1)*w+x]!==id)edge(id,d,c);if(x===0||labels[y*w+x-1]!==id)edge(id,c,a);}
  ctx.strokeStyle='#30343a';ctx.lineWidth=1.15*scale;ctx.lineCap='round';ctx.lineJoin='round';let paths=0;
  for(const map of regions.values())while(map.size){const start=map.keys().next().value;let key=start;const points=[];do{points.push([key%stride,Math.floor(key/stride)]);const edges=map.get(key);if(!edges?.length)break;const next=edges.pop();if(!edges.length)map.delete(key);key=next;}while(key!==start&&points.length<w*h);if(points.length<8)continue;points.push(points[0]);const path=simplify(points,.4*scale);path.pop();if(path.length<3)continue;const last=path.at(-1),first=path[0];ctx.beginPath();ctx.moveTo((last[0]+first[0])/2,(last[1]+first[1])/2);for(let i=0;i<path.length;i++){const p=path[i],q=path[(i+1)%path.length];ctx.quadraticCurveTo(p[0],p[1],(p[0]+q[0])/2,(p[1]+q[1])/2);}ctx.closePath();ctx.stroke();paths++;}
  return {paths,nearBoundary(x,y,radius){const xx=Math.round(x),yy=Math.round(y),r=Math.ceil(radius),id=labels[yy*w+xx];for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(dx*dx+dy*dy>radius*radius)continue;const px=xx+dx,py=yy+dy;if(px<0||px>=w||py<0||py>=h||labels[py*w+px]!==id)return true;}return false;}};
 };
}
