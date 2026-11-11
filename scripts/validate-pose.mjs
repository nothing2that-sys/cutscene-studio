import {readFile} from 'node:fs/promises';
import {readReferencePoses} from '../app/src/pose-format.js';
try{
  if(!process.argv[2])throw Error('Usage: node scripts/validate-pose.mjs pose.json');
  const poses=readReferencePoses(await readFile(process.argv[2],'utf8'));
  console.log(JSON.stringify({valid:true,count:poses.length,names:poses.map(p=>p.name),kinds:poses.map(p=>p.kind),visualReview:false},null,2));
}catch(error){console.error(JSON.stringify({valid:false,message:error.message},null,2));process.exitCode=1;}
