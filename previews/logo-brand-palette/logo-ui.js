(function(root){
 'use strict';
 root.ATLAS_LOGO_PALETTE={mount({container,ctx,action,isBusy,onAdopt,onStage}){
  const G=root.ATLAS_LOGO_CORE,K=root.ATLAS_STARTUP_CORE,E=root.ATLAS_CLARUS_EXPORTS,I=root.ATLAS_LANGUAGE;
  const t=key=>root.ATLAS_MULTI_COPY[key]?.[I.language==='en'?1:0]||key,esc=K.escape;
  let draft=null,workerURL=null;
  container.innerHTML=`<h3 data-logo-copy="logoTitle"></h3><p data-logo-copy="logoHelp"></p><div class="logo-actions"><label class="button secondary"><span data-logo-copy="logoOpen"></span><input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" hidden></label><label><span data-logo-copy="logoCount"></span><input id="logo-count" type="number" min="1" max="12" step="1" value="6" inputmode="numeric"></label></div><p id="logo-status" role="status" aria-live="polite"></p><div id="logo-review" hidden><p class="note" data-logo-copy="logoReview"></p><canvas id="logo-canvas" tabindex="0"></canvas><p class="small" data-logo-copy="logoClick"></p><div class="logo-point"><label>X<input id="logo-x" type="number" min="0" step="1" value="0"></label><label>Y<input id="logo-y" type="number" min="0" step="1" value="0"></label><button id="logo-pixel" class="secondary" data-logo-copy="logoPixel"></button></div><p id="logo-origin" class="small"></p><div id="logo-candidates" class="logo-candidates"></div><div class="actions"><button id="logo-adopt" data-logo-copy="logoAdopt"></button><button id="logo-repeat" class="secondary" data-logo-copy="logoRepeat"></button><button id="logo-cancel" class="quiet" data-logo-copy="logoCancel"></button></div><p class="small" data-logo-copy="logoAdoptNote"></p></div>`;
  const $=id=>container.querySelector('#'+id),canvas=$('logo-canvas');
  function status(text){$('logo-status').textContent=text;}
  const task=fn=>action(async()=>{try{await fn();}catch(error){status(t(error.message));throw error;}});
  function refresh(){
   container.querySelectorAll('button,input').forEach(el=>el.disabled=isBusy());
   $('logo-adopt').disabled=isBusy()||!draft?.candidates.length||Number($('logo-count').value)!==draft?.analysis.requested_count;
   $('logo-repeat').disabled=$('logo-pixel').disabled=isBusy()||!draft;
  }
  function paint(){
   container.querySelectorAll('[data-logo-copy]').forEach(el=>el.textContent=t(el.dataset.logoCopy));
   canvas.setAttribute('aria-label',t('logoCanvasLabel'));
   $('logo-review').hidden=!draft;
   $('logo-candidates').innerHTML=draft?draft.candidates.map((c,i)=>`<article class="logo-colour"><i style="background:${K.hex(c.rgb)}"></i><label>${t('logoColourName')}<input data-logo-label="${i}" maxlength="64" value="${esc(c.label)}"></label><code>${K.hex(c.rgb)} · ${c.rgb.join(' / ')}</code><small>${c.kind==='manual_pixel'?t('logoManual'):t('logoSuggested')} · X ${c.point.x} / Y ${c.point.y}</small><button class="quiet" data-logo-remove="${i}">${t('remove')}</button></article>`).join(''):'';
   $('logo-origin').textContent=draft?draft.meta.name+' · '+draft.meta.width+' × '+draft.meta.height+' · '+(draft.meta.colour_origin.icc?.status==='EMBEDDED_ICC'?t('logoICC')+': '+draft.meta.colour_origin.icc.name:t('logoNoICC'))+'. '+t('logoOrigin'):'';
   if(draft){$('logo-adopt').textContent=t('logoAdoptCount').replace('{n}',String(draft.candidates.length));$('logo-x').max=draft.meta.width-1;$('logo-y').max=draft.meta.height-1;}
   refresh();
  }
  function run(job){return new Promise((resolve,reject)=>{
   if(!workerURL)workerURL=URL.createObjectURL(new Blob([JSON.parse(document.getElementById('atlas-logo-worker-source').textContent)],{type:'text/javascript'}));
   const worker=new Worker(workerURL),timer=setTimeout(()=>done(Error('LOGO_TIMEOUT')),30000);let ended=false;
   function done(error,value){if(ended)return;ended=true;clearTimeout(timer);worker.terminate();error?reject(error):resolve(value);}
   worker.onmessage=e=>e.data.error?done(Error(e.data.error)):done(null,e.data.result);worker.onerror=e=>done(Error(e.message));worker.postMessage(job);
  });}
  async function decode(bytes,mime){const url=URL.createObjectURL(new Blob([bytes],{type:mime}));try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('LOGO_DECODE'));img.src=url;});}finally{URL.revokeObjectURL(url);}}
  function nameCandidates(analysis){return analysis.candidates.map((c,i)=>({...c,label:t('logoColour')+' '+(i+1)}));}
  function showAnalysis(){status(draft.candidates.length+' '+t('logoFound')+' '+t('logoOpaqueNote')+(draft.candidates.length<draft.analysis.requested_count?' '+t('logoFewer'):''));}
  $('logo-file').onchange=e=>{
   const file=e.target.files[0];e.target.value='';if(!file)return;
   task(async()=>{
    if(file.size>K.MAX_ORIGINAL)throw Error('LOGO_BYTES');
    const count=Number($('logo-count').value);if(!Number.isInteger(count)||count<1||count>12)throw Error('LOGO_COUNT');
    const bytes=new Uint8Array(await file.arrayBuffer()),mime=G.mime(bytes),origin=await root.ATLAS_COLOUR_ORIGIN.inspect(bytes),img=await decode(bytes,mime);
    if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>24000000)throw Error('LOGO_SIZE');
    const scratch=document.createElement('canvas');scratch.width=img.naturalWidth;scratch.height=img.naturalHeight;
    const dc=scratch.getContext('2d',{colorSpace:'srgb',willReadFrequently:true});dc.drawImage(img,0,0);const rgba=dc.getImageData(0,0,scratch.width,scratch.height).data;
    status(t('logoRunning'));const analysis=await run({rgba,width:scratch.width,height:scratch.height,count});
    draft={bytes,rgba,meta:{name:file.name,width:scratch.width,height:scratch.height,sha256:origin.file_sha256,colour_origin:origin},analysis,candidates:nameCandidates(analysis)};
    canvas.width=scratch.width;canvas.height=scratch.height;canvas.getContext('2d',{colorSpace:'srgb'}).drawImage(scratch,0,0);scratch.width=scratch.height=1;
    $('logo-x').value=Math.floor(canvas.width/2);$('logo-y').value=Math.floor(canvas.height/2);onStage(true);paint();showAnalysis();
   });
  };
  $('logo-count').oninput=()=>{if(draft){status(t('logoReanalyse'));refresh();}};
  $('logo-repeat').onclick=()=>task(async()=>{
   if(!draft)return;status(t('logoRunning'));const analysis=await run({rgba:draft.rgba,width:draft.meta.width,height:draft.meta.height,count:Number($('logo-count').value)});
   draft.analysis=analysis;draft.candidates=nameCandidates(analysis);paint();showAnalysis();
  });
  $('logo-candidates').oninput=e=>{if(e.target.dataset.logoLabel!==undefined)draft.candidates[Number(e.target.dataset.logoLabel)].label=e.target.value;};
  $('logo-candidates').onclick=e=>{if(isBusy()||e.target.dataset.logoRemove===undefined)return;draft.candidates.splice(Number(e.target.dataset.logoRemove),1);paint();status(t('logoReview'));};
  function sample(x,y){
   if(isBusy()||!draft)return;
   try{
    if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=draft.meta.width||y>=draft.meta.height)throw Error('LOGO_POINT');
    const at=(y*draft.meta.width+x)*4;if(draft.rgba[at+3]!==255)throw Error('LOGO_ALPHA');
    const rgb=Array.from(draft.rgba.slice(at,at+3));if(draft.candidates.some(c=>c.rgb.every((v,i)=>v===rgb[i]))){status(t('logoExists'));return;}
    if(draft.candidates.length>=12)throw Error('LOGO_MAX');
    draft.candidates.push({rgb,point:{x,y},kind:'manual_pixel',label:t('logoColour')+' '+(draft.candidates.length+1)});$('logo-x').value=x;$('logo-y').value=y;paint();status(t('logoAdded'));
   }catch(error){status(t(error.message));}
  }
  canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/canvas.width,r.height/canvas.height),dx=(r.width-canvas.width*scale)/2,dy=(r.height-canvas.height*scale)/2;sample(Math.floor((e.clientX-r.left-dx)/scale),Math.floor((e.clientY-r.top-dy)/scale));};
  canvas.onkeydown=e=>{const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(delta){e.preventDefault();$('logo-x').value=Math.max(0,Math.min(canvas.width-1,Number($('logo-x').value)+delta[0]));$('logo-y').value=Math.max(0,Math.min(canvas.height-1,Number($('logo-y').value)+delta[1]));}else if(e.key==='Enter'||e.key===' '){e.preventDefault();sample(Number($('logo-x').value),Number($('logo-y').value));}};
  $('logo-pixel').onclick=()=>sample(Number($('logo-x').value),Number($('logo-y').value));
  function clear(){draft=null;canvas.width=canvas.height=1;paint();status('');onStage(false);}
  $('logo-cancel').onclick=()=>{if(!isBusy())clear();};
  $('logo-adopt').onclick=()=>task(async()=>{
   if(!draft?.candidates.length||Number($('logo-count').value)!==draft.analysis.requested_count)throw Error('LOGO_REVIEW');
   const doc=K.defaults(ctx.master);doc.name=draft.meta.name.replace(/\.[^.]*$/,'').slice(0,100)||t('example');
   doc.colours=draft.candidates.map(c=>{
    const {x,y}=c.point,at=(y*draft.meta.width+x)*4;if(draft.rgba[at+3]!==255||!c.rgb.every((v,i)=>v===draft.rgba[at+i]))throw Error('LOGO_PIXELS');
    if(!c.label.trim())throw Error('LOGO_LABEL');
    const ref=K.nearest(c.rgb,ctx),assignment=E.createSourceAssignment({size:1,count:1,rgb:c.rgb,std:[0,0,0],bounds:[x,y,x,y]},{ix:x,iy:y},draft.meta,ref,ctx.master);
    return {label:c.label.trim(),kind:'image',source_rgb:c.rgb.slice(),reference_id:ref.id,assignment};
   });
   const {candidates,...analysis}=draft.analysis;doc.logo_selection={schema:'ATLAS_LOGO_SELECTION_V1',...analysis,image_sha256:draft.meta.sha256,accepted:draft.candidates.map(c=>({rgb:c.rgb.slice(),point:{...c.point},kind:c.kind}))};G.validateAudit(doc);
   const bytes=await K.pack({doc,profile:null,result:null,original:{name:draft.meta.name,bytes:draft.bytes}},ctx);await onAdopt(bytes);clear();
  });
  root.addEventListener('atlas-language-change',()=>{paint();if(draft)showAnalysis();});paint();
  return {pending:()=>Boolean(draft),refresh,clear};
 }};
})(window);
