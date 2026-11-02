import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const asset=JSON.parse(readFileSync(new URL('../app/src/assets/gallery-human.json',import.meta.url),'utf8'));
test('gallery body and remeshed featureless head form one closed manifold surface',()=>{
 const count=asset.positions.length/3,parent=Array.from({length:count},(_,i)=>i),find=i=>parent[i]===i?i:parent[i]=find(parent[i]),edges=new Map();
 assert.equal(count,10000);assert.equal(asset.indices.length/3,19996);
 for(let i=0;i<asset.indices.length;i+=3)for(let j=0;j<3;j++){const a=asset.indices[i+j],b=asset.indices[i+(j+1)%3];assert.ok(Number.isInteger(a)&&a>=0&&a<count);parent[find(a)]=find(b);const key=[a,b].sort((x,y)=>x-y).join(':');edges.set(key,(edges.get(key)||0)+1);}
 assert.equal(new Set(parent.map((_,i)=>find(i))).size,1);assert.ok([...edges.values()].every(n=>n===2));
});
test('authored chest morphs and skin weights match gallery topology and remain finite',()=>{
 const count=asset.positions.length/3;assert.equal(asset.keys.length,46);assert.ok(asset.positions.every(Number.isFinite));
 for(const name of ['heightUp','heightDown','spacingIn','spacingOut','volume','flat']){const data=asset.morphDeltas[name];assert.equal(data.length,count*3);assert.ok(data.every(Number.isFinite));assert.ok(data.some(n=>n!==0));}
 for(let i=0;i<count;i++){assert.ok(asset.skinIndex.slice(i*4,i*4+4).every(n=>Number.isInteger(n)&&n>=0&&n<46));const w=asset.skinWeight.slice(i*4,i*4+4);assert.ok(w.every(n=>Number.isFinite(n)&&n>=0));assert.ok(Math.abs(w.reduce((sum,n)=>sum+n,0)-1)<3e-6);}
});
test('gallery model sources are pinned CC0 MakeHuman data, with no gallery image payload',()=>{
 const provenance=JSON.parse(readFileSync(new URL('../app/src/assets/gallery-human.source.json',import.meta.url),'utf8'));assert.equal(asset.license,'CC0-1.0');assert.equal(provenance.license,'CC0-1.0');assert.match(provenance.sourceCommit,/^[a-f0-9]{40}$/);
 for(const entry of provenance.files){assert.ok(entry.url.startsWith('https://raw.githubusercontent.com/makehumancommunity/makehuman/'+provenance.sourceCommit+'/'));assert.match(entry.sha256,/^[a-f0-9]{64}$/);}
});
