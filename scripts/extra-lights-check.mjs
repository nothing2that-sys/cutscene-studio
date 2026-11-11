// lighting.extras: extra lights brighten color.png but not light.png (key light only),
// shot.json and the prompt describe them, the panel adds/removes them, and they survive
// save/reopen. Usage: node scripts/extra-lights-check.mjs [baseUrl]
import {loadPlaywright} from './playwright-runtime.mjs';
import assert from 'node:assert/strict';
const {chromium}=loadPlaywright();
const base=process.argv[2]||'http://127.0.0.1:3001';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const unzip=`window.__unzip=z=>{const files={};for(let i=0;i<z.length-4;i++){if(z[i]==0x50&&z[i+1]==0x4b&&z[i+2]==3&&z[i+3]==4){const sz=z[i+18]|z[i+19]<<8|z[i+20]<<16|z[i+21]<<24,nl=z[i+26]|z[i+27]<<8;const name=new TextDecoder().decode(z.subarray(i+30,i+30+nl));files[name.split('/').pop()]=z.slice(i+30+nl,i+30+nl+sz);i+=30+nl+sz-1;}}return files;};
window.__mean=async bytes=>{const img=await createImageBitmap(new Blob([bytes],{type:'image/png'}));const c=new OffscreenCanvas(img.width,img.height),g=c.getContext('2d');g.drawImage(img,0,0);const d=g.getImageData(0,0,img.width,img.height).data;let s=0;for(let i=0;i<d.length;i+=4)s+=d[i]+d[i+1]+d[i+2];return s/(d.length/4)/3;};`;
const scene=extras=>({version:1,units:'meters',title:'보조광',room:{size:[6,3,5],walls:true},camera:{position:[0,1.4,4],target:[0,1,0],fov:45},
 actors:[{id:'p',name:'인물',position:[0,0,0],height:1.7}],props:[],lighting:{type:'sun',position:[-3,5,3],target:[0,1,0],intensity:0.8,ambient:0.2,...(extras?{extras}:{})}});
const shoot=s=>page.evaluate(async t=>{const S=window.__bodyV1.studio;await S.importText(t,'x',true);await new Promise(r=>setTimeout(r,600));const p=await S.createShotPackage(),f=window.__unzip(p.zip);
 return {color:await window.__mean(f['color.png']),light:Array.from(f['light.png']).reduce((a,b)=>(a*31+b)>>>0,7),extras:p.json.lighting.extras||[],prompt:p.prompt};},JSON.stringify(s));
try{
 await page.goto(base);await page.waitForFunction(()=>window.__bodyV1?.studio,null,{timeout:120000});await page.addScriptTag({content:unzip});
 const off=await shoot(scene(null)),on=await shoot(scene([{type:'lamp',position:[1.2,1.6,1.2],target:[0,1.2,0],color:'#ffd9a0',intensity:3}]));
 assert.ok(on.color>off.color+3,`extra light brightens color.png (${off.color.toFixed(1)} -> ${on.color.toFixed(1)})`);
 assert.equal(on.light,off.light,'light.png is the key light only');
 assert.equal(on.extras.length,1);assert.match(on.prompt,/보조광 1: 전등/);
 // Panel: add a second, change it, remove the first.
 await page.evaluate(()=>{document.getElementById('studio-extra-lights').closest('details').open=true;});
 await page.click('#studio-extra-add');await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>window.__bodyV1.studio.snapshot().document.lighting.extras.length),2);
 await page.selectOption('[data-extra="1"] [data-k="type"]','spot');await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>window.__bodyV1.studio.snapshot().document.lighting.extras[1].type),'spot');
 assert.equal(await page.locator('#studio-extra-add').count(),0,'no add button at two');
 await page.click('[data-remove="0"]');await page.waitForTimeout(300);
 const left=await page.evaluate(()=>window.__bodyV1.studio.snapshot().document.lighting.extras);assert.equal(left.length,1);assert.equal(left[0].type,'spot');
 // Save/reopen.
 const project=await page.evaluate(async()=>JSON.stringify(await window.__bodyV1.drive.save()));
 await page.evaluate(async t=>{await window.__bodyV1.studio.importText(t,'reopen',false);},project);await page.waitForTimeout(1200);
 assert.deepEqual(await page.evaluate(()=>window.__bodyV1.studio.snapshot().document.lighting.extras.map(x=>x.type)),['spot']);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,colorMean:{off:+off.color.toFixed(1),on:+on.color.toFixed(1)},prompt:on.prompt.split('\n').filter(l=>l.includes('보조광'))},null,1));
}finally{await browser.close();}
