import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {defaultCoreDesign,coreShapeKey} from '../app/src/doll-core-geometry.js';
const evidence='docs/review-evidence/2026-11-03-doll-core-refinement',meshes=JSON.parse(await readFile(evidence+'/optimized-meshes.json','utf8')),design=JSON.parse(await readFile(evidence+'/design.json','utf8')),base=defaultCoreDesign(),chunks=[],entries=[];let offset=0;
for(const p of meshes){assert.equal(coreShapeKey(design,p.name),coreShapeKey(base,p.name),'Captured shape differs from current default');const origin={thorax:(650-419)/200,abdomen:(650-481)/200,pelvis:(650-545)/200}[p.name],positions=Float32Array.from(p.positions,(v,i)=>i%3===1?v+origin:v),normals=Float32Array.from(p.normals),indices=Uint16Array.from(p.indices),entry={name:p.name,shapeKey:coreShapeKey(base,p.name),quality:'balanced',metadata:p.metadata};
 for(const [key,array]of Object.entries({positions,normals,indices})){const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}entry[key]={offset,length:array.length,type:array.constructor.name};const bytes=Buffer.from(array.buffer);chunks.push(bytes);offset+=bytes.length;}entries.push(entry);
}
await mkdir('app/public/doll-core',{recursive:true});await writeFile('app/public/doll-core/preview.bin',Buffer.concat(chunks));await writeFile('app/public/doll-core/preview.json',JSON.stringify({version:1,entries},null,2));console.log(JSON.stringify({bytes:offset,triangles:meshes.reduce((n,p)=>n+p.indices.length/3,0)}));
