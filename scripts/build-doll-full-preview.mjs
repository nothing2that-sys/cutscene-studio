import {writeFile,mkdir} from 'node:fs/promises';
import {fullDollDesign} from '../app/src/doll-full-design.js';
import {meshCorePart,coreShapeKey} from '../app/src/doll-core-geometry.js';
const profile=process.argv[2]||'default',output=profile==='gallery-p015'?'app/public/doll-gallery-p015':'app/public/doll-full-core',design=fullDollDesign(profile),chunks=[],entries=[];let offset=0;
for(const name of ['torso']){const g=meshCorePart(design,name),entry={name,shapeKey:coreShapeKey(design,name),quality:'balanced',metadata:g.userData};for(const [key,array]of Object.entries({positions:g.attributes.position.array,normals:g.attributes.normal.array,indices:Uint16Array.from(g.index.array)})){const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}entry[key]={offset,length:array.length,type:array.constructor.name};const b=Buffer.from(array.buffer,array.byteOffset,array.byteLength);chunks.push(b);offset+=b.length;}entries.push(entry);}
await mkdir(output,{recursive:true});await writeFile(output+'/preview.bin',Buffer.concat(chunks));await writeFile(output+'/preview.json',JSON.stringify({version:1,entries},null,2));console.log({bytes:offset});
