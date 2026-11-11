"""Offline RTMW3D inference; no image upload. Optional preparation tool, not an app dependency."""
import argparse, hashlib, json, time
from pathlib import Path
import cv2
import numpy as np
import onnxruntime as ort
from rtmlib import RTMPose3d

parser=argparse.ArgumentParser()
parser.add_argument('--root',default='app/public/local-pose-references')
parser.add_argument('--model',default='.review-tools/pose-models/rtmw3d.onnx')
parser.add_argument('--sample',action='store_true')
parser.add_argument('--threads',type=int,default=2)
args=parser.parse_args()
root=Path(args.root); catalog=json.loads((root/'catalog.json').read_text(encoding='utf-8'))
records=catalog['poses']
if args.sample:
    selected={}
    for p in records: selected.setdefault(p['name'],p)
    records=list(selected.values())
out=root/'landmarks';out.mkdir(exist_ok=True)
options=ort.SessionOptions();options.intra_op_num_threads=args.threads;options.inter_op_num_threads=1
model=object.__new__(RTMPose3d)
model.session=ort.InferenceSession(args.model,sess_options=options,providers=['CPUExecutionProvider'])
model.model_input_size=(288,384);model.mean=np.array((123.675,116.28,103.53));model.std=np.array((58.395,57.12,57.375));model.z_range=2.1744869;model.to_openpose=False;model.backend='onnxruntime'
model_hash=hashlib.sha256(Path(args.model).read_bytes()).hexdigest()
started=time.monotonic();done=0
for record in records:
    dest=out/(record['id']+'.json')
    if dest.exists(): continue
    image=cv2.imdecode(np.fromfile(root/record['image'],dtype=np.uint8),cv2.IMREAD_UNCHANGED)
    if image is None: raise ValueError('Unreadable image '+record['id'])
    if image.ndim==2: image=cv2.cvtColor(image,cv2.COLOR_GRAY2BGR)
    if image.shape[2]==4:
        alpha=image[:,:,3:4]/255.0;image=(image[:,:,:3]*alpha+255*(1-alpha)).astype(np.uint8)
    keypoints,scores,simcc,xy=model(image)
    data={'id':record['id'],'model':'RTMW3D-X','modelSha256':model_hash,'imageSha256':record['sha256'],'width':image.shape[1],'height':image.shape[0],'keypoints':keypoints[0].tolist(),'xy':xy[0].tolist(),'scores':scores[0].tolist(),'reviewStatus':'machine-estimated-unreviewed'}
    dest.write_text(json.dumps(data,ensure_ascii=False,allow_nan=False),encoding='utf-8');done+=1
    if args.sample or done%20==0: print(json.dumps({'id':record['id'],'done':done,'elapsedSeconds':round(time.monotonic()-started,1),'meanBodyScore':round(float(np.mean(scores[0][:17])),3)}),flush=True)
print(json.dumps({'processed':done,'available':len(list(out.glob('*.json'))),'seconds':round(time.monotonic()-started,1)}),flush=True)
