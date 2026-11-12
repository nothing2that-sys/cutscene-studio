import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {createAiService} from './ai/service.mjs';

try{process.loadEnvFile(fileURLToPath(new URL('../.env.local',import.meta.url)));}catch(error){if(error.code!=='ENOENT')throw error;}
const ai=createAiService();

const root=fileURLToPath(new URL('../app/dist/',import.meta.url));
const port=Number(process.env.CUTSCENE_PORT || 3001);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  try {
    if(await ai.middleware(req,res))return;
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const file=path.resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
    const relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end();return;}
    if(!(await stat(file)).isFile()){res.writeHead(404);res.end();return;}
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:data);
  } catch {res.writeHead(404);res.end('Not found');}
});
server.on('close',()=>ai.close());
const shutdown=()=>{ai.close();server.close();server.closeIdleConnections();};
process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`포트 ${port}가 사용 중입니다. 이미 실행된 편집기를 확인하세요.`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`컷신 스튜디오: http://127.0.0.1:${port}\n종료하려면 Ctrl+C를 누르세요.`));
