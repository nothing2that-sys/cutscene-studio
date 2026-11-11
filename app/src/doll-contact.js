import * as THREE from 'three';

// Solid-union queries on the actual indexed display triangles. Separate closed
// components (joint/outer shell/phalanges) use independent parity counts.
export class DollSolid {
 constructor(mesh){this.mesh=mesh;this.nodes=[];this.components=mesh.geometry.userData.contactComponents||[{start:0,count:mesh.geometry.index.count}];this.triangleComponent=new Int16Array(mesh.geometry.index.count/3);for(let c=0;c<this.components.length;c++){const p=this.components[c];for(let i=p.start/3;i<(p.start+p.count)/3;i++)this.triangleComponent[i]=c;}
  this.p=new THREE.Vector3();this.a=new THREE.Vector3();this.b=new THREE.Vector3();this.c=new THREE.Vector3();this.closest=new THREE.Vector3();this.triangle=new THREE.Triangle();this.ray=new THREE.Ray(new THREE.Vector3(),new THREE.Vector3(1,.371,.153).normalize());this.queryRay=new THREE.Ray();this.inverse=new THREE.Matrix4();this.box=new THREE.Box3();this.lastVersion=-1;this.refit(true);
 }
 vertices(t){const g=this.mesh.geometry,p=g.attributes.position,idx=g.index;this.a.fromBufferAttribute(p,idx.getX(t*3));this.b.fromBufferAttribute(p,idx.getX(t*3+1));this.c.fromBufferAttribute(p,idx.getX(t*3+2));return [this.a,this.b,this.c];}
 refit(initial=false){const g=this.mesh.geometry,p=g.attributes.position;if(!initial&&this.lastVersion===p.version){this.inverse.copy(this.mesh.matrixWorld).invert();this.box.copy(g.boundingBox).applyMatrix4(this.mesh.matrixWorld);return;}
  const n=g.index.count/3,boxes=Array.from({length:n},()=>new THREE.Box3()),centers=new Float32Array(n*3);for(let t=0;t<n;t++){const [a,b,c]=this.vertices(t);boxes[t].setFromPoints([a,b,c]);boxes[t].getCenter(this.p).toArray(centers,t*3);}
  if(initial){const build=ids=>{const node={box:new THREE.Box3(),left:-1,right:-1,ids:null};for(const t of ids)node.box.union(boxes[t]);const id=this.nodes.length;this.nodes.push(node);if(ids.length<=10)node.ids=ids;else{const size=node.box.getSize(this.p),axis=size.x>size.y?(size.x>size.z?0:2):(size.y>size.z?1:2);ids.sort((a,b)=>centers[a*3+axis]-centers[b*3+axis]);const mid=ids.length>>1;node.left=build(ids.slice(0,mid));node.right=build(ids.slice(mid));}return id;};build(Array.from({length:n},(_,i)=>i));}
  else for(let i=this.nodes.length-1;i>=0;i--){const node=this.nodes[i];node.box.makeEmpty();if(node.ids)for(const t of node.ids)node.box.union(boxes[t]);else node.box.union(this.nodes[node.left].box).union(this.nodes[node.right].box);}
  this.lastVersion=p.version;g.computeBoundingBox();this.inverse.copy(this.mesh.matrixWorld).invert();this.box.copy(g.boundingBox).applyMatrix4(this.mesh.matrixWorld);
 }
 containsLocalPoint(point){if(!this.nodes[0].box.containsPoint(point))return false;this.ray.origin.copy(point);const hits=new Map(),stack=[0];while(stack.length){const node=this.nodes[stack.pop()];if(!this.ray.intersectsBox(node.box))continue;if(node.ids){for(const t of node.ids){this.vertices(t);if(this.ray.intersectTriangle(this.a,this.b,this.c,false,this.closest)){const distance=this.closest.distanceTo(point);if(distance>1e-10){const c=this.triangleComponent[t];if(!hits.has(c))hits.set(c,[]);hits.get(c).push(distance);}}}}else stack.push(node.left,node.right);}for(const distances of hits.values()){distances.sort((a,b)=>a-b);let count=0,last=-Infinity;for(const d of distances)if(d-last>1e-9){count++;last=d;}if(count%2)return true;}return false;}
 closestLocalPoint(point){let best=Infinity,result=null;const stack=[0];while(stack.length){const node=this.nodes[stack.pop()];if(node.box.distanceToPoint(point)>=best)continue;if(node.ids){for(const t of node.ids){this.vertices(t);this.triangle.set(this.a,this.b,this.c).closestPointToPoint(point,this.closest);const distance=this.closest.distanceTo(point);if(distance<best){best=distance;result=this.closest.clone();}}}else stack.push(node.left,node.right);}return result;}
 firstLocalHit(ray){let best=Infinity,result=null;const stack=[0];while(stack.length){const node=this.nodes[stack.pop()];if(!ray.intersectsBox(node.box))continue;if(node.ids){for(const t of node.ids){this.vertices(t);if(ray.intersectTriangle(this.a,this.b,this.c,false,this.closest)){const distance=this.closest.distanceToSquared(ray.origin);if(distance<best){best=distance;result=this.closest.clone();}}}}else stack.push(node.left,node.right);}return result;}
 firstRayDistance(worldRay){if(!worldRay.intersectsBox(this.box))return Infinity;const ray=this.queryRay.copy(worldRay).applyMatrix4(this.inverse),stack=[0];let nearest=Infinity;while(stack.length){const node=this.nodes[stack.pop()];if(!ray.intersectsBox(node.box))continue;if(node.ids){for(const t of node.ids){this.vertices(t);if(ray.intersectTriangle(this.a,this.b,this.c,true,this.closest)){this.closest.applyMatrix4(this.mesh.matrixWorld);nearest=Math.min(nearest,this.closest.distanceTo(worldRay.origin));}}}else stack.push(node.left,node.right);}return nearest;}
 interiorDistance(world){if(!this.box.containsPoint(world))return 0;this.p.copy(world).applyMatrix4(this.inverse);const p=this.p.clone();this.ray.origin.copy(p);const hits=new Map(),stack=[0];
  while(stack.length){const node=this.nodes[stack.pop()];if(!this.ray.intersectsBox(node.box))continue;if(node.ids){for(const t of node.ids){this.vertices(t);const hit=this.ray.intersectTriangle(this.a,this.b,this.c,false,this.closest);if(hit){const distance=hit.distanceTo(p);if(distance>1e-7){const key=this.triangleComponent[t];if(!hits.has(key))hits.set(key,[]);hits.get(key).push(distance);}}}}else stack.push(node.left,node.right);}
  let inside=false;for(const distances of hits.values()){distances.sort((a,b)=>a-b);let count=0,last=-1;for(const d of distances)if(d-last>1e-6){count++;last=d;}if(count%2){inside=true;break;}}
  if(!inside)return 0;let best=Infinity;stack.push(0);while(stack.length){const node=this.nodes[stack.pop()];if(node.box.distanceToPoint(p)>=best)continue;if(node.ids){for(const t of node.ids){this.vertices(t);this.triangle.set(this.a,this.b,this.c).closestPointToPoint(p,this.closest);best=Math.min(best,this.closest.distanceTo(p));}}else{const l=this.nodes[node.left].box.distanceToPoint(p),r=this.nodes[node.right].box.distanceToPoint(p);if(l<r)stack.push(node.right,node.left);else stack.push(node.left,node.right);}}
  return best*this.mesh.matrixWorld.getMaxScaleOnAxis();
 }
}

export function createDollContacts(meshes,bones){
 const solids=new Map([...meshes].map(([name,m])=>[name,new DollSolid(m)])),point=new THREE.Vector3(),joint=new THREE.Vector3(),inverse=new THREE.Matrix4(),couplings=new Map();
 const pairKey=(a,b)=>[a,b].sort().join('|');
 const allow=(a,b,bone,radius)=>couplings.set(pairKey(a,b),{bone,radius});
 allow('head','neck','head',24);allow('neck','thorax','neck',31);
 for(const side of ['L','R']){allow('upper'+side,'thorax','upper'+side,38);allow('upper'+side,'fore'+side,'fore'+side,28);allow('fore'+side,'hand'+side,'wrist'+side,18);allow('thigh'+side,meshes.get('thorax')?.userData.torsoSkin?'thorax':'pelvis','thigh'+side,58);allow('thigh'+side,'shin'+side,'shin'+side,37);allow('shin'+side,'foot'+side,'ankle'+side,25);}
 // Only the internal overlap of nested waist fittings is intentional; outer
 // shell contact beyond this inner ellipsoid still participates in checks.
 const waist={ 'abdomen|thorax':{bone:'thorax',r:[48,25,26]},'abdomen|pelvis':{bone:'abdomen',r:[48,25,30]}};
 function permitted(a,b,p){const k=pairKey(a,b),c=couplings.get(k);if(c){inverse.copy(bones.get(c.bone).matrixWorld).invert();return point.copy(p).applyMatrix4(inverse).lengthSq()<(c.radius/200)**2;}const w=waist[k];if(w){inverse.copy(bones.get(w.bone).matrixWorld).invert();point.copy(p).applyMatrix4(inverse);return (point.x*200/w.r[0])**2+(point.y*200/w.r[1])**2+(point.z*200/w.r[2])**2<1;}return false;}
 function refresh(){for(const s of solids.values())s.refit();}
 function audit({stride=15,margin=.004,only=null,maxPairs=Infinity}={}){refresh();const entries=[...solids],pairs=[];let total=0,maxDepth=0;
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){const [a,A]=entries[i],[b,B]=entries[j];if(only&&!only.has(a)&&!only.has(b))continue;if(!A.box.intersectsBox(B.box))continue;let count=0,depth=0,samples=0,first=null;
   for(const [source,target,name,other]of [[A,B,a,b],[B,A,b,a]]){const pos=source.mesh.geometry.attributes.position;for(let k=0;k<pos.count;k+=stride){const p=new THREE.Vector3().fromBufferAttribute(pos,k).applyMatrix4(source.mesh.matrixWorld);if(permitted(name,other,p))continue;samples++;const d=target.interiorDistance(p);if(d>margin){count++;depth=Math.max(depth,d);if(!first)first=p.toArray();}}}
   if(count){pairs.push({a,b,count,samples,maxDepthPixels:depth*200,first});total+=count;maxDepth=Math.max(maxDepth,depth);if(pairs.length>=maxPairs)return {total,maxDepthPixels:maxDepth*200,pairs};}
  }return {total,maxDepthPixels:maxDepth*200,pairs};
 }
 function rayQuery(visible){refresh();const targets=[...solids.values()].filter(s=>visible.includes(s.mesh));return ray=>{let nearest=Infinity;for(const solid of targets)nearest=Math.min(nearest,solid.firstRayDistance(ray));return nearest;};}
 return {audit,refresh,solids,permitted,rayQuery};
}
