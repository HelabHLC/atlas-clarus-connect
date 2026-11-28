/* Local-only BYOS staging panel. No profile upload or ICC calculation. */
(function(root){
  'use strict';
  function mount(){
    const api=root.ATLAS_RC36_BYOS;
    if(!api||document.getElementById('rc36-byos-panel'))return;
    const d=document.createElement('details');d.id='rc36-byos-panel';d.style.cssText='margin:12px;padding:12px;border:1px solid #8493a0;border-radius:8px;max-width:100%;overflow-wrap:anywhere';
    const summary=document.createElement('summary');summary.textContent='Open DCM · Eigene ICC-Profile / Bring your own profiles';d.append(summary);
    const p=document.createElement('p');p.textContent='Test: lokale Ausgabeprofile, nur im Arbeitsspeicher. Keine ICC-Berechnung. / Staging: local output profiles, memory only. No ICC calculation.';d.append(p);
    const file=document.createElement('input');file.type='file';file.accept='.icc,.icm';file.setAttribute('aria-label','Local ICC output profile');d.append(file);
    const list=document.createElement('select');list.setAttribute('aria-label','Select local ICC profile');d.append(list);
    const status=document.createElement('p');status.setAttribute('role','status');d.append(status);
    const clear=document.createElement('button');clear.type='button';clear.textContent='Profile entfernen / Clear profiles';d.append(clear);
    const research=document.createElement('a');research.href='research/index.html';research.target='_blank';research.rel='noopener';research.textContent='Colour Advisory & Spectral Lab (Research Beta)';research.style.display='block';d.append(research);
    function refresh(){list.replaceChildren();const m=api.selected();for(const x of api.list()){const o=document.createElement('option');o.value=x.sha256;o.textContent=x.name+' · '+x.deviceSpace.trim()+' · '+x.sha256.slice(0,12);list.append(o)}if(m)list.value=m.sha256;list.disabled=!m;status.textContent=m?'SHA-256: '+m.sha256+' · structural preflight only · NOT CALCULATED':'No local profile selected';}
    file.addEventListener('change',async()=>{if(!file.files[0])return;file.disabled=true;try{await api.add(file.files[0]);refresh()}catch(e){status.textContent='Import rejected: '+e.message}finally{file.value='';file.disabled=false}});
    list.addEventListener('change',()=>{api.select(list.value);refresh()});
    clear.addEventListener('click',()=>{api.clear();refresh()});
    refresh();document.body.prepend(d);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(globalThis);
