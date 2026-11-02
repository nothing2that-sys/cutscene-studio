"""Independent 2D body estimator plus rotation recovery for the frozen correction queue."""
import argparse,hashlib,json,time
from pathlib import Path
import cv2,numpy as np,onnxruntime as ort
from rtmlib import RTMPose
parser=argparse.ArgumentParser();parser.add_argument('--limit',type=int,default=466);args=parser.parse_args()
root=Path('app/public/local-pose-references');catalog=json.loads((root/'catalog.json').read_text(encoding='utf-8'));ids=json.loads(Path('.review-tools/reference-correction-baseline/targets.json').read_text())[:args.limit]
model_path=next(Path('.review-tools/pose-models/rtmpose-x-2d').rglob('*.onnx'));options=ort.SessionOptions();options.intra_op_num_threads=4;options.inter_op_num_threads=1
model=object.__new__(RTMPose);model.session=ort.InferenceSession(str(model_path),sess_options=options,providers=['CPUExecutionProvider']);model.model_input_size=(288,384);model.mean=np.array((123.675,116.28,103.53));model.std=np.array((58.395,57.12,57.375));model.to_openpose=False;model.backend='onnxruntime'
model_hash=hashlib.sha256(model_path.read_bytes()).hexdigest();out=root/'landmarks-2d';out.mkdir(exist_ok=True);started=time.monotonic();done=0
for id in ids:
 dest=out/(id+'.json')
 if dest.exists():continue
 record=next(p for p in catalog['poses'] if p['id']==id);image=cv2.imdecode(np.fromfile(root/record['image'],np.uint8),cv2.IMREAD_UNCHANGED)
 if image.ndim==2:image=cv2.cvtColor(image,cv2.COLOR_GRAY2BGR)
 if image.shape[2]==4:
  alpha=image[:,:,3:4]/255;image=(image[:,:,:3]*alpha+255*(1-alpha)).astype(np.uint8)
 h,w=image.shape[:2];_,center,scale=model.preprocess(image,[0,0,w,h]);variants=[]
 for turn in range(4):
  rotated=np.ascontiguousarray(np.rot90(image,turn));xy,scores=model(rotated);xy=xy[0];s=scores[0]
  # np.rot90 is counter-clockwise. Undo to original image pixels before crop normalization.
  if turn==1:xy=np.stack((w-1-xy[:,1],xy[:,0]),axis=1)
  elif turn==2:xy=np.stack((w-1-xy[:,0],h-1-xy[:,1]),axis=1)
  elif turn==3:xy=np.stack((xy[:,1],h-1-xy[:,0]),axis=1)
  crop=(xy-center+scale/2)/scale*np.array((288,384))
  variants.append({'rotation':turn*90,'xy':xy.tolist(),'crop':crop.tolist(),'scores':s.tolist(),'meanBodyScore':float(np.mean(s[5:17]))})
 result={'id':id,'model':'RTMPose-X-body7-2D','modelSha256':model_hash,'imageSha256':record['sha256'],'variants':variants};dest.write_text(json.dumps(result,allow_nan=False),encoding='utf-8');done+=1
 if done%10==0:print(json.dumps({'done':done,'id':id,'seconds':round(time.monotonic()-started,1)}),flush=True)
print(json.dumps({'done':done,'cached':len(list(out.glob('*.json'))),'seconds':round(time.monotonic()-started,1)}),flush=True)
