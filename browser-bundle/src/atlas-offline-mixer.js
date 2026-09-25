(function (root) {
  'use strict';
  // Pilot: a local, opt-in spectral recipe search. No source spectra ship with the bundle.
  const ATLAS_SHA = 'dfcac10e5cbe8401b438063294e5230145f155afe1cf7bb1cdb45541d5e78fe5';
  const CHSOS_SHA = 'd102c1f320ce080bfe84fe3f3c0bf255ddb53497ca90c65b19163df047524059';
  const MASTER_SHA = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  const WHITE_ID = 'CHSOS_GORGIAS_PW_6_ANATASE';
  const opacityNotes = {
    CHSOS_GORGIAS_PY_139_ISOINDOLINE_YELLOW: {note:'CHSOS describes semi-opaque to transparent behavior depending on particle size and formulation; not a rating for this swatch.',source:'https://chsopensource.org/products/pigments-checker/pigments-checker-modern-and-contemporary-art-pigments-list/py-139-isoindoline-yellow/'},
    CHSOS_GORGIAS_PO_73_PYRROLE_ORANGE: {note:'CHSOS describes high opacity qualitatively; no measured rating for this swatch.',source:'https://chsopensource.org/products/pigments-checker/pigments-checker-modern-and-contemporary-art-pigments-list/po-73-pyrrole-orange/'}
  };
  const X=[.01431,.04351,.13438,.2839,.34828,.3362,.2908,.19536,.09564,.03201,.0049,.0093,.06327,.1655,.2904,.43345,.5945,.7621,.9163,1.0263,1.0622,1.0026,.85445,.6424,.4479,.2835,.1649,.0874,.04677,.0227,.011359];
  const Y=[.000396,.00121,.004,.0116,.023,.038,.06,.09098,.13902,.20802,.323,.503,.71,.862,.954,.99495,.995,.952,.87,.757,.631,.503,.381,.265,.175,.107,.061,.032,.017,.00821,.004102];
  const Z=[.06785,.2074,.6456,1.3856,1.74706,1.77211,1.6692,1.28764,.81295,.46518,.272,.1582,.07825,.04216,.0203,.00875,.0039,.0021,.00165,.0011,.0008,.00034,.00019,.00005,.00002,0,0,0,0,0,0];
  const D=[49.31,56.51,60.03,57.82,74.82,87.25,90.61,91.37,95.09,91.96,95.72,96.61,97.13,102.1,100.75,102.31,100,97.74,98.92,93.5,97.71,99.29,99.07,95.75,98.9,95.71,98.24,103.06,99.19,87.43,91.66];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  const mixerStyle = `<style id="atlas-offline-mixer-style">
    .atlas-offline-mixer { margin-top: 1rem; }
    .atlas-offline-mixer summary { cursor: pointer; }
    .atlas-offline-mixer details[open] { position: fixed; z-index: 1000; top: 5.5rem; right: 1rem; width: min(680px, calc(100vw - 2rem)); max-height: calc(100vh - 6.5rem); overflow: auto; padding: 1.25rem; border: 1px solid #718498; border-radius: 12px; background: #171f2a; color: #f4f7fb; box-shadow: 0 12px 36px #000b; box-sizing: border-box; }
    .atlas-offline-mixer details[open] summary { position: sticky; top: -1.25rem; z-index: 1; margin: -1.25rem -1.25rem 1rem; padding: 1rem 1.25rem; background: #202b39; font-weight: 700; }
    .atlas-offline-mixer label { display: block; margin: .75rem 0; }
    .atlas-offline-mixer input[type=file] { display: block; max-width: 100%; margin-top: .3rem; }
    .atlas-offline-mixer [data-result] section { margin-top: 1.25rem; padding: 1rem; border: 1px solid #394757; border-radius: 8px; }
    .atlas-offline-mixer [data-result] h4 { margin: 0 0 .75rem; line-height: 1.4; }
    .atlas-offline-mixer [data-result] li { margin: .5rem 0; overflow-wrap: anywhere; }
    .atlas-offline-mixer [data-result] small { display: block; margin: .2rem 0 .5rem; color: #c4d0df; line-height: 1.5; overflow-wrap: anywhere; }
    .atlas-offline-mixer [data-result] p { padding: .8rem; border-left: 3px solid #a4f764; line-height: 1.5; }
    .atlas-offline-mixer .mix-before-after { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; margin: .75rem 0; }
    .atlas-offline-mixer .mix-swatch { height: 80px; border: 1px solid #9aa7b5; border-radius: 5px; }
    .atlas-offline-mixer .mix-before-after figcaption { margin-top: .35rem; font-size: .85rem; overflow-wrap: anywhere; }
    @media(max-width:460px) { .atlas-offline-mixer details[open] { top: .5rem; max-height: calc(100vh - 1rem); } }
  </style>`;
  const clamp=x=>Math.min(.999999,Math.max(.000001,x));
  const ks=r=>(1-clamp(r))**2/(2*clamp(r));
  const refl=k=>Math.max(0,Math.min(1,1+k-Math.sqrt(k*k+2*k)));
  function lab(r){
    const sum=(a,b)=>a.reduce((v,n,i)=>v+n*D[i]*b[i],0), den=sum(Array(31).fill(1),Y), f=t=>t>(6/29)**3?Math.cbrt(t):t/(3*(6/29)**2)+4/29;
    const xx=f(sum(r,X)/sum(Array(31).fill(1),X)),yy=f(sum(r,Y)/den),zz=f(sum(r,Z)/sum(Array(31).fill(1),Z));
    return [116*yy-16,500*(xx-yy),200*(yy-zz)];
  }
  const de=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  function previewHex(r){
    const sum=(cmf)=>r.reduce((v,n,i)=>v+n*D[i]*cmf[i],0);
    const yWhite=D.reduce((v,n,i)=>v+n*Y[i],0);
    const xyz=[sum(X)/yWhite,sum(Y)/yWhite,sum(Z)/yWhite];
    const matrix=[[3.2406,-1.5372,-.4986],[-.9689,1.8758,.0415],[.0557,-.204,1.057]];
    return '#'+matrix.map(row=>{
      const linear=row.reduce((v,n,i)=>v+n*xyz[i],0);
      const clipped=Math.max(0,Math.min(1,linear));
      const encoded=clipped<=.0031308?12.92*clipped:1.055*clipped**(1/2.4)-.055;
      return Math.round(encoded*255).toString(16).padStart(2,'0');
    }).join('').toUpperCase();
  }
  async function digest(file){const b=await file.arrayBuffer(),h=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  function spectrum(values){if(!Array.isArray(values)||values.length!==31||values.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('Invalid 400–700 nm spectrum');return values}
  async function load(atlasFile,chsosFile){
    if(await digest(atlasFile)!==ATLAS_SHA||await digest(chsosFile)!==CHSOS_SHA)throw Error('Dataset SHA-256 mismatch. Use the verified atlas and CHSOS pilot files.');
    const atlas=new Map();
    for(const line of (await atlasFile.text()).split(/\r?\n/)){
      if(!line.trim())continue;
      const match=line.match(/^"(H\d{3}_L\d{3}_C\d{3})"\s+(.+)$/), values=match?.[2].trim().split(/\s+/).map(Number);
      if(!match||values.length!==36||values.some(v=>!Number.isFinite(v)||v<0||v>1)||atlas.has(match[1]))throw Error('Invalid atlas spectrum row');
      atlas.set(match[1],spectrum(values.slice(2,33)));
    }
    if(atlas.size!==13283)throw Error('Atlas must have 13,283 unique references');
    const model=JSON.parse(await chsosFile.text());
    if(model.registry?.atlas_master_sha256!==MASTER_SHA||model.basis_registry?.length!==87)throw Error('CHSOS dataset/master mismatch');
    const bases=model.basis_registry.filter(b=>['CHSOS','CHSOS_GORGIAS_FORS'].includes(b.source_family)&&!b.basis_id.startsWith('PAINTMIXING_KIMERA_')).map(b=>({id:b.basis_id,name:b.sample_title,ks:spectrum(b.reflectance_400_700).map(ks),opacity_marker:'UNKNOWN',opacity_source:null,opacity_note:opacityNotes[b.basis_id]?.note||null,opacity_note_source:opacityNotes[b.basis_id]?.source||null}));
    if(bases.length!==84||new Set(bases.map(b=>b.id)).size!==84)throw Error('Unexpected CHSOS basis');
    return {atlas,bases};
  }
  function evaluate(target,parts,whiteBase,whiteFraction){
    if(whiteFraction)parts=[...parts.map(p=>({base:p.base,weight:p.weight*(1-whiteFraction)})),{base:whiteBase,weight:whiteFraction}];
    const total=parts.reduce((s,p)=>s+p.weight,0);
    const predicted=target.map((_,i)=>refl(parts.reduce((s,p)=>s+p.weight*p.base.ks[i],0)/total));
    const rmse=Math.sqrt(predicted.reduce((s,v,i)=>s+(v-target[i])**2,0)/31);
    return {parts,rmse,de76:de(lab(predicted),lab(target)),preview_hex:previewHex(predicted)};
  }
  function solve(data,reference,options={}){
    const target=data.atlas.get(reference);if(!target)throw Error('PKL reference missing from atlas spectrum file');
    const whiteFraction=options.whiteFraction||0;
    if(![0,.05,.10].includes(whiteFraction))throw Error('Supported white fractions: 0%, 5%, 10%');
    const whiteBase=whiteFraction?data.bases.find(b=>b.id===WHITE_ID):null;
    if(whiteFraction&&!whiteBase)throw Error('CHSOS PW6 anatase white missing');
    const candidates=whiteFraction?data.bases.filter(b=>b!==whiteBase):data.bases;
    // Spectral shortlist, then bounded 1–3-component grid/refinement; model weights are not dispense masses.
    const singles=candidates.map(base=>evaluate(target,[{base,weight:1}],whiteBase,whiteFraction)).sort((a,b)=>a.rmse-b.rmse);
    let best=singles[0];const top=singles.slice(0,12).map(x=>x.parts[0].base);
    for(let i=0;i<top.length;i++)for(const b of candidates){
      if(b===top[i])continue;
      for(let step=1;step<20;step++){
        const trial=evaluate(target,[{base:top[i],weight:step/20},{base:b,weight:1-step/20}],whiteBase,whiteFraction);
        if(trial.rmse<best.rmse)best=trial;
      }
    }
    const leaders=[best.parts[0].base,...top.slice(0,6)];
    for(const a of leaders)for(const b of top)for(const c of top){
      if(a===b||a===c||b===c)continue;
      for(let i=1;i<10;i++)for(let j=1;j<10-i;j++){
        const trial=evaluate(target,[{base:a,weight:i/10},{base:b,weight:j/10},{base:c,weight:(10-i-j)/10}],whiteBase,whiteFraction);
        if(trial.rmse<best.rmse)best=trial;
      }
    }
    return {reference,white_fraction:whiteFraction,rmse:best.rmse,de76:best.de76,preview_hex:best.preview_hex,recipe:best.parts.map(p=>({basis_id:p.base.id,name:p.base.name,fraction:p.weight,opacity_marker:p.base.opacity_marker||'UNKNOWN',opacity_source:p.base.opacity_source||null,opacity_note:p.base.opacity_note||null,opacity_note_source:p.base.opacity_note_source||null})),opacity_status:'NOT_VERIFIED',measured_qc_status:'NOT_MEASURED',selection_metric:'SPECTRAL_RMSE_HEURISTIC'};
  }
  function mount(){
    if(!document.getElementById('atlas-offline-mixer-style'))document.head.insertAdjacentHTML('beforeend',mixerStyle);
    for(const parent of document.querySelectorAll('#selection,#wheel-selection')){
      const legacy=parent.querySelector('details.basis23-recipe');
      if(legacy?.textContent.includes('PAINTMIXING_KIMERA_')){
        const notice=document.createElement('section');
        notice.className='basis23-recipe';
        notice.setAttribute('role','status');
        notice.innerHTML='<strong>Legacy Basis-23 recipe withheld</strong><p>This stored recipe contains a KIMERA basis paint. KIMERA is excluded from the CHSOS pilot. Its proportions and ΔE00 cannot be reused as a CHSOS-only recipe. Use the offline CHSOS mixer below for a separate computational candidate.</p>';
        legacy.replaceWith(notice);
      }
      const terms=[...parent.querySelectorAll('dl dt')];
      const ref=terms.find(term=>['Exact identity','Exact PKL identity'].includes(term.textContent.trim()))?.nextElementSibling?.textContent?.trim();
      if(!/^H\d{3}_L\d{3}_C\d{3}$/.test(ref))continue;
      const old=parent.querySelector('.atlas-offline-mixer');if(old?.dataset.reference===ref)continue;old?.remove();
      const section=document.createElement('section');section.className='atlas-offline-mixer';section.dataset.reference=ref;
      section.innerHTML=`<details><summary>Offline pigment mixer · ${esc(ref)}</summary><p>Choose the verified atlas .rs and CHSOS research JSON. Files are read locally in this browser.</p><label>Atlas spectra <input data-atlas type="file" accept=".rs"></label> <label>CHSOS pigment data <input data-chsos type="file" accept=".json"></label> <button type="button" data-calculate>Calculate candidate</button><div data-result role="status">No mixture calculated.</div></details>`;
      parent.append(section);
      section.querySelector('[data-calculate]').onclick=async()=>{
        const box=section.querySelector('[data-result]'), af=section.querySelector('[data-atlas]').files[0],cf=section.querySelector('[data-chsos]').files[0];
        if(!af||!cf){box.textContent='Select both local data files.';return}
        box.textContent='Checking files and calculating…';await new Promise(resolve=>setTimeout(resolve,0));
        try{
          const data=await load(af,cf),results=[0,.05,.10].map(whiteFraction=>solve(data,ref,{whiteFraction}));
          const hex=terms.find(term=>term.textContent.trim()==='HEX')?.nextElementSibling?.textContent?.trim();
          if(!/^#[0-9a-f]{6}$/i.test(hex))throw Error('Selected PKL HEX unavailable');
          box.innerHTML=results.map(result=>`<section><h4>PW6 anatase white ${(result.white_fraction*100).toFixed(0)}% · spectral RMSE ${result.rmse.toFixed(5)} · ΔE76 ${result.de76.toFixed(2)}</h4><div class="mix-before-after"><figure><div class="mix-swatch" style="background:${esc(hex)}"></div><figcaption>Before · PKL reference ${esc(hex)}</figcaption></figure><figure><div class="mix-swatch" style="background:${esc(result.preview_hex)}"></div><figcaption>After · model preview ${esc(result.preview_hex)}</figcaption></figure></div><ol>${result.recipe.map(p=>`<li>${esc(p.name)} · ${(p.fraction*100).toFixed(1)}% <small>${esc(p.basis_id)} · basis paint opacity: ${esc(p.opacity_marker)}${p.opacity_note?` · CHSOS qualitative note: ${esc(p.opacity_note)} <a href="${esc(p.opacity_note_source)}" target="_blank" rel="noopener noreferrer">CHSOS source</a>`:''}</small></li>`).join('')}</ol></section>`).join('')+'<p>Screen previews are approximate model colours, not measured wet or dry paint. White fractions are model weights, not dispensing instructions. Qualitative CHSOS notes are not opacity ratings. Mixture opacity: NOT VERIFIED · physical QC: NOT MEASURED.</p>';
        }catch(e){box.textContent=`Mixer unavailable: ${e.message}`}
      };
    }
  }
  if(typeof module==='object'&&module.exports)module.exports={load,solve,lab};
  else {new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount()}
})(typeof window==='undefined'?globalThis:window);
