// Offline mesh editing of the CC0 authored body. No separate body-part primitives.
export function shapeGalleryBody(points,faces,influences,keys){
 const head=keys.indexOf('head'),neck=keys.indexOf('neck'),torso=keys.indexOf('torso'),pelvis=keys.indexOf('pelvis');
 const weight=(id,key)=>influences[id].get(key)||0;
 const bodyIds=new Set(faces),headPoints=points.filter((p,i)=>bodyIds.has(i)&&weight(i,head)>.9);
 const chin=Math.min(...headPoints.map(p=>p[1])),crown=Math.max(...headPoints.map(p=>p[1]));
 const cut=chin-.19;
 for(let i=0;i<points.length;i++){
  const p=points[i],trunk=weight(i,torso)+weight(i,pelvis),waist=Math.exp(-Math.pow((p[1]-1.7)/1.05,2))*trunk;
  p[2]*=1-.13*waist;p[0]*=1-.07*waist;
  const neckFalloff=Math.exp(-Math.pow((p[1]-cut)/.42,2))*(Math.abs(p[2])<.85?1:0),neckScale=1-.28*neckFalloff;
  p[0]=.25+(p[0]-.25)*neckScale;p[2]*=neckScale;
 }
 const clipped=[],cuts=new Map(),guides=points.map(()=>[0,0,0]);
 function intersection(a,b){
  const key=[a,b].sort((x,y)=>x-y).join(':');if(cuts.has(key))return cuts.get(key);
  const t=(cut-points[a][1])/(points[b][1]-points[a][1]),p=points[a].map((n,k)=>n+(points[b][k]-n)*t),w=new Map();
  for(const [k,v]of influences[a])w.set(k,(w.get(k)||0)+v*(1-t));for(const [k,v]of influences[b])w.set(k,(w.get(k)||0)+v*t);
  const id=points.length;points.push(p);influences.push(w);guides.push([0,0,0]);cuts.set(key,id);return id;
 }
 for(let i=0;i<faces.length;i+=3){
  const triangle=faces.slice(i,i+3),polygon=[];
  for(let j=0;j<3;j++){const a=triangle[j],b=triangle[(j+1)%3],inside=points[a][1]<=cut,next=points[b][1]<=cut;if(inside)polygon.push(a);if(inside!==next)polygon.push(intersection(a,b));}
  for(let j=1;j<polygon.length-1;j++)clipped.push(polygon[0],polygon[j],polygon[j+1]);
 }
 const edges=new Map();for(let i=0;i<clipped.length;i+=3)for(let j=0;j<3;j++){const a=clipped[i+j],b=clipped[i+(j+1)%3],key=[a,b].sort((x,y)=>x-y).join(':');const e=edges.get(key);if(e)e.count++;else edges.set(key,{a,b,count:1});}
 const boundary=[...edges.values()].filter(e=>e.count===1),next=new Map(boundary.map(e=>[e.a,e.b])),ring=[];let id=boundary[0]?.a;
 if(id===undefined)throw Error('No neck boundary after clipping');do{ring.push(id);id=next.get(id);if(id===undefined||ring.length>boundary.length)throw Error('Neck boundary is not a simple loop');}while(id!==ring[0]);
 if(ring.length!==boundary.length)throw Error('Unexpected additional open body boundary');
 const center=ring.reduce((a,i)=>a.map((v,k)=>v+points[i][k]/ring.length),[0,0,0]);
 const angles=ring.map(i=>Math.atan2(points[i][2]-center[2],points[i][0]-center[0]));
 const height=crown-chin,profiles=[
  [cut,.28,.24,center[0]],[chin+.025,.45,.20,.43],
  [chin+height*.13,.69,.55,.4],[chin+height*.34,.85,.73,.31],
  [chin+height*.57,.87,.77,.23],[chin+height*.78,.76,.70,.17],
  [chin+height*.93,.44,.43,.15],[crown,0,0,.15],
 ];
 function sample(y){const dome=chin+height*.57;if(y>=dome){const t=(y-dome)/(crown-dome),r=Math.sqrt(Math.max(0,1-t*t));return [.87*r,.77*r,.23-.08*t];}let n=1;while(n<profiles.length-1&&profiles[n][0]<y)n++;const a=profiles[n-1],b=profiles[n],t=(y-a[0])/(b[0]-a[0]),v=t*t*(3-2*t);return [a[1]+(b[1]-a[1])*v,a[2]+(b[2]-a[2])*v,a[3]+(b[3]-a[3])*v];}
 let previous=ring;
 for(let row=1;row<25;row++){
  const y=cut+(crown-cut)*row/25,[depth,width,x]=sample(y),current=[];
  for(let j=0;j<ring.length;j++){
   const angle=angles[j],id=points.length,headAmount=Math.min(1,Math.max(0,(y-cut)/.22));points.push([x+depth*Math.cos(angle),y,width*Math.sin(angle)]);influences.push(new Map([[head,headAmount],[neck,1-headAmount]]));
   const fraction=(y-chin)/height;guides.push([Math.sin(angle),(fraction-.52)*2,Math.cos(angle)>.15&&fraction>.1&&fraction<.96?1:0]);current.push(id);
  }
  for(let j=0;j<ring.length;j++){const k=(j+1)%ring.length;clipped.push(previous[j],current[j],previous[k],previous[k],current[j],current[k]);}previous=current;
 }
 const pole=points.length;points.push([.15,crown,0]);influences.push(new Map([[head,1]]));guides.push([0,1,0]);for(let j=0;j<ring.length;j++)clipped.push(previous[j],pole,previous[(j+1)%ring.length]);
 return {points,faces:clipped,influences,guides,chin,crown,neckBoundary:ring.length};
}
