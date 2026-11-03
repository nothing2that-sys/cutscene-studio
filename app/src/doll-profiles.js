// Only metadata and manually read pose anchors. No third-party image bytes.
export const GALLERY_P015={
 id:'gallery-p015',name:'갤러리 P015 · 콘트라포스토',source:'https://ai-pose-gallery.pages.dev/',imageUrl:'https://ai-pose-gallery.pages.dev/img/full_single_P015_front.png',sourceId:'full_single_P015_front',sourceTitle:'立ち・コントラポスト腰に手',width:900,height:1200,sha256:'51f54ceb4d8115f6e29a36a9583a88f896314304101ca035091a1d30394e80aa',
 localReference:'http://127.0.0.1:3015/gallery-p015.png',
 anchors:{upperL:[323,274],upperR:[520,289],foreL:[198,381],wristL:[280,474],foreR:[541,456],wristR:[577,576],ankleL:[354,1029],ankleR:[628,1027]},
};
export function dollProfile(id='default'){
 if(id==='default')return {id,upperLength:167,foreLength:131,shoulderHalfSpan:93,shoulderRadius:32,headOffset:28,headShiftX:0,headScale:1};
 if(id==='gallery-p015')return {id,upperLength:184,foreLength:136,shoulderHalfSpan:110,shoulderRadius:40.5,headOffset:65,headShiftX:-8,headScale:1.025};
 throw Error('지원하지 않는 전신 체형입니다.');
}
export const galleryAuthor=key=>GALLERY_P015.anchors[key].map(v=>v*960/GALLERY_P015.width);
