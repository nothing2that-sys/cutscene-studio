// Independently authored study cage. Units are reference-image pixels; +z faces viewer.
// This is not a replacement surface for body-rig.js. Each cage point is editable.
import * as THREE from 'three';
export const landmarks={
 crown:[449,80,0],chin:[475,227,0],shoulderL:[378,273,0],elbowL:[258,387,3],wristL:[352,476,35],
 shoulderR:[543,266,-12],elbowR:[637,166,0],wristR:[522,108,12],
 hipL:[382,567,0],kneeL:[392,820,8],ankleL:[406,1085,8],
 hipR:[507,579,-4],kneeR:[607,816,15],ankleR:[674,1067,12],
};
const V=p=>new THREE.Vector3(...p);
const ringShape=[[0,1],[.42,.96],[.78,.78],[.97,.4],[1,0],[.91,-.46],[.69,-.82],[.36,-.97],[0,-1],[-.36,-.97],[-.69,-.82],[-.91,-.46],[-1,0],[-.97,.4],[-.78,.78],[-.42,.96]];
// Rows: y, center x, lateral extent, anterior depth, posterior depth, breast relief.
// Shoulder, chest root, inframammary fold, costal margin, iliac crest and pubis
// are independent rows. Chest relief is part of the trunk topology, never spheres.
const trunkRows=[
 [216,466,23,22,22,0],[239,467,25,23,24,0],[250,473,51,28,29,0],
 [265,478,72,35,34,0],[285,483,72,43,37,7],[309,490,77,50,38,22],
 [337,496,87,54,39,41],[359,497,88,49,39,49],[378,496,81,43,38,41],
 [394,494,66,40,37,11],[411,492,64,39,36,0],[438,489,57,36,34,0],
 [463,482,59,36,35,0],[484,467,71,38,40,0],[507,450,91,42,48,0],
 [532,440,108,46,57,0],[554,437,119,47,66,0],[578,438,117,43,65,0],
 [596,445,84,35,50,0],[612,452,18,20,27,0],
];
function trunk(neutral){return trunkRows.map(([y,x,w,f,b,ch])=>ringShape.map(([u,v],j)=>{
 const lobe=Math.exp(-(((Math.abs(u)-.65)/.3)**2));
 // broad chest root; medial groove, lower fold and outer fullness share vertices.
 const z=v>=0?f*v+ch*lobe*Math.max(0,v):b*v;
 return [(neutral?480:x)+u*w,y,z];
}));}
function head(neutral){const rows=[[80,0,0],[86,27,24],[104,46,40],[134,56,48],[165,54,48],[193,44,41],[214,29,31],[228,5,8]];return rows.map(([y,w,d])=>ringShape.map(([u,v])=>[(neutral?480:452)+(neutral?0:(y-130)*.15)+u*w,neutral?80+(y-80)*142/148:y,d*v]));}
// Each station is [fraction along bone, lateral shift, width, front, back].
// Unequal front/back and off-axis centers encode biceps, ulna, adductors, calf/tibia.
const profiles={
 upper:[[-.16,0,1,1,1],[-.10,0,24,23,22],[0,0,34,31,29],[.13,-2,36,34,28],[.33,-3,33,33,26],[.56,-1,29,28,25],[.78,1,24,24,22],[1,0,19,20,18]],
 fore:[[0,0,19,21,18],[.17,3,26,25,20],[.35,5,27,25,20],[.58,4,21,21,17],[.82,1,14,16,12],[1,0,11,13,10]],
 thigh:[[0,0,55,51,48],[.15,-5,64,58,49],[.33,-7,61,58,48],[.53,-3,52,49,41],[.73,1,39,39,33],[.9,2,29,30,26],[1,0,25,27,24]],
 shin:[[0,0,24,25,23],[.13,1,29,27,28],[.29,-4,38,31,39],[.45,-6,39,28,41],[.62,-4,30,22,31],[.82,-1,21,17,21],[1,0,16,16,16]],
};
function limb(a,b,profile,mirror=1){a=V(a);b=V(b);const dir=b.clone().sub(a).normalize(),side=new THREE.Vector3(-dir.y,dir.x,0).normalize();
 return profile.map(([t,shift,w,f,bk])=>ringShape.map(([u,v])=>a.clone().lerp(b,t).addScaledVector(side,(u*w+shift)*mirror).add(new THREE.Vector3(0,0,v>=0?v*f:v*bk)).toArray()));
}
export function createStudyCage(pose='reference'){
 const neutral=pose==='neutral',j=structuredClone(landmarks);
 if(neutral)Object.assign(j,{shoulderL:[391,268,0],elbowL:[352,431,0],wristL:[341,563,0],shoulderR:[569,268,0],elbowR:[608,431,0],wristR:[619,563,0],hipL:[424,576,0],kneeL:[424,833,0],ankleL:[424,1098,0],hipR:[536,576,0],kneeR:[536,833,0],ankleR:[536,1098,0]});
 const parts=[{name:'trunk',rings:trunk(neutral)},{name:'head',rings:head(neutral)}];
 for(const s of ['L','R']){
  for(const [name,a,b,c,p,q] of [['arm','shoulder','elbow','wrist','upper','fore'],['leg','hip','knee','ankle','thigh','shin']]){
   const upper=limb(j[a+s],j[b+s],profiles[p],s==='L'?1:-1),lower=limb(j[b+s],j[c+s],profiles[q],s==='L'?1:-1);
   // One shared elbow/knee ring, so neither a floating cap nor a cover sphere.
   const joint=upper.at(-1).map((v,k)=>v.map((n,axis)=>(n+lower[0][k][axis])/2));
   parts.push({name:name+s,rings:[...upper.slice(0,-1),joint,...lower.slice(1)]});
  }
  const w=j['wrist'+s],a=j['ankle'+s];
  const palmEnd=neutral?[w[0]+(s==='L'?-5:5),w[1]+47,w[2]+2]:s==='L'?[398,463,50]:[474,80,12];
  parts.push({name:'palm'+s,rings:limb(w,palmEnd,[[0,0,11,12,10],[.25,0,18,11,9],[.75,0,21,9,8],[1,0,18,8,7]])});
  const d=V(palmEnd).sub(V(w)).normalize(),side=new THREE.Vector3(-d.y,d.x,0);
  for(let k=0;k<4;k++){
   const start=V(palmEnd).addScaledVector(side,(k-1.5)*10),len=[30,37,34,26][k];
   const end=!neutral&&s==='L'?new THREE.Vector3(438-k*4,466+k*10,48-k*2):start.clone().addScaledVector(d,len).add(new THREE.Vector3(0,0,-5));
   parts.push({name:`finger${s}${k}`,rings:limb(start.toArray(),end.toArray(),[[0,0,5.3,6,5],[.5,0,4.8,5,4],[.9,0,4,4,3],[1,0,.8,1,1]])});
  }
  const thumb=V(w).lerp(V(palmEnd),.45).addScaledVector(side,-20),tip=thumb.clone().addScaledVector(side,-14).addScaledVector(d,25);
  parts.push({name:'thumb'+s,rings:limb(thumb.toArray(),tip.toArray(),[[0,0,8,8,7],[.4,0,7,7,6],[.85,0,5,5,4],[1,0,1,1,1]])});
  // Foot cage extends forward in depth; instep, heel and toe box authored separately.
  const footRows=[[a[1]-12,16,15,15,0],[a[1]+12,20,26,20,0],[a[1]+43,25,52,23,1],[a[1]+80,33,78,18,5],[a[1]+104,37,83,13,8],[a[1]+119,33,76,9,9]];
  parts.push({name:'foot'+s,rings:footRows.map(([y,w,f,b,offset])=>ringShape.map(([u,v])=>[a[0]+u*w+offset,y,a[2]+(v>=0?f*v:b*v)]))});
  for(let k=0;k<5;k++){
   const medial=s==='L'?4-k:k,x=a[0]-20+k*13;
   parts.push({name:`toe${s}${k}`,rings:limb([x,a[1]+112,a[2]+44],[x,a[1]+124+(4-medial)*1.2,a[2]+48],[[0,0,7,29,20],[.55,0,6.5,28,18],[.9,0,5,24,15],[1,0,2,16,8]])});
  }
 }
 return {version:1,units:'reference pixels; +y down; +z anterior',pose,parts,joints:j,assumptions:['Orthographic frontal comparison. Drawing perspective is not recovered.','Posterior anatomy and all depths are inferred.','Neutral pose preserves segment lengths approximately; no production rig binding.']};
}
export function cageGeometry(rings){
 // Cubic interpolation of explicitly authored XYZ cage points in both directions.
 const n=rings[0].length,rows=(rings.length-1)*3,cols=n*2,positions=[],indices=[];
 const curves=Array.from({length:n},(_,k)=>new THREE.CatmullRomCurve3(rings.map(r=>V(r[k])),false,'centripetal'));
 for(let i=0;i<=rows;i++){
  const cross=new THREE.CatmullRomCurve3(curves.map(c=>c.getPoint(i/rows)),true,'centripetal');
  for(let k=0;k<cols;k++){const p=cross.getPoint(k/cols);positions.push((p.x-480)/640,(1280-p.y)/640,p.z/640);}
 }
 for(let i=0;i<rows;i++)for(let k=0;k<cols;k++){const a=i*cols+k,b=i*cols+(k+1)%cols,c=a+cols,d=b+cols;indices.push(a,c,b,b,c,d);}
 // Close ends. Rings remain editable; caps are a generated display detail.
 for(const [r,reverse]of [[0,true],[rows,false]]){const id=positions.length/3,center=[0,0,0];for(let k=0;k<cols;k++)for(let a=0;a<3;a++)center[a]+=positions[(r*cols+k)*3+a]/cols;positions.push(...center);for(let k=0;k<cols;k++){const a=r*cols+k,b=r*cols+(k+1)%cols;indices.push(id,reverse?b:a,reverse?a:b);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
