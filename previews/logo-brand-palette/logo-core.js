(function(root){
 'use strict';
 const METHOD='OPAQUE_SRGB_GRID_RGB5_WEIGHTED_KMEANS_ACTUAL_PIXEL_V1';
 const need=(ok,msg)=>{if(!ok)throw Error(msg);},distance=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0),packed=a=>(a[0]<<16)|(a[1]<<8)|a[2];
 function extract({rgba,width,height,count}){
  need(Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0&&width*height<=24000000,'LOGO_SIZE');
  need((rgba instanceof Uint8Array||rgba instanceof Uint8ClampedArray)&&rgba.length===width*height*4,'LOGO_PIXELS');
  need(Number.isInteger(count)&&count>=1&&count<=12,'LOGO_COUNT');
  const stride=Math.max(1,Math.ceil(Math.sqrt(width*height/1000000))),bins=new Map();let sampled=0,opaque=0;
  for(let y=Math.min(Math.floor(stride/2),height-1);y<height;y+=stride)for(let x=Math.min(Math.floor(stride/2),width-1);x<width;x+=stride){
   sampled++;const at=(y*width+x)*4;if(rgba[at+3]!==255)continue;opaque++;
   const rgb=[rgba[at],rgba[at+1],rgba[at+2]],key=((rgb[0]>>3)<<10)|((rgb[1]>>3)<<5)|(rgb[2]>>3),cell=rgb.map(v=>(v>>3)*8+3.5),d=distance(rgb,cell);
   let b=bins.get(key);if(!b){b={key,n:0,sum:[0,0,0],rgb,point:{x,y},d};bins.set(key,b);}b.n++;rgb.forEach((v,i)=>b.sum[i]+=v);
   if(d<b.d||(d===b.d&&packed(rgb)<packed(b.rgb))){b.rgb=rgb;b.point={x,y};b.d=d;}
  }
  need(opaque>0,'LOGO_OPAQUE');
  const list=[...bins.values()].sort((a,b)=>b.n-a.n||a.key-b.key);list.forEach(b=>b.mean=b.sum.map(v=>v/b.n));
  const centres=[list[0].mean.slice()],chosen=new Set([list[0].key]),k=Math.min(count,list.length);
  while(centres.length<k){let best=null,score=-1;for(const b of list){if(chosen.has(b.key))continue;const s=b.n*Math.min(...centres.map(c=>distance(c,b.mean)));if(s>score||(s===score&&b.key<best.key)){best=b;score=s;}}chosen.add(best.key);centres.push(best.mean.slice());}
  let assignments=[];
  for(let pass=0;pass<24;pass++){
   let moved=false;const sums=centres.map(()=>[0,0,0,0]);
   list.forEach((b,i)=>{let pick=0,d=Infinity;centres.forEach((c,j)=>{const n=distance(c,b.mean);if(n<d){pick=j;d=n;}});if(assignments[i]!==pick)moved=true;assignments[i]=pick;b.sum.forEach((v,j)=>sums[pick][j]+=v);sums[pick][3]+=b.n;});
   sums.forEach((sum,i)=>{if(sum[3])centres[i]=sum.slice(0,3).map(v=>v/sum[3]);});if(!moved)break;
  }
  const candidates=[];
  centres.forEach((centre,j)=>{
   const group=list.filter((b,i)=>assignments[i]===j);if(!group.length)return;
   group.sort((a,b)=>b.n-a.n||distance(a.mean,centre)-distance(b.mean,centre)||a.key-b.key);
   const representative=group[0],weight=group.reduce((s,b)=>s+b.n,0);
   candidates.push({rgb:representative.rgb.slice(),point:{...representative.point},sampled_count:weight,share:weight/opaque,kind:'cluster_representative'});
  });
  candidates.sort((a,b)=>b.sampled_count-a.sampled_count||packed(a.rgb)-packed(b.rgb));
  return {method:METHOD,requested_count:count,stride,sampled_pixels:sampled,opaque_pixels:opaque,excluded_alpha_pixels:sampled-opaque,candidates};
 }
 function validateAudit(doc){
  const a=doc.logo_selection;if(a===undefined)return;
  need(a?.schema==='ATLAS_LOGO_SELECTION_V1'&&a.method===METHOD&&/^[a-f0-9]{64}$/.test(a.image_sha256),'LOGO_AUDIT');
  need(Number.isInteger(a.requested_count)&&a.requested_count>=1&&a.requested_count<=12&&Number.isInteger(a.stride)&&a.stride>=1&&a.stride<=5,'LOGO_AUDIT');
  need(['sampled_pixels','opaque_pixels','excluded_alpha_pixels'].every(k=>Number.isInteger(a[k])&&a[k]>=0)&&a.sampled_pixels<=24000000&&a.opaque_pixels>0&&a.opaque_pixels+a.excluded_alpha_pixels===a.sampled_pixels,'LOGO_AUDIT');
  need(Array.isArray(a.accepted)&&a.accepted.length===doc.colours.length&&a.accepted.every((v,i)=>{
   const c=doc.colours[i],s=c.assignment;
   return c.kind==='image'&&s?.image?.sha256===a.image_sha256&&['cluster_representative','manual_pixel'].includes(v.kind)&&JSON.stringify(v.rgb)===JSON.stringify(c.source_rgb)&&Number.isInteger(v.point?.x)&&Number.isInteger(v.point?.y)&&v.point.x===s.sampling.centre[0]&&v.point.y===s.sampling.centre[1];
  }),'LOGO_AUDIT');
 }
 function mime(bytes){
  const text=String.fromCharCode(...bytes.slice(0,12));
  if(text.startsWith('\x89PNG\r\n\x1a\n'))return 'image/png';
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if(text.startsWith('RIFF')&&text.slice(8)==='WEBP')return 'image/webp';
  throw Error('LOGO_FORMAT');
 }
 root.ATLAS_LOGO_CORE={METHOD,extract,validateAudit,mime};
})(typeof window==='undefined'?globalThis:window);
