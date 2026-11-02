import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const out='validation/launcher';await mkdir(out,{recursive:true});
if(process.platform!=='win32')throw new Error('This launcher check requires Windows.');
const env={...process.env,CUTSCENE_PORT:'3013',CUTSCENE_NODE:process.execPath};
// Exercise the explicit override with a PATH that contains no Node or Codex.
env.PATH=path.join(process.env.SystemRoot,'System32');
const child=spawn('C:\\Windows\\System32\\cmd.exe',['/d','/c','start.cmd'],{cwd:process.cwd(),env,windowsHide:true});
let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
try{
  let response;
  for(let n=0;n<100;n++){
    try{response=await fetch('http://127.0.0.1:3013/');if(response.ok)break;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(response?.ok,'Launcher did not serve: '+output);
  assert.match(output,/127\.0\.0\.1:3013/);
  const report={passed:true,node:process.execPath,customPort:3013,systemPathWithoutNode:true,output};
  await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
  if(child.pid)await new Promise(resolve=>{const kill=spawn('C:\\Windows\\System32\\taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});kill.on('exit',resolve);});
}
