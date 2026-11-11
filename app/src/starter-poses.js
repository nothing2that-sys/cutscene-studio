// Authored with cutscene-studio's joint/continuity rules; no third-party images.
export const STARTER_POSES=[
  ['standing','편하게 서기','standing',{}],
  ['sitting','의자에 앉는 자세','sitting',{}],
  ['pointing','한 손으로 가리키기','pointing',{}],
  ['reaching','앞으로 손 뻗기','reaching',{}],
  ['wave','한 손 들어 인사','standing',{r_arm:{raise:125,straddle:25},r_elbow:{bend:80}}],
  ['both-arms-up','두 팔 올리기','standing',{l_arm:{raise:160,straddle:15},r_arm:{raise:160,straddle:15},l_elbow:{bend:15},r_elbow:{bend:15}}],
  ['walking','걷는 중간 자세','standing',{l_leg:{raise:30},r_leg:{raise:-20},l_knee:{bend:10},r_knee:{bend:35},l_arm:{raise:-20},r_arm:{raise:25},l_elbow:{bend:20},r_elbow:{bend:25}}],
  ['squat','무릎 굽혀 낮추기','standing',{l_leg:{raise:95},r_leg:{raise:95},l_knee:{bend:125},r_knee:{bend:125},l_ankle:{bend:-20},r_ankle:{bend:-20},torso:{bend:20},l_arm:{raise:60},r_arm:{raise:60},l_elbow:{bend:45},r_elbow:{bend:45}}],
  ['bent-arm','한쪽 팔 접기','standing',{r_arm:{raise:35,straddle:35},r_elbow:{bend:100}}],
  ['looking-back','상체 돌려 뒤 보기','standing',{torso:{turn:35},neck:{turn:20},head:{turn:25}}],
  // Floor poses (scene-format POSES); grounded by the lowest point when applied.
  ['kneeling','두 무릎 꿇기','kneeling',{}],
  ['half-kneeling','한쪽 무릎 꿇기','half-kneeling',{}],
  ['squatting','쪼그려 앉기','squatting',{}],
  ['crouching','웅크려 앉기','crouching',{}],
  ['lying','바닥에 눕기','lying',{}],
].map(([key,name,pose,joints])=>({id:'starter-'+key,name,source:'cutscene-studio-authored-3d',pose:{pose,joints},thumbnail:'/pose-library/'+key+'.png',createdAt:'2026-11-02'}));
