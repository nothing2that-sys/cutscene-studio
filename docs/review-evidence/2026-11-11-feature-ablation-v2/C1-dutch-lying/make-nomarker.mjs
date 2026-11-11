// Makes a no-light-marker variant of a package folder: yellow marker pixels in pose.png go
// black, and the prompt drops its references to the marker.
import {loadPlaywright} from 'file:///D:/github/cutscene-studio/scripts/playwright-runtime.mjs';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
const [src,dst]=process.argv.slice(2);await mkdir(dst,{recursive:true});
for(const f of ['color.png','label.png','depth.png','range.png','light.png'])await copyFile(path.join(src,f),path.join(dst,f));
const {chromium}=loadPlaywright();const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage();
const png=(await readFile(path.join(src,'pose.png'))).toString('base64');
const out=await p.evaluate(async b64=>{const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);const d=x.getImageData(0,0,c.width,c.height);let n=0;
 for(let i=0;i<d.data.length;i+=4){const r=d.data[i],g=d.data[i+1],bl=d.data[i+2];if(r>40&&g>30&&bl<0.35*Math.min(r,g)&&g>0.6*r&&g<1.05*r){d.data[i]=d.data[i+1]=d.data[i+2]=0;n++;}}
 x.putImageData(d,0,0);return {n,url:c.toDataURL('image/png')};},png);
await writeFile(path.join(dst,'pose.png'),Buffer.from(out.url.split(',')[1],'base64'));await b.close();
let t=(await readFile(path.join(src,'prompt.txt'),'utf8')).replace(/\r\n/g,'\n');
t=t.replace(' 광원 위치는 아래 「조명」과 pose.png의 노란 표시를 따르세요.',' 광원 위치는 아래 「조명」을 따르세요.')
 .replace(/ ?\(pose\.png[^)]*\)/g,'').replace('라벨 색·뼈대·노란 광원 표시·글자는','라벨 색·뼈대·글자는');
await writeFile(path.join(dst,'prompt.txt'),t);console.log(out.n,t.includes('노란'),t.length);
