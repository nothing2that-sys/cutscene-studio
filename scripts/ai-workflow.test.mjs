import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createAiService,validateJob,imageBytes} from './ai/service.mjs';
import {runProcess,parseObject,codexMessages} from './ai/cli-transport.mjs';
import {makeRequest,parseResponse,runApi} from './ai/providers.mjs';
import {EXAMPLE_SCENE} from '../app/src/scene-format.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0XkAAAAASUVORK5CYII=','base64'),dataUrl=`data:image/png;base64,${png.toString('base64')}`;
const processRunner=async(_,args)=>({code:0,stdout:args[0]==='login'?'Logged in using ChatGPT':args[0]==='features'?'image_generation stable true':'codex-cli 0.test',stderr:''});
async function fixture(t,overrides={}){
  const root=await mkdtemp(path.join(os.tmpdir(),'cutscene-ai-test-'));
  const options={root,discover:async()=>'/test/codex',processRunner,...overrides};const svc=createAiService(options);
  t.after(async()=>{svc.close();await rm(root,{recursive:true,force:true});});return {svc,root,options};
}
const wait=async(svc,id)=>{for(let i=0;i<200;i++){const job=await svc.get(id);if(job.status!=='running')return job;await new Promise(r=>setTimeout(r,5));}throw Error('test timeout');};
test('transport preserves UTF-8, stdin and reports nonzero exits without interpreting prompts as a shell',async()=>{
  const response=await runProcess(process.execPath,['-e',"process.stdin.on('data',x=>process.stdout.write(x));process.stdin.on('end',()=>process.exitCode=3)"],{input:'소설 $() ` & ;',timeoutMs:5000});
  assert.equal(response.stdout,'소설 $() ` & ;');assert.equal(response.code,3);
  await assert.rejects(runProcess(process.execPath,['-e',"setInterval(()=>{},1000)"],{timeoutMs:50}),/초과/);
  await assert.rejects(runProcess(process.execPath,['-e',"process.stdout.write('x'.repeat(10000))"],{maxBytes:50}),/용량/);
});
test('CLI messages only accept final agent events and valid object JSON',()=>{
  assert.deepEqual(codexMessages('noise\n{"type":"item.completed","item":{"type":"agent_message","text":"ok"}}\n{"type":"turn.failed"}'),{messages:['ok'],turnError:true});
  assert.deepEqual(parseObject('```json\n{"a":1}\n```'),{a:1});assert.throws(()=>parseObject('[]'));
});
test('reject bad operations, model flags, invalid image bytes and empty stories before model calls',()=>{
  for(const input of [{operation:'shell',provider:'codex-cli'},{operation:'plan',provider:'codex-cli',story:''},{operation:'plan',provider:'codex-cli',story:'hello',model:'--do-bad-things '},{operation:'image',provider:'codex-cli',prompt:'hi',images:[{name:'x',dataUrl:'data:image/png;base64,aGVsbG8='}]}])assert.throws(()=>validateJob(input));
  assert.equal(imageBytes(dataUrl).mime,'image/png');
  assert.throws(()=>validateJob({operation:'plan',provider:'codex-cli',story:'소설',model:'--dangerously-bypass-approvals-and-sandbox'}));
});
test('plan validates before completion, persists across restarts, rejects concurrent calls',async t=>{
  let resolve;const pending=new Promise(r=>resolve=r);const {svc,options}=await fixture(t,{cli:async()=>{await pending;return {text:JSON.stringify(EXAMPLE_SCENE)};}});
  const input={operation:'plan',provider:'codex-cli',story:'소설'};
  const job=await svc.create(input);await assert.rejects(svc.create(input),/생성 중/);resolve();
  const result=await wait(svc,job.id);assert.equal(result.status,'completed');assert.equal(result.result.scene.title,EXAMPLE_SCENE.title);
  assert.equal((await createAiService(options).get(job.id)).status,'completed');
});
test('model invalid scene fails and cancellation is terminal, with no fallback calls',async t=>{
  let apiCalls=0;const {svc}=await fixture(t,{cli:async()=>({text:'{"version":999}'}),api:async()=>{apiCalls++;}});
  const failed=await svc.create({operation:'plan',provider:'codex-cli',story:'소설'});assert.equal((await wait(svc,failed.id)).status,'failed');assert.equal(apiCalls,0);
  const cancelled=await fixture(t,{cli:({signal})=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true});})});
  const job=await cancelled.svc.create({operation:'plan',provider:'codex-cli',story:'소설'});await new Promise(r=>setTimeout(r,15));assert.equal((await cancelled.svc.cancel(job.id)).status,'cancelled');
});
test('CLI image stores actual output, sends all references, and blocks arbitrary local paths',async t=>{
  let sent;const {svc,root}=await fixture(t,{cli:async options=>{sent=options;const file=path.join(options.work,'actual.png');await writeFile(file,png);return {text:JSON.stringify({imagePaths:[file]})};}});
  const input={operation:'image',provider:'codex-cli',prompt:'현재 장면으로 그려줘',shot:{title:'edited'},images:[{name:'color.png',dataUrl}]};
  const job=await svc.create(input),result=await wait(svc,job.id);assert.equal(result.status,'completed');assert.match(sent.prompt,/edited/);assert.match(sent.prompt,/color.png/);assert.equal(sent.images.length,1);assert.equal(sent.image,true);
  assert.deepEqual(await readFile(path.join(root,job.id,'result.png')),png);
  const unsafe=await fixture(t,{cli:async()=>({text:JSON.stringify({imagePaths:[path.join(root,job.id,'result.png')]})})});
  const rejected=await unsafe.svc.create(input);assert.equal((await wait(unsafe.svc,rejected.id)).status,'failed');
});
test('API wire format includes real image inputs and parses image/text outputs',()=>{
  for(const provider of ['openai','gemini']){
    const request=makeRequest({provider,operation:'image',prompt:'draw',images:[{dataUrl,mime:'image/png'}]});
    assert.equal(request.url.startsWith('https://'),true);assert.equal(request.body.store,false);assert.ok(JSON.stringify(request.body).includes(png.toString('base64')));
  }
  assert.deepEqual(parseResponse('openai','plan',{status:'completed',output:[{content:[{type:'output_text',text:'{"version":1}'}]}]}),{version:1});
  assert.deepEqual(parseResponse('gemini','plan',{status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'{"version":1}'}]}]}),{version:1});
  assert.equal(parseResponse('openai','image',{output:[{type:'image_generation_call',result:'abc'}]}).base64,'abc');
  assert.equal(parseResponse('gemini','image',{steps:[{type:'model_output',content:[{type:'image',mime_type:'image/png',data:'abc'}]}]}).base64,'abc');
  assert.throws(()=>parseResponse('openai','image',{output:[]}));assert.throws(()=>parseResponse('gemini','plan',{status:'failed'}));
});
test('API has no hidden credential creation or retry; authorization never enters the body',async()=>{
  await assert.rejects(runApi({provider:'openai',operation:'plan',prompt:'hi'},{env:{}}),/OPENAI_API_KEY/);
  let calls=0;await assert.rejects(runApi({provider:'openai',operation:'plan',prompt:'hi'},{env:{OPENAI_API_KEY:'test-only-not-a-secret'},fetcher:async(url,options)=>{calls++;assert.equal(JSON.stringify(options.body).includes('test-only-not-a-secret'),false);assert.equal(options.redirect,'error');return new Response('',{status:429});}}),/429/);assert.equal(calls,1);
});
test('HTTP blocks cross-origin, DNS rebinding, non-JSON and traversal; jobs remain local',async t=>{
  const {svc}=await fixture(t,{cli:async()=>({text:JSON.stringify(EXAMPLE_SCENE)})});
  const server=http.createServer((req,res)=>{svc.middleware(req,res).then(handled=>{if(!handled){res.writeHead(404);res.end();}});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base+'/api/ai/capabilities',{headers:{Origin:'https://evil.test'}})).status,403);
  const rebound=await new Promise((resolve,reject)=>{const req=http.get(base+'/api/ai/capabilities',{headers:{Host:'evil.test'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});assert.equal(rebound,403);
  assert.equal((await fetch(base+'/api/ai/jobs',{method:'POST',body:'{}'})).status,415);
  assert.equal((await fetch(base+'/api/ai/jobs/..%2f..%2fsecret')).status,404);
  const posted=await fetch(base+'/api/ai/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'plan',provider:'codex-cli',story:'원문'})});assert.equal(posted.status,202);const job=await posted.json();await wait(svc,job.id);assert.equal((await(await fetch(base+'/api/ai/jobs/'+job.id)).json()).status,'completed');
});
