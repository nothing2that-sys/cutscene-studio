import * as THREE from 'three';

// Rigid anatomical sections on the existing rig. Each section retains its volume
// during posing; finger skinning is retained inside the two authored hands.
export function segmentedBody(m,source,headBox,rootInverse){
 const keys=source.keys,keyIndex=key=>keys.indexOf(key),at=key=>m[key].getWorldPosition(new THREE.Vector3()).applyMatrix4(rootInverse);
 const positions=[],indices=[],skinIndex=[],skinWeight=[],partIds=[],parts=[],cache=new Map();
 const partId=name=>{let id=parts.indexOf(name);if(id<0){id=parts.length;parts.push(name);}return id;};
 function vertex(p,name,weights){
  const part=partId(name),merged=new Map();for(const [k,w]of weights||[[keyIndex(name),1]])if(w>1e-8)merged.set(k,(merged.get(k)||0)+w);const raw=[...merged].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,4),total=raw.reduce((sum,[,w])=>sum+w,0),w=raw.map(([k,w])=>[k,w/total]),stamp=part+':'+p.map(n=>Math.round(n*1e5)).join(',')+':'+[...w].sort((a,b)=>a[0]-b[0]).map(([i,a])=>i+'/'+Math.round(a*1e5)).join(',');
  if(cache.has(stamp))return cache.get(stamp);const id=positions.length/3;positions.push(...p);partIds.push(part);const list=w.filter(([,w])=>w>1e-8).slice(0,4);while(list.length<4)list.push([0,0]);skinIndex.push(...list.map(([i])=>i));skinWeight.push(...list.map(([,w])=>w));cache.set(stamp,id);return id;
 }
 function triangle(a,b,c){if(a===b||b===c||c===a)return;indices.push(a,b,c);}
 function surface(name,rows,sides,point,transform=new THREE.Matrix4(),reverse=false){
  let previous,first;for(let i=0;i<=rows;i++){const ring=[];for(let j=0;j<sides;j++){const p=point(i/rows,j/sides*Math.PI*2).applyMatrix4(transform);ring.push(vertex(p.toArray(),name));}if(!first)first=ring;if(previous)for(let j=0;j<sides;j++){const k=(j+1)%sides;const a=previous[j],b=ring[j],c=previous[k],d=ring[k];if(reverse){triangle(a,b,c);triangle(c,b,d);}else{triangle(a,c,b);triangle(c,d,b);}}previous=ring;}return {first,last:previous};
 }
 function ellipsoid(name,center,size,rows=10,sides=16){surface(name,rows,sides,(t,a)=>{const y=Math.cos(t*Math.PI),r=Math.sin(t*Math.PI);return new THREE.Vector3(center.x+size.x*r*Math.cos(a),center.y+size.y*y,center.z+size.z*r*Math.sin(a));});}
 function cap(name,ring,reverse){const center=[0,0,0];for(const id of ring)for(let a=0;a<3;a++)center[a]+=positions[id*3+a]/ring.length;const c=vertex(center,name);for(let j=0;j<ring.length;j++){const a=ring[j],b=ring[(j+1)%ring.length];if(reverse)triangle(b,a,c);else triangle(a,b,c);}}
 const matrix=key=>new THREE.Matrix4().multiplyMatrices(rootInverse,m[key].imageWrapper.matrixWorld);
 function trunk(name,sections){
  sections=name==='pelvis'?sections.slice(0,-1):sections.slice(1,-1);
  const curve=new THREE.CatmullRomCurve3(sections.map(([y,d,w])=>new THREE.Vector3(d,y,w))),offset=new THREE.CatmullRomCurve3(sections.map(([y,,,x=0])=>new THREE.Vector3(x,y,0)));
  const rings=surface(name,32,28,(t,a)=>{const q=curve.getPoint(t);return new THREE.Vector3(offset.getPoint(t).x+Math.max(0,q.x)*Math.cos(a),q.y,Math.max(0,q.z)*Math.sin(a));},matrix(name),true);
  cap(name,rings.first,false);cap(name,rings.last,true);
 }
 const feminine=!!m.userData.bodyProfile?.chest;
 trunk('pelvis',[[-5.2,0,0,-.4],[-4.3,2.4,3.1,-.5],[-2.8,3.5,5.9,-.65],[-.7,3.8,feminine?6.55:5.9,-.8],[1.8,3.25,feminine?5.7:5.2,-1.0],[4.1,2.6,feminine?3.7:4.0,-1.65],[5.2,2.45,feminine?3.35:3.8,-2],[5.35,0,0,-2]],true);
 trunk('torso',[[-.8,0,0,0],[-.6,2.45,feminine?3.35:3.8,0],[1.5,2.45,feminine?3.25:3.8,0],[4.2,2.8,4.05,0],[7,3.25,4.95,0],[10,3.35,5.25,0],[12.4,3.05,5.3,0],[13.6,2.5,5.25,0],[14.5,1.7,3.2,0],[15.3,1.4,1.7,0],[15.45,0,0,0]]);
 // A featureless egg head, sized from the configured head-unit bounds.
 const hc=headBox.getCenter(new THREE.Vector3()),hh=headBox.max.y-headBox.min.y;
 surface('head',20,28,(t,a)=>{const y=Math.cos(t*Math.PI),r=Math.sin(t*Math.PI),jaw=.66+.34*THREE.MathUtils.smoothstep(y,-.9,.08);return new THREE.Vector3(hc.x+hh*.385*r*Math.cos(a)+hh*.025*(1-y),hc.y+hh*.5*y,hc.z+hh*.385*r*Math.sin(a)*jaw);});
 const n=at('neck'),top=new THREE.Vector3(hc.x,headBox.min.y+hh*.16,hc.z),axis=top.clone().sub(n);
 const neckRings=surface('neck',10,16,(t,a)=>{const radius=1.30*(1-.1*Math.sin(t*Math.PI)),p=n.clone().addScaledVector(axis,t);return p.add(new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius));},new THREE.Matrix4(),true);cap('neck',neckRings.first,false);cap('neck',neckRings.last,true);

 const jointParts=new Map(),labelFor=i=>{let best=0;for(let j=1;j<4;j++)if(source.skinWeight[i*4+j]>source.skinWeight[i*4+best])best=j;const key=keys[source.skinIndex[i*4+best]];return key.includes('finger')?key.slice(0,2)+'wrist':key;};
 const retain=key=>key.endsWith('_wrist')||key.endsWith('_ankle');
 const points=Array.from({length:source.positions.length/3},(_,i)=>({p:source.positions.slice(i*3,i*3+3),label:labelFor(i),weights:source.skinIndex.slice(i*4,i*4+4).map((k,j)=>[k,source.skinWeight[i*4+j]])}));
 const limbProfiles={arm:[[0,1.8,1.9],[.22,2.05,2.1],[.6,1.65,1.7],[1,1.35,1.4]],elbow:[[0,1.35,1.4],[.25,1.75,1.8],[.55,1.45,1.5],[1,.92,1.05]],leg:[[0,2.6,2.65],[.22,3.25,3.3],[.55,2.95,3],[1,1.75,1.85]],knee:[[0,1.75,1.85],[.26,2.25,2.3],[.5,1.95,2.0],[.8,1.25,1.35],[1,.92,1.05]]};

 for(const side of ['l','r'])for(const [part,end]of [['arm','elbow'],['elbow','wrist'],['leg','knee'],['knee','ankle']]){
  const name=side+'_'+part,start=at(name),finish=at(side+'_'+end),length=start.distanceTo(finish),y=finish.clone().sub(start).normalize(),x=new THREE.Vector3(1,0,0).addScaledVector(y,-y.x).normalize(),z=x.clone().cross(y).normalize();
  const values=limbProfiles[part],first=values[0],last=values.at(-1),controls=[[-.065,0,0],[-.035,first[1]*.8,first[2]*.8],...values,[1.035,last[1]*.8,last[2]*.8],[1.065,0,0]],curve=new THREE.CatmullRomCurve3(controls.map(([t,d,w])=>new THREE.Vector3(d,t,w)));
  surface(name,20,20,(t,a)=>{const p=curve.getPoint(t),offset=part==='knee'?-.35*Math.sin(Math.PI*THREE.MathUtils.clamp(p.y,0,1)):0;return start.clone().addScaledVector(y,p.y*length).addScaledVector(x,Math.max(0,p.x)*Math.cos(a)+offset).addScaledVector(z,Math.max(0,p.z)*Math.sin(a));},new THREE.Matrix4(),true);
 }
 function blend(items){const p=[0,0,0],w=new Map();for(const item of items){item.p.forEach((v,k)=>p[k]+=v/items.length);for(const [k,a]of item.weights)w.set(k,(w.get(k)||0)+a/items.length);}return {p,weights:[...w].sort((a,b)=>b[1]-a[1]).slice(0,4)};}
 function polygon(name,items){if(!retain(name))return;const soft=name.endsWith('_wrist'),ids=items.map(item=>vertex(item.p,name,soft?item.weights:null));for(let j=1;j<ids.length-1;j++)triangle(ids[0],ids[j],ids[j+1]);if(!jointParts.has(name))jointParts.set(name,[]);}
 for(let i=0;i<source.indices.length;i+=3){const tri=source.indices.slice(i,i+3).map(id=>points[id]),labels=[...new Set(tri.map(v=>v.label))];
  if(labels.length===1){polygon(labels[0],tri);continue;}
  if(labels.length===3){const center=blend(tri);for(let j=0;j<3;j++)polygon(tri[j].label,[tri[j],blend([tri[j],tri[(j+1)%3]]),center,blend([tri[(j+2)%3],tri[j]])]);continue;}
  for(const label of labels){const poly=[];for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3];if(a.label===label)poly.push(a);if((a.label===label)!==(b.label===label))poly.push(blend([a,b]));}polygon(label,poly);}
 }
 // Close the trimmed authored sections. Each closed cap stays on the same rigid part.
 const boundary=new Map();for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){const a=indices[i+j],b=indices[i+(j+1)%3],part=partIds[a];if(!jointParts.has(parts[part]))continue;const stamp=part+':'+[a,b].sort((x,y)=>x-y).join(':');if(boundary.has(stamp))boundary.delete(stamp);else boundary.set(stamp,{a,b,part});}
 for(const name of jointParts.keys()){
  const edges=[...boundary.values()].filter(e=>parts[e.part]===name),next=new Map(edges.map(e=>[e.a,e.b])),visited=new Set();
  for(const edge of edges){if(visited.has(edge.a))continue;const loop=[];let v=edge.a;while(!visited.has(v)&&next.has(v)){visited.add(v);loop.push(v);v=next.get(v);}if(v!==loop[0]||loop.length<3)continue;const center=[0,0,0];for(const id of loop)for(let a=0;a<3;a++)center[a]+=positions[id*3+a]/loop.length;const c=vertex(center,name);for(let j=0;j<loop.length;j++)triangle(loop[(j+1)%loop.length],loop[j],c);}
 }
 // Rounded connectors cover the rotating boundaries; they are model geometry,
 // distinct from the editor's temporary IK handles.
 for(const side of ['l','r'])for(const [part,radii]of [['arm',[1.85,1.9,1.9]],['elbow',[1.38,1.38,1.38]],['wrist',[.92,.95,.95]],['leg',[2.6,2.6,2.6]],['knee',[1.8,1.8,1.85]],['ankle',[1.0,1.0,1.0]]])ellipsoid(side+'_'+part,at(side+'_'+part),new THREE.Vector3(...radii),12,16);
 for(const side of ['l','r'])ellipsoid(side+'_leg',at(side+'_knee').add(new THREE.Vector3(1.96,0,0)),new THREE.Vector3(.34,1.32,1.38),8,14);
 const chest=m.userData.bodyProfile?.chest;
 if(chest){
  for(const side of [-1,1]){
   const cy=17*chest.height-.3,cz=side*5*chest.spacing,base=2.25,depth=3.65*chest.projection;
   surface('torso',16,28,(t,a)=>{const phi=t*Math.PI,r=Math.sin(phi),front=Math.cos(phi),vertical=Math.cos(a),medial=Math.sin(a)*side<0,width=medial?2.25:2.65,ry=vertical>0?3.2:2.65;return new THREE.Vector3(base+depth*front,cy+ry*r*vertical-.32*Math.max(front,0),cz+width*r*Math.sin(a));},matrix('torso'),true);
  }
  m.userData.surfaceChestAnchors=[-1,1].map(side=>[3.4,17*chest.height-.3,side*5*chest.spacing]);
 }else m.userData.surfaceChestAnchors=null;
 const frames={};for(const side of ['l','r'])for(const [part,end]of [['arm','elbow'],['elbow','wrist'],['leg','knee'],['knee','ankle']]){const start=at(side+'_'+part),finish=at(side+'_'+end),y=finish.clone().sub(start).normalize(),x=new THREE.Vector3(1,0,0).addScaledVector(y,-y.x).normalize();frames[side+'_'+part]={start,y,x,z:x.clone().cross(y).normalize(),length:start.distanceTo(finish)};}
 const invTorso=matrix('torso').invert(),invPelvis=matrix('pelvis').invert(),guides=[];
 for(let i=0;i<positions.length/3;i++){const name=parts[partIds[i]],p=new THREE.Vector3(...positions.slice(i*3,i*3+3));let guide=[0,0,0];
  if(name==='torso'){p.applyMatrix4(invTorso);guide=[p.z/5,1,THREE.MathUtils.smoothstep(p.x,.5,2.5)];}
  else if(name==='pelvis'){p.applyMatrix4(invPelvis);guide=[p.z/6,(p.y-(Math.abs(p.z)*.6-4.7))/5,THREE.MathUtils.smoothstep(p.x,.1,1.8)];}
  else if(frames[name]){const f=frames[name],v=p.sub(f.start),t=v.dot(f.y)/f.length;guide=[v.dot(f.z)/3,(t-.53)*2,t>.07&&t<.94?THREE.MathUtils.smoothstep(v.dot(f.x),.1,1):0];}
  guides.push(...guide);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));geometry.setAttribute('color',new THREE.Float32BufferAttribute(positions.map(()=>1),3));geometry.setAttribute('bodyGuide',new THREE.Float32BufferAttribute(guides,3));geometry.computeVertexNormals();geometry.userData.sections=parts;geometry.userData.partIds=partIds;return geometry;
}
