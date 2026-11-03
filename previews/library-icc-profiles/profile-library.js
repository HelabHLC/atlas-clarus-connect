/* Library membership never changes the encoding of frozen master RGB values. */
(function(root){
  'use strict';
  const catalog=root.ATLAS_ICC_CATALOG,bank=root.ATLAS_ICC_PROFILE_BANK||{},instances=[];
  const pending=new Map(),local=new Map(),sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  function profile(id){const p=catalog.profiles[id];if(!p)throw Error('Unbekanntes Profil.');return p;}
  async function verify(id,bytes){const p=profile(id);if(bytes.length!==p.bytes||await sha(bytes)!==p.sha256)throw Error('Die ICC-Datei stimmt nicht mit der geprüften Profilversion überein.');return bytes;}
  function available(id){return local.has(id)||typeof bank[id]==='string'||(root.ATLAS_ICC_INSTALLED||[]).includes(id);}
  async function load(id){
    if(typeof bank[id]==='string')return;
    if(!pending.has(id))pending.set(id,new Promise((resolve,reject)=>{
      const s=document.createElement('script');let timer;const finish=error=>{clearTimeout(timer);s.remove();error?reject(error):resolve();};
      s.src=new URL(id+'.js',root.ATLAS_ICC_DATA_BASE).href;
      s.onload=()=>finish(typeof bank[id]==='string'?null:Error('Die lokale Profildatei ist unvollständig.'));
      s.onerror=()=>finish(Error('Profildatei fehlt. Bitte die ZIP vollständig entpacken.'));
      timer=setTimeout(()=>finish(Error('Profildatei konnte nicht rechtzeitig geladen werden.')),30000);document.head.append(s);
    }).finally(()=>pending.delete(id)));
    return pending.get(id);
  }
  async function bytes(id){if(local.has(id))return verify(id,local.get(id));if(!available(id))throw Error('Profil zuerst vom Anbieter laden und hier importieren.');await load(id);const b=Uint8Array.from(atob(bank[id]),c=>c.charCodeAt(0));return verify(id,b);}
  async function importFiles(files){let added=0,rejected=0;for(const f of files){if(f.size>16*1024*1024){rejected++;continue;}const b=new Uint8Array(await f.arrayBuffer()),hash=await sha(b),entry=Object.entries(catalog.profiles).find(([,p])=>p.sha256===hash&&p.bytes===b.length);if(!entry){rejected++;continue;}local.set(entry[0],b);added++;}return{added,rejected};}
  function element(tag,text){const el=document.createElement(tag);if(text)el.textContent=text;return el;}
  function download(name,b){const url=URL.createObjectURL(new Blob([b],{type:'application/vnd.iccprofile'})),a=element('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function mount({container,externalSelect,attach,isBusy=()=>false}){
    const box=element('div');box.className='atlas-profile-library';
    const title=element('h3','Profil zur Bibliothek');box.append(title);
    const label=element('label','Bibliothek / Druckbedingung'),select=element('select');select.setAttribute('aria-label','Bibliothek für ICC-Zuordnung');
    for(const [id,v] of Object.entries(catalog.libraries)){if(v.hidden)continue;const op=element('option',v.name);op.value=id;select.append(op);}
    label.append(select);box.append(label);
    const note=element('p'),rows=element('div'),tools=element('div');tools.className='atlas-profile-actions';
    const impLabel=element('label','Vorhandene ICC-Dateien zuordnen'),imp=element('input');imp.type='file';imp.multiple=true;imp.accept='.icc,.icm';impLabel.append(imp);tools.append(impLabel);
    const message=element('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
    box.append(note,rows,tools,message,element('p','Die Bibliothek ist eine Auswahl fester ATLAS-Farben. Das ICC-Profil dient der Umrechnung; es ändert keine Original- oder Referenzwerte. Material und Druckbedingung mit der Druckerei abstimmen.'));
    container.append(box);let working=false,buttons=[];
    function refresh(){const locked=working||isBusy();select.disabled=imp.disabled=locked;for(const item of buttons)item.el.disabled=locked||!available(item.id);}
    async function action(fn){if(working||isBusy())return;working=true;message.textContent='Profil wird geprüft …';refresh();try{await fn();}catch(e){message.textContent=e.message;}finally{working=false;refresh();}}
    function render(){
      const lib=catalog.libraries[select.value];rows.replaceChildren();buttons=[];message.textContent='';note.textContent=lib.note;
      for(const id of lib.profile_ids){const p=profile(id),row=element('div');row.className='atlas-profile-row';row.append(element('strong',p.description||p.file_name),element('p',`${p.file_name} · ${p.role_label}${p.beta?' · BETA':''}`));
        const actions=element('div');actions.className='atlas-profile-actions';
        const save=element('button','ICC-Datei speichern');save.type='button';save.onclick=()=>action(async()=>{download(p.file_name,await bytes(id));message.textContent='ICC-Datei unverändert gespeichert.';});buttons.push({el:save,id});actions.append(save);
        if(p.output_path){const use=element('button','Für Druckvorbereitung übernehmen');use.type='button';use.onclick=()=>action(async()=>{await attach({id,profile:p,bytes:await bytes(id),library:lib});message.textContent=`${p.file_name} übernommen. Material und Einstellungen prüfen; B/A anschließend neu berechnen.`;});buttons.push({el:use,id});actions.append(use);}
        const source=element('a','Originalquelle ↗');source.href=p.source_page||p.source_url;source.target='_blank';source.rel='noopener noreferrer';actions.append(source);row.append(actions);
        if(!available(id))row.append(element('p','Noch nicht lokal verfügbar. Originalprofil herunterladen, ggf. ZIP entpacken und die ICC-Datei oben zuordnen.'));
        const details=element('details'),summary=element('summary','Profilversion und Herkunft');details.append(summary,element('p',`SHA-256: ${p.sha256}`),element('p',p.match_note),element('p',p.copyright));row.append(details);rows.append(row);
      }
      refresh();
    }
    select.onchange=render;
    imp.onchange=()=>{const files=Array.from(imp.files);imp.value='';action(async()=>{const r=await importFiles(files);render();message.textContent=`${r.added} Profil(e) zugeordnet; ${r.rejected} Datei(en) passen zu keiner geprüften Version. Nicht erkannte Druckprofile können weiter über „Ausgabeprofil laden“ verwendet werden.`;});};
    if(externalSelect){select.value=externalSelect.value||'core';externalSelect.addEventListener('change',()=>{select.value=externalSelect.value;render();});}
    render();instances.push({refresh});return{refresh,select};
  }
  root.ATLAS_PROFILE_LIBRARY={mount,verify,bytes,importFiles,available,refreshAll:()=>instances.forEach(x=>x.refresh())};
})(window);
