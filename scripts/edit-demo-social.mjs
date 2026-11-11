// Edit the captured feature reel into an X-ready H.264/AAC MP4.
// Requires ffmpeg on PATH, FFMPEG_PATH, or .review-tools/video-runtime's ffmpeg-static.
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const ffmpeg=process.env.FFMPEG_PATH||path.resolve('.review-tools/video-runtime/node_modules/ffmpeg-static/ffmpeg.exe');
const dir=path.resolve('.review-tools/social-recording'),out=path.resolve('docs/demo/social');
await mkdir(dir,{recursive:true});
const report=JSON.parse(await readFile(path.join(out,'timeline.json'),'utf8'));
if(report.pageErrors.length||report.clips.length!==13)throw Error('Capture incomplete');
const esc=s=>s.replaceAll('\\','\\\\').replaceAll('{','\\{').replaceAll('}','\\}');
const run=args=>{const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{encoding:'utf8',timeout:180000});if(r.status!==0)throw Error(r.stderr);};
const header=`[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Title,Malgun Gothic,52,&H00CCF5F0,&H00FFFFFF,&H00120C08,&H00120C08,-1,0,0,0,100,100,0,0,1,1,0,2,50,50,93,1\nStyle: Subtitle,Malgun Gothic,31,&H00FFFFFF,&H00FFFFFF,&H00120C08,&H00120C08,0,0,0,0,100,100,0,0,1,1,0,2,50,50,40,1\nStyle: Brand,Malgun Gothic,24,&H00CCF5F0,&H00FFFFFF,&H00120C08,&H00120C08,-1,0,0,0,100,100,1,0,1,1,0,9,40,40,30,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
const clips=[];
// Start with the result, then show how it is made.
const final=report.clips.find(c=>c.id==='final');
const edit=[{...final,id:'hook',title:'포즈 · 구도 · 거리 · 빛',subtitle:'작화 전에, 직접 잡으세요',seconds:2},...report.clips];
const captions=[];let cursor=0;
for(let i=0;i<edit.length;i++){
 const c=edit[i],duration=c.end-c.start,staticCard=['depth-result','light-result','final','hook'].includes(c.id),seconds=c.seconds;
 const sourceStart=Math.max(0,c.start-(report.sourceOffsetSeconds||0));
 let filter=`setpts=${(seconds/duration).toFixed(8)}*(PTS-STARTPTS),fps=30,scale=1920:1080:flags=lanczos,setsar=1`;
 if(!staticCard){
  // Enlarge the controls and the person for pose operations; keep the entire UI for
  // the library, light/depth previews and export actions.
  if(['presets','save','reset','restore'].includes(c.id))filter=`crop=1600:900:320:40,scale=1920:1080:flags=lanczos,setsar=1,setpts=${(seconds/duration).toFixed(8)}*(PTS-STARTPTS),fps=30`;
  await writeFile(path.join(dir,'captions.ass'),header+`Dialogue: 0,0:00:00.00,0:10:00.00,Title,,0,0,0,,{\\fad(80,80)}${esc(c.title)}\nDialogue: 0,0:00:00.00,0:10:00.00,Subtitle,,0,0,0,,${esc(c.subtitle)}\nDialogue: 0,0:00:00.00,0:10:00.00,Brand,,0,0,0,,CUTSCENE STUDIO  /  ${String(i).padStart(2,'0')}\n`);
  filter+=`,drawbox=x=0:y=895:w=1920:h=185:color=0x080e19@0.96:t=fill,ass=captions.ass`;
 }else if(c.id==='hook'||c.id==='final'){
  await writeFile(path.join(dir,'captions.ass'),header+`Dialogue: 0,0:00:00.00,0:10:00.00,Subtitle,,0,0,0,,${c.id==='hook'?'CUTSCENE STUDIO · 42초 기능 소개':'github.com/nothing2that-sys/cutscene-studio'}\n`);
  filter+=`,ass=captions.ass`;
 }
 const target=path.join(dir,`cut-${String(i).padStart(2,'0')}.mp4`);
 const args=['-ss',String(sourceStart),'-t',String(duration),'-i','source.webm','-vf',filter,'-t',String(seconds),'-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-profile:v','high','-level:v','4.1',target];
 const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{cwd:dir,encoding:'utf8',timeout:180000});if(r.status!==0)throw Error(r.stderr);
 clips.push(target);captions.push({...c,outputStart:cursor,outputEnd:cursor+seconds});cursor+=seconds;
 console.log(`Edited ${c.id} (${seconds}s)`);
}
await writeFile(path.join(dir,'concat.txt'),clips.map(p=>`file '${p.replaceAll('\\','/')}'`).join('\n'));
const output=path.join(out,'cutscene-studio-x.mp4');
run(['-f','concat','-safe','0','-i',path.join(dir,'concat.txt'),'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',output]);
run(['-ss','0.5','-i',output,'-frames:v','1',path.join(out,'poster.jpg')]);
await writeFile(path.join(out,'edit-report.json'),JSON.stringify({durationSeconds:cursor,video:'H.264 High@4.1 / yuv420p / 1920x1080 / 30fps',audio:'AAC-LC / 48kHz / stereo silent track',bytes:(await stat(output)).size,captions,checks:report.checks,pageErrors:report.pageErrors},null,2));
console.log(`Ready: ${output} (${cursor}s)`);
