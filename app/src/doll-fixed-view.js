import * as THREE from 'three';
import {createContourRenderer} from './doll-line-contours.js';

// Fixed camera projection: only a changed model/camera needs WebGL.
// Panning, zooming and rigid XYZ translation reuse this projected layer.
export function createFixedView({renderer,scene,camera,orbit,host,onTransform,onMode,getGuides,getOccluders,getVisibilityQuery,lineSettings={}}){
 const canvas=document.createElement('canvas');canvas.id='fixed-canvas';canvas.hidden=true;canvas.style.cssText='touch-action:none;cursor:grab;transform-origin:50% 50%';host.insertBefore(canvas,document.getElementById('overlay-frame'));
 const ctx=canvas.getContext('2d'),normalMaterial=new THREE.MeshNormalMaterial(),offset=new THREE.Vector3(),raycaster=new THREE.Raycaster();let enabled=false,style='line',guides=true,zoom=1,panX=0,panY=0,target,drag,captures=0;
 const right=new THREE.Vector3(),up=new THREE.Vector3(),drawContours=createContourRenderer();
 function drawGuides(w,h,nearBoundary){if(!guides||!getGuides)return;const occluders=getOccluders(),query=getVisibilityQuery?.(occluders);ctx.lineCap='round';ctx.lineJoin='round';for(const curve of getGuides()){ctx.strokeStyle=lineSettings.semantic?(curve.lineKind==='joint'?'#4a4a4a':'#7d8186'):'#454545';ctx.lineWidth=(lineSettings.semantic?(curve.lineKind==='joint'?.8:.6):1.2)*w/host.clientWidth;ctx.beginPath();let started=false;for(const p of curve){if(!p){started=false;continue;}const projected=p.clone().project(camera);if(Math.abs(projected.x)>1||Math.abs(projected.y)>1){started=false;continue;}raycaster.setFromCamera(projected,camera);const distance=query?query(raycaster.ray):(raycaster.intersectObjects(occluders,false)[0]?.distance??Infinity);if(!Number.isFinite(distance)||Math.abs(distance-p.distanceTo(raycaster.ray.origin))>.015){started=false;continue;}const x=(projected.x+1)*w/2,y=(1-projected.y)*h/2;if(curve.lineKind==='joint'&&nearBoundary?.(x,y,1.1*w/host.clientWidth)){started=false;continue;}if(started)ctx.lineTo(x,y);else ctx.moveTo(x,y);started=true;}ctx.stroke();}}
 function projection(){if(camera.isPerspectiveCamera)return {x:0,y:0};camera.updateMatrixWorld();right.setFromMatrixColumn(camera.matrixWorld,0);up.setFromMatrixColumn(camera.matrixWorld,1);return {x:offset.dot(right)*host.clientWidth*camera.zoom/(camera.right-camera.left),y:-offset.dot(up)*host.clientHeight*camera.zoom/(camera.top-camera.bottom)};}
 function transform(){const p=projection();canvas.style.transform=`translate(${panX+p.x*zoom}px,${panY+p.y*zoom}px) scale(${zoom})`;onTransform?.({offset,zoom,panX,panY});}
 function capture(){if(!enabled)return;const scale=2,w=renderer.domElement.width*scale,h=renderer.domElement.height*scale;canvas.width=w;canvas.height=h;
  if(style==='current'){ctx.drawImage(renderer.domElement,0,0,w,h);}
  else if(lineSettings.semantic){const contour=drawContours({renderer,scene,camera,occluders:getOccluders(),ctx,w,h,style,scale:w/host.clientWidth});drawGuides(w,h,contour.nearBoundary);}
  else{
   if(!target||target.width!==w||target.height!==h){target?.dispose();target=new THREE.WebGLRenderTarget(w,h,{depthBuffer:true});}
   const oldTarget=renderer.getRenderTarget(),oldMaterial=scene.overrideMaterial,oldColor=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha(),pixels=new Uint8Array(w*h*4);
   try{scene.overrideMaterial=normalMaterial;renderer.setRenderTarget(target);renderer.setClearColor(0x000000,0);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,w,h,pixels);}
   finally{scene.overrideMaterial=oldMaterial;renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldColor,oldAlpha);}
   const image=ctx.createImageData(w,h),out=image.data,step=2,directions=[[-step,0],[step,0],[0,-step],[0,step]];
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=((h-1-y)*w+x)*4,o=(y*w+x)*4;let value=255;
    if(pixels[p+3]>127){value=style==='flat'?237:255;let edge=false;for(const [dx,dy]of directions){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h){edge=true;break;}const q=((h-1-yy)*w+xx)*4;if(pixels[q+3]<128){edge=true;break;}const ox=x-dx,oy=y-dy;if(ox<0||ox>=w||oy<0||oy>=h)continue;const opposite=((h-1-oy)*w+ox)*4;if(pixels[opposite+3]<128)continue;const d=(pixels[p]-pixels[q])**2+(pixels[p+1]-pixels[q+1])**2+(pixels[p+2]-pixels[q+2])**2,curvature=(2*pixels[p]-pixels[q]-pixels[opposite])**2+(2*pixels[p+1]-pixels[q+1]-pixels[opposite+1])**2+(2*pixels[p+2]-pixels[q+2]-pixels[opposite+2])**2;if(d>32**2&&curvature>36**2){edge=true;break;}}if(edge)value=45;}
    out[o]=out[o+1]=out[o+2]=value;out[o+3]=255;
   }
   ctx.putImageData(image,0,0);
   drawGuides(w,h);
  }
  captures++;transform();
 }
 function bakeView(){if(camera.isPerspectiveCamera){const w=host.clientWidth,h=host.clientHeight,view=camera.view?.enabled?{...camera.view}:null;camera.zoom*=zoom;if(view)camera.setViewOffset(view.fullWidth,view.fullHeight,(view.offsetX-(view.fullWidth-view.width)/2)*zoom+(view.fullWidth-view.width)/2-panX*view.width/w,(view.offsetY-(view.fullHeight-view.height)/2)*zoom+(view.fullHeight-view.height)/2-panY*view.height/h,view.width,view.height);else if(panX||panY)camera.setViewOffset(w,h,-panX,-panY,w,h);camera.updateProjectionMatrix();panX=panY=0;zoom=1;return;}camera.zoom*=zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();right.setFromMatrixColumn(camera.matrixWorld,0);up.setFromMatrixColumn(camera.matrixWorld,1);const viewHeight=camera.isPerspectiveCamera?2*camera.position.distanceTo(orbit.target)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)):camera.top-camera.bottom,viewWidth=camera.isPerspectiveCamera?viewHeight*camera.aspect:camera.right-camera.left,delta=right.clone().multiplyScalar(-panX*viewWidth/(host.clientWidth*camera.zoom)).addScaledVector(up,panY*viewHeight/(host.clientHeight*camera.zoom));camera.position.add(delta);orbit.target.add(delta);panX=panY=0;zoom=1;}
 function setEnabled(value){if(enabled===value)return;if(!value)bakeView();enabled=value;canvas.hidden=!enabled;renderer.domElement.style.visibility=enabled?'hidden':'visible';host.style.touchAction=enabled?'none':'';orbit.enabled=!enabled;onMode?.(enabled);transform();}
 function resetView(){zoom=1;panX=panY=0;transform();}
 function setOffset(x,y,z){if([x,y,z].some(v=>!Number.isFinite(v)||Math.abs(v)>10))return;offset.set(x,y,z);transform();}
 function zoomAt(value,x=0,y=0){const next=THREE.MathUtils.clamp(value,.25,4),ratio=next/zoom;panX=x-(x-panX)*ratio;panY=y-(y-panY)*ratio;zoom=next;transform();}
 host.addEventListener('wheel',e=>{if(!enabled)return;e.preventDefault();const rect=host.getBoundingClientRect();zoomAt(zoom*Math.exp(-e.deltaY*.0015),e.clientX-rect.left-rect.width/2,e.clientY-rect.top-rect.height/2);},{passive:false});
 host.addEventListener('pointerdown',e=>{if(!enabled||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,panX,panY};host.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';});
 host.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;panX=drag.panX+e.clientX-drag.x;panY=drag.panY+e.clientY-drag.y;transform();});
 const release=e=>{if(drag?.id===e.pointerId){drag=undefined;canvas.style.cursor='grab';if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);}};host.addEventListener('pointerup',release);host.addEventListener('pointercancel',release);
 function exportCanvas(){const output=document.createElement('canvas');output.width=renderer.domElement.width;output.height=renderer.domElement.height;const context=output.getContext('2d'),p=projection();context.fillStyle='white';context.fillRect(0,0,output.width,output.height);context.translate(output.width/2+(panX+p.x*zoom)*output.width/host.clientWidth,output.height/2+(panY+p.y*zoom)*output.height/host.clientHeight);context.scale(zoom,zoom);context.drawImage(canvas,-output.width/2,-output.height/2,output.width,output.height);return output;}
 return {canvas,offset,capture,setEnabled,setOffset,resetView,zoomAt,exportCanvas,get enabled(){return enabled;},get captures(){return captures;},get zoom(){return zoom;},get style(){return style;},set style(value){style=value;},get guides(){return guides;},set guides(value){guides=value;},get state(){return {zoom,panX,panY,offset:offset.toArray(),captures,style,guides};},get identity(){return zoom===1&&panX===0&&panY===0&&offset.lengthSq()<1e-12;}};
}
