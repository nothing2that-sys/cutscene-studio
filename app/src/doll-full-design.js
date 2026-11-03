import {defaultCoreDesign} from './doll-core-geometry.js';
import {dollProfile} from './doll-profiles.js';

// Full-doll refinement. Core editor defaults remain a separate saved study.
export function fullDollDesign(profile='default'){const p=dollProfile(profile),d=defaultCoreDesign();d.previewBundle=profile==='gallery-p015'?'gallery-p015':'full';
 d.thorax.sections=[[239,25,24,23],[250,54,31,29],[266,84,39,36],[286,85,47,39],[310,79,51,41],[336,85,50,42],[359,98,47,42],[378,87,42,40],[395,70,36,38],[410,62,34,36],[423,59,33,34]];
 d.thorax.relief={...d.thorax.relief,projection:60,spacing:46};
 d.thorax.sideWidthScale=.88;
 d.thorax.sockets=d.thorax.sockets.map(s=>s.name.startsWith('shoulder')?{...s,center:[Math.sign(s.center[0])*p.shoulderHalfSpan,274,0],radius:profile==='gallery-p015'?[43,44,41]:[39,40,37]}:s.name==='waistUpper'?{...s,radius:[64,32,40]}:s);
 // Hip span is an anatomical rest dimension, not a projected screen distance.
 // A turned pelvis must retain enough transverse span in three dimensions.
 d.pelvis.sections=d.pelvis.sections.map(row=>{const r=[...row],y=r[0],blend=Math.min(Math.max((y-480)/49,0),1)*Math.min(Math.max((617-y)/23,0),1);r[1]*=1+.055*blend;if(y===594)r[1]=65;if(y===608)r[1]=20;return r;});
 d.pelvis.sockets=d.pelvis.sockets.map(s=>s.name==='waistLower'?{...s,radius:[74,34,44]}:s.name.startsWith('hip')?{...s,center:[Math.sign(s.center[0])*73,560,1],radius:[42,42,40]}:s);
 // One continuous external torso. The three original pivots still drive it;
 // shoulder and hip sockets remain actual cavities in this surface.
 const parts=Object.fromEntries(['thorax','abdomen','pelvis'].map(name=>[name,structuredClone(d[name])]));
 for(const p of Object.values(parts))p.sockets=[]; // solid parent joints are genuinely unioned with the outer torso
 d.torso={jointSolids:['L','R'].flatMap(side=>[{center:d.thorax.sockets.find(s=>s.name==='shoulder'+side).center,radius:[p.shoulderRadius,p.shoulderRadius,p.shoulderRadius]},{center:d.pelvis.sockets.find(s=>s.name==='hip'+side).center,radius:[42,42,42]}]),sections:[...d.thorax.sections.filter(r=>r[0]<419),...d.abdomen.sections.filter(r=>r[0]>=419&&r[0]<488),...d.pelvis.sections.filter(r=>r[0]>=488)],parts,blend:8};
 return d;}
