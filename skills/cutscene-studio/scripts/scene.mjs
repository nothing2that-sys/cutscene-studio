import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const skillRoot=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
const command=args.shift();
function option(name){const i=args.indexOf(name);if(i<0)return undefined;const value=args[i+1];if(!value||value.startsWith('--'))throw new Error(name+' requires a value');args.splice(i,2);return value;}
const appOption=option('--app-root');
const outOption=option('--out');
const overwriteIndex=args.indexOf('--overwrite');
const overwrite=overwriteIndex>=0;
if(overwrite)args.splice(overwriteIndex,1);
const input=args.shift();
if(args.length)throw new Error('Unexpected arguments: '+args.join(' '));
async function exists(p){try{await access(p);return true;}catch{return false;}}
async function resolveApp(){
  const candidates=[];
  if(appOption){const explicit=path.resolve(appOption);if(await exists(path.join(explicit,'app/src/scene-format.js')))return explicit;throw new Error('No Cutscene Studio app found at --app-root');}
  let current=process.cwd();
  for(;;){candidates.push(current);const parent=path.dirname(current);if(parent===current)break;current=parent;}
  try{candidates.push(JSON.parse(await readFile(path.join(skillRoot,'references/runtime.json'),'utf8')).appRoot);}catch{}
  for(const root of candidates.filter(Boolean)){if(await exists(path.join(root,'app/src/scene-format.js')))return path.resolve(root);}
  if(appOption)throw new Error('No Cutscene Studio app found at --app-root');
  return null;
}
async function format(){
  const root=await resolveApp();
  const source=root?path.join(root,'app/src/scene-format.js'):path.join(skillRoot,'scripts/scene-format.mjs');
  return {root,source,impl:await import(pathToFileURL(source).href)};
}
async function readJSON(file){
  if(!file)throw new Error('Input JSON file is required');
  const text=await readFile(file,'utf8');
  if(text.length>40_000_000)throw new Error('Input exceeds 40MB');
  return JSON.parse(text.replace(/^\uFEFF/,''));
}
function print(value){process.stdout.write(JSON.stringify(value,null,2)+'\n');}
async function save(file,data){
  if(!overwrite&&await exists(file))throw new Error('Output exists; choose a new path or explicitly use --overwrite');
  await mkdir(path.dirname(path.resolve(file)),{recursive:true});
  await writeFile(file,data,{flag:overwrite?'w':'wx'});
}
function inspect(data){
  if(data.reportVersion===1&&typeof data.originalJSON==='string'&&Array.isArray(data.errors))return {...data,kind:'validation-report',visualReview:false};
  if(data.version===1&&data.units==='meters'&&!data.editorState&&!data.mannequins)
    return {kind:'scene-proposal',title:data.title,actors:data.actors,props:data.props,camera:data.camera,shots:data.shots,visualReview:false};
  const state=data.editorState||data;
  if(!Array.isArray(state.mannequins)||!Array.isArray(state.importedModels))throw new Error('Not a scene, editor project, or handoff packet');
  const studio=state.studio||{};
  const shot=data.activeShot?.camera?data.activeShot:studio.shots?.[studio.activeShot];
  return {
    kind:data.editorState?'handoff':'editor-project',
    actualStateSource:data.editorState?'editorState':'root mannequins/importedModels',
    title:studio.document?.title,
    transformConvention:'Root transforms, not proposal feet anchors; Euler rotation is radians with order',
    actors:state.mannequins.map(m=>({id:m.studioId,name:m.name,bodyProfile:m.bodyProfile,boneLayout:m.boneLayout,position:m.position,rotation:m.rotation,scale:m.scale,posture:m.posture,joints:m.joints})),
    props:state.importedModels.map(m=>({name:m.name,position:m.position,rotation:m.rotation,scale:m.scale,primitive:m.primitive,embeddedGLB:!!m.glbBase64})),
    captureCamera:shot?.camera||state.camera,
    workingCamera:state.camera,
    shots:studio.shots||[],activeShot:studio.activeShot,
    lighting:studio.document?.lighting,room:studio.document?.room,
    proposalIsInitial:true,shotsSharePose:true,
    images:{color:!!data.images?.color,depth:!!data.images?.depth},
    render:data.render,direction:data.direction,
    visualReview:false,
  };
}
function png(data,name){
  if(typeof data!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=\r\n]+$/.test(data))throw new Error(name+' is not a PNG data URL');
  const bytes=Buffer.from(data.slice(data.indexOf(',')+1),'base64');
  if(bytes.length>20_000_000||bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(name+' has invalid PNG bytes');
  return {bytes,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
try{
  if(!command||command==='help'||command==='--help'){
    print({commands:['info [--app-root PATH]','validate INPUT [--app-root PATH] [--out NEW.json] [--overwrite]','inspect INPUT','extract HANDOFF --out NEW_DIRECTORY'],notes:'No network, LLM calls, browser injection, or image generation. Validate uses the installed app schema first.'});
  }else if(command==='info'){
    const f=await format();print({appRoot:f.root,schemaSource:f.source,fallback:!f.root,url:f.root?'http://127.0.0.1:3001':null,serverRunning:'not checked',shotsSharePose:true});
  }else if(command==='validate'){
    const data=await readJSON(input),f=await format(),normalized=f.impl.validateScene(data);
    if(outOption)await save(outOption,JSON.stringify(normalized,null,2)+'\n');
    print({valid:true,schemaSource:f.source,fallback:!f.root,actors:normalized.actors.length,props:normalized.props.length,shots:normalized.shots.length,output:outOption?path.resolve(outOption):null,warnings:f.impl.analyzeScene?.(data).warnings||[],visualReview:false});
  }else if(command==='inspect'){
    print(inspect(await readJSON(input)));
  }else if(command==='extract'){
    if(!outOption)throw new Error('--out NEW_DIRECTORY is required');
    const data=await readJSON(input);
    inspect(data);
    if(!data.editorState||!data.images)throw new Error('Extraction requires a handoff with editorState and images');
    const color=png(data.images.color,'color'),depth=png(data.images.depth,'depth');
    if(color.width!==depth.width||color.height!==depth.height)throw new Error('Color and depth dimensions do not match');
    const dest=path.resolve(outOption);
    if(await exists(dest))throw new Error('Extraction destination already exists; use a new directory');
    await mkdir(path.dirname(dest),{recursive:true});await mkdir(dest);
    await writeFile(path.join(dest,'color.png'),color.bytes);
    await writeFile(path.join(dest,'depth.png'),depth.bytes);
    await writeFile(path.join(dest,'project.json'),JSON.stringify(data.editorState,null,2)+'\n');
    await writeFile(path.join(dest,'direction.txt'),typeof data.direction==='string'?data.direction:'');
    print({extracted:true,directory:dest,files:['color.png','depth.png','project.json','direction.txt'],resolution:[color.width,color.height],visualReview:false});
  }else throw new Error('Unknown command: '+command);
}catch(error){process.stderr.write(JSON.stringify({ok:false,error:error.message,issues:error.issues||[]})+'\n');process.exitCode=1;}
