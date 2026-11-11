import * as THREE from 'three';
import {coreField,toWorld} from './doll-core-geometry.js';

// A single watertight outer torso follows the same pelvis/abdomen/thorax rig.
// Blend weights depend on neutral author-space height, never screen coordinates.
export function createTorsoSkin(mesh,bones,design){
 const names=['pelvis','abdomen','thorax'],origins=[toWorld([0,545,0]),toWorld([0,481,0]),toWorld([0,419,0])],rest=Float32Array.from(mesh.geometry.attributes.position.array),restNormals=Float32Array.from(mesh.geometry.attributes.normal.array),inverse=new THREE.Matrix4(),matrices=names.map(()=>new THREE.Matrix4()),v=new THREE.Vector3(),sum=new THREE.Vector3();let previous=[];
 const field=coreField(design,'torso');
 function weights(y){const upper=1-THREE.MathUtils.smoothstep(y,380,452),lower=THREE.MathUtils.smoothstep(y,462,522);return [lower,1-upper-lower,upper];}
 const vertexWeights=Array.from({length:rest.length/3},(_,i)=>weights(650-rest[i*3+1]*200));
 const smoothDerivative=(y,a,b)=>{const t=(y-a)/(b-a);return t>0&&t<1?6*t*(1-t)/(b-a):0;},weightDerivatives=Array.from({length:rest.length/3},(_,i)=>{const y=650-rest[i*3+1]*200,lower=-200*smoothDerivative(y,462,522),upper=200*smoothDerivative(y,380,452);return[lower,-lower-upper,upper];});
 function local(p,w){sum.set(0,0,0);for(let j=0;j<3;j++)if(w[j])sum.addScaledVector(v.copy(p).applyMatrix4(matrices[j]),w[j]);return sum;}
 function update(){for(let i=0;i<3;i++){const chain=[];for(let n=bones.get(names[i]);n&&n!==mesh.parent;n=n.parent)chain.unshift(n);matrices[i].identity();for(const n of chain){n.updateMatrix();matrices[i].multiply(n.matrix);}matrices[i].multiply(new THREE.Matrix4().makeTranslation(-origins[i].x,-origins[i].y,-origins[i].z));}const signature=matrices.flatMap(m=>m.elements);if(previous.length&&signature.every((n,i)=>Math.abs(n-previous[i])<1e-7))return;previous=signature;
  const pos=mesh.geometry.attributes.position,normals=mesh.geometry.attributes.normal,p=new THREE.Vector3(),mapped=new THREE.Vector3(),normal=new THREE.Vector3(),jacobian=new THREE.Matrix3(),normalMatrix=new THREE.Matrix3();let minAbsDeterminant=Infinity,fallback=0;for(let i=0;i<pos.count;i++){p.fromArray(rest,i*3);sum.set(0,0,0);const w=vertexWeights[i],dw=weightDerivatives[i],J=jacobian.elements;J.fill(0);for(let j=0;j<3;j++){if(!w[j]&&!dw[j])continue;const M=matrices[j].elements;mapped.copy(p).applyMatrix4(matrices[j]);sum.addScaledVector(mapped,w[j]);for(let c=0;c<3;c++)for(let r=0;r<3;r++)J[c*3+r]+=w[j]*M[c*4+r];J[3]+=dw[j]*mapped.x;J[4]+=dw[j]*mapped.y;J[5]+=dw[j]*mapped.z;}pos.setXYZ(i,sum.x,sum.y,sum.z);const determinant=Math.abs(jacobian.determinant());minAbsDeterminant=Math.min(minAbsDeterminant,determinant);if(determinant<1e-10||!Number.isFinite(determinant)){fallback++;continue;}normalMatrix.copy(jacobian).invert().transpose();normal.fromArray(restNormals,i*3).applyMatrix3(normalMatrix).normalize();normals.setXYZ(i,normal.x,normal.y,normal.z);}pos.needsUpdate=true;if(fallback)mesh.geometry.computeVertexNormals();else normals.needsUpdate=true;mesh.userData.skinNormalFrame={method:'neutral indexed surface normals transformed by actual skin Jacobian inverse-transpose',minAbsDeterminant,geometricFallbackVertices:fallback};mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
 }
 function projectPoint(p){return mesh.localToWorld(local(toWorld(p),weights(p[1])).clone());}
 function surface(x,y){let z=150;while(z>0&&field(x,y,z)>0)z-=2;if(z<=0)return null;let lo=z,hi=z+2;for(let k=0;k<8;k++){const mid=(lo+hi)/2;if(field(x,y,mid)>0)hi=mid;else lo=mid;}return [x,y,hi+1];}
 const center=Array.from({length:92},(_,i)=>surface(0,250+i*355/91)),waist=Array.from({length:85},(_,i)=>{const a=-Math.PI/2+i/84*Math.PI;return surface(58*Math.sin(a),449+24*Math.cos(a));}),bust=[-1,1].map(side=>Array.from({length:52},(_,i)=>{const a=i/51*Math.PI;return surface(side*44+36*Math.cos(a),355+35*Math.sin(a));}));
 const groin=[-1,1].map(side=>Array.from({length:65},(_,i)=>{const t=i/64;return surface(side*88*(1-t),535+76*t);}));
 return {update,projectPoint,guides(){return [center,waist,...bust,...groin].map(c=>c.map(p=>p?projectPoint(p):null));},weights};
}
