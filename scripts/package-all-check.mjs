// "모든 컷 패키지": one zip with a folder per shot (complete on its own) and index.json;
// the active shot is restored. Label colours (R4): only visible people/props get one,
// people first; more than the palette size is reported as a warning.
// Usage: node scripts/package-all-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1400,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const unzip=`window.__unzip=z=>{const files={};for(let i=0;i<z.length-4;i++){if(z[i]==0x50&&z[i+1]==0x4b&&z[i+2]==3&&z[i+3]==4){const sz=z[i+18]|z[i+19]<<8|z[i+20]<<16|z[i+21]<<24,nl=z[i+26]|z[i+27]<<8;const name=new TextDecoder().decode(z.subarray(i+30,i+30+nl));files[name]=z.slice(i+30+nl,i+30+nl+sz);i+=30+nl+sz-1;}}return files;};`;
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});await page.addScriptTag({content:unzip});
 // Three shots of a two-person scene; one shot frames only the left person.
 const scene={version:1,units:'meters',title:'세 컷 확인',room:{size:[8,3,6],walls:true},camera:{position:[0,1.4,6],target:[0,1,0],fov:45},
  actors:[{id:'a',name:'왼쪽 사람',position:[-1,0,0],height:1.7,bodyType:'male'},{id:'b',name:'오른쪽 사람',position:[1,0,0],height:1.6}],
  props:[{id:'far',name:'먼 상자',type:'box',position:[0,0,-20],size:[.3,.3,.3]}],
  shots:[{id:'wide',name:'넓게',purpose:'두 사람',camera:{position:[0,1.4,6],target:[0,1,0],fov:45}},{id:'left',name:'왼쪽만',purpose:'왼쪽 사람',camera:{position:[-1,1.5,2.2],target:[-1,1.3,0],fov:35}},{id:'top',name:'위에서',purpose:'부감',camera:{position:[0,5,3],target:[0,0.5,0],fov:50}}]};
 const r=await page.evaluate(async scene=>{const S=window.__bodyV1.studio;await S.importText(JSON.stringify(scene),'all',true);await new Promise(r=>setTimeout(r,800));
  const activeBefore=S.snapshot().activeShot;const out=await S.createAllShotsPackage();const files=window.__unzip(out.zip),names=Object.keys(files);
  const read=n=>JSON.parse(new TextDecoder().decode(files[n]));const index=read('index.json');
  const shots=index.shots.map(s=>{const j=read(s.folder+'/shot.json');return {folder:s.folder,name:j.shot.name,people:s.people,labels:j.labels.filter(l=>l.kind!=='floor'&&l.kind!=='wall').map(l=>({id:l.id,color:l.color,visible:l.visible})),hasPrompt:names.includes(s.folder+'/prompt.txt'),images:['color.png','label.png','depth.png','range.png','pose.png','light.png'].every(f=>names.includes(s.folder+'/'+f))};});
  return {activeBefore,activeAfter:S.snapshot().activeShot,shots};},scene);
 assert.equal(r.shots.length,3);assert.deepEqual(r.shots.map(s=>s.folder),['shot-01_넓게','shot-02_왼쪽만','shot-03_위에서']);
 assert.ok(r.shots.every(s=>s.hasPrompt&&s.images),'every folder is complete');
 assert.equal(r.activeAfter,r.activeBefore,'active shot restored');
 const left=r.shots[1];assert.deepEqual(left.people,['왼쪽 사람']);
 const lab=id=>left.labels.find(l=>l.id===id);assert.equal(lab('a').color,'#e6194b');assert.equal(lab('b').color,'','off-screen person gets no colour');assert.equal(lab('far').color,'','off-screen prop gets no colour');
 // Palette overflow: 20 visible props.
 const many={...scene,shots:[],props:Array.from({length:20},(_,i)=>({id:'p'+i,name:'상자'+i,type:'box',position:[-2.4+(i%10)*0.53,0,-1+Math.floor(i/10)*0.6],size:[.3,.3,.3]}))};
 const w=await page.evaluate(async scene=>{const S=window.__bodyV1.studio;await S.importText(JSON.stringify(scene),'many',true);await new Promise(r=>setTimeout(r,800));const p=await S.createShotPackage();return p.json.warnings||[];},many);
 assert.equal(w[0]?.code,'LABEL_COLORS_REPEAT');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,folders:r.shots.map(s=>s.folder),leftLabels:left.labels,overflow:w[0].message},null,1));
}finally{await browser.close();}
