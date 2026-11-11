// Runs the unit tests and every browser check one after another against the dev server
// (default http://127.0.0.1:3001) and prints one line per check.
// Usage: node scripts/run-all-checks.mjs [baseUrl]
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdirSync} from 'node:fs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),node=process.execPath,base=process.argv[2]||'http://127.0.0.1:3001';
const CHECKS=['browser-check','validation-ui-check','body-sides-check','body-types-check','pose-presets-check','look-at-check','autosave-check','restore-race-check',
 'history-glb-check','props-check','held-props-check','extra-lights-check','wall-shadows-check','camera-lens-check','overlap-warning-check','shot-overrides-check',
 'package-all-check','llm-package-scenarios'];
const results=[];
const run=(name,args)=>{const t=Date.now(),r=spawnSync(node,args,{cwd:root,encoding:'utf8',timeout:600000});const ok=r.status===0;results.push({name,ok,seconds:Math.round((Date.now()-t)/1000)});
 console.log(`${ok?'PASS':'FAIL'} ${name} (${Math.round((Date.now()-t)/1000)}s)`);if(!ok)console.log((r.stdout+r.stderr).split('\n').filter(l=>!/^\s+at /.test(l)).slice(-12).join('\n'));};
run('unit tests',['--test',...readdirSync(path.join(root,'scripts')).filter(f=>f.endsWith('.test.mjs')).map(f=>'scripts/'+f)]);
for(const c of CHECKS)run(c,[`scripts/${c}.mjs`,base]);
const failed=results.filter(r=>!r.ok);console.log(`\n${results.length-failed.length}/${results.length} passed`+(failed.length?` · failed: ${failed.map(r=>r.name).join(', ')}`:''));
process.exitCode=failed.length?1:0;
