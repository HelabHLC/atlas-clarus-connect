(function(){
  'use strict';
  if(!window.AndroidExport||window.ATLAS_LIVE_CAMERA)return;
  const style=document.createElement('style');
  style.textContent=`.atlas-camera{position:fixed;inset:0;z-index:100000;background:#101820;color:#fff;padding:16px;display:flex;flex-direction:column;gap:10px;overflow:auto}.atlas-camera[hidden]{display:none}.atlas-camera button,.atlas-camera select{font:inherit;padding:10px;min-height:44px}.atlas-camera-stage{position:relative;min-height:160px;flex:1;overflow:hidden}.atlas-camera video{width:100%;height:100%;position:absolute;object-fit:contain}.atlas-camera-target{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:24px;height:24px;border:2px solid #fff;box-shadow:0 0 0 2px #111;pointer-events:none}.atlas-camera-target:after{content:'+';position:absolute;inset:0;text-align:center;line-height:20px;color:white;text-shadow:0 0 3px #000}.atlas-camera-actions{display:flex;flex-wrap:wrap;gap:8px}.atlas-camera-result{white-space:pre-line;min-height:70px}.atlas-camera-note{font-size:13px;margin:0}.atlas-camera-record{white-space:pre-line;padding:12px;border:1px solid #71838d;background:#102638;color:#fff}.atlas-live-button{margin:6px;padding:10px}`;
  document.head.append(style);
  let overlay,video,readout,librarySelect,lockButton,useButton,switchButton,targetInput,stream,timer,current,locked,frame,binder,library,session=0,front=false,previousFocus,torchButton,torch=false;
  const core=window.ATLAS_LIVE_CAMERA_CORE;
  function describe(r){return `${r.source_hex} → ${r.atlas_reference}\nReference ${r.reference_hex} · Row ${r.atlas_row_id} · ${r.library_name}\n${locked?'Fixed / Fixiert':'Live'} · ${r.lamp_on?'Lamp ON · ':''}Camera estimate / Kamera-Schätzung`;}
  function stopTracks(){torch=false;if(torchButton){torchButton.disabled=true;torchButton.textContent="Lamp / Leuchte";}clearInterval(timer);timer=null;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;if(video)video.srcObject=null;}
  function close(){session++;stopTracks();if(overlay)overlay.hidden=true;locked=current=frame=null;if(previousFocus?.isConnected)previousFocus.focus();}
  function resetLock(){locked=frame=null;useButton.disabled=true;lockButton.textContent='Fix / Fixieren';}
  function render(r){readout.textContent=describe(r);readout.style.borderLeft='16px solid '+r.source_hex;}
  function build(){
    overlay=document.createElement('section');overlay.className='atlas-camera';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Live camera / Live-Kamera');
    overlay.innerHTML='<div class="atlas-camera-actions"><button data-close>Close / Schließen</button><button data-switch>Switch camera / Kamera wechseln</button><button data-torch disabled aria-pressed="false">Lamp / Leuchte</button></div><label>Reference library / Referenzbibliothek <select data-library></select></label><div class="atlas-camera-stage"><video autoplay muted playsinline></video><span class="atlas-camera-target" aria-hidden="true"></span></div><output class="atlas-camera-result"></output><p class="atlas-camera-note">Centre 11 × 11 pixel mean · nearest library reference by RGB. Light and white balance affect results. Phone lamp illuminates a broad area, not a projected aiming point. Lamp light changes observed colour. No physical colour measurement.</p><div class="atlas-camera-actions"><button data-lock disabled>Fix / Fixieren</button><button data-use disabled>Use image + selection / Übernehmen</button></div>';
    document.body.append(overlay);video=overlay.querySelector('video');readout=overlay.querySelector('output');librarySelect=overlay.querySelector('select');lockButton=overlay.querySelector('[data-lock]');useButton=overlay.querySelector('[data-use]');switchButton=overlay.querySelector('[data-switch]');torchButton=overlay.querySelector('[data-torch]');
    video.onloadeddata=()=>sample();
    overlay.querySelector('[data-close]').onclick=close;
    torchButton.onclick=async()=>{
      const track=stream?.getVideoTracks()[0];if(!track)return;
      const next=!torch;resetLock();
      try{await track.applyConstraints({advanced:[{torch:next}]});if(track!==stream?.getVideoTracks()[0])return;if(track.getSettings?.().torch!==next)throw Error('Lamp state not confirmed');torch=next;torchButton.setAttribute('aria-pressed',String(torch));torchButton.textContent=torch?'Lamp on / Leuchte an':'Lamp off / Leuchte aus';resetLock();sample();}
      catch(e){stopTracks();resetLock();lockButton.disabled=true;readout.textContent='Lamp state could not be confirmed. Close and reopen the camera. / Leuchtenstatus unbestätigt: Kamera erneut öffnen.';}
    };
    switchButton.onclick=()=>{front=!front;startStream();};
    librarySelect.onchange=()=>{resetLock();library=binder.library(librarySelect.value);sample();};
    lockButton.onclick=()=>{
      if(locked){resetLock();sample();return;}
      if(!current||!video.videoWidth)return;
      // Capture and sample the very same frame; live preview continues after fixing.
      frame=document.createElement('canvas');frame.width=video.videoWidth;frame.height=video.videoHeight;
      frame.getContext('2d').drawImage(video,0,0);
      locked=Object.freeze({...readSample(frame),captured_at:new Date().toISOString()});
      lockButton.textContent='Release / Lösen';useButton.disabled=false;render(locked);
    };
    useButton.onclick=apply;
    overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const nodes=[...overlay.querySelectorAll('button,select')].filter(n=>!n.disabled);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  }
  const sampleCanvas=document.createElement('canvas');sampleCanvas.width=sampleCanvas.height=11;
  const sampleContext=sampleCanvas.getContext('2d',{willReadFrequently:true,colorSpace:'srgb'});
  function readSample(source){
    const width=source.videoWidth||source.width,height=source.videoHeight||source.height;
    const size=Math.min(11,width,height),x=Math.floor((width-size)/2),y=Math.floor((height-size)/2);
    sampleCanvas.width=sampleCanvas.height=size;
    sampleContext.drawImage(source,x,y,size,size,0,0,size,size);
    const rgb=core.mean(sampleContext.getImageData(0,0,size,size).data);
    const settings=stream?.getVideoTracks()[0]?.getSettings?.()||{};
    return {...binder.match(rgb,library),lamp_on:torch,camera_reported_settings:{white_balance_mode:settings.whiteBalanceMode??null,white_balance_temperature_kelvin:settings.colorTemperature??null,exposure_mode:settings.exposureMode??null,note:'Camera processing settings, not the measured light spectrum or lamp colour temperature'},lighting_note:torch?'Phone lamp changes observed colour':'Ambient lighting; camera white balance affects observed colour',sampling:{mode:'AREA_MEAN_RGB',bounds:[x,y,x+size-1,y+size-1],width,height,pixel_count:size*size}};
  }
  function sample(){
    if(!stream||!video.videoWidth||video.readyState<2)return;
    try{current=readSample(video);lockButton.disabled=false;if(!locked)render(current);}catch(e){readout.textContent=e.message;lockButton.disabled=true;}
  }
  async function startStream(){
    const token=++session;stopTracks();resetLock();current=null;lockButton.disabled=true;readout.textContent='Opening camera / Kamera wird geöffnet …';
    try{
      const next=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:front?'user':'environment'},width:{ideal:1920},height:{ideal:1080}}});
      if(token!==session||overlay.hidden){next.getTracks().forEach(t=>t.stop());return;}
      stream=next;const cameraTrack=next.getVideoTracks()[0];torch= cameraTrack?.getSettings?.().torch===true;torchButton.textContent=torch?'Lamp on / Leuchte an':'Lamp off / Leuchte aus';torchButton.disabled=!core.canToggleTorch(cameraTrack?.getCapabilities?.());torchButton.title=torchButton.disabled?'Lamp control unavailable on this camera / Leuchte nicht steuerbar':'';torchButton.setAttribute('aria-pressed',String(torch));video.srcObject=next;await video.play();
      if(token!==session)return;
      for(const track of next.getVideoTracks())track.onended=()=>{if(token===session){stopTracks();resetLock();lockButton.disabled=true;readout.textContent='Camera stopped. Close and reopen to retry.';}};
      timer=setInterval(sample,250);sample();
    }catch(e){if(token!==session)return;stopTracks();readout.textContent='Camera unavailable or permission denied. Close and use an existing image, or enable camera access and retry.';}
  }
  async function open(input){
    if(input.disabled)return;
    if(!navigator.mediaDevices?.getUserMedia){alert('Live camera unavailable in this WebView. Please use Take photo or choose an image.');return;}
    try{
      binder=core.create(window.ATLAS_CLARUS_DATA);
      if(!overlay)build();previousFocus=document.activeElement;targetInput=input;overlay.hidden=false;
      librarySelect.replaceChildren();
      for(const [id,view] of Object.entries(window.ATLAS_CLARUS_DATA.views)){if(view.hidden_from_new_selection)continue;librarySelect.add(new Option(view.name,id));}
      const selected=document.getElementById(input.id==='cr-file'?'cr-library':'library-view');
      librarySelect.value=selected?.value||'core';if(!librarySelect.value)librarySelect.value='core';
      library=binder.library(librarySelect.value);overlay.querySelector('[data-close]').focus();await startStream();
    }catch(e){if(overlay)readout.textContent=e.message;else alert(e.message);}
  }
  function saveRecord(record){
    const blob=new Blob([JSON.stringify(record,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ATLAS_Camera_Selection.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function apply(){
    if(!locked||!frame||targetInput.disabled)return;
    const fixed=locked,image=frame,input=targetInput,token=session;useButton.disabled=true;
    try{
      const blob=await new Promise(resolve=>image.toBlob(resolve,'image/png'));
      if(!blob)throw Error('Camera image could not be encoded');
      if(token!==session||locked!==fixed)return;
      const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
      if(token!==session||locked!==fixed)return;
      const name='ATLAS-camera-'+fixed.captured_at.replace(/[^0-9]/g,'')+'.png';
      const record={schema:'atlas-clarus-camera-selection/1.0',...fixed,image:{name,mime:'image/png',sha256:[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join(''),width:image.width,height:image.height},note:'Unsigned camera observation; reference RGB is distinct from source RGB. Save the image and this record together. Tool project formats do not yet embed this camera record.'};
      const transfer=new DataTransfer();transfer.items.add(new File([blob],name,{type:'image/png'}));input.files=transfer.files;
      const selector=document.getElementById(input.id==='cr-file'?'cr-library':'library-view');
      if(selector&&[...selector.options].some(o=>o.value===fixed.library_id)&&selector.value!==fixed.library_id){selector.value=fixed.library_id;selector.dispatchEvent(new Event('change',{bubbles:true}));}
      input.dispatchEvent(new Event('change',{bubbles:true}));
      let card=document.getElementById('atlas-camera-record-'+input.id);
      if(!card){card=document.createElement('section');card.id='atlas-camera-record-'+input.id;card.className='atlas-camera-record';input.closest('label')?.after(card);if(!card.isConnected)input.after(card);}
      card.replaceChildren();const text=document.createElement('p');text.textContent=`Fixed camera selection / Fixierte Auswahl\n${fixed.source_hex} → ${fixed.atlas_reference}\nReference ${fixed.reference_hex} · ${fixed.library_name}\nCamera estimate · ${fixed.sampling.pixel_count} pixels · ${name}`;card.append(text);
      const save=document.createElement('button');save.textContent='Save selection record / Auswahl speichern';save.onclick=()=>saveRecord(record);card.append(save);
      const saveImage=document.createElement('button');saveImage.textContent='Save fixed image / Bild speichern';saveImage.onclick=()=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};card.append(saveImage);
      input.dispatchEvent(new CustomEvent('atlas-camera-selection',{bubbles:true,detail:record}));close();
    }catch(e){readout.textContent=e.message;useButton.disabled=false;}
  }
  function attach(){
    if(!window.document?.body)return;
    for(const input of document.querySelectorAll('input[type=file]')){
      const accepts=(input.accept||'').toLowerCase().split(',').map(s=>s.trim());
      if(input.multiple||!input.id||input.dataset.atlasLive||!accepts.some(t=>['image/*','image/png','.png'].includes(t)))continue;
      input.dataset.atlasLive='1';const button=document.createElement('button');button.type='button';button.className='atlas-live-button';button.textContent='Live camera / Live-Kamera';button.onclick=()=>open(input);
      (input.closest('label')||input).after(button);
    }
  }
  window.ATLAS_LIVE_CAMERA={close,open,isOpen:()=>!!overlay&&!overlay.hidden};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
  addEventListener('pagehide',close);addEventListener('hashchange',close);
  attach();new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
})();
