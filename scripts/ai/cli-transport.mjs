// JavaScript adaptation of ReviewGate's CliTransport.RunJobAsync / FromCodex.
// Upstream: nothing2that-sys/reviewgate, CliTransport.cs, blob
// a7bf0d1eb72790ebd5f56af3667a700891454098. See docs/AI_WORKFLOW.md.
import {spawn} from 'node:child_process';
import {access,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export async function locateCodex(env=process.env){
  const names=process.platform==='win32'?['codex.exe']:['codex'];
  const dirs=[...(env.PATH||env.Path||'').split(path.delimiter),path.join(env.LOCALAPPDATA||'', 'Programs','OpenAI','Codex','bin'),path.join(os.homedir(),'.local','bin')];
  for(const dir of dirs.filter(Boolean))for(const name of names){const file=path.join(dir,name);try{await access(file);return file;}catch{}}
  // npm on Windows exposes a .cmd shim. Launch its fixed JS entry with Node,
  // without cmd.exe or shell interpolation.
  if(process.platform==='win32')for(const dir of dirs.filter(Boolean)){const file=path.join(dir,'node_modules','@openai','codex','bin','codex.js');try{await access(file);return file;}catch{}}
  return null;
}

// Prompts travel on stdin; never concatenate user input into a shell command.
// Drain both pipes, enforce a shared output cap, and kill the process tree on cancel.
export function runProcess(executable,args,{input='',cwd,signal,timeoutMs=600_000,maxBytes=16*1024*1024}={}){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted)return reject(new Error('작업을 취소했습니다.'));
    const child=spawn(executable.endsWith('.js')?process.execPath:executable,executable.endsWith('.js')?[executable,...args]:args,{cwd,windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});
    let stdout='',stderr='',bytes=0,failure;
    const kill=()=>{
      if(process.platform==='win32'){
        const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.on('error',()=>child.kill());
      }else child.kill('SIGKILL');
    };
    const stop=message=>{failure??=new Error(message);kill();};
    const cancel=()=>stop('작업을 취소했습니다. 모델 요청이 이미 처리되었을 수 있습니다.');
    const timer=setTimeout(()=>stop('응답 시간이 초과됐습니다. 자동 재시도하지 않았습니다.'),timeoutMs);
    signal?.addEventListener('abort',cancel,{once:true});
    const collect=which=>chunk=>{bytes+=Buffer.byteLength(chunk);if(bytes>maxBytes){if(!failure)stop('CLI 응답 용량을 초과했습니다.');return;}if(which==='out')stdout+=chunk;else stderr+=chunk;};
    // setEncoding preserves multi-byte UTF-8 characters split across pipe chunks.
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stdout.on('data',collect('out'));child.stderr.on('data',collect('err'));
    child.stdin.on('error',()=>{});
    const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);};
    child.on('error',()=>{cleanup();reject(new Error('Codex CLI를 실행하지 못했습니다. 설치와 로그인을 확인하세요.'));});
    child.on('close',code=>{cleanup();if(failure)reject(failure);else resolve({stdout,stderr,code});});
    child.stdin.end(input);
  });
}

export function codexMessages(stdout){
  const messages=[];let turnError=false;
  for(const line of stdout.split('\n'))try{const event=JSON.parse(line);if(event.type==='turn.failed'||event.type==='error')turnError=true;if(event.type==='item.completed'&&event.item?.type==='agent_message')messages.push(event.item.text);}catch{}
  return {messages,turnError};
}
export function parseObject(text){
  const clean=String(text||'').trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
  try{const obj=JSON.parse(clean);if(obj&&typeof obj==='object'&&!Array.isArray(obj))return obj;}catch{}
  throw new Error('모델이 유효한 JSON 객체를 반환하지 않았습니다.');
}
export async function runCodex({prompt,work,model,images=[],signal,image=false,executable}){
  executable??=await locateCodex();if(!executable)throw new Error('Codex CLI가 없습니다. Codex를 설치하고 codex login으로 로그인하세요.');
  const out=path.join(work,'last-message.txt');
  const args=['exec','-','-C',work,'--skip-git-repo-check','--json','--ephemeral','-o',out,'--sandbox','read-only',
    '--disable','memories','-c','memories.use_memories=false','-c','memories.generate_memories=false',
    '-c','features.shell_tool=false','-c','features.unified_exec=false','-c','features.browser_use=false',
    '-c','features.computer_use=false','-c','features.in_app_browser=false','-c','features.multi_agent=false',
    '-c','features.apps=false','-c',`features.image_generation=${image}`];
  if(model)args.push('-m',model);
  for(const file of images)args.push('-i',file);
  const response=await runProcess(executable,args,{input:prompt,cwd:work,signal});
  const {messages,turnError}=codexMessages(response.stdout);
  if(response.code!==0||turnError)throw new Error('Codex 호출에 실패했습니다. 로그인·사용량·모델 접근 권한을 확인하세요. 자동 재시도하지 않았습니다.');
  let last;try{last=await readFile(out,'utf8');}catch{}
  return {text:last||messages.at(-1)||'',stdout:response.stdout};
}
