(function(){
  'use strict';
  const STATUS='SIMULATED_NOT_PHYSICALLY_VERIFIED';
  const CONFIG=window.ATLAS_TRYCOLORS_CONFIG||{};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hex=v=>/^#[0-9A-F]{6}$/i.test(String(v||''))?String(v).toUpperCase():null;
  function selectedFrom(root){
    const ref=root.querySelector('h2')?.textContent?.trim();
    const rows=[...root.querySelectorAll('dl dt')];
    const value=label=>rows.find(x=>x.textContent.trim()===label)?.nextElementSibling?.textContent?.trim();
    const targetHex=hex(value('HEX'));
    const rowId=Number(value('atlas_row_id'));
    return ref&&targetHex&&Number.isInteger(rowId)?{ref,targetHex,rowId}:null;
  }
  function saveJson(name,data){
    const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function renderResult(box,envelope){
    const r=envelope.recipe||{},parts=(r.structure||[]).filter(x=>Number(x.wholeParts)>0);
    box.innerHTML=`<p class="trycolors-match"><b>Practical match ${Number(r.matchResult||0).toFixed(1)}%</b> · ${esc(r.mixedColor||'—')}</p><ol>${parts.map(x=>`<li><i style="background:${esc(x.hex)}"></i><b>${Number(x.wholeParts)} parts</b> ${esc(x.name||x.hex)} <small>${(Number(x.count||0)*100).toFixed(2)}%</small></li>`).join('')}</ol><p><a href="https://trycolors.com" target="_blank" rel="noopener noreferrer">Recipe computed by Trycolors</a></p><p class="boundary">${STATUS}. Digital recipe candidate only; not a physical measurement, ALFA dispenser command, production approval or change to PKL identity.</p><div class="trycolors-actions"><button data-trycolors-json>Export evidence JSON</button><button data-trycolors-copy>Copy recipe</button></div>`;
    box.querySelector('[data-trycolors-json]').onclick=()=>saveJson(`trycolors-${envelope.target.atlas_ref}.json`,envelope);
    box.querySelector('[data-trycolors-copy]').onclick=()=>navigator.clipboard?.writeText(parts.map(x=>`${x.wholeParts} parts ${x.name||x.hex}`).join(' + '));
  }
  async function requestRecipe(selection,box,button){
    if(!CONFIG.endpoint)return;
    button.disabled=true;box.innerHTML='<p>Requesting TryColors PRO Advanced candidate…</p>';
    try{
      const headers={'Content-Type':'application/json'};if(CONFIG.nonce)headers['X-WP-Nonce']=CONFIG.nonce;
      const response=await fetch(CONFIG.endpoint,{method:'POST',credentials:'same-origin',headers,body:JSON.stringify({target_hex:selection.targetHex,atlas_ref:selection.ref,atlas_row_id:selection.rowId})});
      const data=await response.json().catch(()=>({error:'Invalid server response.'}));
      if(!response.ok)throw new Error(data.message||data.error||`Request failed (${response.status})`);
      renderResult(box,data);
    }catch(error){box.innerHTML=`<p class="trycolors-error">${esc(error.message)}</p><p class="boundary">PKL identity and the offline workflow remain unchanged.</p>`}
    finally{button.disabled=false}
  }
  function mount(root){
    const selection=selectedFrom(root);if(!selection||root.querySelector('.trycolors-recipe'))return;
    const panel=document.createElement('section');panel.className='trycolors-recipe';
    panel.innerHTML=`<p class="eyebrow">OPTIONAL ONLINE RECIPE</p><h3>TryColors candidate</h3><p>Target: <b>${esc(selection.ref)}</b> · ${selection.targetHex}</p><button data-trycolors-create ${CONFIG.endpoint?'':'disabled'}>Create PRO Advanced recipe</button><div data-trycolors-result>${CONFIG.endpoint?'<p>Uses the fixed Golden Heavy Body 59-paint measured palette. The API key never enters this browser.</p>':'<p>Offline mode: no recipe server is configured. All existing ATLAS tools remain available.</p>'}</div>`;
    root.append(panel);const button=panel.querySelector('[data-trycolors-create]');button.onclick=()=>requestRecipe(selection,panel.querySelector('[data-trycolors-result]'),button);
  }
  function scan(){document.querySelectorAll('#selection,#wheel-selection').forEach(mount)}
  new MutationObserver(scan).observe(document.body,{subtree:true,childList:true});scan();
})();
