// Minimal PNG (8/16-bit gray or RGBA) and stored-ZIP writers for the LLM shot package.
// No dependencies: CompressionStream('deflate') produces the zlib stream PNG expects.
const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
export function crc32(bytes,crc=0){crc=~crc>>>0;for(let i=0;i<bytes.length;i++)crc=CRC_TABLE[(crc^bytes[i])&255]^(crc>>>8);return ~crc>>>0;}
async function deflate(bytes){const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));return new Uint8Array(await new Response(stream).arrayBuffer());}
const u32=v=>[v>>>24&255,v>>>16&255,v>>>8&255,v&255];
function chunk(type,data){const t=new TextEncoder().encode(type),body=new Uint8Array(t.length+data.length);body.set(t);body.set(data,t.length);return [...u32(data.length),...body,...u32(crc32(body))];}
// channels: 1 = gray, 4 = RGBA. bitDepth 16 takes a Uint16Array of samples.
export async function encodePNG({width,height,channels,bitDepth=8,data}){
 const colorType=channels===1?0:channels===3?2:6,bytesPer=channels*bitDepth/8,stride=width*bytesPer;
 const raw=new Uint8Array((stride+1)*height);
 for(let y=0;y<height;y++){raw[y*(stride+1)]=0;const row=y*(stride+1)+1;
  if(bitDepth===16)for(let i=0;i<width*channels;i++){const v=data[y*width*channels+i];raw[row+2*i]=v>>8;raw[row+2*i+1]=v&255;}
  else raw.set(data.subarray(y*stride,(y+1)*stride),row);}
 const ihdr=new Uint8Array([...u32(width),...u32(height),bitDepth,colorType,0,0,0]);
 const parts=[137,80,78,71,13,10,26,10,...chunk('IHDR',ihdr),...chunk('IDAT',await deflate(raw)),...chunk('IEND',new Uint8Array())];
 return new Uint8Array(parts);
}
// files: [{name, data:Uint8Array|string}] -> Uint8Array (stored, UTF-8 names).
export function createZip(files){
 const enc=new TextEncoder(),local=[],central=[];let offset=0;
 const le16=v=>[v&255,v>>8&255],le32=v=>[v&255,v>>>8&255,v>>>16&255,v>>>24&255];
 for(const file of files){
  const name=enc.encode(file.name),data=typeof file.data==='string'?enc.encode(file.data):file.data,crc=crc32(data);
  const head=[...le16(20),...le16(0x0800),...le16(0),...le16(0),...le16(0x21),...le32(crc),...le32(data.length),...le32(data.length),...le16(name.length),...le16(0)];
  const entry=new Uint8Array(4+head.length+name.length+data.length);entry.set([0x50,0x4b,3,4,...head]);entry.set(name,4+head.length);entry.set(data,4+head.length+name.length);
  local.push(entry);
  central.push(new Uint8Array([0x50,0x4b,1,2,...le16(20),...head,...le16(0),...le16(0),...le16(0),...le32(0),...le32(offset),...name]));
  offset+=entry.length;
 }
 const size=central.reduce((s,c)=>s+c.length,0),end=new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...le16(files.length),...le16(files.length),...le32(size),...le32(offset),0,0]);
 const out=new Uint8Array(offset+size+end.length);let p=0;for(const part of [...local,...central,end]){out.set(part,p);p+=part.length;}return out;
}
export function dataUrlBytes(url){const [head,body]=url.split(',');if(!/;base64$/.test(head))return new TextEncoder().encode(decodeURIComponent(body));const bin=atob(body),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
