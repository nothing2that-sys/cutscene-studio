import {loadPlaywright} from './playwright-runtime.mjs';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root='app/public/local-pose-references',catalog=JSON.parse(await readFile(root+'/catalog.json','utf8')),ids=JSON.parse(await readFile('.review-tools/reference-correction-baseline/targets.json','utf8')),limit=Number(process.argv.find(a=>a.startsWith('--limit='))?.split('=')[1]||466);await mkdir(root+'/refined',{recursive:true});
const sourceHash=createHash('sha256');for(const file of ['reference-retarget.js','reference-refinement.js','reference-corrections.js'])sourceHash.update(await readFile('app/src/'+file));const sourceVersion=sourceHash.digest('hex');
const edits=JSON.parse(await readFile('app/src/reference-edits.json','utf8'));
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});const page=await browser.newPage({viewport:{width:1600,height:1100}});
await page.route('**/@vite/client',async route=>{const response=await route.fetch();const body=(await response.text()).replace(/(?:window\.)?location\.reload\([^)]*\)/g,'void 0');await route.fulfill({response,body});});
try{
 await page.goto('http://127.0.0.1:3002');await page.waitForSelector('#body-height');await page.evaluate(async()=>{const rig=await import('/src/body-rig.js'),{refineReference}=await import('/src/reference-refinement.js');window.__refinement={m:rig.createCharacter({height:1.75,headUnits:8}),refineReference};});
 for(const id of ids.slice(0,limit)){
  const item=catalog.poses.find(p=>p.id===id),raw=JSON.parse(await readFile(root+'/landmarks/'+id+'.json','utf8'));let observations;try{observations=JSON.parse(await readFile(root+'/landmarks-2d/'+id+'.json','utf8'));}catch{continue;}
  raw.category=item.name;
  if(edits[id]?.seed){const seed=JSON.parse(await readFile(root+'/refined/'+edits[id].seed+'.json','utf8'));raw.poseSeed=seed.pose.rotations;}
  if(edits[id]?.upperSeed){const seed=JSON.parse(await readFile(root+'/refined/'+edits[id].upperSeed+'.json','utf8'));raw.upperSeed=seed.pose.rotations;}
  const baseline=JSON.parse(await readFile('.review-tools/reference-correction-baseline/'+id+'.json','utf8'));
  const inputVersion=createHash('sha256').update(sourceVersion+JSON.stringify([edits[id],raw,observations,baseline,item.tags])).digest('hex');
  try{const cached=JSON.parse(await readFile(root+'/refined/'+id+'.json','utf8'));if(cached.quality.refinement.inputVersion===inputVersion&&!process.argv.includes('--redo='+id))continue;}catch{}
  const result=await page.evaluate(({raw,observations,baseline,tags})=>{const {m,refineReference}=window.__refinement;return refineReference(m,raw,observations,baseline,tags);},{raw,observations,baseline,tags:item.tags});
  result.quality.refinement.inputVersion=inputVersion;
  await writeFile(root+'/refined/'+id+'.json',JSON.stringify(result));console.log(JSON.stringify({id,error:result.quality.refinement.normalizedError,max:result.quality.refinement.maxNormalizedError}));
 }
}finally{await browser.close();}
