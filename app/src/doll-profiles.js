// Only metadata and manually read pose anchors. No third-party image bytes.
export const GALLERY_P015={
 id:'gallery-p015',name:'갤러리 P015 · 콘트라포스토',source:'https://ai-pose-gallery.pages.dev/',imageUrl:'https://ai-pose-gallery.pages.dev/img/full_single_P015_front.png',sourceId:'full_single_P015_front',sourceTitle:'立ち・コントラポスト腰に手',width:900,height:1200,sha256:'51f54ceb4d8115f6e29a36a9583a88f896314304101ca035091a1d30394e80aa',
 localReference:'http://127.0.0.1:3015/gallery-p015.png',
 anchors:{upperL:[323,274],upperR:[520,289],foreL:[198,381],wristL:[280,474],foreR:[541,456],wristR:[577,576],ankleL:[354,1029],ankleR:[628,1027]},
};
// Body-variety prototypes (docs/BODY_VARIETY_PLAN.md stage 1). Values are relative to the
// default female 8-head doll: limb lengths and widths go to the rig, `form` scales the
// torso sections. The default profile is untouched.
const MALE={upperLength:172,foreLength:135,thighLength:272,shinLength:282,shoulderHalfSpan:104,shoulderRadius:35,headOffset:30,headShiftX:0,headScale:1.02,armWidth:1.1,legWidth:1,thighUpper:.84,
 form:{chest:.12,thoraxWidth:1.1,thoraxDepth:1.06,waistWidth:1.14,pelvisWidth:.9,glutes:.8,hipHalfSpan:68}};
export const BODY_FORMS={
 male:{label:'성인 남성 · 8등신',metrics:MALE},
 neutral:{label:'중성 · 8등신',metrics:{upperLength:169,foreLength:133,thighLength:269,shinLength:278,shoulderHalfSpan:98,shoulderRadius:33,headOffset:29,headShiftX:0,headScale:1,armWidth:1.03,legWidth:.98,thighUpper:.9,
  form:{chest:0,thoraxWidth:1.04,thoraxDepth:1.02,waistWidth:1.07,pelvisWidth:.94,glutes:.88,hipHalfSpan:70}}},
 child:{label:'아이 · 약 5.5등신',metrics:{upperLength:138,foreLength:108,thighLength:218,shinLength:224,shoulderHalfSpan:80,shoulderRadius:28,headOffset:26,headShiftX:0,headScale:1.4,headWidth:1.4,headGrowsUp:true,armWidth:.86,legWidth:.88,thighUpper:.88,
  form:{chest:0,thoraxWidth:.9,thoraxDepth:1,waistWidth:1.08,pelvisWidth:.84,glutes:.78,hipHalfSpan:58}}},
 'male-heavy':{label:'성인 남성 · 큰 체격',metrics:{...MALE,armWidth:1.18,legWidth:1.16,thighUpper:.96,shoulderRadius:39,shoulderHalfSpan:118,
  form:{...MALE.form,thoraxWidth:1.1,thoraxDepth:1.25,waistWidth:1.42,abdomenFront:1.4,pelvisWidth:1.08,glutes:.95,hipHalfSpan:72}}},
};
// Body types offered in the editor and scene JSON. Each maps to a doll profile; the
// nominal head units feed camera wording (the rig itself stays the 8-head v1 driver).
export const BODY_TYPES={
 female:{profile:'default',label:'성인 여성 · 8등신',headUnits:8},
 male:{profile:'male',label:BODY_FORMS.male.label,headUnits:8},
 neutral:{profile:'neutral',label:BODY_FORMS.neutral.label,headUnits:8},
 child:{profile:'child',label:BODY_FORMS.child.label,headUnits:5.4},
 'male-heavy':{profile:'male-heavy',label:BODY_FORMS['male-heavy'].label,headUnits:8},
};
export const bodyTypeOf=profile=>profile?.bodyType||'female';
export function dollProfile(id='default'){
 if(id==='default')return {id,upperLength:167,foreLength:131,shoulderHalfSpan:93,shoulderRadius:32,headOffset:28,headShiftX:0,headScale:1};
 if(id==='gallery-p015')return {id,upperLength:184,foreLength:136,shoulderHalfSpan:110,shoulderRadius:40.5,headOffset:65,headShiftX:-8,headScale:1.025};
 if(BODY_FORMS[id])return {id,...BODY_FORMS[id].metrics};
 throw Error('지원하지 않는 전신 체형입니다.');
}
export const galleryAuthor=key=>GALLERY_P015.anchors[key].map(v=>v*960/GALLERY_P015.width);
