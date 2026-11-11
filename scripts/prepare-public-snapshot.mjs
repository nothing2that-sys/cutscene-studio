// Builds a separate, sanitized public snapshot; never rewrites the source history.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),out=path.resolve('.review-tools/public-snapshot');
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
async function walk(dir){let result=[];try{for(const e of await readdir(dir,{withFileTypes:true})){const f=dir+'/'+e.name;result.push(...e.isDirectory()?await walk(f):[f]);}}catch{}return result;}
const candidates=new Set([...tracked,...await walk('docs'),...await walk('app/saved/nowhere-to-hide-rain'),...await walk('app/saved/holiday-umbrella'),...await walk('scripts')]);
const textExt=new Set(['.js','.mjs','.json','.md','.txt','.html','.css','.ps1','.cmd','.py','.yml','.yaml','.svg']);
const allowedEvidence=['2026-11-06-llm-ablation','2026-11-11-feature-ablation-v2','2026-11-11-gaze-ablation-v2','2026-11-06-llm-package'];
const manifest=[],excluded=[];
for(const f of [...candidates].sort()){
 if(/^(data\/pose-corrections\/|app\/saved\/pose-project.json)|(^|\/)(AGENTS|MEMORY|SESSION_STARTUP|DEV_SUMMARY)\.md$/.test(f)||/page@.*\.webm$/.test(f)){excluded.push(f);continue;}
 const ext=path.extname(f),isText=textExt.has(ext)||['.gitignore','LICENSE','LICENSE.md'].includes(path.basename(f));
 if(f.startsWith('docs/review-evidence/')&&!isText&&!tracked.includes(f)&&!allowedEvidence.some(x=>f.includes('/'+x+'/'))){excluded.push(f);continue;}
 // Personal attachments and original external pose images are never candidates.
 let bytes=await readFile(f);
 if(isText){let s=bytes.toString('utf8');
  s=s.replace(/[A-Z]:[\\/]+Users[\\/]+[^\\/\r\n"']+/gi,'C:/Users/USER')
    .replace(/USER/g,'USER').replace(/jhlim@envysolution\.com/gi,'developer@example.com')
    .replace(/https?:\/\/192\.168\.\d+\.\d+(?::\d+)?/g,'http://localhost')
    .replace(/https?:\/\/(?:drive|docs)\.google\.com\/[^\s)"'<>]+/g,'[private-reference-omitted]');
  bytes=Buffer.from(s);
 }
 const dest=path.join(out,f);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,bytes);
 manifest.push({path:f,size:bytes.length,text:isText});
}
// Root license makes GitHub license detection explicit.
await copyFile('app/LICENSE',path.join(out,'LICENSE'));if(!manifest.some(f=>f.path==='LICENSE'))manifest.push({path:'LICENSE',size:(await stat('app/LICENSE')).size,text:true});
await writeFile('.review-tools/public-manifest.json',JSON.stringify(manifest));
await writeFile('.review-tools/public-exclusions.json',JSON.stringify(excluded,null,2));
console.log(JSON.stringify({files:manifest.length,text:manifest.filter(x=>x.text).length,binary:manifest.filter(x=>!x.text).length,MB:Math.round(manifest.reduce((n,x)=>n+x.size,0)/1e6),excluded:excluded.length}));
