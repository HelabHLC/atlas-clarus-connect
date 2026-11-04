(function(){
  'use strict';
  const $=id=>document.getElementById(id),K=window.ATLAS_STARTUP_CORE,E=window.ATLAS_CLARUS_EXPORTS,P=window.ATLAS_CLARUS_PRINT,A=window.ATLAS_LIBRARY_ACCEPTANCE,D=window.ATLAS_COLOUR_ADVICE;
  const data=window.ATLAS_CLARUS_DATA,ctx={colors:data.colors,master:data.master_sha256,views:data.views};
  if(ctx.master!==P.MASTER||ctx.colors.length!==13283)throw Error('ATLAS-Master nicht verfügbar.');
  let state={doc:K.defaults(ctx.master),original:null,profile:null,result:null},image=null,imageMeta=null,busy=false,dirty=false,workerURL=null,guide=null,catalogUI=null,advice=null;
  const canvas=$('kit-canvas'),dc=canvas.getContext('2d',{colorSpace:'srgb',willReadFrequently:true});
  function status(id,msg,error=false){$(id).textContent=msg;$(id).classList.toggle('error',error);}
  let adviceContext='';
  const currentAdviceContext=()=>JSON.stringify([state.doc.print.library_id,state.doc.advice?.tolerance??null]);
  function change(){const next=currentAdviceContext();if(next!==adviceContext){state.doc.colours.forEach(c=>{if(c.replacement)c.replacement.withdrawn=true;});adviceContext=next;}state.result=null;dirty=true;renderResults();refresh();}
  const acceptance=()=>A.check(state.doc,ctx,state.profile?.info);
  function ready(){const s=state.doc.print;return acceptance().status==='ACCEPTED_FOR_LIBRARY'&&state.doc.colours.length>0&&state.profile&&s.printing_condition.trim()&&s.substrate.trim()&&(s.path!=='ECG'||s.channel_order.length===7&&new Set(s.channel_order.map(v=>v.toUpperCase())).size===7);}
  function refresh(){
    document.querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=busy);
    $('kit-export').disabled=busy||!state.doc.colours.length;$('kit-card').disabled=busy||!state.doc.colours.length;$('kit-json').disabled=busy||acceptance().status!=='ACCEPTED_FOR_LIBRARY';
    $('kit-calculate').disabled=busy||!ready();$('kit-clear-profile').disabled=busy||!state.profile;
    $('kit-pixel').disabled=busy||!image;
    window.ATLAS_PROFILE_LIBRARY?.refreshAll();
    guide?.refresh();
    renderAcceptance();
    advice?.refresh();
    $('kit-channels-label').hidden=state.doc.print.path!=='ECG';
    $('kit-path-note').textContent=state.doc.print.path==='TEXTILE_RGB'?'FOGRA58 ist ein textiler RGB-Austauschfarbraum. Lade die offizielle finale TextileRGB_FOGRA58.icc. Ein konkretes Drucker-/Tinten-/Materialprofil wird dadurch nicht ersetzt.':'Das Profil muss zum Druckverfahren, Druckerzustand und Material passen. Der Profilname allein bestätigt das nicht.';
    $('kit-json').textContent=state.doc.colours.some(c=>c.replacement)?'Ursprüngliche Zuordnung · Clarus JSON':'Clarus JSON für alle Werkzeuge';
    $('kit-export').textContent=acceptance().status==='ACCEPTED_FOR_LIBRARY'?(state.doc.advice?'Farbmappe · bestätigte Auswahl + Originalfarben':'Farbmappe mit akzeptierten Paletten · ZIP'):'Entwurf sichern · ZIP';
    status('kit-save-status',state.doc.colours.length?`${acceptance().status==='ACCEPTED_FOR_LIBRARY'?'Bibliotheksprüfung bestanden':'Nicht akzeptiert · Entwurf'} · ${state.doc.colours.length} Farbe(n) · ${state.result?'B/A-Vergleich berechnet':'Druckvorschau noch nicht berechnet'}${dirty?' · Änderungen noch nicht als ZIP gesichert.':''}`:'Noch keine Farbe ausgewählt.');
  }
  function renderAcceptance(){
    const check=acceptance(),select=$('kit-library'),items=A.choices(ctx,state.profile?.info),signature=items.map(([id])=>id).join('|');
    if(select.dataset.options!==signature){select.replaceChildren(new Option('Zielbibliothek noch offen',''));for(const [id,v]of items)select.add(new Option(v.name,id));select.dataset.options=signature;}
    select.value=state.doc.print.library_id||'';
    const accepted=check.status==='ACCEPTED_FOR_LIBRARY';
    $('kit-acceptance-title').textContent=accepted?'Für diese Bibliothek akzeptiert':'Kundenfarben noch nicht akzeptiert';
    $('kit-acceptance-summary').textContent=(check.library_name?check.library_name+' · ':'')+(accepted?`${check.rows.length} von ${check.rows.length} Farben akzeptiert${check.rows.some(r=>r.status==='REPLACEMENT_FOUND')?' · einschließlich bestätigter Ersatzfarben': ' · ursprüngliche Referenzadressen enthalten'}.`:check.reason)+(state.profile&&!items.length?' Für dieses Profil fehlt eine zugeordnete Bibliotheksliste.':'');
    $('kit-acceptance').dataset.status=accepted?'accepted':'pending';
    document.querySelectorAll('[data-library-row]').forEach(el=>{const row=check.rows[Number(el.dataset.libraryRow)];el.textContent=A.rowLabel(row);el.dataset.status=row?.status||'UNVERIFIED';});
    const list=$('kit-acceptance-rows');list.replaceChildren(...state.doc.colours.map((c,i)=>{const li=document.createElement('li'),ref=ctx.colors.find(r=>r.id===c.reference_id);li.textContent=c.label+' · '+ref.ref+' · '+A.rowLabel(check.rows[i]);return li;}));
  }
  $('kit-library').onchange=e=>{if(busy)return;state.doc.print.library_id=e.target.value;change();};
  async function task(action,errorId='kit-status'){
    if(busy)return;busy=true;refresh();try{if(!window.crypto?.subtle)throw Error('Für Datei- und Profilprüfungen bitte das entpackte START_HERE.html lokal öffnen oder die Anwendung über HTTPS verwenden.');await action();}catch(err){status(errorId,err.message,true);}finally{busy=false;refresh();}
  }
  function renderColours(){
    const box=$('kit-colours');box.replaceChildren();
    if(!state.doc.colours.length){const p=document.createElement('p');p.className='empty';p.textContent='Deine ausgewählten Farben erscheinen hier.';box.append(p);}
    state.doc.colours.forEach((c,i)=>{
      const ref=ctx.colors.find(r=>r.id===c.reference_id),card=document.createElement('article');card.className='colour';
      card.innerHTML=`<div class="colour-top"><input aria-label="Farbname ${i+1}" maxlength="64"><button class="quiet" aria-label="Farbe ${i+1} entfernen">×</button></div><div class="pair"><div><div class="swatch" style="background:${K.hex(c.source_rgb)}"></div><p><b>Source Colour</b><br><code>${K.hex(c.source_rgb)}</code><br>RGB ${c.source_rgb.join(' / ')}<br>${c.kind==='image'?'Bildauswahl':c.kind==='recorded_srgb'?'Aufgezeichnete Bildfarbe':c.kind==='atlas_reference'?'Referenz als Ausgangsfarbe':'Manuell · sRGB'}</p></div><div><div class="swatch" style="background:${ref.hex}"></div><p><b>ATLAS-Referenz</b><br><code>${ref.hex}</code><br>RGB ${ref.rgb.join(' / ')}<br>${ref.ref}</p></div></div>`;
      const check=document.createElement('p');check.className='membership-status';check.dataset.libraryRow=String(i);card.append(check);
      card.querySelector('input').value=c.label;card.querySelector('input').oninput=e=>{c.label=e.target.value;change();};
      card.querySelector('button').onclick=()=>{if(busy)return;state.doc.colours.splice(i,1);change();renderColours();};box.append(card);
    });refresh();
  }
  function renderResults(){
    const result=state.result,box=$('kit-ba');box.replaceChildren();box.hidden=!result;
    if(!result){status('kit-print-status',ready()?'Bibliotheksprüfung bestanden. Berechne jetzt den B/A-Vergleich.':acceptance().status!=='ACCEPTED_FOR_LIBRARY'?'B/A gesperrt: '+acceptance().reason:'Wähle Farben, lade ein passendes Ausgabeprofil und ergänze Druckbedingung und Material. Nach Änderungen bitte neu berechnen.');return;}
    const grid=document.createElement('div');grid.className='ba-grid';
    result.colours.forEach((r,i)=>{const card=document.createElement('article');card.className='ba-card';const s=state.doc.print;
      card.innerHTML=`<h3>${K.escape(state.doc.colours[i].label)}</h3><div class="pair"><div><div class="swatch" style="background:${K.hex(r.input_rgb)}"></div><p><b>B · ${s.basis==='source'?'Source':s.basis==='accepted'?'Bestätigte Auswahl':'Referenz'}</b><br><code>${K.hex(r.input_rgb)}</code><br>RGB ${r.input_rgb.join(' / ')}</p></div><div><div class="swatch" style="background:${K.hex(r.preview_rgb)}"></div><p><b>A · Profilrückrechnung</b><br><code>${K.hex(r.preview_rgb)}</code><br>RGB ${r.preview_rgb.join(' / ')}</p></div></div><p><b>${K.escape(r.channel_order.join(' / '))}</b><br>${r.device_values_16bit.join(' / ')} · 16 Bit<br>${s.path==='TEXTILE_RGB'?'':r.device_values_16bit.map(v=>(100*v/65535).toFixed(2)+' %').join(' / ')}</p>`;
      grid.append(card);});box.append(grid);
    status('kit-print-status',`Berechnet: ${state.profile.name} · ${state.doc.print.intent} · Schwarzpunktkompensation ${state.doc.print.bpc?'an':'aus'}. Source und Referenz unverändert.`);
  }
  function addColour(c){if(state.doc.colours.length>=12)throw Error('Diese erste Version unterstützt zwölf Farben. Entferne zuerst eine Farbe.');state.doc.colours.push(c);change();renderColours();status('kit-status','Farbe zur Prüfung aufgenommen. Source Colour und ATLAS-Referenz bleiben getrennt.');}
  function label(){return $('kit-label').value.trim()||`Farbe ${state.doc.colours.length+1}`;}
  $('kit-add').onclick=()=>{if(busy)return;try{const h=$('kit-hex').value.trim();if(!/^#[0-9a-f]{6}$/i.test(h))throw Error('Bitte einen sRGB-HEX-Wert mit sechs Stellen eingeben, z. B. #EA6325.');const values=h.slice(1).match(/../g).map(x=>parseInt(x,16));addColour({label:label(),kind:'manual_srgb',source_rgb:values,reference_id:K.nearest(values,ctx).id,assignment:null});}catch(err){status('kit-status',err.message,true);}};
  async function decodeImage(bytes,mime){const url=URL.createObjectURL(new Blob([bytes],{type:mime}));try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Das Bild konnte nicht geöffnet werden.'));img.src=url;});}finally{URL.revokeObjectURL(url);}}
  function drawImage(img){
    image=img;canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;dc.clearRect(0,0,canvas.width,canvas.height);dc.drawImage(img,0,0);
    $('kit-stage').hidden=false;$('kit-placeholder').hidden=true;$('kit-x').max=canvas.width-1;$('kit-y').max=canvas.height-1;$('kit-x').value=Math.floor(canvas.width/2);$('kit-y').value=Math.floor(canvas.height/2);
  }
  function showOrigin(){const o=imageMeta?.colour_origin,i=o?.icc;status('kit-origin',!imageMeta?'Kein Originalbild in dieser Farbmappe.':`${imageMeta.name} · ${imageMeta.width} × ${imageMeta.height} Pixel. ${i?.status==='EMBEDDED_ICC'?'Eingebettetes ICC: '+i.name:i?.status==='NO_EMBEDDED_ICC'?'Kein eingebettetes ICC gefunden.':'Profilherkunft nicht vollständig bestimmbar.'} Die Originaldatei bleibt unverändert erhalten. Die Farbauswahl verwendet die vom Browser ausgelesenen sRGB-Werte (8 Bit); die tatsächliche Browsertransformation ist nicht verifiziert.`);}
  $('kit-image').onchange=event=>{const file=event.target.files[0];event.target.value='';if(!file)return;task(async()=>{
    if(file.size>K.MAX_ORIGINAL||!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw Error('Bitte PNG, JPEG, WebP oder GIF bis 32 MiB wählen.');
    const bytes=new Uint8Array(await file.arrayBuffer()),origin=await window.ATLAS_COLOUR_ORIGIN.inspect(bytes),img=await decodeImage(bytes,file.type);
    if(!img.naturalWidth||img.naturalWidth*img.naturalHeight>24000000)throw Error('Für diese Vorschau bitte ein Bild mit höchstens 24 Megapixeln wählen.');
    const removed=state.doc.colours.filter(c=>c.kind==='image').length;
    state.doc.colours=state.doc.colours.filter(c=>c.kind!=='image');state.original={name:file.name,bytes};imageMeta={name:file.name,width:img.naturalWidth,height:img.naturalHeight,sha256:origin.file_sha256,colour_origin:origin};drawImage(img);showOrigin();change();renderColours();
    status('kit-image-status',`${file.name} · ${img.naturalWidth} × ${img.naturalHeight} Pixel. Klicke auf eine Farbe. Ein anderes Bild ersetzt die bisherigen Bildfarben.`);
    status('kit-status',removed?`Neues Original geöffnet; ${removed} Bildfarbe(n) des vorherigen Originals entfernt. Manuelle Farben bleiben erhalten.`:'Bild geöffnet. Wähle jetzt deine Markenfarben.');
  });};
  function sample(x,y){
    if(busy||!image)return;
    try{
      if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=canvas.width||y>=canvas.height)throw Error('Pixelkoordinate liegt außerhalb des Bildes.');
      const px=dc.getImageData(x,y,1,1).data;if(px[3]<128)throw Error('Dieser Pixel ist zu transparent. Bitte eine andere Stelle wählen.');
      const values=Array.from(px.slice(0,3)),ref=K.nearest(values,ctx),assignment=E.createSourceAssignment({size:1,count:1,rgb:values,std:[0,0,0],bounds:[x,y,x,y]},{ix:x,iy:y},imageMeta,ref,ctx.master);
      addColour({label:label(),kind:'image',source_rgb:values,reference_id:ref.id,assignment});$('kit-x').value=x;$('kit-y').value=y;
    }catch(err){status('kit-status',err.message,true);}
  }
  canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/canvas.width,r.height/canvas.height),dx=(r.width-canvas.width*scale)/2,dy=(r.height-canvas.height*scale)/2;sample(Math.floor((e.clientX-r.left-dx)/scale),Math.floor((e.clientY-r.top-dy)/scale));};
  $('kit-pixel').onclick=()=>sample(Number($('kit-x').value),Number($('kit-y').value));
  canvas.onkeydown=e=>{const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(delta){e.preventDefault();$('kit-x').value=Math.max(0,Math.min(canvas.width-1,Number($('kit-x').value)+delta[0]));$('kit-y').value=Math.max(0,Math.min(canvas.height-1,Number($('kit-y').value)+delta[1]));}else if(e.key==='Enter'||e.key===' '){e.preventDefault();$('kit-pixel').click();}};
  $('kit-name').oninput=e=>{state.doc.name=e.target.value;dirty=true;refresh();};
  const fields={'kit-basis':'basis','kit-condition':'printing_condition','kit-material':'substrate','kit-intent':'intent','kit-bpc':'bpc','kit-channels':'channel_order'};
  Object.entries(fields).forEach(([id,key])=>{$(id).oninput=e=>{if(['printing_condition','substrate'].includes(key)&&state.doc.print_guide)state.doc.print_guide.applied=null;state.doc.print[key]=key==='bpc'?e.target.value==='true':key==='channel_order'?e.target.value.split(',').map(v=>v.trim()).filter(Boolean):e.target.value;change();};});
  function clearGuideProfile(){if(state.doc.print_guide)state.doc.print_guide.applied=null;}
  function profileStatus(){status('kit-profile-status',state.profile?`Geladen: ${state.profile.name}`:'Noch kein Ausgabeprofil geladen.');$('kit-profile-status').title=state.profile?'SHA-256 '+state.profile.info.sha256:'';}
  $('kit-path').onchange=e=>{state.doc.print.path=e.target.value;state.doc.print.library_id='';state.profile=null;clearGuideProfile();profileStatus();change();};
  $('kit-clear-profile').onclick=()=>{state.profile=null;clearGuideProfile();profileStatus();change();};
  async function attachProfile(bytes,name,path,condition,guideKind=null,preferredLibrary=''){
    if(busy)throw Error('Die Anwendung arbeitet. Bitte kurz warten.');
    busy=true;state.profile=null;clearGuideProfile();change();profileStatus();refresh();
    try{
      const info=await P.readProfile(bytes,name,path);
      state.doc.print.path=path;$('kit-path').value=path;
      if(condition){state.doc.print.printing_condition=condition;$('kit-condition').value=condition;}
      state.doc.print.channel_order=[];$('kit-channels').value='';
      if(path==='ECG'&&info.sha256==='dfea0cc4f4d1fa51b80bee490751c7b559ed7c21adf15de230d6705c56c76042'){state.doc.print.channel_order=['C','M','Y','K','O','G','V'];$('kit-channels').value='C, M, Y, K, O, G, V';}
      state.profile={name,bytes,info};state.doc.print.library_id=A.suggestedLibrary(ctx,info,preferredLibrary);if(guideKind){state.doc.print_guide.applied={kind:guideKind,sha256:info.sha256};state.doc.print.substrate=window.ATLAS_PRINT_GUIDE.material(state.doc.print_guide);$('kit-material').value=state.doc.print.substrate;}profileStatus();change();
    }finally{busy=false;refresh();}
  }
  async function loadProfileFile(file,guided=false){
    if(busy)return;
    busy=true;state.profile=null;clearGuideProfile();profileStatus();change();
    let bytes;
    try{if(file.size>P.MAX_PROFILE_BYTES)throw Error('ICC-Profil zu groß; höchstens 16 MiB.');bytes=new Uint8Array(await file.arrayBuffer());}
    finally{busy=false;refresh();}
    const space=String.fromCharCode(...bytes.slice(16,20));
    const path=guided?({'CMYK':'4C','7CLR':'ECG','RGB ':'TEXTILE_RGB'}[space]||'UNSUPPORTED'):state.doc.print.path;
    if(path==='UNSUPPORTED')throw Error('Dieses Profil hat keinen unterstützten Ausgabeweg. Bitte ein CMYK-Ausgabeprofil, ein Siebenkanalprofil oder das finale FOGRA58-Austauschprofil verwenden.');
    await attachProfile(bytes,file.name,path,guided?'Druckereivorgabe: '+file.name.slice(0,140):null,guided?'printer_file':null);
  }
  $('kit-profile').onchange=async e=>{
    const file=e.target.files[0];e.target.value='';if(!file||busy)return;
    try{await loadProfileFile(file);}catch(error){status('kit-profile-status',error.message,true);}
  };
  if(window.ATLAS_PROFILE_LIBRARY){
    catalogUI=window.ATLAS_PROFILE_LIBRARY.mount({container:$('kit-profile-library'),isBusy:()=>busy,attach:async({profile,bytes})=>attachProfile(bytes,profile.file_name,profile.output_path,profile.printing_condition||profile.description,null,catalogUI.select.value)});
  }
  if(window.ATLAS_PRINT_GUIDE&&window.ATLAS_PROFILE_LIBRARY){
    guide=window.ATLAS_PRINT_GUIDE.mount({container:$('kit-print-guide'),catalog:window.ATLAS_ICC_CATALOG,library:window.ATLAS_PROFILE_LIBRARY,
      getGuide:()=>state.doc.print_guide,getProfile:()=>state.profile,getSettings:()=>state.doc.print,isBusy:()=>busy,
      onChange:g=>{state.doc.print_guide=g;state.doc.print.library_id='';state.profile=null;state.doc.print.printing_condition='';state.doc.print.substrate=window.ATLAS_PRINT_GUIDE.material(g);$('kit-condition').value='';$('kit-material').value=state.doc.print.substrate;profileStatus();change();},
      onApply:async(id,kind)=>{
        busy=true;refresh();let bytes;
        try{bytes=await window.ATLAS_PROFILE_LIBRARY.bytes(id);}finally{busy=false;refresh();}
        const p=window.ATLAS_ICC_CATALOG.profiles[id];
        await attachProfile(bytes,p.file_name,p.output_path,p.printing_condition||p.description,kind);
      },onFile:file=>loadProfileFile(file,true)});
  }
  if(window.ATLAS_COLOUR_ADVICE_UI){
    advice=window.ATLAS_COLOUR_ADVICE_UI.mount({container:$('kit-advice'),ctx,getDoc:()=>state.doc,isBusy:()=>busy,
      onChange:()=>{$('kit-basis').value=state.doc.print.basis;change();},
      onLibrary:async id=>{
        if(busy)return;
        if(!A.choices(ctx).some(([key])=>key===id))throw Error('Bibliothek nicht verfügbar.');
        if(state.profile&&!A.choices(ctx,state.profile.info).some(([key])=>key===id)){state.profile=null;clearGuideProfile();state.doc.print.printing_condition='';$('kit-condition').value='';}
        state.doc.print.library_id=id;profileStatus();change();
        $('kit-advanced').open=true;
        if(catalogUI){catalogUI.select.value=id;catalogUI.select.dispatchEvent(new Event('change'));}
      }});
  }
  function run(job){return new Promise((resolve,reject)=>{
    if(!workerURL)workerURL=URL.createObjectURL(new Blob([JSON.parse($('atlas-print-worker-source').textContent)],{type:'text/javascript'}));
    const worker=new Worker(workerURL);let settled=false;const done=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);worker.terminate();error?reject(error):resolve(value);};const timer=setTimeout(()=>done(Error('Die Berechnung dauerte zu lange. Prüfe das Profil.')),45000);
    worker.onmessage=e=>{if(e.data.type==='error')done(Error(e.data.message));else if(['result','reference-result'].includes(e.data.type))done(null,e.data.result);};worker.onerror=e=>done(Error(e.message||'ICC-Berechnung fehlgeschlagen.'));worker.postMessage(job);
  });}
  $('kit-calculate').onclick=()=>task(async()=>{
    const doc=K.validate(state.doc,ctx),s=doc.print;A.requireAccepted(doc,ctx,state.profile?.info);if(!ready())throw Error('Farben, passendes Profil, Druckbedingung und Material fehlen.');
    state.result=null;renderResults();status('kit-print-status','Die Ausgabe wird mit dem geladenen Profil berechnet …');
    const input=doc.colours.map(c=>s.basis==='source'?c.source_rgb:s.basis==='accepted'?D.effective(c,doc,ctx).rgb:ctx.colors.find(r=>r.id===c.reference_id).rgb),pixels=new Uint8Array(input.flatMap(v=>[...v,255]));
    const preview=await run({path:s.path,width:input.length,height:1,pixels,profile:state.profile.bytes,intent:s.intent,bpc:s.bpc});
    const colours=[];for(let i=0;i<input.length;i++){
      const separation=await run({operation:'reference-separation',path:s.path,rgb:input[i],profile:state.profile.bytes,intent:s.intent,bpc:s.bpc,channelOrder:s.channel_order});
      colours.push({input_rgb:[...input[i]],preview_rgb:Array.from(preview.pixels.slice(i*4,i*4+3)),channel_order:separation.channel_order,device_values_16bit:separation.device_values_16bit});
    }
    const result={status:'COMPUTATIONAL_PREVIEW_NOT_MEASURED',profile_sha256:state.profile.info.sha256,settings:doc.print,inputs:doc.colours,colours,engine:preview.engine,method:preview.method,return_intent:preview.return_intent,return_bpc:preview.return_bpc,paper_white_simulation:preview.paper_white_simulation};
    K.validateResult(doc,ctx,result,state.profile.info);state.result=result;dirty=true;renderResults();
  },'kit-print-status');
  function download(name,bytes,type){const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  const stem=()=>state.doc.name.replace(/[^a-z0-9_-]+/gi,'_').slice(0,80)||'Meine_Marke';
  $('kit-export').onclick=()=>task(async()=>{const bytes=await K.pack(state,ctx);download(stem()+(acceptance().status==='ACCEPTED_FOR_LIBRARY'?'_Farbmappe.zip':'_Entwurf.zip'),bytes,'application/zip');dirty=false;status('kit-status','Projekt heruntergeladen. Der Prüfbericht im ZIP zeigt, ob die Farben für die Zielbibliothek akzeptiert sind. Das ZIP lässt sich hier wieder öffnen.');});
  $('kit-card').onclick=()=>{try{K.validate(state.doc,ctx);download(stem()+'_Farbkarte.html',K.report(state.doc,ctx,state.result,state.profile?.name,state.profile?.info),'text/html');}catch(err){status('kit-status',err.message,true);}};
  $('kit-json').onclick=()=>{try{K.validate(state.doc,ctx);A.requireAccepted(state.doc,ctx,state.profile?.info);download(stem()+'.clarus.json',JSON.stringify(K.clarus(state.doc,ctx),null,2),'application/json');status('kit-status','Clarus JSON enthält ATLAS-Referenzen und aufgezeichnete Bildquellen. Manuelle Source-Eingaben vollständig über die Farbmappe sichern.');}catch(err){status('kit-status',err.message,true);}};
  function loadForm(){
    adviceContext=currentAdviceContext();
    $('kit-name').value=state.doc.name;$('kit-path').value=state.doc.print.path;
    for(const [id,key]of Object.entries(fields))$(id).value=key==='channel_order'?state.doc.print[key].join(', '):String(state.doc.print[key]);profileStatus();renderColours();renderResults();refresh();
  }
  $('kit-import').onchange=e=>{const file=e.target.files[0];e.target.value='';if(!file)return;task(async()=>{
    if(file.size>K.MAX_ZIP)throw Error('Farbmappe zu groß.');const restored=await K.unpack(new Uint8Array(await file.arrayBuffer()),ctx);
    // Validate/decode everything before replacing the currently open workspace.
    let nextImage=null,nextMeta=null;
    if(restored.original){nextImage=await decodeImage(restored.original.bytes,'');if(!nextImage.naturalWidth||nextImage.naturalWidth*nextImage.naturalHeight>24000000)throw Error('Bild in Farbmappe zu groß.');const origin=await window.ATLAS_COLOUR_ORIGIN.inspect(restored.original.bytes);nextMeta={name:restored.original.name,width:nextImage.naturalWidth,height:nextImage.naturalHeight,sha256:origin.file_sha256,colour_origin:origin};if(restored.doc.colours.some(c=>c.kind==='image'&&(c.assignment.image.width!==nextMeta.width||c.assignment.image.height!==nextMeta.height)))throw Error('Bildabmessungen stimmen nicht.');}
    state=restored;image=nextImage;imageMeta=nextMeta;dirty=false;if(image)drawImage(image);else{$('kit-stage').hidden=true;$('kit-placeholder').hidden=false;dc.clearRect(0,0,canvas.width,canvas.height);}showOrigin();loadForm();
    status('kit-image-status',imageMeta?`${imageMeta.name} · Originaldatei geprüft. Gespeicherte Farben wurden nicht neu ausgelesen.`:'Kein Bild in dieser Farbmappe.');status('kit-status','Farbmappe geöffnet. Original, Profile und Farbzuordnungen geprüft. Bitte den B/A-Vergleich neu berechnen.');
  });};
  $('kit-demo').onclick=()=>{if(busy)return;try{for(const [name,values]of [['Markenorange',[234,99,37]],['Dunkelgrün',[24,74,61]],['Warmweiß',[245,241,222]]]){if(state.doc.colours.length>=12)break;addColour({label:name,kind:'manual_srgb',source_rgb:values,reference_id:K.nearest(values,ctx).id,assignment:null});}status('kit-status','Drei ausdrücklich als sRGB definierte Beispielfarben hinzugefügt. Für die Druckvorschau dein Ausgabeprofil laden.');}catch(err){status('kit-status',err.message,true);}};
  if(window.parent!==window){
    document.body.classList.add('embedded-advice');
    let seeded=false;
    addEventListener('message',e=>{
      if(e.source!==parent)return;
      if(e.data?.type==='ATLAS_ADVICE_CLOSE_REQUEST_V1'){if(!dirty||confirm('Deine Farbberatung ist noch nicht als ZIP gesichert. Trotzdem schließen?'))parent.postMessage({type:'ATLAS_ADVICE_CLOSE_ALLOWED_V1'},'*');return;}
      if(e.data?.type!=='ATLAS_ADVICE_SEED_V1'||seeded)return;
      task(async()=>{
        const incoming=e.data.snapshot;
        if(!incoming||incoming.profile||incoming.result)throw Error('Ungültige Beratungsübergabe.');
        K.validate(incoming.doc,ctx);
        // Serialize and reopen through the same validation used for file imports.
        const restored=await K.unpack(await K.pack(incoming,ctx),ctx);
        state=restored;seeded=true;dirty=true;
        if(state.original){const img=await decodeImage(state.original.bytes,'');const origin=await window.ATLAS_COLOUR_ORIGIN.inspect(state.original.bytes);imageMeta={name:state.original.name,width:img.naturalWidth,height:img.naturalHeight,sha256:origin.file_sha256,colour_origin:origin};drawImage(img);showOrigin();}
        loadForm();status('kit-status','Aus der Browser Edition übernommen. Source-Aufzeichnungen und ursprüngliche Referenzen bleiben erhalten. Sichere deine Entscheidungen als Farbmappe.');
        $('kit-acceptance').scrollIntoView();parent.postMessage({type:'ATLAS_ADVICE_SEEDED_V1'},'*');
      });
    });
    parent.postMessage({type:'ATLAS_ADVICE_READY_V1'},'*');
  }
  addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  loadForm();
  if(!window.crypto?.subtle)status('kit-status','Diese HTTP-Vorschau unterstützt keine Prüfsummen. Für Dateien, Profile und ZIP bitte START_HERE.html lokal öffnen oder HTTPS verwenden.',true);
})();
