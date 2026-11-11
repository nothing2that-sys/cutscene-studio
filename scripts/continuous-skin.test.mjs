import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const asset=JSON.parse(readFileSync(new URL('../app/src/assets/reference-human.json',import.meta.url),'utf8'));
test('reference human has a connected closed body and two closed eye surfaces',()=>{
 const count=asset.positions.length/3,parent=Array.from({length:count},(_,i)=>i),find=i=>parent[i]===i?i:parent[i]=find(parent[i]),edges=new Map();
 assert.ok(count<=8000&&asset.indices.length/3<=18000);
 for(let i=0;i<asset.indices.length;i+=3)for(let j=0;j<3;j++){const a=asset.indices[i+j],b=asset.indices[i+(j+1)%3];assert.ok(Number.isInteger(a)&&a>=0&&a<count);parent[find(a)]=find(b);const key=[a,b].sort((x,y)=>x-y).join(':');edges.set(key,(edges.get(key)||0)+1);}
 const sizes=new Map();for(let i=0;i<count;i++)sizes.set(find(i),(sizes.get(find(i))||0)+1);assert.equal(sizes.size,3);assert.ok(Math.max(...sizes.values())/count>.9);assert.ok([...edges.values()].every(n=>n===2));
});
test('all skin influences are finite, bounded and normalized',()=>{
 assert.equal(new Set(asset.keys).size,46);assert.equal(asset.skinIndex.length,asset.positions.length/3*4);assert.equal(asset.skinWeight.length,asset.skinIndex.length);assert.ok(asset.positions.every(Number.isFinite));
 for(let i=0;i<asset.skinIndex.length;i+=4){assert.ok(asset.skinIndex.slice(i,i+4).every(n=>Number.isInteger(n)&&n>=0&&n<asset.keys.length));const weights=asset.skinWeight.slice(i,i+4);assert.ok(weights.every(n=>Number.isFinite(n)&&n>=0&&n<=1));assert.ok(Math.abs(weights.reduce((sum,n)=>sum+n,0)-1)<3e-6);}
 assert.equal(asset.license,'CC0-1.0');
});
