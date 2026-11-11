// room.wallShadows: with the key lamp behind the back wall, walls that cast shadows
// darken light.png and color.png and the person's light note says 벽의 그림자; without the
// flag the lamp shines through as before. Usage: node scripts/wall-shadows-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1400,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const unzip=`window.__unzip=z=>{const files={};for(let i=0;i<z.length-4;i++){if(z[i]==0x50&&z[i+1]==0x4b&&z[i+2]==3&&z[i+3]==4){const sz=z[i+18]|z[i+19]<<8|z[i+20]<<16|z[i+21]<<24,nl=z[i+26]|z[i+27]<<8;const name=new TextDecoder().decode(z.subarray(i+30,i+30+nl));files[name.split('/').pop()]=z.slice(i+30+nl,i+30+nl+sz);i+=30+nl+sz-1;}}return files;};
window.__mean=async bytes=>{const img=await createImageBitmap(new Blob([bytes],{type:'image/png'}));const c=new OffscreenCanvas(img.width,img.height),g=c.getContext('2d');g.drawImage(img,0,0);const d=g.getImageData(0,0,img.width,img.height).data;let s=0;for(let i=0;i<d.length;i+=4)s+=d[i]+d[i+1]+d[i+2];return s/(d.length/4)/3;};`;
const scene=flag=>({version:1,units:'meters',title:'벽',room:{size:[6,3,5],walls:true,...(flag?{wallShadows:true}:{})},actors:[{id:'p',name:'인물',position:[0,0,0],yaw:180,height:1.7}],
 camera:{position:[0,1.4,2.4],target:[0,1,-1],fov:50},lighting:{type:'lamp',position:[0,1.6,-3.6],target:[0,1.1,0],intensity:2,ambient:0.15}});
const shoot=s=>page.evaluate(async t=>{const S=window.__bodyV1.studio;await S.importText(t,'w',true);await new Promise(r=>setTimeout(r,600));const p=await S.createShotPackage(),f=window.__unzip(p.zip);
 return {light:await window.__mean(f['light.png']),color:await window.__mean(f['color.png']),note:p.json.labels.find(l=>l.id==='p')?.lightCondition?.text||''};},JSON.stringify(s));
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});await page.addScriptTag({content:unzip});
 const off=await shoot(scene(false)),on=await shoot(scene(true));
 assert.ok(on.light<off.light-5,`walls darken light.png (${off.light.toFixed(1)} -> ${on.light.toFixed(1)})`);
 assert.ok(on.color<off.color-3,`walls darken color.png (${off.color.toFixed(1)} -> ${on.color.toFixed(1)})`);
 assert.match(on.note,/벽의 그림자/);assert.doesNotMatch(off.note,/벽의 그림자/);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,off,on},null,1));
}finally{await browser.close();}
