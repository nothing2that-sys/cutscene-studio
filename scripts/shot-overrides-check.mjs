// Per-shot overrides: shots[].hidden leaves people/props out of that cut (labels, prompt,
// images) and shots[].lighting replaces the lighting for that cut only; the editing scene
// is unchanged afterwards; the panel can set both; they survive save/reopen.
// Usage: node scripts/shot-overrides-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const unzip=`window.__unzip=z=>{const files={};for(let i=0;i<z.length-4;i++){if(z[i]==0x50&&z[i+1]==0x4b&&z[i+2]==3&&z[i+3]==4){const sz=z[i+18]|z[i+19]<<8|z[i+20]<<16|z[i+21]<<24,nl=z[i+26]|z[i+27]<<8;const name=new TextDecoder().decode(z.subarray(i+30,i+30+nl));files[name]=z.slice(i+30+nl,i+30+nl+sz);i+=30+nl+sz-1;}}return files;};`;
const cam={position:[0,1.4,5],target:[0,1,0],fov:45};
const scene={version:1,units:'meters',title:'컷별',room:{size:[8,3,6],walls:true},actors:[{id:'a',name:'민',position:[-0.8,0,0],height:1.7},{id:'b',name:'수',position:[0.8,0,0],height:1.6}],props:[{id:'box',name:'상자',type:'box',position:[0,0,-1],size:[.4,.4,.4]}],
 lighting:{type:'sun',position:[-3,5,3],target:[0,1,0],intensity:2},camera:cam,
 shots:[{id:'wide',name:'둘',camera:cam},{id:'solo',name:'민만',camera:cam,hidden:['b']},{id:'night',name:'밤',camera:cam,lighting:{type:'lamp',position:[1,2,1.5],target:[0,1,0],color:'#9fb8ff',intensity:1,ambient:0.1}}]};
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});await page.addScriptTag({content:unzip});
 const r=await page.evaluate(async t=>{const S=window.__bodyV1.studio;await S.importText(t,'shots',true);await new Promise(r=>setTimeout(r,600));
  const out=await S.createAllShotsPackage(),f=window.__unzip(out.zip),read=n=>JSON.parse(new TextDecoder().decode(f[n]));
  const shots=out.shots.map(s=>({folder:s.folder,people:s.json.labels.filter(l=>l.kind==='person').map(l=>l.id),light:s.json.lighting.type,prompt:new TextDecoder().decode(f[s.folder+'/prompt.txt'])}));
  return {shots,afterVisible:window.__bodyV1.actors.map(a=>a.driver.visible),afterLight:S.snapshot().document.lighting.type};},JSON.stringify(scene));
 assert.deepEqual(r.shots[0].people,['a','b']);assert.deepEqual(r.shots[1].people,['a'],'hidden person left out');assert.ok(!r.shots[1].prompt.includes('= 수'),'hidden person not in the prompt');
 assert.equal(r.shots[0].light,'sun');assert.equal(r.shots[2].light,'lamp','shot lighting used');assert.match(r.shots[2].prompt,/푸른빛/);
 assert.deepEqual(r.afterVisible,[true,true],'editing scene keeps everyone visible');assert.equal(r.afterLight,'sun','base lighting unchanged');
 // Panel: hide the box in the first shot and pin the lighting.
 const openExtras=()=>page.evaluate(()=>{document.querySelectorAll('.studio-shot-extra').forEach(d=>{for(let e=d;e;e=e.parentElement?.closest('details'))e.open=true;});});
 await openExtras();
 await page.locator('.studio-shot-row').first().locator('[data-shot-hide="box"]').check();await page.waitForTimeout(300);
 await openExtras();await page.locator('.studio-shot-row').first().locator('[data-shot-light="pin"]').click();await page.waitForTimeout(300);
 const first=await page.evaluate(()=>{const s=window.__bodyV1.studio.snapshot().shots[0];return {hidden:s.hidden,light:s.lighting?.type};});
 assert.deepEqual(first,{hidden:['box'],light:'sun'});
 // Save/reopen keeps the overrides.
 const project=await page.evaluate(async()=>JSON.stringify(await window.__bodyV1.drive.save()));
 await page.evaluate(async t=>{await window.__bodyV1.studio.importText(t,'reopen',false);},project);await page.waitForTimeout(1200);
 const kept=await page.evaluate(()=>window.__bodyV1.studio.snapshot().shots.map(s=>({h:s.hidden||[],l:s.lighting?.type||null})));
 assert.deepEqual(kept,[{h:['box'],l:'sun'},{h:['b'],l:null},{h:[],l:'lamp'}]);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,shots:r.shots.map(s=>({folder:s.folder,people:s.people,light:s.light})),kept},null,1));
}finally{await browser.close();}
