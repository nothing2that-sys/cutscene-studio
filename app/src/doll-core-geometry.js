import * as THREE from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {reduceDollMesh} from './doll-mesh-reduction.js';

// New core sculpt, independent of body-study-cage.js. Coordinates: image pixels,
// centered x, y down, z toward viewer. Section columns: y, half-width, front, back.
// Socket fields subtract real cavities; they are not painted joint circles.
export function defaultCoreDesign(){return {
 version:1,kind:'articulated-doll-core',resolution:80,displayQuality:'balanced',
 thorax:{sections:[[239,25,24,23],[250,52,30,28],[266,78,37,35],[286,82,42,38],[310,83,43,39],[336,86,42,40],[359,84,39,40],[378,77,37,39],[395,66,35,37],[410,62,34,36],[423,59,33,34]],
  relief:{projection:52,spacing:42,width:32,upper:54,lower:26,centerY:355,clavicle:4.5,
   // dy, root half-width, relief height. The upper root spreads into the chest;
   // the lower rows turn under at the inframammary fold rather than a cone tip.
   profile:[[-85,58,0],[-60,55,.12],[-36,53,.42],[-16,51,.78],[0,48,1],[15,44,.96],[28,36,.62],[39,28,.06],[43,22,0]]},
  sockets:[{name:'shoulderL',center:[-91,274,0],radius:[34,35,32]},{name:'shoulderR',center:[91,274,0],radius:[34,35,32]},{name:'waistUpper',center:[0,419,0],radius:[63,30,36]}]},
 abdomen:{sections:[[389,3,3,3],[395,37,24,23],[405,55,31,31],[419,60,34,33],[438,58,35,33],[455,60,37,34],[474,67,39,37],[485,70,40,39],[496,62,35,35],[505,40,23,23],[511,2,2,2]],sockets:[]},
 pelvis:{sections:[[473,66,35,37],[488,77,40,44],[507,96,45,56],[529,111,47,66],[547,116,45,70],[563,115,41,69],[579,106,37,62],[594,80,32,49],[608,37,24,32],[617,3,3,3]],
  sockets:[{name:'waistLower',center:[0,481,0],radius:[72,30,42]},{name:'hipL',center:[-61,584,1],radius:[55,55,48]},{name:'hipR',center:[61,584,1],radius:[55,55,48]}]},
 assumptions:['Posterior shape, depths, socket interiors and pivot axes are authored assumptions.','Reference pose is a rigid three-part assembly preset, not a recovered camera or physical doll mechanism.','Socket clearance is for a digital study; not manufacturing tolerance.']
};}
export const coreNames=['thorax','abdomen','pelvis'];
export const CORE_SURFACE_REVISION=3;
export const coreShapeKey=(design,name)=>JSON.stringify([CORE_SURFACE_REVISION,name,design.resolution,design[name]]);
export const coreLabels={thorax:'흉곽·가슴',abdomen:'복부·허리',pelvis:'골반·고관절'};
export const toWorld=([x,y,z])=>new THREE.Vector3(x/200,(650-y)/200,z/200);
const bell=(x,s)=>Math.exp(-((x/s)**2));
function interpolate(sections,y,col,minimum=.5){
 let i=0;while(i<sections.length-2&&sections[i+1][0]<y)i++;
 const a=sections[i],b=sections[i+1],t=THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1);
 // Hermite with harmonic, sign-limited slopes avoids overshooting socket lips.
 const slope=k=>{if(k===0)return (sections[1][col]-sections[0][col])/(sections[1][0]-sections[0][0]);if(k===sections.length-1)return (sections[k][col]-sections[k-1][col])/(sections[k][0]-sections[k-1][0]);const p=(sections[k][col]-sections[k-1][col])/(sections[k][0]-sections[k-1][0]),q=(sections[k+1][col]-sections[k][col])/(sections[k+1][0]-sections[k][0]);return p*q<=0?0:2*p*q/(p+q);};
 const h=b[0]-a[0];return Math.max(minimum,(2*t**3-3*t*t+1)*a[col]+(t**3-2*t*t+t)*h*slope(i)+(-2*t**3+3*t*t)*b[col]+(t**3-t*t)*h*slope(i+1));
}
function ellipsoidDistance(x,y,z,c,r){return (Math.hypot((x-c[0])/r[0],(y-c[1])/r[1],(z-c[2])/r[2])-1)*Math.min(...r);}
function roundedMaximum(a,b,radius=4){const h=Math.max(radius-Math.abs(a-b),0)/radius;return Math.max(a,b)+h*h*radius*.25;}
export function coreField(design,name){
 if(name==='torso'){const d=design.torso,fields=['thorax','abdomen','pelvis'].map(n=>coreField(d.parts,n)),join=(a,b)=>Math.min(a,b)-Math.max(d.blend-Math.abs(a-b),0)**2/(4*d.blend);return (x,y,z)=>{let value=join(join(fields[0](x,y,z),fields[1](x,y,z)),fields[2](x,y,z));for(const joint of d.jointSolids||[])value=join(value,ellipsoidDistance(x,y,z,joint.center,joint.radius));return value;};}
 const part=design[name],rows=part.sections,minY=rows[0][0],maxY=rows.at(-1)[0];
 // Precompute section samples; y interpolation during meshing is frequent.
 const samples=[];for(let y=Math.floor(minY)-10;y<=Math.ceil(maxY)+10;y++){const r=part.relief,dy=r?y-r.centerY:0,profile=r?.profile,within=profile&&dy>=profile[0][0]&&dy<=profile.at(-1)[0];samples.push([y,...[1,2,3].map(k=>interpolate(rows,y,k)),within?interpolate(profile,dy,1):1,within?interpolate(profile,dy,2,0):0]);}const sampleY=samples[0][0];
 return (x,y,z)=>{
  const sy=THREE.MathUtils.clamp(y-sampleY,0,samples.length-1),i=Math.min(Math.floor(sy),samples.length-2),t=sy-i,at=k=>samples[i][k]*(1-t)+samples[i+1][k]*t;
  const sideScale=part.sideWidthScale??1,width=at(1)*(sideScale+(1-sideScale)*THREE.MathUtils.smoothstep(z,0,30));let front=at(2),back=at(3);
  if(name==='thorax'){
   const r=part.relief,dy=y-r.centerY,lobes=bell(x-r.spacing,r.width)+bell(x+r.spacing,r.width),vertical=bell(dy,dy<0?r.upper:r.lower);
   if(r.profile){const width=at(4),section=at(5),lobe=side=>Math.max(0,1-((x-side*r.spacing)/width)**2)**1.5;front+=r.projection*section*(lobe(-1)+lobe(1));}
   else front+=r.projection*lobes*vertical;
   if(r.profile){const t=THREE.MathUtils.clamp((Math.abs(x)-16)/62,0,1),arc=254+t*16+2*Math.sin(t*Math.PI);front+=r.clavicle*Math.sin(Math.PI*t)*bell(y-arc,3.5);front-=2.5*bell(x,7)*bell(y-252,6);}
   else front+=r.clavicle*bell(y-(254+Math.abs(x)*.16),4.5)*bell(x,75);
   front+=2*bell(x,8)*bell(y-285,38); // sternum and upper chest, no separate sphere
   back+=3.5*(bell(x-42,20)+bell(x+42,20))*bell(y-294,36)-2*bell(x,8)*bell(y-320,60);
  }else if(name==='abdomen'){
   front+=1.8*bell(x,8)*bell(y-440,24)-1.6*bell(x,4)*bell(y-456,4);
   back+=2.5*bell(y-462,25)-1.3*bell(x,9)*bell(y-453,35);
  }else{
   front+=3*bell(x,30)*bell(y-531,35);
   back+=6*(bell(x-45,27)+bell(x+45,27))*bell(y-551,34)-4*bell(x,9)*bell(y-565,31);
  }
  let d=(Math.hypot(x/width,z/(z>=0?front:back))-1)*Math.min(width,z>=0?front:back);
  d=Math.max(d,minY-y,y-maxY);
  for(const socket of part.sockets)d=roundedMaximum(d,-ellipsoidDistance(x,y,z,socket.center,socket.radius));
  return d;
 };
}

// Extract the solid and socket walls with Three's marching cubes. Weld positions
// before assigning analytic normals: socket intersections remain real geometry.
const sourceCache=new Map(),displayCache=new Map();
function remember(cache,key,g,limit){cache.set(key,g.clone());while(cache.size>limit){const first=cache.keys().next().value;cache.get(first).dispose();cache.delete(first);}}
export function meshCorePart(design,name){
 const quality=design.displayQuality||'balanced',shapeKey=coreShapeKey(design,name),displayKey=shapeKey+':'+quality;
 if(displayCache.has(displayKey)){const cached=displayCache.get(displayKey);displayCache.delete(displayKey);displayCache.set(displayKey,cached);return cached.clone();}
 let g;
 if(sourceCache.has(shapeKey))g=sourceCache.get(shapeKey).clone();else{
 const field=coreField(design,name),rows=design[name].sections,n=design.resolution,
  xExtent=Math.max(140,...rows.map(r=>r[1]+20),...(design[name].jointSolids||[]).map(j=>Math.abs(j.center[0])+j.radius[0]+32)),backExtent=Math.max(104,...rows.map(r=>r[3]+30)),frontExtent=Math.max(136,...rows.map(r=>r[2]+(name==='thorax'?design.thorax.relief.projection*1.4:10)+20)),
  minY=Math.min(rows[0][0],...(design[name].jointSolids||[]).map(j=>j.center[1]-j.radius[1]))-32,maxY=Math.max(rows.at(-1)[0],...(design[name].jointSolids||[]).map(j=>j.center[1]+j.radius[1]))+32,start=[-xExtent,minY,-backExtent],span=[xExtent*2,maxY-minY,backExtent+frontExtent],material=new THREE.MeshBasicMaterial(),mc=new MarchingCubes(n,material,false,false,60000);
 mc.isolation=0;
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)mc.field[(z*n+y)*n+x]=-field(start[0]+x/n*span[0],start[1]+y/n*span[1],start[2]+z/n*span[2]);
 mc.update();if(mc.count<3||mc.count>=180000)throw Error('조형 단면/소켓 크기로 유효한 메시를 만들 수 없습니다.');
 const raw=new THREE.BufferGeometry(),world=[];
 for(let i=0;i<mc.count*3;i+=3){const author=[0,1,2].map(k=>start[k]+(mc.positionArray[i+k]+1)*.5*span[k]);world.push(...toWorld(author).toArray());}
 // The author-to-world conversion reverses y; reverse triangle winding too.
 for(let i=0;i<world.length;i+=9)for(let k=0;k<3;k++){const b=world[i+3+k];world[i+3+k]=world[i+6+k];world[i+6+k]=b;}
 raw.setAttribute('position',new THREE.Float32BufferAttribute(world,3));g=mergeVertices(raw,1e-6);raw.dispose();mc.geometry.dispose();material.dispose();
 // Iso values close to a grid corner can produce collapsed triangles after
 // welding. Remove these before computing adjacency, rather than hiding holes.
 const clean=[],pos=g.attributes.position,idx=g.index;
 for(let i=0;i<idx.count;i+=3){const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2);if(a!==b&&b!==c&&a!==c)clean.push(a,b,c);}g.setIndex(clean);
 const neighbors=Array.from({length:pos.count},()=>new Set());for(let i=0;i<clean.length;i+=3)for(let k=0;k<3;k++){const a=clean[i+k],b=clean[i+(k+1)%3];neighbors[a].add(b);neighbors[b].add(a);}
 let smooth=Float64Array.from(pos.array);for(let cycle=0;cycle<16;cycle++)for(const amount of [.45,-.47]){const next=new Float64Array(smooth.length);for(let i=0;i<neighbors.length;i++)for(let axis=0;axis<3;axis++){let sum=0;for(const j of neighbors[i])sum+=smooth[j*3+axis];next[i*3+axis]=neighbors[i].size?smooth[i*3+axis]+amount*(sum/neighbors[i].size-smooth[i*3+axis]):smooth[i*3+axis];}smooth=next;}pos.array.set(smooth);
 g.userData={part:name,resolution:n,socketRounding:4,smoothingCycles:16};
 }
 const field=coreField(design,name),e=.35;
 function assignNormals(mesh){const normals=[],pos=mesh.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i)*200,y=650-pos.getY(i)*200,z=pos.getZ(i)*200,v=new THREE.Vector3(field(x+e,y,z)-field(x-e,y,z),field(x,y-e,z)-field(x,y+e,z),field(x,y,z+e)-field(x,y,z-e)).normalize();normals.push(...v.toArray());}mesh.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));}
 if(!g.attributes.normal){assignNormals(g);remember(sourceCache,shapeKey,g,6);}
 const sourceTriangles=g.index.count/3,budgets=quality==='light'?{thorax:2200,abdomen:1200,pelvis:2800,torso:6500}:{thorax:4200,abdomen:2400,pelvis:5000,torso:10000};
 if(quality!=='source'&&sourceTriangles>budgets[name]){const reduced=reduceDollMesh(g,budgets[name]);g.dispose();g=reduced;}
 if(!g.attributes.normal)assignNormals(g);if(design.previewBundle==='full'||name==='torso')g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.displayQuality=quality;g.userData.sourceTriangles=sourceTriangles;remember(displayCache,displayKey,g,12);return g;
}
