import * as THREE from 'three';

// Lightweight rigid anatomical volumes on the existing rig. No new bones or assets.
const surfaces=new WeakMap();
let mode='human';try{mode=localStorage.getItem('cutscene-body-surface')==='rig'?'rig':'human';}catch{}
export const bodySurfaceMode=()=>mode;
const skinColor='#d9e4f3';
export function surfaceColor(){return mode==='human'?skinColor:'#b59a76';}

// Sections: height, front/back radius, lateral radius, front/back center.
function volume(control,sides=16,hip=false){
 if(sides===16){const a=control[0],b=control.at(-1);control=[[a[0]-.65,.08,.08,a[3]||0],...control,[b[0]+.65,.08,.08,b[3]||0]];}
 const path=new THREE.CatmullRomCurve3(control.map(([y,depth,width])=>new THREE.Vector3(depth,y,width))),offset=new THREE.CatmullRomCurve3(control.map(([y,,,center=0])=>new THREE.Vector3(center,y,0)));
 const sections=Array.from({length:12},(_,i)=>{const p=path.getPoint(i/11);return [p.y,Math.max(.1,p.x),Math.max(.1,p.z),offset.getPoint(i/11).x];});
 const vertices=[],indices=[];
 for(let i=0;i<sections.length;i++)for(let j=0;j<=sides;j++){
  const [y,depth,width,center=0]=sections[i],angle=j/sides*Math.PI*2,groin=hip?2.2*Math.abs(Math.sin(angle))*Math.pow(1-i/11,4):0;
  vertices.push(center+depth*Math.cos(angle),y+groin,width*Math.sin(angle));
 }
 for(let i=0;i<sections.length-1;i++)for(let j=0;j<sides;j++){
  const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);
 }
 // Flat end caps are buried in the adjoining body volume.
 for(const [row,reverse]of [[0,false],[sections.length-1,true]]){
  const center=vertices.length/3;vertices.push(sections[row][3]||0,sections[row][0],0);
  for(let j=0;j<sides;j++){const a=row*(sides+1)+j;indices.push(...(reverse?[center,a+1,a]:[center,a,a+1]));}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const normals=geometry.attributes.normal;for(let i=0;i<sections.length;i++){const a=i*(sides+1),b=a+sides,n=new THREE.Vector3().fromBufferAttribute(normals,a).add(new THREE.Vector3().fromBufferAttribute(normals,b)).normalize();normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);}
 geometry.computeBoundingBox();return geometry;
}
function head(original){
 original.computeBoundingBox();const box=original.boundingBox,size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),geometry=new THREE.SphereGeometry(1,32,24),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i),z=p.getZ(i),jaw=.72+.28*THREE.MathUtils.smoothstep(y,-.85,.1),front=p.getX(i),nose=front>0?.12*Math.exp(-Math.pow((y+.08)/.15,2)-Math.pow(z/.17,2)):0;
  p.setXYZ(i,center.x+(front+nose)*size.x/2,center.y+y*size.y/2,center.z+z*jaw*size.z/2);
 }
 geometry.computeBoundingBox();const changed=geometry.boundingBox.clone(),extent=changed.getSize(new THREE.Vector3());
 for(let i=0;i<p.count;i++)p.setXYZ(i,box.min.x+(p.getX(i)-changed.min.x)/extent.x*size.x,box.min.y+(p.getY(i)-changed.min.y)/extent.y*size.y,box.min.z+(p.getZ(i)-changed.min.z)/extent.z*size.z);
 geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}
function foot(original){
 original.computeBoundingBox();const box=original.boundingBox,size=box.getSize(new THREE.Vector3()),geometry=new THREE.SphereGeometry(1,24,16),positions=geometry.attributes.position;
 // The shoe's local +X is the sole after its existing image rotation.
 for(let i=0;i<positions.count;i++){
  const x=(Math.min(positions.getX(i),.65)+1)/1.65,y=(positions.getY(i)+1)/2,z=(positions.getZ(i)+1)/2;
  positions.setXYZ(i,box.min.x+x*size.x,box.min.y+y*size.y,box.min.z+z*size.z);
 }
 geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}
function anatomicalGeometry(key,image){
 if(key==='head')return head(image.geometry);
 if(key==='torso')return volume([[0,2.95,4.5],[2,2.95,4.4],[5,3.4,5.3],[9,3.7,6.2],[12,3.7,6],[13.4,2.9,6],[14.5,2.1,3.7],[15.3,1.65,1.8]],24);
 if(key==='pelvis')return volume([[-4.5,2.5,3.9,-.6],[-2.5,3.55,5.65,-.65],[0,3.8,6,-.8],[2,3.6,5.8,-1.2],[4,2.95,4.45,-1.8],[6,2.6,3.8,-2]],24,true);
 if(/_arm$/.test(key))return volume([[-1,1.25,1.4],[0,2.05,2.2],[2.5,2.1,2.2],[5.5,1.85,1.95],[9,1.55,1.6],[11.5,1.5,1.55]]);
 if(/_elbow$/.test(key))return volume([[-.7,1.45,1.5],[0,1.5,1.55],[2.5,1.8,1.85],[5,1.6,1.65],[8,1.15,1.3],[11.3,.95,1.1]]);
 if(/_leg$/.test(key))return volume([[-1,2.1,2.2],[0,2.7,2.75],[3,3,2.95],[7,2.65,2.65],[11,2.1,2.15],[15.5,1.8,1.9]]);
 if(/_knee$/.test(key))return volume([[-.7,1.8,1.9],[0,1.9,2],[3.5,2.25,2.35],[6.5,2,2.1],[10,1.35,1.5],[14.25,1.05,1.2]]);
 if(/_ankle$/.test(key))return foot(image.geometry);
 return image.geometry;
}
export function setBodySurface(m,value=mode){
 if(!m?.torso)return;let state=surfaces.get(m);
 if(!state){
  const material=new THREE.MeshStandardMaterial({color:skinColor,emissive:'#26354a',emissiveIntensity:.15,roughness:.85,metalness:0,side:THREE.DoubleSide});
  const parts=[];
  for(const [key,joint]of Object.entries(m))if(joint?.image?.isMesh){
   const image=joint.image;parts.push({image,original:image.geometry,material:image.material,humanMaterial:material.clone(),human:anatomicalGeometry(key,image),children:image.children.filter(c=>c.isMesh).map(child=>({child,visible:child.visible}))});
  }
  state={material,parts};surfaces.set(m,state);
 }
 const human=value==='human';
 m.traverse(mesh=>{const saved=mesh.userData.origEmissive;if(!mesh.isMesh||!saved)return;const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material],colors=Array.isArray(saved)?saved:[saved];materials.forEach((material,i)=>material.emissive?.copy(colors[i]||colors[0]));delete mesh.userData.origEmissive;});
 for(const part of state.parts){part.image.geometry=human?part.human:part.original;part.image.material=human?part.humanMaterial:part.material;for(const {child,visible}of part.children)child.visible=human?false:visible;}
 m.userData.bodySurface=human?'human':'rig';
 const chest=m.getObjectByName('Chest volume reference');chest?.children.forEach(mesh=>mesh.material.color.set(human?skinColor:'#b59a76'));
}
export function setBodySurfaceMode(value,models=[]){
 mode=value==='rig'?'rig':'human';try{localStorage.setItem('cutscene-body-surface',mode);}catch{}
 models.forEach(m=>setBodySurface(m,mode));
}
