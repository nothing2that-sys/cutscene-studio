import * as THREE from 'three';

// Local quadric-error edge collapses. Link and face-orientation checks preserve
// the closed socket topology. No post-collapse smoothing changes the sculpture.
class MinHeap {
 constructor(){this.items=[];}
 push(value){const a=this.items;let i=a.length;a.push(value);while(i){const p=(i-1)>>1;if(a[p].cost<=value.cost)break;a[i]=a[p];i=p;}a[i]=value;}
 pop(){const a=this.items;if(!a.length)return;const first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].cost<a[j].cost)j++;if(a[j].cost>=last.cost)break;a[i]=a[j];i=j;}a[i]=last;}return first;}
}
const evaluate=(q,p)=>q[0]*p[0]*p[0]+2*q[1]*p[0]*p[1]+2*q[2]*p[0]*p[2]+2*q[3]*p[0]+q[4]*p[1]*p[1]+2*q[5]*p[1]*p[2]+2*q[6]*p[1]+q[7]*p[2]*p[2]+2*q[8]*p[2]+q[9];
function normal(a,b,c){const x=b[0]-a[0],y=b[1]-a[1],z=b[2]-a[2],u=c[0]-a[0],v=c[1]-a[1],w=c[2]-a[2],n=[y*w-z*v,z*u-x*w,x*v-y*u],length=Math.hypot(...n);return {vector:n.map(v=>v/(length||1)),length};}
function optimal(q,a,b){
 const det=q[0]*(q[4]*q[7]-q[5]*q[5])-q[1]*(q[1]*q[7]-q[2]*q[5])+q[2]*(q[1]*q[5]-q[2]*q[4]),points=[a,b,a.map((n,i)=>(n+b[i])*.5)];
 if(Math.abs(det)>1e-10){
  const p=[(-q[3]*(q[4]*q[7]-q[5]*q[5])+q[1]*(q[6]*q[7]-q[5]*q[8])-q[2]*(q[6]*q[5]-q[4]*q[8]))/det,
   (-q[0]*(q[6]*q[7]-q[5]*q[8])+q[3]*(q[1]*q[7]-q[2]*q[5])-q[2]*(q[1]*q[8]-q[6]*q[2]))/det,
   (-q[0]*(q[4]*q[8]-q[6]*q[5])+q[1]*(q[1]*q[8]-q[6]*q[2])-q[3]*(q[1]*q[5]-q[4]*q[2]))/det];
  const length=Math.hypot(...a.map((v,i)=>v-b[i]));if(p.every(Number.isFinite)&&Math.hypot(...p.map((v,i)=>v-a[i]))<length*2&&Math.hypot(...p.map((v,i)=>v-b[i]))<length*2)points.push(p);
 }
 return points.map(p=>({p,cost:Math.max(0,evaluate(q,p))})).sort((a,b)=>a.cost-b.cost)[0];
}
export function reduceDollMesh(geometry,targetTriangles){
 const pos=geometry.attributes.position,sourceNormals=geometry.attributes.normal,idx=geometry.index,vertices=Array.from({length:pos.count},(_,i)=>({p:[pos.getX(i),pos.getY(i),pos.getZ(i)],n:sourceNormals?[sourceNormals.getX(i),sourceNormals.getY(i),sourceNormals.getZ(i)]:[0,0,0],weight:1,q:new Float64Array(10),faces:new Set(),alive:true,version:0})),faces=[],heap=new MinHeap();let count=idx.count/3;
 for(let i=0;i<idx.count;i+=3){const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)],n=normal(...ids.map(i=>vertices[i].p)).vector,[a,b,c]=n,d=-n.reduce((sum,v,k)=>sum+v*vertices[ids[0]].p[k],0),q=[a*a,a*b,a*c,a*d,b*b,b*c,b*d,c*c,c*d,d*d],face={ids,n,alive:true};const f=faces.length;faces.push(face);for(const id of ids){vertices[id].faces.add(f);for(let k=0;k<10;k++)vertices[id].q[k]+=q[k];}}
 const neighbors=i=>{const out=new Set();for(const f of vertices[i].faces)for(const j of faces[f].ids)if(j!==i)out.add(j);return out;};
 function schedule(a,b){if(a>b)[a,b]=[b,a];if(!vertices[a].alive||!vertices[b].alive)return;const u=vertices[a],v=vertices[b],q=u.q.map((n,i)=>n+v.q[i]),best=optimal(q,u.p,v.p),normalDifference=sourceNormals?Math.max(0,1-u.n.reduce((s,n,i)=>s+n*v.n[i],0)):0,lengthSquared=u.p.reduce((s,n,i)=>s+(n-v.p[i])**2,0);heap.push({a,b,va:u.version,vb:v.version,p:best.p,cost:best.cost+normalDifference*lengthSquared*.25,q});}
 const edges=new Set();for(const face of faces)for(let k=0;k<3;k++){let a=face.ids[k],b=face.ids[(k+1)%3];if(a>b)[a,b]=[b,a];const key=a+':'+b;if(!edges.has(key)){edges.add(key);schedule(a,b);}}
 let rejected=0,collapsed=0,maxCost=0;
 while(count>targetTriangles&&heap.items.length){
  const edge=heap.pop(),{a,b,p}=edge,u=vertices[a],v=vertices[b];if(!u.alive||!v.alive||u.version!==edge.va||v.version!==edge.vb)continue;
  const shared=[...u.faces].filter(f=>v.faces.has(f));if(shared.length!==2){rejected++;continue;}
  const na=neighbors(a),nb=neighbors(b),opposite=new Set(shared.flatMap(f=>faces[f].ids.filter(i=>i!==a&&i!==b))),common=[...na].filter(i=>nb.has(i));
  if(common.length!==2||common.some(i=>!opposite.has(i))||(na.size===3&&nb.size===3)){rejected++;continue;}
  const affected=new Set([...u.faces,...v.faces]);let valid=true;
  for(const f of affected){if(shared.includes(f))continue;const face=faces[f],next=normal(...face.ids.map(i=>i===a||i===b?p:vertices[i].p));if(next.length<1e-11||next.vector.reduce((sum,n,i)=>sum+n*face.n[i],0)<.35){valid=false;break;}}
  if(!valid){rejected++;continue;}
  for(const f of affected){const face=faces[f];for(const i of face.ids)vertices[i].faces.delete(f);if(shared.includes(f)){face.alive=false;count--;continue;}face.ids=face.ids.map(i=>i===b?a:i);for(const i of face.ids)vertices[i].faces.add(f);}
  const blended=u.n.map((n,i)=>n*u.weight+v.n[i]*v.weight),norm=Math.hypot(...blended)||1;u.n=blended.map(n=>n/norm);u.weight+=v.weight;
  u.p=p;u.q=edge.q;u.version++;v.alive=false;v.version++;v.faces.clear();
  for(const f of u.faces)faces[f].n=normal(...faces[f].ids.map(i=>vertices[i].p)).vector;
  for(const n of neighbors(a))schedule(a,n);collapsed++;maxCost=Math.max(maxCost,edge.cost);
 }
 const positions=[],indices=[],remap=new Map();for(const face of faces)if(face.alive)for(const id of face.ids){if(!remap.has(id)){remap.set(id,positions.length/3);positions.push(...vertices[id].p);}indices.push(remap.get(id));}
 const reduced=new THREE.BufferGeometry();reduced.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));reduced.setIndex(indices);reduced.userData={...geometry.userData,reduction:{sourceTriangles:idx.count/3,targetTriangles,triangles:indices.length/3,collapsed,rejected,maxAccumulatedQuadricCost:maxCost}};return reduced;
}
