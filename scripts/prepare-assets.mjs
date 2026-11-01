import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { EXAMPLE_SCENE,validateScene } from '../app/src/scene-format.js';

await mkdir('examples',{recursive:true});
await mkdir('app/public',{recursive:true});
await writeFile('examples/example-scene.json',JSON.stringify(validateScene(EXAMPLE_SCENE),null,2)+'\n');
const licenses=[['pose-toolkit','app/LICENSE'],['mannequin-js','app/node_modules/mannequin-js/LICENSE'],['Three.js','app/node_modules/three/LICENSE'],['Vite','app/node_modules/vite/LICENSE.md']];
let out='Local Cutscene Studio uses the following third-party works.\nModified pose-toolkit source and original history are in app/.\n\n';
for(const [name,file]of licenses)out+=`=== ${name} ===\n${await readFile(file,'utf8')}\n\n`;
await writeFile('app/public/THIRD_PARTY_LICENSES.txt',out);
console.log('Prepared example scene and third-party notices.');
