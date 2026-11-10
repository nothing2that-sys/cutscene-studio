// Body-variety stage 1 review: the default doll and the new body profiles side by side
// at true relative heights, from fixed angles, in clay or silhouette.
import * as THREE from 'three';
import {createFullDoll} from './doll-full-rig.js';
import {BODY_FORMS} from './doll-profiles.js';

const PROFILES=[['default','성인 여성 · 8등신 (현재)',1.65],['male',BODY_FORMS.male.label,1.78],['neutral',BODY_FORMS.neutral.label,1.72],['child',BODY_FORMS.child.label,1.15],['male-heavy',BODY_FORMS['male-heavy'].label,1.78]];
const $=id=>document.getElementById(id),canvas=$('view'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setClearColor(0xffffff);
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x78808b,2.1));const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(-3,4,5);scene.add(key);
const clay=new THREE.MeshStandardMaterial({color:0xc9ccd1,roughness:.9}),black=new THREE.MeshBasicMaterial({color:0x111111});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(8,3),new THREE.MeshBasicMaterial({color:0xeef1f4}));floor.rotation.x=-Math.PI/2;scene.add(floor);
const camera=new THREE.OrthographicCamera(-2.3,2.3,1.29,-1.29,.1,50);
const figures=[],spacing=.85,stats=[];
function measure(rig,frame){frame.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(frame),head=new THREE.Box3().setFromObject(rig.meshes.get('head'));return {height:box.max.y-box.min.y,head:head.max.y-head.min.y,box};}
function fit(fig){const {rig,frame,target}=fig;frame.scale.setScalar(1);frame.position.set(0,0,0);let m=measure(rig,frame);const s=target/m.height;frame.scale.setScalar(s);m=measure(rig,frame);frame.position.y-=m.box.min.y;frame.position.x=fig.x;}
async function build(){
 for(const [i,[profile,label,target]]of PROFILES.entries()){const t0=performance.now();const rig=await createFullDoll({profile,protection:false,initialState:'neutral'});const ms=performance.now()-t0;
  const frame=new THREE.Group();frame.add(rig.root);scene.add(frame);const fig={profile,label,target,rig,frame,x:(i-(PROFILES.length-1)/2)*spacing,ms};fit(fig);figures.push(fig);
  const m=measure(rig,frame);stats.push(`${label.padEnd(18)} 생성 ${Math.round(ms)}ms · 키 ${m.height.toFixed(2)}m · 머리 ${(m.head*100).toFixed(1)}cm · 등신 ${(m.height/m.head).toFixed(2)}`);}
}
function setMaterial(mode){for(const f of figures)f.rig.root.traverse(n=>{if(n.isMesh){n.userData.origMaterial??=n.material;n.material=mode==='silhouette'?black:n.userData.origMaterial;}});floor.visible=mode!=='silhouette';}
function setPose(name){for(const f of figures){f.rig.preset(name);fit(f);}}
function render(angle='front',mode='clay'){
 const dirs={front:[0,0,1],side:[1,0,0],back:[0,0,-1],oblique:[.8,0,.6]},d=new THREE.Vector3(...dirs[angle]).normalize();
 camera.position.copy(d.clone().multiplyScalar(12)).add(new THREE.Vector3(0,.95,0));camera.lookAt(0,.95,0);camera.updateProjectionMatrix();
 // Side and oblique views stack the figures in depth; spread them along the screen instead.
 for(const f of figures){const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),d).normalize().negate();f.frame.position.x=0;f.frame.position.z=0;f.frame.position.addScaledVector(right,-f.x);f.frame.position.y=f.frame.position.y;f.frame.rotation.y=0;}
 setMaterial(mode);renderer.render(scene,camera);return canvas.toDataURL('image/png');
}
await build();setPose('neutral');render();
$('stats').textContent=stats.join('\n');
for(const id of ['angle','mode','pose'])$(id).onchange=()=>{setPose($('pose').value);render($('angle').value,$('mode').value);};
window.__variety={ready:true,stats,render,setPose,profiles:PROFILES.map(p=>p[0]),audit:()=>figures.map(f=>({profile:f.profile,contacts:f.rig.auditContacts?.().total??null})),auditDetail:profile=>{const f=figures.find(x=>x.profile===profile),r=f.rig.auditContacts();return r.pairs.map(p=>({a:p.a,b:p.b,count:p.count,depthMm:+(p.maxDepthPixels*5).toFixed(1)}));}};
