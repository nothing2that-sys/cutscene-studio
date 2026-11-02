// Run after placing pose-tags.json and extracted PNGs in app/public/local-pose-references/images.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../app/public/local-pose-references/',import.meta.url);
const source=JSON.parse(await readFile(new URL('pose-tags.json',root),'utf8'));
const ids=new Set(),poses=[];
for(const item of source.poses){
  if(!/^POSE-\d{4}(-VAR\d+)?$/.test(item.pose_id)||ids.has(item.pose_id)||!/^POSE-[^/\\]+\.png$/.test(item.file_name))throw Error('Invalid or duplicate reference '+item.pose_id);
  ids.add(item.pose_id);const bytes=await readFile(new URL('images/'+encodeURIComponent(item.file_name),root));
  if(createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Image hash mismatch: '+item.pose_id);
  poses.push({id:item.pose_id,name:item.category,summary:item.summary,tags:item.observed_tags||[],concepts:item.concepts||[],scenes:item.scene_candidates||[],image:'images/'+item.file_name,source:item.drive_url,note:item.note||'',sha256:item.sha256});
}
if(poses.length!==source.total)throw Error('Incomplete index');
await writeFile(new URL('catalog.json',root),JSON.stringify({version:1,source:'개인 Drive 포즈 참조 · 미래코드',kind:'image-reference',aliases:source.aliases,poses}));
console.log(JSON.stringify({registered:poses.length,hashesVerified:poses.length,categories:new Set(poses.map(p=>p.name)).size,kind:'image-reference'}));
