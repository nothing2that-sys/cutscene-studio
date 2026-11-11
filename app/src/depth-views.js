// LiDAR-style views of the shot: a colour range image with distance rings and labels,
// and a top-down plan aligned to the camera. Both are drawn from exact scene data, so
// there is no scan noise or sparsity to imitate.
import * as THREE from 'three';

const r1=v=>Math.round(v*10)/10;
// Text tags with a dark backing; fixed ones keep their spot, others step up/down until clear.
function placeTags(ctx,tags,W,H,s){
 ctx.font=`bold ${s}px sans-serif`;ctx.textBaseline='middle';const placed=[],hit=(a,b)=>a.x<b.x+b.w+4&&b.x<a.x+a.w+4&&Math.abs(a.y-b.y)<s*1.4;
 for(const t of [...tags.filter(t=>t.fixed),...tags.filter(t=>!t.fixed)]){const w=ctx.measureText(t.text).width,box={x:Math.min(Math.max(t.x-w/2,2),W-w-2),y:Math.min(Math.max(t.y,s),H-s),w};
  for(let k=1;!t.fixed&&k<16&&placed.some(o=>hit(box,o));k++)box.y=Math.min(Math.max(t.y+(k%2?-1:1)*Math.ceil(k/2)*s*1.4,s),H-s);
  placed.push(box);ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(box.x-3,box.y-s*.65,w+6,s*1.3);ctx.fillStyle=t.color;ctx.fillText(t.text,box.x,box.y);}
}
// Turbo colormap (Google, polynomial fit). t=0 dark blue … t=1 dark red.
export function turbo(t){
 t=Math.min(1,Math.max(0,t));
 const c=(a)=>Math.round(255*Math.min(1,Math.max(0,a[0]+t*(a[1]+t*(a[2]+t*(a[3]+t*(a[4]+t*a[5])))))));
 return [c([.13572138,4.6153926,-42.66032258,132.13108234,-152.94239396,59.28637943]),c([.09140261,2.19418839,4.84296658,-14.18503333,4.27729857,2.82956604]),c([.1066733,12.64194608,-60.58204836,110.36276771,-89.90310912,27.34824973])];
}
// Ring spacing: a round step giving roughly 4–12 rings over the range.
export function ringStep(nearM,farM){
 const span=Math.max(.1,farM-nearM);for(const s of [.25,.5,1,2,5,10])if(span/s<=12)return s;return 20;
}
// Near = red, far = blue, on a log scale so close surfaces get more colour steps.
export function rangeColor(d,nearM,farM){const s=(Math.log(d)-Math.log(nearM))/(Math.log(farM)-Math.log(nearM)||1);return turbo(.1+.85*(1-Math.min(1,Math.max(0,s))));}
// (The outer ends of turbo are near-black, so the scale uses 0.10–0.95.)

export function drawRange(canvas,{passes,labels,facts,range}){
 const {width:W,height:H,label,distance}=passes,ctx=canvas.getContext('2d'),img=ctx.createImageData(W,H),d=img.data;
 const step=ringStep(range.nearM,range.farM),edge=.15,person=new Set(labels.filter(l=>l.kind==='person').map(l=>l.index));
 // Rings go on floor, walls and props only: on bodies they trace mannequin curves.
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,o=i*4;d[o+3]=255;if(!label[i])continue;
  const v=distance[i],c=rangeColor(v,range.nearM,range.farM);d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];
  // Depth discontinuities (one surface in front of another) as dark outlines.
  const nb=[x+1<W?i+1:-1,y+1<H?i+W:-1];
  for(const j of nb){if(j<0)continue;if(!label[j]||Math.abs(distance[j]-v)>edge){d[o]=d[o+1]=d[o+2]=0;break;}
   // Same-distance rings: a white line where the ring index changes on a continuous surface.
   if(!person.has(label[i])&&Math.floor(distance[j]/step)!==Math.floor(v/step)){d[o]=d[o+1]=d[o+2]=255;}}
 }
 ctx.putImageData(img,0,0);
 const s=Math.max(12,Math.round(H/45));ctx.font=`bold ${s}px sans-serif`;ctx.textBaseline='middle';
 const tags=[],tag=(text,x,y,color='#fff')=>tags.push({text,x,y,color});
 // Distance at each visible person, measured on its own pixels.
 for(const a of facts?.actors||[]){const l=labels.find(x=>x.kind==='person'&&x.id===a.id),p=a.points?.headTop;if(!l||!p?.inFrame)continue;
  let sum=0,n=0;for(let i=0;i<label.length;i+=7)if(label[i]===l.index){sum+=distance[i];n++;}if(!n)continue;
  tag(`${a.name.split(' · ')[0]} ${r1(sum/n)}m`,p.screen[0]*W,Math.max(s,p.screen[1]*H-s*1.2),'#fff');}
 placeTags(ctx,tags,W,H,s);
 // Legend: colour bar with metre ticks.
 const bw=Math.round(s*1.2),bh=Math.round(H*.45),bx=W-bw-s*4,by=Math.round(H*.08);
 ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(bx-s*.4,by-s*1.6,bw+s*4,bh+s*2.6);
 for(let k=0;k<bh;k++){const dist=range.nearM*Math.pow(range.farM/range.nearM,k/bh),c=rangeColor(dist,range.nearM,range.farM);ctx.fillStyle=`rgb(${c})`;ctx.fillRect(bx,by+k,bw,1);}
 ctx.fillStyle='#fff';ctx.font=`${Math.round(s*.8)}px sans-serif`;ctx.fillText('거리(m)',bx-s*.2,by-s*.9);
 for(let m=Math.ceil(range.nearM/step)*step;m<=range.farM+1e-6;m+=step){const k=Math.log(m/range.nearM)/Math.log(range.farM/range.nearM)*bh;ctx.fillRect(bx+bw,by+k,s*.4,1);ctx.fillText(String(r1(m)),bx+bw+s*.5,by+k);}
 return {step};
}

// Camera-aligned top-down frame: x = right of the camera, y = forward along its view.
export function planFrame(camera){
 camera.updateMatrixWorld(true);
 const pos=camera.getWorldPosition(new THREE.Vector3()),f=camera.getWorldDirection(new THREE.Vector3());f.y=0;
 if(f.lengthSq()<1e-6)f.set(0,0,-1).applyQuaternion(camera.quaternion).setY(0);f.normalize();
 const right=new THREE.Vector3().crossVectors(f,new THREE.Vector3(0,1,0)).normalize();
 return {pos,forward:f,right,map:p=>{const v=new THREE.Vector3(p[0]-pos.x,0,p[2]-pos.z);return [v.dot(right),v.dot(f)];},dir:d=>{const v=new THREE.Vector3(d[0],0,d[2]);return [v.dot(right),v.dot(f)];}};
}
export function drawPlan(canvas,{facts,labels,lighting,room,camera,aspect}){
 const W=canvas.width,H=canvas.height,ctx=canvas.getContext('2d'),F=planFrame(camera),s=Math.max(12,Math.round(H/60));
 const pts=[[0,0]];
 const people=(facts?.actors||[]).map(a=>({a,l:labels.find(x=>x.kind==='person'&&x.id===a.id),p:F.map(a.points.pelvis.world),f:F.dir(a.forward)}));
 const props=(facts?.props||[]).map(p=>{const b=p.box,c=[[b.min[0],0,b.min[2]],[b.max[0],0,b.min[2]],[b.max[0],0,b.max[2]],[b.min[0],0,b.max[2]]].map(F.map);return {p,l:labels.find(x=>x.kind==='prop'&&x.id===p.id),c};});
 const [rw,,rd]=room?.size||[0,0,0],roomC=rw?[[-rw/2,0,-rd/2],[rw/2,0,-rd/2],[rw/2,0,rd/2],[-rw/2,0,rd/2]].map(F.map):[];
 const L=lighting?.position?F.map(lighting.position):null,type=lighting?.type||'sun';
 // Frame the camera, people, props and a lamp/spot; the room may run off the edges.
 people.forEach(x=>pts.push(x.p));props.forEach(x=>pts.push(...x.c));if(L&&type!=='sun')pts.push(L);
 const minX=Math.min(...pts.map(p=>p[0]))-1,maxX=Math.max(...pts.map(p=>p[0]))+1,minY=Math.min(...pts.map(p=>p[1]))-1,maxY=Math.max(...pts.map(p=>p[1]))+1;
 const tags=[],top=s*3,scale=Math.min((W-2*s)/(maxX-minX),(H-top-s*2)/(maxY-minY)),cx=W/2-(minX+maxX)/2*scale,cy=top+maxY*scale;
 const X=p=>[cx+p[0]*scale,cy-p[1]*scale];
 ctx.fillStyle='#14171c';ctx.fillRect(0,0,W,H);ctx.lineCap='round';
 // Floor and walls.
 if(roomC.length){ctx.fillStyle='#262b33';ctx.beginPath();roomC.forEach((p,i)=>{const [x,y]=X(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fill();
  if(room.walls){ctx.strokeStyle='#9aa3ad';ctx.lineWidth=s*.5;for(const [a,b]of [[0,1],[0,3]]){ctx.beginPath();ctx.moveTo(...X(roomC[a]));ctx.lineTo(...X(roomC[b]));ctx.stroke();}}}
 // Distance rings from the camera.
 const far=Math.max(...pts.map(p=>Math.hypot(...p))),step=ringStep(0,far);ctx.font=`${Math.round(s*.85)}px sans-serif`;ctx.textBaseline='middle';
 for(let m=step;m<=far+step;m+=step){ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(...X([0,0]),m*scale,0,Math.PI*2);ctx.stroke();const [x,y]=X([0,m]);ctx.fillStyle='rgba(255,255,255,.55)';ctx.fillText(`${r1(m)}m`,x+3,y);}
 // Camera field of view.
 const v=(facts?.camera?.verticalFovDeg||40)*Math.PI/360,h=Math.atan(Math.tan(v)*(aspect||16/9)),reach=(far+step)*1.2;
 ctx.fillStyle='rgba(120,180,255,.12)';ctx.strokeStyle='rgba(120,180,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(...X([0,0]));ctx.lineTo(...X([-Math.sin(h)*reach,Math.cos(h)*reach]));ctx.lineTo(...X([Math.sin(h)*reach,Math.cos(h)*reach]));ctx.closePath();ctx.fill();ctx.stroke();
 const label=(text,x,y,color,fixed=false)=>tags.push({text,x,y,color,fixed});
 // Props (footprints) and people (disc + facing arrow).
 for(const x of props){ctx.fillStyle=(x.l?.color||'#888')+'99';ctx.strokeStyle=x.l?.color||'#888';ctx.lineWidth=2;ctx.beginPath();x.c.forEach((p,i)=>{const q=X(p);i?ctx.lineTo(...q):ctx.moveTo(...q);});ctx.closePath();ctx.fill();ctx.stroke();const c=X(x.c.reduce((a,p)=>[a[0]+p[0]/4,a[1]+p[1]/4],[0,0]));label(x.p.name,c[0],c[1],'#ddd');}
 for(const x of people){const [px,py]=X(x.p),r=Math.max(s*.8,.22*scale),col=x.l?.color||'#fff';ctx.fillStyle=col;ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();
  const len=Math.hypot(...x.f)||1,fx=x.f[0]/len,fy=x.f[1]/len;// Facing: an arrow from the disc edge.
  const reach=Math.max(r*2.4,r+s*2.5),ax=px+fx*reach,ay=py-fy*reach,nx=-fy,ny=-fx;ctx.strokeStyle=ctx.fillStyle='#fff';ctx.lineWidth=s*.3;ctx.beginPath();ctx.moveTo(px+fx*r,py-fy*r);ctx.lineTo(ax,ay);ctx.stroke();ctx.beginPath();ctx.moveTo(ax+fx*s*.9,ay-fy*s*.9);ctx.lineTo(ax+nx*s*.6,ay+ny*s*.6);ctx.lineTo(ax-nx*s*.6,ay-ny*s*.6);ctx.closePath();ctx.fill();
  label(`${x.a.name.split(' · ')[0]} ${r1(Math.hypot(...x.p))}m`,px,py+r+s,col);}
 // Light source.
 if(L){ctx.fillStyle=ctx.strokeStyle='#ffd400';ctx.lineWidth=s*.3;
  if(type==='sun'){const t=F.dir(lighting.target.map((v,i)=>v-lighting.position[i])),n=Math.hypot(...t);
   if(n<.15)label('해: 거의 바로 위',W/2,top-s,'#ffd400');else{// The sun sits on the frame edge it shines from; the arrow points the way light travels.
    const dx=t[0]/n,dy=-t[1]/n,k=Math.min((W/2-s*2)/Math.max(Math.abs(dx),1e-6),(H/2-s*3)/Math.max(Math.abs(dy),1e-6)),tail=[W/2-dx*k,H/2-dy*k],head=[tail[0]+dx*s*7,tail[1]+dy*s*7];
    ctx.beginPath();ctx.moveTo(...tail);ctx.lineTo(...head);ctx.stroke();ctx.beginPath();ctx.moveTo(head[0]+dx*s,head[1]+dy*s);ctx.lineTo(head[0]-dy*s*.7,head[1]+dx*s*.7);ctx.lineTo(head[0]+dy*s*.7,head[1]-dx*s*.7);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.arc(...tail,s*1.1,0,Math.PI*2);ctx.fill();label('해 (화살표 = 빛이 가는 방향)',tail[0],tail[1]+(dy>0?s*2:-s*2),'#ffd400',true);}}
  else{const [lx,ly]=X(L);ctx.beginPath();ctx.arc(lx,ly,s*.8,0,Math.PI*2);ctx.fill();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(lx+Math.cos(a)*s*1.2,ly+Math.sin(a)*s*1.2);ctx.lineTo(lx+Math.cos(a)*s*1.8,ly+Math.sin(a)*s*1.8);ctx.stroke();}
   if(type==='spot'){const T=X(F.map(lighting.target));ctx.setLineDash([s*.6,s*.4]);ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(...T);ctx.stroke();ctx.setLineDash([]);}
   label(`${type==='spot'?'스포트':'전등'} 높이 ${r1(lighting.position[1])}m`,lx,ly-s*2.4,'#ffd400');}}
 // Camera.
 const [kx,ky]=X([0,0]);ctx.fillStyle='#7ab4ff';ctx.beginPath();ctx.moveTo(kx,ky-s);ctx.lineTo(kx-s*.8,ky+s*.6);ctx.lineTo(kx+s*.8,ky+s*.6);ctx.closePath();ctx.fill();
 label(`카메라 높이 ${r1(F.pos.y)}m`,kx,ky+s*1.6,'#7ab4ff');
 label(`위에서 본 배치 · 위쪽 = 카메라가 보는 방향 · 원 간격 ${step}m`,W/2,s*1.2,'#fff',true);
 placeTags(ctx,tags,W,H,s);
 return {step,scale};
}
