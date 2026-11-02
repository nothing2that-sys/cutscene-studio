import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readReferencePoses} from '../app/src/pose-format.js';
const root='app/public/local-pose-references';
export async function applyCorrections(){
 const index=JSON.parse(await readFile('data/pose-corrections/index.json','utf8'));
 const catalog=JSON.parse(await readFile(root+'/catalog.json','utf8')),pending=[];
 // Validate every source and pose before changing any local data.
 for(const entry of index.poses){
  const item=catalog.poses.find(p=>p.id===entry.id);assert.ok(item,'Missing reference '+entry.id);
  const text=await readFile('data/pose-corrections/'+entry.id+'.json','utf8');assert.equal(createHash('sha256').update(text).digest('hex'),entry.sha256);
  const result=JSON.parse(text);assert.equal(result.source.poseId,item.id);assert.equal(result.source.imageSha256,item.sha256);
  const bytes=await readFile(root+'/'+item.image);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
  assert.equal(readReferencePoses(JSON.stringify(result.pose)).length,1);await access(root+'/converted');pending.push({item,result,text});
 }
 for(const {item,result,text}of pending){await writeFile(root+'/converted/'+item.id+'.json',text);item.conversion={file:'converted/'+item.id+'.json',...result.quality};}
 catalog.correctionReview={date:index.date,reviewed:index.reviewed,unresolved:index.unresolved,scope:index.poses.length};
 await writeFile(root+'/catalog.json',JSON.stringify(catalog));return catalog.correctionReview;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)console.log(JSON.stringify(await applyCorrections()));
