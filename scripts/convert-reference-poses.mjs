import {loadPlaywright} from './playwright-runtime.mjs';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
const root='app/public/local-pose-references',catalog=JSON.parse(await readFile(root+'/catalog.json','utf8'));
const files=new Set(await readdir(root+'/landmarks'));await mkdir(root+'/converted',{recursive:true});
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1600,height:1100}}),report=[];
try{
 await page.goto('http://127.0.0.1:3002');await page.waitForSelector('#body-height');
 await page.evaluate(async()=>{const rig=await import('/src/body-rig.js'),{retargetLandmarks}=await import('/src/reference-retarget.js');window.__retarget={m:rig.createCharacter({height:1.75,headUnits:8}),retargetLandmarks};});
 for(const item of catalog.poses){if(!files.has(item.id+'.json'))continue;const data=JSON.parse(await readFile(root+'/landmarks/'+item.id+'.json','utf8'));
  const result=await page.evaluate(data=>{const {m,retargetLandmarks}=window.__retarget;return retargetLandmarks(m,data);},{...data,tags:item.tags});result.type='converted-pose';result.version=1;result.pose.name=item.id+' '+item.name;result.source={poseId:item.id,imageSha256:item.sha256,model:data.model,modelSha256:data.modelSha256};
  await writeFile(root+'/converted/'+item.id+'.json',JSON.stringify(result));item.conversion={file:'converted/'+item.id+'.json',...result.quality};report.push({id:item.id,...result.quality});
 }
 await writeFile(root+'/catalog.json',JSON.stringify(catalog));await mkdir('validation/reference-conversion',{recursive:true});await writeFile('validation/reference-conversion/report.json',JSON.stringify({converted:report.length,estimated:report.filter(r=>r.status==='estimated').length,needsCorrection:report.filter(r=>r.status==='needs-correction').length,poses:report},null,2));console.log(JSON.stringify({converted:report.length,estimated:report.filter(r=>r.status==='estimated').length,needsCorrection:report.filter(r=>r.status==='needs-correction').length}));
}finally{await browser.close();}
