import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import * as THREE from '../app/node_modules/three/build/three.module.js';
import {encodePNG,createZip,crc32} from '../app/src/package-files.js';
import {buildLabels,analyzePasses,depthRange,passImages,lightingNotes,buildShotJson,buildPrompt,DEPTH_NEAR_VALUE,DEPTH_FAR_VALUE} from '../app/src/llm-package.js';

function readPNG(bytes){
 assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let p=8;const chunks={};
 while(p<bytes.length){const len=view.getUint32(p),type=new TextDecoder().decode(bytes.subarray(p+4,p+8)),body=bytes.subarray(p+4,p+8+len);assert.equal(view.getUint32(p+8+len),crc32(body),type+' crc');chunks[type]=bytes.subarray(p+8,p+8+len);p+=12+len;}
 const ihdr=new DataView(chunks.IHDR.buffer,chunks.IHDR.byteOffset);return {width:ihdr.getUint32(0),height:ihdr.getUint32(4),bitDepth:chunks.IHDR[8],colorType:chunks.IHDR[9],raw:inflateSync(chunks.IDAT)};
}
test('16-bit gray PNG keeps exact millimetre samples',async()=>{
 const data=new Uint16Array([0,1,4321,65535,1000,2000]);const png=readPNG(await encodePNG({width:3,height:2,channels:1,bitDepth:16,data}));
 assert.equal(png.bitDepth,16);assert.equal(png.colorType,0);
 const out=[];for(let y=0;y<2;y++)for(let x=0;x<3;x++){const i=y*7+1+x*2;out.push(png.raw[i]<<8|png.raw[i+1]);}
 assert.deepEqual(out,[...data]);
});
test('stored zip has local + central entries with UTF-8 names',()=>{
 const zip=createZip([{name:'shot-첫/a.txt',data:'hello'},{name:'shot-첫/b.bin',data:new Uint8Array([1,2,3])}]);
 const v=new DataView(zip.buffer),end=zip.length-22;assert.equal(v.getUint32(end,true),0x06054b50);assert.equal(v.getUint16(end+10,true),2);
 const central=v.getUint32(end+16,true);assert.equal(v.getUint32(central,true),0x02014b50);
 assert.equal(v.getUint32(0,true),0x04034b50);assert.equal(v.getUint32(14,true),crc32(new TextEncoder().encode('hello')));
});

// Three people in a line along -Z, all facing +Z, light straight in front (+Z).
function queue(){
 const actors=[0,1,2].map(i=>{const root=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.45,1.7,.3));body.position.set(0,.85,0);root.add(body);root.position.set(0,0,-i);root.updateMatrixWorld(true);return {id:'p'+i,name:'인물'+(i+1),root};});
 const point=(i,y)=>({world:[0,y,-i],screen:[.5,.5],depth:4+i,inFrame:true,occludedBy:null});
 const facts={camera:{position:[3,1.6,4],heightM:1.6,pitchDeg:-5,focal35mm:35,verticalFovDeg:40,aspect:1.78},actors:actors.map((a,i)=>({id:a.id,name:a.name,forward:[0,0,1],up:[0,1,0],yawToCamera:30,points:{head:point(i,1.6),chest:point(i,1.3),pelvis:point(i,.95)}})),props:[]};
 return {actors,facts,labels:buildLabels({actors})};
}
test('front light: only the first person is unshadowed, the rest are in the shadow of the one in front',()=>{
 const {facts,labels}=queue();const notes=lightingNotes({facts,lighting:{position:[0,1.4,8],target:[0,1.2,0]},labels});
 assert.match(notes.get('p0').text,/정면으로 받음/);assert.deepEqual(notes.get('p0').castShadowFrom,{});
 assert.deepEqual(Object.keys(notes.get('p1').castShadowFrom),['인물1']);assert.deepEqual(Object.keys(notes.get('p2').castShadowFrom),['인물2']);
 const back=lightingNotes({facts,lighting:{position:[0,1.4,-8],target:[0,1.2,0]},labels});
 assert.match(back.get('p0').text,/등지고/);assert.deepEqual(Object.keys(back.get('p0').castShadowFrom),['인물2']);assert.deepEqual(back.get('p2').castShadowFrom,{});
});
test('depth view spans the people, nearest white, farther darker, background black',()=>{
 const {labels}=queue();const W=4,H=1,label=new Uint8Array([1,2,3,0]),distance=new Float32Array([4,5,6,0]),direct=new Float32Array([1,0,0,0]);
 const passes={width:W,height:H,label,distance,direct},stats=analyzePasses(passes,labels),range=depthRange(passes,labels,stats);
 assert.equal(range.nearM,4);assert.equal(range.farM,6);
 const img=passImages(passes,labels,range);assert.equal(img.depth8[0],DEPTH_NEAR_VALUE);assert.equal(img.depth8[2],DEPTH_FAR_VALUE);assert.ok(img.depth8[1]<img.depth8[0]&&img.depth8[1]>img.depth8[2]);assert.equal(img.depth8[3],0);
 assert.deepEqual([...img.depth16],[4000,5000,6000,0]);assert.equal(img.light8[0],255);assert.equal(img.light8[1],0);
 assert.deepEqual([...img.rgba.subarray(0,4)],[230,25,75,255]);
});
test('shot.json links each label colour to its character references and the prompt names them',()=>{
 const {facts,labels}=queue();const passes={width:3,height:1,label:new Uint8Array([1,2,3]),distance:new Float32Array([4,5,6]),direct:new Float32Array([1,0,0])};
 const stats=analyzePasses(passes,labels),range=depthRange(passes,labels,stats),camera=new THREE.PerspectiveCamera();camera.position.set(3,1.6,4);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
 const lighting={position:[0,1.4,8],target:[0,1.2,0],color:'#ffffff',intensity:2,ambient:.4};
 const {json,refFiles}=buildShotJson({shot:{name:'컷1',camera:{target:[0,1,0]}},scene:{title:'줄'},camera,facts,description:{text:'설명',structured:{actors:[],props:[]}},labels,stats,range,lightNotes:lightingNotes({facts,lighting,labels}),references:{p1:[{label:'얼굴',note:'흉터',name:'x.png',mime:'image/png',dataUrl:'data:image/png;base64,AA=='}]},objectNotes:new Map(),width:3,height:1,lighting});
 const p1=json.labels.find(l=>l.id==='p1');assert.equal(p1.color,labels[1].color);assert.deepEqual(p1.references,[{file:'refs/p1/1-face.png',label:'얼굴',note:'흉터',originalName:'x.png'}]);assert.equal(refFiles[0].name,'refs/p1/1-face.png');
 assert.match(json.lighting.text,/카메라 쪽/);
 const prompt=buildPrompt(json);assert.match(prompt,new RegExp(labels[1].color+' = 인물2[\\s\\S]*refs/p1/1-face.png\\(얼굴: 흉터\\)'));assert.match(prompt,/인물1의 그림자 안/);
});
