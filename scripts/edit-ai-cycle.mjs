// Edit only the recorded timeline. No generated/simulated UI frames are substituted.
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'docs/demo/ai-cycle');
const ffmpeg=process.env.FFMPEG_PATH||path.join(root,'.review-tools/video-runtime/node_modules/ffmpeg-static/ffmpeg.exe');
const report=JSON.parse(await readFile(path.join(out,'recording-report.json'),'utf8'));
const raw=path.dirname(path.resolve(root,report.source));
if(!report.success||report.pageErrors.length||report.calls.length!==3||report.clips.length!==12)throw Error('Live capture is incomplete.');
if(report.calls.filter(x=>x.operation==='image').some(x=>!x.characterNotesForwarded))throw Error('Character notes did not reach the final image request.');
await mkdir(raw,{recursive:true});
function run(args,options={}){const result=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{cwd:raw,encoding:'utf8',timeout:180000,...options});if(result.status!==0)throw Error(result.stderr);return result;}
const assHeader=`[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Footer,Malgun Gothic,29,&H00FFFFFF,&H00FFFFFF,&H00120C08,&H00120C08,0,0,0,0,100,100,0,0,1,1,0,2,40,40,30,1\nStyle: Brand,Malgun Gothic,23,&H00CCF5F0,&H00FFFFFF,&H00120C08,&H00120C08,-1,0,0,0,100,100,0,0,1,1,0,3,40,40,75,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
const edits=[],files=[];let cursor=0;
for(const [i,clip]of report.clips.entries()){
  const duration=clip.end-clip.start,seconds=clip.seconds;
  const waiting=['planning','first-wait','second-wait'].includes(clip.id);
  const footer=waiting?`실제 대기 ${Math.round(duration)}초 → 영상 ${seconds}초로 축약 · ${Math.max(1,duration/seconds).toFixed(1)}배속`:clip.id==='request'?'요청: 오후 햇살 아래, 서연이 탁자 위 파란 찻잔을 내려다본다':'실제 앱 녹화 · 로그인된 Codex CLI · 새 API 키 발급 없음';
  const ass=assHeader+`Dialogue: 0,0:00:00.00,0:10:00.00,Footer,,0,0,0,,${footer}\nDialogue: 0,0:00:00.00,0:10:00.00,Brand,,0,0,0,,CUTSCENE STUDIO  |  ${String(i+1).padStart(2,'0')} / ${report.clips.length}\n`;
  const caption=`caption-${i}.ass`;await writeFile(path.join(raw,caption),ass);
  // Maintain the entire real editor. Input/control text is not replaced by a mockup.
  const filter=`setpts=${(seconds/duration).toFixed(9)}*(PTS-STARTPTS),fps=30,scale=1920:1080:flags=lanczos,setsar=1,drawbox=x=0:y=968:w=1920:h=112:color=0x080e19@0.98:t=fill,ass=${caption}`;
  const file=path.join(raw,`edited-${String(i).padStart(2,'0')}.mp4`);
  run(['-ss',String(clip.start),'-t',String(duration),'-i','source.webm','-vf',filter,'-t',String(seconds),'-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p',file]);
  files.push(file);edits.push({...clip,outputStart:cursor,outputEnd:cursor+seconds,actualSeconds:duration,speed:duration/seconds});cursor+=seconds;console.log('EDITED',clip.id,seconds+'s');
}
await writeFile(path.join(raw,'concat.txt'),files.map(file=>`file '${file.replaceAll('\\','/')}'`).join('\n'));
const target=path.join(out,'cutscene-ai-cycle.mp4');
run(['-f','concat','-safe','0','-i','concat.txt','-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',target]);
const posterTime=edits.find(x=>x.id==='compare').outputStart+2;
run(['-ss',String(posterTime),'-i',target,'-frames:v','1',path.join(out,'poster.jpg')]);
// Decode the whole artifact to ensure the final container and all video frames are readable.
run(['-i',target,'-f','null','-']);
const format=spawnSync(ffmpeg,['-hide_banner','-i',target],{encoding:'utf8'}).stderr;
await writeFile(path.join(out,'edit-report.json'),JSON.stringify({success:true,durationSeconds:cursor,format:'1920x1080 / 30 fps / H.264 / yuv420p / AAC silent track',bytes:(await stat(target)).size,decodeCheck:'passed',edits,sourceModelCalls:report.calls.map(x=>({operation:x.operation,provider:x.provider})),mediaInfo:format},null,2));
const chapters=edits.map(x=>`${String(Math.floor(x.outputStart/60)).padStart(2,'0')}:${String(x.outputStart%60).padStart(2,'0')} ${x.title}`).join('\n');
await writeFile(path.join(out,'README.md'),`# 실제 CLI 생성·수정·재생성 영상\n\n2026-11-12 실제 로컬 편집기와 로그인된 Codex CLI로 녹화했습니다. 새 API 키는 만들지 않았습니다.\n\n[영상 재생](cutscene-ai-cycle.mp4) · [수정 전 결과](result-1.png) · [수정 후 결과](result-2.png)\n\n- 소설과 인물 설정 입력 → 한 번에 이미지까지 생성.\n- 같은 장면에서 화풍·카메라 위치·화각 수정.\n- 현재 구도로 이어서 생성 → 수정 전/후 결과 비교.\n- 실제 호출: 장면 구성 1회, 이미지 생성 2회. 모의 응답이나 이전 생성 결과로 대체하지 않았습니다.\n- 대기 구간은 실제 소요 시간과 배속을 표시해 축약했습니다. 상단 설명과 결과 확대는 녹화용 주석입니다.\n- ${cursor}초, 1920×1080, 30 fps, H.264 MP4. 음성 없이 한국어 자막으로 설명합니다.\n\n## 타임라인\n\n\`\`\`text\n${chapters}\n\`\`\`\n\n실행·검증 근거는 recording-report.json과 edit-report.json에 있습니다. 구도·포즈 보존 정도는 생성 모델에 따라 달라질 수 있습니다.\n`);
console.log('VIDEO READY',target,cursor+'s');
