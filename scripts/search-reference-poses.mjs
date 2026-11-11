import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../app/public/local-pose-references/',import.meta.url),catalog=JSON.parse(await readFile(new URL('catalog.json',root),'utf8'));
const query=process.argv.slice(2).filter(a=>a!=='--include-unresolved').join(' ').toLocaleLowerCase().replace(/\s/g,'');
if(!query)throw Error('검색할 번호·자세·장면을 입력하세요.');
const concepts=Object.entries(catalog.aliases||{}).filter(([,aliases])=>aliases.some(a=>query.includes(a.toLocaleLowerCase().replace(/\s/g,'')))).map(([key])=>key);
const matches=catalog.poses.filter(p=>process.argv.includes('--include-unresolved')||!['unresolved','needs-correction'].includes(p.conversion?.status)).map(p=>{const text=[p.id,p.name,p.summary,...p.tags,...p.concepts,...p.scenes].join(' ').toLocaleLowerCase().replace(/\s/g,'');let score=text.includes(query)?10:0;score+=concepts.filter(c=>[...p.concepts,...p.scenes].includes(c)).length;return {p,score};}).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(({p,score})=>({id:p.id,category:p.name,summary:p.summary,score,quality:p.conversion?.status||'image-only',visualReview:p.conversion?.visualReview||false,image:fileURLToPath(new URL(p.image,root)),pose:p.conversion?fileURLToPath(new URL(p.conversion.file,root)):null}));
console.log(JSON.stringify(matches,null,2));
