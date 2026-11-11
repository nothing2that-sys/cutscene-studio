// Fixed-view pan/zoom is baked into a camera "view offset" measured in the pixels of the
// window it was made in. Three.js reads offsets as fractions of the frustum width, so
// applying the same view to a camera with another aspect (a 16:9 cut, a resized window)
// stretches the horizontal pan. This re-expresses the view for the new aspect so every
// point keeps its place relative to the frame height (the vertical field of view is
// shared; only the horizontal span changes).
export function fitViewToAspect(view,aspect){
 if(!view?.enabled||!(aspect>0))return view;
 const fh=view.fullHeight,a0=view.fullWidth/fh;
 if(!(fh>0)||Math.abs(a0-aspect)<1e-9)return view;
 // Centre of the visible window, in frame-height units from the frustum centre.
 const centre=view.offsetX/fh+.5*view.width/fh-.5*a0;
 const fullWidth=aspect*fh,width=aspect*view.height;
 return {...view,fullWidth,width,offsetX:fh*centre-.5*width+.5*fullWidth};
}
