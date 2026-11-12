// ReviewGate separates wire adapters from transports. Keep the same boundary here.
import {parseObject} from './cli-transport.mjs';

const API={openai:'https://api.openai.com/v1/responses',gemini:'https://generativelanguage.googleapis.com/v1beta/interactions'};
export const DEFAULT_MODELS={openai:{plan:'gpt-6-astra',image:'gpt-6-astra'},gemini:{plan:'gemini-3.8-flash',image:'gemini-nano-banana-2.1'}};
export function apiKey(provider,env=process.env){return provider==='openai'?env.OPENAI_API_KEY:env.GEMINI_API_KEY||env.GOOGLE_API_KEY;}
export function makeRequest({provider,operation,model,prompt,images=[]}){
  if(!Object.hasOwn(API,provider))throw new Error('지원하지 않는 API 제공자입니다.');
  model=model||DEFAULT_MODELS[provider][operation];
  if(provider==='openai')return {url:API.openai,body:{model,store:false,input:[{role:'user',content:[{type:'input_text',text:prompt},...images.map(x=>({type:'input_image',image_url:x.dataUrl}))]}],
    ...(operation==='image'?{tools:[{type:'image_generation',model:'gpt-image-2.5-sunburst',output_format:'png'}],tool_choice:{type:'image_generation'}}:{text:{format:{type:'json_object'}},max_output_tokens:12000})}};
  return {url:API.gemini,body:{model,store:false,input:[{type:'text',text:prompt},...images.map(x=>({type:'image',mime_type:x.mime,data:x.dataUrl.split(',')[1]}))],
    ...(operation==='plan'?{response_format:{type:'text',mime_type:'application/json'}}:{})}};
}
export function parseResponse(provider,operation,json){
  if(provider==='openai'){
    if(json.status&&json.status!=='completed')throw new Error('모델 응답이 완료되지 않았습니다.');
    if(operation==='image'){
      const image=json.output?.find(x=>x.type==='image_generation_call'&&typeof x.result==='string');
      if(!image)throw new Error('응답에 생성된 이미지가 없습니다. 이미지 생성 지원 모델인지 확인하세요.');
      return {mime:'image/png',base64:image.result};
    }
    return parseObject(json.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n'));
  }
  if(json.status&&json.status!=='completed')throw new Error('모델 응답이 완료되지 않았습니다.');
  const blocks=(json.steps||[]).filter(x=>x.type==='model_output').flatMap(x=>x.content||[]);
  if(operation==='image'){
    const image=json.output_image||blocks.findLast(x=>x.type==='image'&&x.data);
    if(!image?.data)throw new Error('응답에 생성된 이미지가 없습니다. 이미지 생성 지원 모델인지 확인하세요.');
    return {mime:image.mime_type||'image/png',base64:image.data};
  }
  return parseObject(blocks.filter(x=>x.type==='text').map(x=>x.text).join('\n'));
}
// Fixed endpoints, no redirects, bounded reads, no automatic retry after uncertain outcomes.
export async function runApi(options,{env=process.env,fetcher=fetch}={}){
  const key=apiKey(options.provider,env);if(!key)throw new Error(`${options.provider==='openai'?'OPENAI_API_KEY':'GEMINI_API_KEY'}가 서버 환경에 없습니다. CLI를 선택하거나 기존 키를 서버에 설정하세요.`);
  const {url,body}=makeRequest(options);
  const response=await fetcher(url,{method:'POST',redirect:'error',signal:options.signal,headers:{'Content-Type':'application/json',...(options.provider==='openai'?{Authorization:`Bearer ${key}`}:{'x-goog-api-key':key,'Api-Revision':'2026-05-20'})},body:JSON.stringify(body)});
  if(!response.ok){await response.body?.cancel();throw new Error(`API 요청 실패 (${response.status}). 인증·사용량·모델 권한을 확인하세요. 자동 재시도하지 않았습니다.`);}
  const reader=response.body.getReader();let size=0;const chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>48*1024*1024)throw new Error('API 응답 용량을 초과했습니다.');chunks.push(value);}}finally{await reader.cancel();}
  let json;try{json=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('API가 올바른 JSON 응답을 반환하지 않았습니다.');}
  return parseResponse(options.provider,options.operation,json);
}
