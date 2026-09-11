(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ATLAS_CLARUS_SAMPLING=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function sampleRgba(data,width,height,centreX,centreY,size,alphaThreshold=128){
    if(!data||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)return null;
    if(!Number.isInteger(centreX)||!Number.isInteger(centreY)||centreX<0||centreX>=width||centreY<0||centreY>=height)return null;
    if(!Number.isInteger(size)||size<1||size%2===0)throw new RangeError('sample size must be a positive odd integer');
    const half=Math.floor(size/2),x0=Math.max(0,centreX-half),y0=Math.max(0,centreY-half),x1=Math.min(width,centreX+half+1),y1=Math.min(height,centreY+half+1);
    const sums=[0,0,0],squares=[0,0,0];let count=0;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const i=(y*width+x)*4;
      if(data[i+3]<alphaThreshold)continue;
      count++;
      for(let c=0;c<3;c++){sums[c]+=data[i+c];squares[c]+=data[i+c]**2}
    }
    if(!count)return null;
    const means=sums.map(v=>v/count);
    return {size,count,rgb:means.map(Math.round),std:means.map((m,c)=>Math.sqrt(Math.max(0,squares[c]/count-m*m))),bounds:[x0,y0,x1-1,y1-1]};
  }
  return {sampleRgba};
});
