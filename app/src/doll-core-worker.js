import {meshCorePart} from './doll-core-geometry.js';
self.onmessage=({data:{id,design,name}})=>{
 try{const g=meshCorePart(design,name),positions=g.attributes.position.array,normals=g.attributes.normal.array,indices=g.index.array;self.postMessage({id,name,positions,normals,indices,metadata:g.userData},[positions.buffer,normals.buffer,indices.buffer]);g.dispose();}
 catch(error){self.postMessage({id,error:error.message});}
};
