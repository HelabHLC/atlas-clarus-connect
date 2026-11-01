(function(global){
  'use strict';
  global.ATLAS_FIRST_COLOUR={init(context){
    const $=id=>document.getElementById(id),E=global.ATLAS_CLARUS_EXPORTS;
    const panel=$('start'),file=$('picker-file'),stage=$('picker-canvas').parentElement,canvas=$('picker-canvas');
    const fileHome=document.createComment('first-colour: original file input position');
    const stageHome=document.createComment('first-colour: original image stage position');
    file.before(fileHome);stage.before(stageHome);
    // Keep the existing camera entry in the full Picker when the file input moves.
    // The camera module honours this marker and does not add a second button.
    if(!file.dataset.atlasLive){
      file.dataset.atlasLive='1';const camera=document.createElement('button');camera.type='button';camera.className='atlas-live-button';camera.textContent='Live camera / Live-Kamera';
      camera.onclick=()=>global.ATLAS_LIVE_CAMERA?.open(file);file.closest('label').after(camera);
    }
    const originalCanvas={tabindex:canvas.getAttribute('tabindex'),label:canvas.getAttribute('aria-label')};
    let documentData=null,records=[],references=[],recordIndex=0,imageMeta=null,imageReady=false,downloaded=false,generation=0;
    let cursor=null;
    const marker=document.createElement('span');marker.className='fc-key-position';marker.hidden=true;marker.setAttribute('aria-hidden','true');stage.append(marker);
    function text(id,value){$(id).textContent=value;}
    function status(message,error=false){text('fc-status',message);$('fc-status').dataset.error=String(error);}
    function saveStatus(message,error=false){text('fc-save-status',message);$('fc-save-status').dataset.error=String(error);}
    function step(n){for(let i=1;i<=3;i++){const el=$('fc-step-'+i);if(i===n)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');}}
    function current(){const source=records[recordIndex]||null;return {source,reference:source?references.find(c=>c.id===source.atlas_row_id):references[0]};}
    function setDocument(data){
      // The same parser as My Palettes validates every source/reference before mutation.
      const restored=E.parseClarus(data,context.colors,context.master);
      const refs=restored.colorIds.map(id=>context.colors.find(c=>c.id===id));
      const canonical=E.clarus(refs,context.master,data.palette_name||'Meine erste Farbe',restored.sourceAssignments);
      documentData=canonical;records=restored.sourceAssignments;references=refs;recordIndex=0;downloaded=false;
      $('fc-records').replaceChildren();
      records.forEach((r,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=`${i+1}. ${r.source_hex} · ${r.image.name}`;$('fc-records').append(option);});
      $('fc-record-label').hidden=records.length<2;
      render();
    }
    function render(){
      const available=!!documentData;
      $('fc-result').hidden=!available;$('fc-awaiting').hidden=available;$('fc-download').disabled=!available;$('fc-next').hidden=!available;
      if(!available)return;
      const {source,reference}=current();
      $('fc-source-swatch').style.background=source?source.source_hex:'';
      $('fc-reference-swatch').style.background=reference.hex;
      text('fc-source-hex',source?source.source_hex:'Nicht aufgezeichnet');text('fc-source-rgb',source?'RGB '+source.source_rgb.join(' / '):'Keine Quelle ergänzt oder rekonstruiert.');
      text('fc-reference-hex',reference.hex);text('fc-reference-rgb','RGB '+reference.rgb.join(' / '));text('fc-address',reference.ref);
      text('fc-principle',source?'Deine ausgewählte Farbe bleibt erhalten. Die ATLAS-Adresse ergänzt eine feste Referenz.':'Diese Datei enthält Referenzen, aber keine aufgezeichnete Ausgangsfarbe.');
      $('fc-origin').replaceChildren();
      const detail=document.createElement('p');detail.className='fc-origin-record';
      detail.textContent=source?`${source.image.name} · ${source.image.width} × ${source.image.height} Pixel · Auswahl ${source.sampling.centre.join(' / ')} · ${source.sampling.mode}. ${records.length} aufgezeichnete Quelle(n), ${references.length} Referenz(en) in dieser Datei.`:`${references.length} Referenz(en). Keine Ausgangsfarbe aufgezeichnet.`;
      $('fc-origin').append(detail);
      if(source&&global.ATLAS_COLOUR_ORIGIN){const origin=document.createElement('div');origin.innerHTML=global.ATLAS_COLOUR_ORIGIN.render(source.image,source);$('fc-origin').append(origin);}
      step(3);
    }
    function clear(){
      generation++;documentData=null;records=[];references=[];recordIndex=0;downloaded=false;cursor=null;marker.hidden=true;
      saveStatus('');render();
    }
    function paintCursor(){
      const pos=cursor&&context.canvasPosition(cursor.x,cursor.y);
      marker.hidden=!pos||!document.body.classList.contains('fc-mode');
      if(pos){marker.style.left=pos.percentX+'%';marker.style.top=pos.percentY+'%';}
    }
    const api={
      loading(){clear();imageReady=false;imageMeta=null;$('fc-empty').hidden=false;$('fc-stage-slot').hidden=true;$('fc-picker-hint').hidden=true;status('Dein Bild wird geöffnet …');step(1);},
      ready(meta){imageMeta=meta;imageReady=true;$('fc-empty').hidden=true;$('fc-stage-slot').hidden=false;$('fc-picker-hint').hidden=false;text('fc-image-name',`${meta.name} · ${meta.width} × ${meta.height} Pixel`);status('Wähle jetzt eine Farbe in deinem Bild.');step(2);},
      error(message){clear();imageReady=false;imageMeta=null;$('fc-empty').hidden=false;$('fc-stage-slot').hidden=true;$('fc-picker-hint').hidden=true;status(message,true);step(1);},
      noSample(){clear();status('An dieser Stelle ist das Bild zu transparent. Wähle eine andere Stelle.',true);step(2);},
      sample(reference,source){
        generation++;setDocument(E.clarus([reference],context.master,'Meine erste Farbe',[source]));
        cursor={x:source.sampling.centre[0],y:source.sampling.centre[1]};paintCursor();
        saveStatus('Noch nicht als Datei gesichert.');status('Farbe ausgewählt. Du kannst sie jetzt mit Herkunft herunterladen.');
      },
      route(id){
        const simple=id==='start';document.body.classList.toggle('fc-mode',simple);
        if(simple){$('fc-upload-slot').append(file);$('fc-stage-slot').append(stage);$('picker-sample-size').value='1';canvas.tabIndex=0;canvas.setAttribute('aria-label','Farbe auswählen: mit Pfeiltasten bewegen, mit Enter die Mitte wählen.');}
        else{fileHome.after(file);stageHome.after(stage);if(originalCanvas.tabindex===null)canvas.removeAttribute('tabindex');else canvas.setAttribute('tabindex',originalCanvas.tabindex);canvas.setAttribute('aria-label',originalCanvas.label);}
        paintCursor();
      }
    };
    canvas.addEventListener('keydown',event=>{
      if(!document.body.classList.contains('fc-mode')||!imageReady||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(event.key))return;
      event.preventDefault();
      if(!cursor)cursor={x:Math.floor(imageMeta.width/2),y:Math.floor(imageMeta.height/2)};
      const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
      if(delta){cursor.x=Math.max(0,Math.min(imageMeta.width-1,cursor.x+delta[0]));cursor.y=Math.max(0,Math.min(imageMeta.height-1,cursor.y+delta[1]));}
      const position=context.canvasPosition(cursor.x,cursor.y);if(position)canvas.onclick(position);paintCursor();
    });
    $('fc-records').onchange=()=>{recordIndex=Number($('fc-records').value);render();};
    $('fc-download').onclick=()=>{
      if(!documentData)return;
      try{
        E.parseClarus(documentData,context.colors,context.master);
        const stem=references.length===1?references[0].ref:'Palette';
        context.download('ATLAS_Clarus_'+stem+'.clarus.json',JSON.stringify(documentData,null,2),'application/json',true);
        downloaded=true;saveStatus('Download gestartet. Prüfe deinen Downloadordner. Mit „Gesicherte Farbe öffnen“ kannst du die Datei wieder ansehen.');
      }catch(err){saveStatus('Download nicht gestartet: '+err.message,true);}
    };
    $('fc-import').onchange=async event=>{
      const incoming=event.target.files?.[0];event.target.value='';if(!incoming)return;
      const sequence=++generation;
      try{
        if(incoming.size>16*1024*1024)throw Error('Die Datei ist größer als 16 MiB. Öffne sie im vollständigen Arbeitsbereich.');
        const data=JSON.parse(await incoming.text());if(sequence!==generation)return;
        setDocument(data);downloaded=true;imageReady=false;imageMeta=null;cursor=null;marker.hidden=true;
        $('fc-stage-slot').hidden=true;$('fc-picker-hint').hidden=true;$('fc-empty').hidden=false;
        text('fc-image-name','Das Originalbild ist in dieser Farbdatei nicht enthalten.');
        status('Gesicherte Farbe geöffnet. Alle enthaltenen Quellen und Referenzen bleiben beim erneuten Download erhalten.');saveStatus('Datei geprüft und geöffnet.');
      }catch(err){if(sequence===generation)status('Datei konnte nicht geöffnet werden: '+err.message,true);}
    };
    async function continueWork(target){
      if(!documentData)return;
      try{
        const snapshot=JSON.parse(JSON.stringify(documentData)),{source,reference}=current();
        await context.openPalette(snapshot,reference,source,target);
      }catch(err){saveStatus('Palette konnte nicht übernommen werden: '+err.message,true);}
    }
    $('fc-collect').onclick=()=>continueWork('palette');$('fc-design').onclick=()=>continueWork('design');$('fc-print').onclick=()=>continueWork('print');
    addEventListener('beforeunload',event=>{if(document.body.classList.contains('fc-mode')&&documentData&&!downloaded){event.preventDefault();event.returnValue='';}});
    return api;
  }};
})(window);
