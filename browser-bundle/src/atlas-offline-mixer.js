(function (root) {
  'use strict';
  // Pilot: a local, opt-in spectral recipe search. No source spectra ship with the bundle.
  const ATLAS_SHA = 'dfcac10e5cbe8401b438063294e5230145f155afe1cf7bb1cdb45541d5e78fe5';
  const CHSOS_SHA = 'd102c1f320ce080bfe84fe3f3c0bf255ddb53497ca90c65b19163df047524059';
  const MASTER_SHA = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  const X=[.01431,.04351,.13438,.2839,.34828,.3362,.2908,.19536,.09564,.03201,.0049,.0093,.06327,.1655,.2904,.43345,.5945,.7621,.9163,1.0263,1.0622,1.0026,.85445,.6424,.4479,.2835,.1649,.0874,.04677,.0227,.011359];
  const Y=[.000396,.00121,.004,.0116,.023,.038,.06,.09098,.13902,.20802,.323,.503,.71,.862,.954,.99495,.995,.952,.87,.757,.631,.503,.381,.265,.175,.107,.061,.032,.017,.00821,.004102];
  const Z=[.06785,.2074,.6456,1.3856,1.74706,1.77211,1.6692,1.28764,.81295,.46518,.272,.1582,.07825,.04216,.0203,.00875,.0039,.0021,.00165,.0011,.0008,.00034,.00019,.00005,.00002,0,0,0,0,0,0];
  const D=[49.31,56.51,60.03,57.82,74.82,87.25,90.61,91.37,95.09,91.96,95.72,96.61,97.13,102.1,100.75,102.31,100,97.74,98.92,93.5,97.71,99.29,99.07,95.75,98.9,95.71,98.24,103.06,99.19,87.43,91.66];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  const clamp=x=>Math.min(.999999,Math.max(.000001,x));
  const ks=r=>(1-clamp(r))**2/(2*clamp(r));
  const refl=k=>Math.max(0,Math.min(1,1+k-Math.sqrt(k*k+2*k)));
  function lab(r){
    const sum=(a,b)=>a.reduce((v,n,i)=>v+n*D[i]*b[i],0), den=sum(Array(31).fill(1),Y), f=t=>t>(6/29)**3?Math.cbrt(t):t/(3*(6/29)**2)+4/29;
    const xx=f(sum(r,X)/sum(Array(31).fill(1),X)),yy=f(sum(r,Y)/den),zz=f(sum(r,Z)/sum(Array(31).fill(1),Z));
    return [116*yy-16,500*(xx-yy),200*(yy-zz)];
  }
  const de=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
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
    const bases=model.basis_registry.filter(b=>['CHSOS','CHSOS_GORGIAS_FORS'].includes(b.source_family)&&!b.basis_id.startsWith('PAINTMIXING_KIMERA_')).map(b=>({id:b.basis_id,name:b.sample_title,ks:spectrum(b.reflectance_400_700).map(ks),opacity_marker:'UNKNOWN',opacity_source:null}));
    if(bases.length!==84||new Set(bases.map(b=>b.id)).size!==84)throw Error('Unexpected CHSOS basis');
    return {atlas,bases};
  }
  function evaluate(target,parts){
    const total=parts.reduce((s,p)=>s+p.weight,0);
    const predicted=target.map((_,i)=>refl(parts.reduce((s,p)=>s+p.weight*p.base.ks[i],0)/total));
    const rmse=Math.sqrt(predicted.reduce((s,v,i)=>s+(v-target[i])**2,0)/31);
    return {parts,rmse,de76:de(lab(predicted),lab(target))};
  }
  function solve(data,reference){
    const target=data.atlas.get(reference);if(!target)throw Error('PKL reference missing from atlas spectrum file');
    // Spectral shortlist, then bounded 1–3-component grid/refinement; model weights are not dispense masses.
    const singles=data.bases.map(base=>evaluate(target,[{base,weight:1}])).sort((a,b)=>a.rmse-b.rmse);
    let best=singles[0];const top=singles.slice(0,12).map(x=>x.parts[0].base);
    for(let i=0;i<top.length;i++)for(const b of data.bases){
      if(b===top[i])continue;
      for(let step=1;step<20;step++){
        const trial=evaluate(target,[{base:top[i],weight:step/20},{base:b,weight:1-step/20}]);
        if(trial.rmse<best.rmse)best=trial;
      }
    }
    const leaders=[best.parts[0].base,...top.slice(0,6)];
    for(const a of leaders)for(const b of top)for(const c of top){
      if(a===b||a===c||b===c)continue;
      for(let i=1;i<10;i++)for(let j=1;j<10-i;j++){
        const trial=evaluate(target,[{base:a,weight:i/10},{base:b,weight:j/10},{base:c,weight:(10-i-j)/10}]);
        if(trial.rmse<best.rmse)best=trial;
      }
    }
    return {reference,rmse:best.rmse,de76:best.de76,recipe:best.parts.map(p=>({basis_id:p.base.id,name:p.base.name,fraction:p.weight,opacity_marker:p.base.opacity_marker||'UNKNOWN',opacity_source:p.base.opacity_source||null})),opacity_status:'NOT_VERIFIED',measured_qc_status:'NOT_MEASURED',selection_metric:'SPECTRAL_RMSE_HEURISTIC'};
  }
  function mount(){
    for(const parent of document.querySelectorAll('#selection,#wheel-selection')){
      const terms=[...parent.querySelectorAll('dl dt')];
      const ref=terms.find(term=>term.textContent.trim()==='Exact identity')?.nextElementSibling?.textContent?.trim();
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
          const result=solve(await load(af,cf),ref);
          box.innerHTML=`<p>Computed candidate · spectral RMSE ${result.rmse.toFixed(5)} · ΔE76 ${result.de76.toFixed(2)}</p><ol>${result.recipe.map(p=>`<li>${esc(p.name)} · ${(p.fraction*100).toFixed(1)}% <small>${esc(p.basis_id)} · basis paint opacity: ${esc(p.opacity_marker)}${p.opacity_source?` · source: ${esc(p.opacity_source)}`:''}</small></li>`).join('')}</ol><p>Basis opacity UNKNOWN means no verified product rating. Mixture opacity: NOT VERIFIED · physical QC: NOT MEASURED. Model weights are not dispensing instructions.</p>`;
        }catch(e){box.textContent=`Mixer unavailable: ${e.message}`}
      };
    }
  }
  if(typeof module==='object'&&module.exports)module.exports={load,solve,lab};
  else {new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount()}
})(typeof window==='undefined'?globalThis:window);
