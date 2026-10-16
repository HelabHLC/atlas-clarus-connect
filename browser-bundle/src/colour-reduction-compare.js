(function(root){
 'use strict';
 function create(){
  const $=id=>document.getElementById(id),canvases=['original','reduced','current'].map(n=>$('cr-compare-'+n));
  let frames=null,saved=[],zoom=1,x=.5,y=.5,drag=null;
  function canvas(rgba,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba),w,h),0,0);return c;}
  function render(){if(!frames)return;const variant=saved.find(v=>v.id===$('cr-variant-select').value);const images=[frames.original,frames.reduced,variant?.canvas||frames.current];
   canvases.forEach((c,i)=>{const ctx=c.getContext('2d'),im=images[i],scale=Math.min(c.width/im.width,c.height/im.height)*zoom,w=im.width*scale,h=im.height*scale;
    ctx.fillStyle='#20252b';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(im,c.width/2-x*w,c.height/2-y*h,w,h);
   });$('cr-variant-info').textContent=variant?'Comparison only: '+variant.name+'. PNG and ZIP exports still use the current output.':'Current output shown. PNG and ZIP exports use this output.';
  }
  for(const c of canvases){c.onpointerdown=e=>{if(!frames)return;drag={px:e.clientX,py:e.clientY,x,y};c.setPointerCapture(e.pointerId);};c.onpointermove=e=>{if(!drag||!frames)return;const rect=c.getBoundingClientRect(),scale=Math.min(c.width/frames.original.width,c.height/frames.original.height)*zoom;x=Math.max(0,Math.min(1,drag.x-(e.clientX-drag.px)*c.width/rect.width/(frames.original.width*scale)));y=Math.max(0,Math.min(1,drag.y-(e.clientY-drag.py)*c.height/rect.height/(frames.original.height*scale)));render();};c.onpointerup=c.onpointercancel=()=>drag=null;
   c.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();x=Math.max(0,Math.min(1,x+(e.key==='ArrowRight'?.05:e.key==='ArrowLeft'?-.05:0)/zoom));y=Math.max(0,Math.min(1,y+(e.key==='ArrowDown'?.05:e.key==='ArrowUp'?-.05:0)/zoom));render();};}
  $('cr-compare-zoom').onchange=()=>{zoom=Number($('cr-compare-zoom').value);render();};$('cr-compare-center').onclick=()=>{x=y=.5;render();};$('cr-variant-select').onchange=render;
  function clear(){saved=[];$('cr-variant-select').replaceChildren(new Option('Current output','current'));render();}
  $('cr-variant-clear').onclick=clear;
  $('cr-variant-save').onclick=()=>{if(!frames)return;if(saved.length>=3){$('cr-variant-info').textContent='Up to three saved variants. Clear them before saving more.';return;}const id='variant-'+saved.length,name='Variant '+(saved.length+1)+' · '+frames.name;saved.push({id,name,canvas:canvas(frames.pixels,frames.current.width,frames.current.height)});$('cr-variant-select').add(new Option(name,id));$('cr-variant-select').value=id;render();};
  return {reset(){frames=null;clear();canvases.forEach(c=>c.getContext('2d').clearRect(0,0,c.width,c.height));x=y=.5;},update(input,reduced,result){frames={original:canvas(input.rgba,input.width,input.height),reduced:canvas(reduced.pixels,input.width,input.height),current:canvas(result.pixels,input.width,input.height),pixels:result.pixels,name:(result.report.library?.name||'Full Atlas')+' · '+result.report.requested_colours+' colours · '+(result.report.area_cleanup?'cleanup '+result.report.area_cleanup.minimum_pixels+' px':'no cleanup')};render();}};
 }
 root.ATLAS_COLOUR_REDUCTION_COMPARE={create};
})(window);
