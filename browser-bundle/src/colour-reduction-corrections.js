/* Explicit source-based corrections; never protect an already distorted output. */
(function(root){
 'use strict';
 const need=(v,m)=>{if(!v)throw Error('Colour correction: '+m);};
 const key=c=>(c[0]<<16)|(c[1]<<8)|c[2];
 function plan(args){
  const {rgba,width,height,colors,libraryIds}=args,n=width*height;
  need(rgba instanceof Uint8Array&&rgba.length===n*4,'Invalid source pixels.');
  const byId=new Map(colors.map(c=>[c.id,c])),allowed=new Set(libraryIds);
  need(allowed.size>0&&allowed.size===libraryIds.length&&libraryIds.every(id=>Number.isInteger(id)&&byId.has(id)),'Invalid library.');
  const valid=r=>Array.isArray(r)&&r.length===4&&r.every(Number.isInteger)&&r[0]>=0&&r[1]>=0&&r[0]<=r[2]&&r[1]<=r[3]&&r[2]<width&&r[3]<height;
  const rectangles=args.protectedRectangles||[],corrections=args.regionCorrections||[],originals=args.originalRgbs||[],locked=args.lockedIds||[];
  need(Array.isArray(rectangles)&&rectangles.length<=64&&rectangles.every(valid),'Invalid protected rectangle bounds.');
  need(Array.isArray(corrections)&&corrections.length<=64,'At most 64 corrections are supported.');
  corrections.forEach((c,i)=>{need(c&&valid(c.rectangle),'Invalid correction bounds.');need(['NEAREST_LIBRARY','REFERENCE'].includes(c.mode),'Invalid correction mode.');if(c.mode==='REFERENCE')need(Number.isInteger(c.atlas_row_id)&&allowed.has(c.atlas_row_id),'Correction reference is outside this library.');
   const a=c.rectangle;need(!corrections.slice(0,i).some(v=>{const b=v.rectangle;return a[0]<=b[2]&&b[0]<=a[2]&&a[1]<=b[3]&&b[1]<=a[3];}),'Correction rectangles must not overlap. Remove or adjust the earlier correction.');});
  need(Array.isArray(originals)&&originals.length<=256&&originals.every(c=>Array.isArray(c)&&c.length===3&&c.every(v=>Number.isInteger(v)&&v>=0&&v<=255)),'Invalid source RGB.');
  need(Array.isArray(locked)&&locked.every(id=>Number.isInteger(id)&&allowed.has(id)),'Protected reference is outside this library.');
  const binding=root.ATLAS_CLARUS_PKL_IMAGE.create(libraryIds.map(id=>byId.get(id)),args.master),mask=new Uint8Array(n),forced=new Int32Array(n).fill(-1),locks=new Set(locked),globalKeys=new Set(originals.map(key)),present=new Set(),bindings=new Map(),cache=new Map();let protectedVisible=0;
  function mark(r,id=-1){const [x0,y0,x1,y1]=r;for(let y=y0;y<=y1;y++){const a=y*width+x0,b=y*width+x1+1;mask.fill(1,a,b);if(id>=0)forced.fill(id,a,b);}}
  rectangles.forEach(r=>mark(r));const priorMask=mask.slice();corrections.forEach(c=>mark(c.rectangle,c.mode==='REFERENCE'?c.atlas_row_id:-1));
  for(let p=0;p<n;p++){const i=p*4;if(!rgba[i+3])continue;const rgb=Array.from(rgba.subarray(i,i+3)),k=key(rgb);if(globalKeys.has(k)){mask[p]=1;present.add(k);}if(!mask[p])continue;
   if(forced[p]>=0&&(priorMask[p]||globalKeys.has(k)))need(binding.nearest(rgb).row.id===forced[p],'Correction conflicts with existing source protection. Remove that protection first.');
   protectedVisible++;let ref=forced[p]>=0?byId.get(forced[p]):cache.get(k);if(!ref){ref=binding.nearest(rgb).row;cache.set(k,ref);}const bk=k+':'+ref.id;let b=bindings.get(bk);if(!b){b={source_rgb:rgb,atlas_row_id:ref.id,rgb_squared_distance:rgb.reduce((s,v,j)=>s+(v-ref.rgb[j])**2,0),pixel_count:0};bindings.set(bk,b);}b.pixel_count++;locks.add(ref.id);
  }
  need(present.size===globalKeys.size,'Each protected source RGB must occur in a visible source pixel.');
  return {mask,forced,locks:[...locks].sort((a,b)=>a-b),protectedVisible,bindings:[...bindings.values()].sort((a,b)=>key(a.source_rgb)-key(b.source_rgb)||a.atlas_row_id-b.atlas_row_id)};
 }
 root.ATLAS_COLOUR_CORRECTIONS={plan};
})(typeof window==='undefined'?globalThis:window);
