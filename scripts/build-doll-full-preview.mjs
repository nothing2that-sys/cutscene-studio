// Prebuilds full-doll torso meshes so the app does not wait for the worker.
// Usage: node scripts/build-doll-full-preview.mjs [default|gallery-p015|body-types]
//  body-types writes every BODY_FORMS profile (male, neutral, child, …) into one bundle.
import {writeFile,mkdir} from 'node:fs/promises';
import {fullDollDesign} from '../app/src/doll-full-design.js';
import {BODY_FORMS} from '../app/src/doll-profiles.js';
import {meshCorePart,coreShapeKey} from '../app/src/doll-core-geometry.js';
const profile=process.argv[2]||'default';
const output=profile==='gallery-p015'?'app/public/doll-gallery-p015':profile==='body-types'?'app/public/doll-body-types':'app/public/doll-full-core';
const designs=profile==='body-types'?Object.keys(BODY_FORMS).map(id=>[id,fullDollDesign(id)]):[[profile,fullDollDesign(profile)]];
const chunks=[],entries=[];let offset=0;
for(const [id,design]of designs)for(const name of ['torso']){
 const g=meshCorePart(design,name),count=g.attributes.position.count,entry={name,...(profile==='body-types'?{profile:id}:{}),shapeKey:coreShapeKey(design,name),quality:'balanced',metadata:g.userData};
 for(const [key,array]of Object.entries({positions:g.attributes.position.array,normals:g.attributes.normal.array,indices:count>65535?Uint32Array.from(g.index.array):Uint16Array.from(g.index.array)})){
  const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}
  entry[key]={offset,length:array.length,type:array.constructor.name};const b=Buffer.from(array.buffer,array.byteOffset,array.byteLength);chunks.push(b);offset+=b.length;
 }
 entries.push(entry);
}
await mkdir(output,{recursive:true});await writeFile(output+'/preview.bin',Buffer.concat(chunks));await writeFile(output+'/preview.json',JSON.stringify({version:1,entries},null,2));
console.log({output,entries:entries.map(e=>e.profile||e.name),bytes:offset});
