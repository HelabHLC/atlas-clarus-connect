(function(root){
  'use strict';
  // View-only inspection. Samples always come from frozen input RGBA, never
  // from the scaled preview, the checkerboard or the reduced image.
  function create({onSelect,onProtect,reference,hex}){
    const $=id=>document.getElementById(id),span=11,half=5,cell=24,size=span*cell;
    const before=$('cr-before'),stage=$('cr-input-stage'),floating=$('cr-loupe-hover'),inspector=$('cr-pixel-inspector');
    const scratch=document.createElement('canvas');scratch.width=span;scratch.height=span;
    const crop=scratch.getContext('2d',{colorSpace:'srgb'});
    let input=null,selected=null,disabled=true;
    function pointAt(event,canvas,width,height){
      const b=canvas.getBoundingClientRect();
      return {x:Math.max(0,Math.min(width-1,Math.floor((event.clientX-b.left)*width/b.width))),
        y:Math.max(0,Math.min(height-1,Math.floor((event.clientY-b.top)*height/b.height)))};
    }
    function sample(point){
      const i=(point.y*input.width+point.x)*4;
      return {...point,rgb:Array.from(input.rgba.slice(i,i+3)),alpha:input.rgba[i+3]};
    }
    function draw(canvas,point){
      const pixels=new Uint8ClampedArray(span*span*4);
      for(let y=0;y<span;y++)for(let x=0;x<span;x++){
        const sx=point.x+x-half,sy=point.y+y-half;
        if(sx>=0&&sy>=0&&sx<input.width&&sy<input.height)
          pixels.set(input.rgba.subarray((sy*input.width+sx)*4,(sy*input.width+sx)*4+4),(y*span+x)*4);
      }
      crop.putImageData(new ImageData(pixels,span,span),0,0);
      const c=canvas.getContext('2d',{colorSpace:'srgb'});c.clearRect(0,0,size,size);
      c.imageSmoothingEnabled=false;c.drawImage(scratch,0,0,size,size);
      c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=1;
      for(let n=0;n<=span;n++){
        c.beginPath();c.moveTo(n*cell+.5,0);c.lineTo(n*cell+.5,size);c.stroke();
        c.beginPath();c.moveTo(0,n*cell+.5);c.lineTo(size,n*cell+.5);c.stroke();
      }
      c.strokeStyle='#000';c.lineWidth=4;c.strokeRect(half*cell+1,half*cell+1,cell-2,cell-2);
      c.strokeStyle='#a6ff4d';c.lineWidth=2;c.strokeRect(half*cell+1,half*cell+1,cell-2,cell-2);
    }
    function label(s){return 'X '+s.x+' · Y '+s.y+' · '+(s.alpha?hex(s.rgb):'Transparent')+' · Alpha '+s.alpha+'/255';}
    function controls(){
      for(const b of inspector.querySelectorAll('button'))b.disabled=disabled||!selected;
      $('cr-pixel-protect').disabled=disabled||!selected||!sample(selected).alpha;
      before.setAttribute('aria-disabled',String(disabled));
      $('cr-loupe-detail').setAttribute('aria-disabled',String(disabled));
    }
    function marker(){
      if(!input||!selected)return;
      const b=before.getBoundingClientRect(),s=stage.getBoundingClientRect(),m=$('cr-pixel-marker');
      m.hidden=false;m.style.left=(b.left-s.left+(selected.x+.5)*b.width/input.width)+'px';
      m.style.top=(b.top-s.top+(selected.y+.5)*b.height/input.height)+'px';
    }
    function choose(point){
      if(disabled||!input)return;
      selected={x:Math.max(0,Math.min(input.width-1,point.x)),y:Math.max(0,Math.min(input.height-1,point.y))};
      const s=sample(selected);inspector.hidden=false;floating.hidden=true;
      draw($('cr-loupe-detail'),selected);$('cr-pixel-value').textContent=label(s)+(s.alpha?' · Input RGB '+s.rgb.join(' / '):' · No colour selected');
      if(s.alpha){
        const r=reference(s.rgb);$('cr-pixel-reference').textContent='Atlas reference: '+r.atlas_reference+' · '+hex(r.reference_rgb)+' · row '+r.atlas_row_id;
      }else $('cr-pixel-reference').textContent='Fully transparent pixels have no Atlas assignment and cannot be protected.';
      marker();controls();onSelect(s);
    }
    before.addEventListener('pointermove',event=>{
      if(disabled||!input||event.pointerType==='touch')return;
      const p=pointAt(event,before,input.width,input.height),s=sample(p);
      draw($('cr-loupe-hover-canvas'),p);$('cr-loupe-hover-value').textContent=label(s);floating.hidden=false;
      const b=stage.getBoundingClientRect(),w=floating.offsetWidth,h=floating.offsetHeight;
      const x=event.clientX-b.left,y=event.clientY-b.top;
      floating.style.left=Math.max(0,Math.min(b.width-w,x+20+w<=b.width?x+20:x-w-20))+'px';
      floating.style.top=Math.max(0,Math.min(b.height-h,y+20+h<=b.height?y+20:y-h-20))+'px';
    });
    before.addEventListener('pointerleave',()=>{floating.hidden=true;});
    before.addEventListener('blur',()=>{floating.hidden=true;});
    // PointerEvent retains fractional CSS coordinates. Chromium's click event
    // can round them, selecting a neighbouring source pixel in a scaled image.
    // Native touch scrolling cancels the pointer, so it never selects a pixel.
    before.addEventListener('pointerup',event=>{if(input&&event.isPrimary&&event.button===0)choose(pointAt(event,before,input.width,input.height));});
    $('cr-loupe-detail').addEventListener('pointerup',event=>{
      if(!selected||!input||disabled||!event.isPrimary||event.button!==0)return;
      const p=pointAt(event,$('cr-loupe-detail'),span,span),x=selected.x+p.x-half,y=selected.y+p.y-half;
      // Blank cells outside the source are padding, never a different source pixel.
      if(x>=0&&y>=0&&x<input.width&&y<input.height)choose({x,y});
    });
    function move(dx,dy){if(!input||disabled)return;const p=selected||{x:Math.floor(input.width/2),y:Math.floor(input.height/2)};choose({x:p.x+dx,y:p.y+dy});}
    function keyboard(event){
      if(!input||disabled)return;
      const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=directions[event.key];
      if(d){event.preventDefault();const step=event.shiftKey?10:1;move(d[0]*step,d[1]*step);}
      else if(event.key==='Enter'||event.key===' '){event.preventDefault();move(0,0);}
      else if(event.key==='Escape')floating.hidden=true;
    }
    before.addEventListener('keydown',keyboard);$('cr-loupe-detail').addEventListener('keydown',keyboard);
    for(const [id,dx,dy]of [['left',-1,0],['right',1,0],['up',0,-1],['down',0,1]])$('cr-pixel-'+id).onclick=()=>move(dx,dy);
    $('cr-pixel-protect').onclick=()=>{if(!disabled&&selected){const s=sample(selected);if(s.alpha)onProtect(s);}};
    if(root.ResizeObserver)new ResizeObserver(marker).observe(before);else root.addEventListener('resize',marker);
    return {
      setInput(next){input=next;selected=null;floating.hidden=true;inspector.hidden=true;$('cr-pixel-marker').hidden=true;controls();},
      setBusy(value){disabled=value;if(value)floating.hidden=true;controls();}
    };
  }
  root.ATLAS_COLOUR_REDUCTION_LOUPE={create};
})(window);
