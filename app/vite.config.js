import { defineConfig } from 'vite';
import {readdir,readFile,stat,unlink} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';

function localReferenceExclusion(){let root,out;return {name:'exclude-local-pose-references',configResolved(config){root=resolve(config.root);out=resolve(root,config.build.outDir);if(out!==resolve(root,'dist'))throw Error('Reference filter requires the verified app/dist build directory.');},async writeBundle(){const references=[];for(const name of ['body-study/reference.png','gallery-p015.png']){try{const bytes=await readFile(resolve(root,'public',name));references.push({bytes:bytes.length,hash:createHash('sha256').update(bytes).digest('hex')});}catch(error){if(error.code!=='ENOENT')throw error;}}const removed=[];async function visit(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(!path.startsWith(out+sep)||entry.isSymbolicLink())throw Error('Unexpected output path in reference filter.');if(entry.isDirectory()){await visit(path);continue;}if(!entry.isFile())continue;const info=await stat(path);if(!references.some(r=>r.bytes===info.size))continue;const hash=createHash('sha256').update(await readFile(path)).digest('hex');if(references.some(r=>r.hash===hash)){await unlink(path);removed.push(path.slice(out.length+1));}}}await visit(out);if(removed.length)console.info('Local reference PNGs excluded from dist:',removed.join(', '));}};}


export default defineConfig({
  plugins:[localReferenceExclusion()],
  build: {rolldownOptions:{input:{editor:'index.html',modelPreview:'model-preview.html',bodyStudy:'body-study.html',bodyPartStudy:'body-part-study.html',dollCore:'doll-core.html',dollFull:'doll-full.html'}}},
  server: {
    host: '127.0.0.1',
    port: 3001,
    strictPort: true,
  },
});
