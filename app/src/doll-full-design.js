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
 if(p.form)applyBodyForm(d,p.form);
 const parts=Object.fromEntries(['thorax','abdomen','pelvis'].map(name=>[name,structuredClone(d[name])]));
 for(const p of Object.values(parts))p.sockets=[]; // solid parent joints are genuinely unioned with the outer torso
 d.torso={jointSolids:['L','R'].flatMap(side=>[{center:d.thorax.sockets.find(s=>s.name==='shoulder'+side).center,radius:[p.shoulderRadius,p.shoulderRadius,p.shoulderRadius]},{center:d.pelvis.sockets.find(s=>s.name==='hip'+side).center,radius:[42,42,42]}]),sections:[...d.thorax.sections.filter(r=>r[0]<419),...d.abdomen.sections.filter(r=>r[0]>=419&&r[0]<488),...d.pelvis.sections.filter(r=>r[0]>=488)],parts,blend:8};
 return d;}

// Body-variety prototypes: scale torso cross-sections (columns: y, half-width, front,
// back) with factors that vary smoothly with height (chest -> waist -> hips), so the
// thorax, abdomen and pelvis still meet without a step. Heights (y) are left alone so the
// anatomical relief positions inside coreField stay where they were authored.
const lerpAnchors=(anchors,y)=>{if(y<=anchors[0][0])return anchors[0][1];for(let i=1;i<anchors.length;i++)if(y<=anchors[i][0]){const [y0,a]=anchors[i-1],[y1,b]=anchors[i],t=(y-y0)/(y1-y0),s=t*t*(3-2*t);return a+(b-a)*s;}return anchors.at(-1)[1];};
function applyBodyForm(d,f){
 const tw=f.thoraxWidth??1,td=f.thoraxDepth??1,ww=f.waistWidth??1,pw=f.pelvisWidth??1,belly=f.abdomenFront??1,gl=f.glutes??1;
 const width=[[240,tw],[345,tw],[440,ww],[485,ww],[545,pw],[620,pw]];
 const front=[[240,td],[370,td],[455,td*belly],[505,td*(1+(belly-1)*.6)],[560,1+(td-1)*.5],[620,1]];
 const back=[[240,td],[400,td],[470,td],[530,gl],[620,gl]];
 const scale=rows=>rows.map(([y,w,fr,bk,...rest])=>[y,w*lerpAnchors(width,y),fr*lerpAnchors(front,y),bk*lerpAnchors(back,y),...rest]);
 for(const name of ['thorax','abdomen','pelvis'])d[name].sections=scale(d[name].sections);
 d.thorax.relief={...d.thorax.relief,projection:d.thorax.relief.projection*(f.chest??1)};
 if(f.hipHalfSpan)d.pelvis.sockets=d.pelvis.sockets.map(s=>s.name.startsWith('hip')?{...s,center:[Math.sign(s.center[0])*f.hipHalfSpan,s.center[1],s.center[2]]}:s);
 d.previewBundle='none';
}
