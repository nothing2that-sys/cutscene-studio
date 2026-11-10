// Saves the body-variety stage 1 review images (all profiles side by side) and the
// contact audit per pose. Usage: node scripts/body-variety-sheets.mjs [baseUrl] [outDir]
import {loadPlaywright} from './playwright-runtime.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const {chromium}=loadPlaywright();
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=process.argv[2]||'http://127.0.0.1:3001',out=path.resolve(process.argv[3]||path.join(root,'docs/review-evidence/2026-11-10-body-variety'));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1700,height:1200}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/body-variety.html');await page.waitForFunction(()=>window.__variety?.ready,null,{timeout:240000});
 await mkdir(out,{recursive:true});
 const shots=[['neutral','front','clay'],['neutral','side','clay'],['neutral','back','clay'],['neutral','oblique','clay'],['neutral','front','silhouette'],['neutral','side','silhouette'],['raised','front','clay'],['squat','oblique','clay'],['step','side','clay']];
 const audit={};
 for(const [pose,angle,mode]of shots){const url=await page.evaluate(([p,a,m])=>{window.__variety.setPose(p);return window.__variety.render(a,m);},[pose,angle,mode]);await writeFile(path.join(out,`${pose}-${angle}-${mode}.png`),Buffer.from(url.split(',')[1],'base64'));}
 for(const pose of ['neutral','raised','squat','step'])audit[pose]=await page.evaluate(p=>{window.__variety.setPose(p);return Object.fromEntries(window.__variety.audit().map(a=>[a.profile,{total:a.contacts,pairs:window.__variety.auditDetail(a.profile)}]));},pose);
 const stats=await page.evaluate(()=>window.__variety.stats);
 await writeFile(path.join(out,'report.json'),JSON.stringify({stats,audit,errors},null,2));
 console.log(stats.join('\n'));for(const [pose,r]of Object.entries(audit))console.log(pose,Object.entries(r).map(([k,v])=>k+':'+v.total).join(' '));
 if(errors.length){console.log(errors);process.exitCode=1;}
}finally{await browser.close();}
