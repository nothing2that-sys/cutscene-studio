import {loadPlaywright} from './playwright-runtime.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const root='app/public/local-pose-references',catalog=JSON.parse(await readFile(root+'/catalog.json','utf8'));
const chosen=process.argv.slice(2);const seen=new Set();const items=catalog.poses.filter(p=>chosen.length?chosen.includes(p.id):!seen.has(p.name)&&seen.add(p.name));
const out='validation/reference-conversion';await mkdir(out,{recursive:true});
const {chromium}=loadPlaywright(),browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=d3d11']});const page=await browser.newPage({viewport:{width:1280,height:1500}});
try{
 await page.goto('http://127.0.0.1:3002');await page.waitForSelector('#body-height');
 const output=await page.evaluate(async items=>{
  const rig=await import('/src/body-rig.js'),{retargetLandmarks}=await import('/src/reference-retarget.js');const urls=performance.getEntriesByType('resource').map(e=>e.name),THREE=await import(urls.find(u=>/\.vite\/deps\/three\.js/.test(u))),mod=await import(urls.find(u=>u.includes('mannequin-js'))),stage=mod.getStage(),m=rig.createCharacter({height:1.75,headUnits:8});
  stage.scene.children.forEach(o=>{if(o!==m&&!o.isLight)o.visible=false;});
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(220,280);renderer.outputColorSpace=THREE.SRGBColorSpace;stage.scene.background=new THREE.Color('#f0f0f0');const output=[];
  for(const item of items){const data=await (await fetch('/local-pose-references/landmarks/'+item.id+'.json')).json(),result=retargetLandmarks(m,{...data,tags:item.tags});const box=new THREE.Box3().setFromObject(m),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),range=Math.max(size.y,size.x,size.z)*.65,camera=new THREE.OrthographicCamera(-range*220/280,range*220/280,range,-range,.01,100);camera.position.copy(center).addScaledVector(new THREE.Vector3(...result.previewDirection),8);camera.lookAt(center);renderer.render(stage.scene,camera);output.push({id:item.id,category:item.name,image:'/local-pose-references/'+item.image,thumbnail:renderer.domElement.toDataURL(),quality:result.quality});}
  return output;
 },items);
 await writeFile(out+'/sample-quality.json',JSON.stringify(output.map(({thumbnail,image,...r})=>r),null,2));
 await page.setContent('<body style="margin:0;background:white;font:14px sans-serif"><main style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px"></main></body>');
 await page.evaluate(output=>{for(const item of output){const tile=document.createElement('section'),heading=document.createElement('h3');heading.textContent=item.id+' '+item.category+' · '+item.quality.status;tile.append(heading);for(const src of [new URL(item.image,'http://127.0.0.1:3002').href,item.thumbnail]){const img=document.createElement('img');img.src=src;img.style='width:48%;height:260px;object-fit:contain';tile.append(img);}document.querySelector('main').append(tile);}},output);
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:out+'/samples.png',fullPage:true});console.log(JSON.stringify({samples:output.length}));
}finally{await browser.close();}
