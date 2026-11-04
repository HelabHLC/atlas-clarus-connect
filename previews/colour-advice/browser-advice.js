(function(){
  'use strict';
  const source=window.ATLAS_ADVICE_BROWSER_SOURCE,data=window.ATLAS_CLARUS_DATA,I=window.ATLAS_LANGUAGE;
  if(!source||!data)return;
  const toolbar=document.querySelector('.library-toolbar'),drawer=document.querySelector('#drawer-palette-list');
  const launch=document.createElement('div');launch.className='atlas-advice-launch';
  launch.innerHTML='<b>ATLAS Clarus Farbberatung</b><p>Bibliothek prüfen, Alternativen finden und Ersatzfarben innerhalb deiner Toleranz vergleichen.</p><button data-advice-selected>Ausgewählte Farbe beraten</button><button data-advice-palette>Aktive Palette beraten</button><p data-advice-status role="status"></p>';
  toolbar.after(launch);if(I){I.control(launch,'browser-advice-language');I.observe(launch);}
  if(drawer){const button=document.createElement('button');button.textContent='Palette in der Farbberatung prüfen';button.dataset.advicePalette='';drawer.before(button);I?.observe(button);}
  let pending=null,frame=null,dialog=null,returnFocus=null,opening=false,stopDialogLanguage=null;
  const status=launch.querySelector('[data-advice-status]');
  async function open(scope,button){
    if(opening||pending||dialog)return;opening=true;
    returnFocus=button;status.textContent='Farbaufzeichnungen werden geprüft …';
    try{
      const input=source[scope](),records=window.ATLAS_CLARUS_EXPORTS.validateSourceAssignments(input.assignments,data.colors,data.master_sha256,input.entries.map(c=>c.id));
      const colours=input.entries.flatMap(entry=>{
        const found=records.filter(r=>r.atlas_row_id===entry.id);
        return found.length?found.map((assignment,i)=>({label:(entry.ref+(found.length>1?' · Quelle '+(i+1):'')).slice(0,64),kind:'recorded_srgb',source_rgb:[...assignment.source_rgb],reference_id:entry.id,assignment})): [{label:entry.ref,kind:'atlas_reference',source_rgb:[...entry.rgb],reference_id:entry.id,assignment:null}];
      });
      if(!colours.length)throw Error('Füge zuerst eine Farbe zur Palette hinzu.');
      if(colours.length>12)throw Error('Diese Beratung unterstützt zwölf Farbaufzeichnungen. Wähle eine kleinere Palette oder berate die ausgewählte Farbe einzeln. Es wurden keine Farben weggelassen.');
      const original=await source.original();
      let carry=null;
      if(original&&original.bytes.length<=32*1024*1024){
        const info=await window.ATLAS_COLOUR_ORIGIN.inspect(original.bytes);
        if(colours.some(c=>c.assignment?.image.sha256===info.file_sha256)){
          carry=original;
          colours.forEach(c=>{if(c.assignment?.image.sha256===info.file_sha256&&JSON.stringify(c.assignment.image.colour_origin)===JSON.stringify(info))c.kind='image';});
        }
      }
      const library=data.views[source.library()];
      pending={doc:{schema:'atlas-clarus-startup-colour-kit/1.0',acceptance_rule:'ATLAS_LIBRARY_MEMBERSHIP_V1',master_sha256:data.master_sha256,name:input.name.slice(0,100),colours,
        print:{library_id:library?.type==='SOURCE_DECLARED_GAMUT_MEMBERSHIP'&&!library.hidden_from_new_selection?source.library():'',path:'4C',basis:'source',printing_condition:'',substrate:'',intent:'Relative colorimetric',bpc:false,channel_order:[]},advice:{schema:'ATLAS_COLOUR_ADVICE_V1',tolerance:null}},original:carry,profile:null,result:null};
      dialog=document.createElement('dialog');dialog.className='atlas-advice-dialog';
      dialog.innerHTML='<div class="atlas-advice-bar"><b>Farbberatung · Browser Edition</b><button data-close-advice>Zurück zur Browser Edition</button></div><iframe title="ATLAS Clarus Farbberatung und Startup Colour Kit"></iframe>';
      document.body.append(dialog);stopDialogLanguage=I?.observe(dialog);frame=dialog.querySelector('iframe');
      const requestClose=()=>frame.contentWindow.postMessage({type:'ATLAS_ADVICE_CLOSE_REQUEST_V1'},'*');
      dialog.querySelector('[data-close-advice]').onclick=requestClose;
      dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
      dialog.addEventListener('close',()=>{stopDialogLanguage?.();stopDialogLanguage=null;dialog.remove();dialog=null;frame=null;pending=null;returnFocus?.focus();status.textContent='Die ursprüngliche Browser-Palette bleibt erhalten. Gesicherte Farbmappen enthalten deine Beratungsentscheidungen.';});
      dialog.showModal();frame.src='startup/index.html?lang='+(I?.language||'de')+'#prepare';
      status.textContent='Die Farbberatung ist geöffnet. Entscheidungen dort als Farbmappe sichern.';
    }catch(err){pending=null;status.textContent=err.message;}finally{opening=false;}
  }
  document.querySelectorAll('[data-advice-selected],[data-advice-palette]').forEach(b=>b.onclick=()=>open(b.dataset.adviceSelected!==undefined?'selected':'palette',b));
  addEventListener('atlas-language-change',()=>{if(frame)frame.contentWindow.postMessage({type:'ATLAS_ADVICE_LANGUAGE_V1',language:I.language},'*');});
  addEventListener('message',event=>{
    if(!frame||event.source!==frame.contentWindow)return;
    if(event.data?.type==='ATLAS_ADVICE_LANGUAGE_V1'&&['de','en'].includes(event.data.language))I?.setLanguage(event.data.language);
    if(event.data?.type==='ATLAS_ADVICE_READY_V1'&&pending)frame.contentWindow.postMessage({type:'ATLAS_ADVICE_SEED_V1',snapshot:pending},'*');
    if(event.data?.type==='ATLAS_ADVICE_SEEDED_V1')pending=null;
    if(event.data?.type==='ATLAS_ADVICE_CLOSE_ALLOWED_V1')dialog.close();
  });
})();
