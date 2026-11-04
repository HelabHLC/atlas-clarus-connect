(function(root){
 root.ATLAS_MULTI_LAUNCHER={mount({container,getSnapshot,isBusy,ctx}){
  const I=root.ATLAS_LANGUAGE,pending=new Map(),button=document.createElement('button'),note=document.createElement('p');
  button.type='button';button.className='secondary';button.id='kit-multi';note.className='small';note.setAttribute('role','status');container.append(button,note);
  const label=()=>button.textContent=I?.language==='en'?'Brand colours across applications ↗':'Markenfarben für mehrere Anwendungen ↗';label();root.addEventListener('atlas-language-change',label);
  button.onclick=()=>{
   if(isBusy())return;
   const snapshot=getSnapshot();if(!snapshot.doc.colours.length){note.textContent=I?.language==='en'?'Choose a starting colour first.':'Wähle zuerst eine Ausgangsfarbe.';return;}
   // Open synchronously in the user gesture; validate/copy asynchronously.
   const tab=root.open('../multi/index.html?lang='+(I?.language||'de'),'_blank');
   if(!tab){note.textContent=I?.language==='en'?'Allow the new tab to open, then try again.':'Erlaube das neue Browserfenster und versuche es erneut.';return;}
   pending.set(tab,{bytes:root.ATLAS_STARTUP_CORE.pack(snapshot,ctx),ready:false,sent:false});
   pending.get(tab).bytes.then(()=>send(tab)).catch(error=>{pending.delete(tab);note.textContent=error.message;});
  };
  async function send(tab){const p=pending.get(tab);if(!p?.ready||p.sent)return;p.sent=true;try{const bytes=await p.bytes;if(tab.closed){pending.delete(tab);return;}tab.postMessage({type:'ATLAS_MULTI_SEED_V1',bytes},'*');}catch(error){pending.delete(tab);note.textContent=error.message;}}
  root.addEventListener('message',e=>{const p=pending.get(e.source);if(!p)return;if(e.data?.type==='ATLAS_MULTI_READY_V1'){p.ready=true;send(e.source);}if(e.data?.type==='ATLAS_MULTI_SEEDED_V1'){pending.delete(e.source);note.textContent=I?.language==='en'?'Palette opened in the multi-application workspace.':'Palette im Arbeitsbereich für mehrere Anwendungen geöffnet.';}});
 }};
})(window);
