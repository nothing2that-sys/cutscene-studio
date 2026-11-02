import {loadPlaywright} from './playwright-runtime.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {applyCorrections} from './apply-reference-corrections.mjs';
const root='app/public/local-pose-references',evidence='docs/review-evidence/2026-11-02-pose-correction',out='data/pose-corrections';
const hash=text=>createHash('sha256').update(text).digest('hex');
const ids=JSON.parse(await readFile(evidence+'/targets.json','utf8')),review=JSON.parse(await readFile(evidence+'/reviews.json','utf8')),catalog=JSON.parse(await readFile(root+'/catalog.json','utf8'));
assert.equal(ids.length,466);assert.deepEqual(review.poses.map(p=>p.id),ids);assert.equal(new Set(ids).size,466);
const untouched=catalog.poses.filter(p=>!ids.includes(p.id)),before=new Map();
for(const item of untouched)before.set(item.id,hash(await readFile(root+'/'+item.conversion.file)));
await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});const page=await browser.newPage();
await page.route('**/@vite/client',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace(/(?:window\.)?location\.reload\([^)]*\)/g,'void 0')});});
const poses=[];
try{
 await page.goto('http://127.0.0.1:3002');await page.waitForSelector('#body-height');
 await page.evaluate(async()=>{const rig=await import('/src/body-rig.js'),{applyHeadCues}=await import('/src/reference-corrections.js');window.__publish={rig,applyHeadCues,m:rig.createCharacter({height:1.75,headUnits:8})};});
 for(const record of review.poses){
  const item=catalog.poses.find(p=>p.id===record.id),text=await readFile(root+'/refined/'+record.id+'.json','utf8');assert.equal(hash(text),record.candidateSha256,'Candidate changed after visual review: '+record.id);const data=JSON.parse(text);assert.equal(data.source.imageSha256,item.sha256);
  const result=await page.evaluate(({data,tags})=>{const {rig,applyHeadCues,m}=window.__publish,root=m.position.toArray(),before=rig.boneDistances(m);for(const [key,r]of Object.entries(data.pose.rotations))m[key].rotation.fromArray(r);rig.constrainBody(m);const cue=applyHeadCues(m,tags),after=rig.boneDistances(m),maxDrift=Math.max(...Object.keys(before).map(k=>Math.abs(before[k]-after[k])));if(maxDrift>1e-6||JSON.stringify(root)!==JSON.stringify(m.position.toArray()))throw Error('Locked rig changed');data.pose.rotations=Object.fromEntries(Object.entries(rig.snapshotBodyJoints(m)).map(([key,j])=>[key,j.rotation]));return {data,cue,maxDrift};},{data,tags:item.tags});
  result.data.quality={...result.data.quality,status:record.status,visualReview:true,reviewer:'Codex visual comparison',reviewDate:review.date,reviewReason:record.reason,reviewScope:review.scope,headCue:result.cue,rigMaxLengthDrift:result.maxDrift};
  const output=JSON.stringify(result.data);await writeFile(out+'/'+record.id+'.json',output);poses.push({id:record.id,sha256:hash(output),status:record.status,reason:record.reason});
 }
}finally{await browser.close();}
const index={version:1,date:review.date,scope:review.scope,reviewed:poses.filter(p=>p.status==='reviewed').length,unresolved:poses.filter(p=>p.status==='unresolved').length,poses};await writeFile(out+'/index.json',JSON.stringify(index,null,2));
await applyCorrections();
for(const item of untouched)assert.equal(hash(await readFile(root+'/'+item.conversion.file)),before.get(item.id),'Untargeted pose changed');
await writeFile(evidence+'/publication.json',JSON.stringify({date:review.date,targeted:466,reviewed:index.reviewed,unresolved:index.unresolved,untouched:untouched.length,untouchedHashesPreserved:true,allRigChecksPassed:true},null,2));
const remaining=review.poses.filter(p=>p.status==='unresolved');
await writeFile(evidence+'/UNRESOLVED.md','# 보정 후 미해결 포즈\n\n총 '+remaining.length+'개. 원본 대조 후 큰 관절·접촉·시점 차이가 남은 초안입니다. 앱 기본 목록에서 제외되며 `미해결 · 수동 확인`에서 원본 확인 후 직접 적용할 수 있습니다. 단일 이미지로 보이지 않는 깊이·손가락·시선의 정확성은 사용 가능 보정본에도 보장하지 않습니다.\n\n| 번호 | 분류 | 남은 차이 |\n|---|---|---|\n'+remaining.map(p=>{const item=catalog.poses.find(i=>i.id===p.id);return `| ${p.id} | ${item.name} | ${p.reason} |`;}).join('\n')+'\n');
console.log(JSON.stringify({reviewed:index.reviewed,unresolved:index.unresolved,untouched:untouched.length}));
