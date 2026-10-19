/* Touch/pen interaction for the Image Picker; mouse behaviour stays intact. */
(function(root){
  function install(canvas,loupe){
    const move=canvas.onpointermove,leave=canvas.onpointerleave,click=canvas.onclick;
    let active=null;
    canvas.style.touchAction='none';
    canvas.onpointerdown=event=>{
      if(event.pointerType==='mouse'||event.isPrimary===false||active!==null)return;
      active=event.pointerId;
      canvas.setPointerCapture(active);
      move(event);
      event.preventDefault();
    };
    canvas.onpointermove=event=>{
      if(event.pointerType==='mouse'||event.pointerId===active)move(event);
    };
    canvas.onpointerleave=event=>{
      if(event.pointerType==='mouse')leave(event);
    };
    canvas.onpointerup=event=>{
      if(event.pointerId!==active)return;
      move(event);
      click(event);
      const id=active;active=null;
      if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
      event.preventDefault();
    };
    canvas.onpointercancel=event=>{
      if(event.pointerId!==active)return;
      const id=active;active=null;
      if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
      loupe.classList.remove('visible');
    };
    canvas.onclick=event=>{
      // Touch/pen was resolved on release, including drags that emit no click.
      if(event.pointerType==='touch'||event.pointerType==='pen')return;
      click(event);
    };
  }
  if(typeof module==='object'&&module.exports)module.exports={install};
  else install(root.document.getElementById('picker-canvas'),root.document.getElementById('picker-loupe'));
})(typeof window==='undefined'?globalThis:window);
