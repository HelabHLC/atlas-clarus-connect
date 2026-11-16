/* ATLAS Multi-Gamut Designer — offline FOGRA58 CSV adapter and independent UI.
 * Import only the published 13,283-row CSV; never infer physical printability.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
(function(){
'use strict';
const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
const ICC_SHA='fad691cc0f25e3d6a91942599755b7f9cf906b91f9e4f4834c3364e6c50a972d';
const CSV_SHA='cc0bd536bf500faebaac47e28ef37db8eb836d566b9d36c14b750467e58d8643';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const engine=window.ATLAS_MULTI_GAMUT,master=window.ATLAS_CLARUS_DATA;
if(!engine||!master||master.master_sha256!==MASTER){$('multi-gamut-status').textContent='Multi-Gamut unavailable: master or engine mismatch';return;}
let store,spectral;try{store=engine.create(master);spectral=window.ATLAS_SPECTRAL_BINDING.create(master);}catch(e){$('multi-gamut-status').textContent=e.message;return;}
store.registerLibrary('textile','TextileRGB');
store.registerProfile({id:'textilergb_fogra58_roundtrip_8bit',library_id:'textile',icc_sha256:ICC_SHA,description:'TextileRGB FOGRA58 ICC 2.4 / Lab PCS',method:'Lab to RGB to Lab, Pillow ImageCms/LittleCMS, 8-bit channels; CIEDE2000',intent:'relative colorimetric'});
const input=$('multi-gamut-file'),threshold=$('multi-gamut-threshold'),search=$('multi-gamut-reference');
const status=$('multi-gamut-status'),results=$('multi-gamut-results');
async function digest(buffer){const hash=await crypto.subtle.digest('SHA-256',buffer);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function render(){
  const t=Number(threshold.value);
  if(!Number.isFinite(t)||t<0||t>100){results.textContent='Invalid tolerance';return;}
  const q=store.query(['textilergb_fogra58_roundtrip_8bit'],t);
  const ref=search.value.trim().toUpperCase(),c=master.colors.find(x=>x.ref===ref);
  let html='<p><b>'+q.ids.length.toLocaleString()+' / 13,283</b> references at ΔE00 ≤ '+escape(t)+' (ICC roundtrip). '+(q.complete?'Complete dataset':'Incomplete dataset')+'.</p>';
  if(ref){
    if(!c)html+='<p>Unknown ATLAS reference.</p>';
    else{
      const m=store.memberships(c.id,t)[0];
      const spectrum=spectral.get(c.ref);
      html+='<p>Spectral master reference: '+(spectrum?'Available · '+spectrum.reflectance.length+' source samples · '+escape(spectrum.source.description):'Not imported / not verified')+'</p>'; if(spectrum){const w=spectrum.wavelength_nm,r=spectrum.reflectance;const pts=w.map((nm,i)=>((nm-380)/350*600).toFixed(2)+','+((1-r[i])*180).toFixed(2)).join(' ');html+='<svg role="img" aria-label="Reflectance curve 380 to 730 nanometers" viewBox="0 0 620 210" style="width:100%;max-width:720px;background:#111927"><path d="M0 0V180H600" fill="none" stroke="#b4becd"/><polyline points="'+pts+'" fill="none" stroke="#59dbd1" stroke-width="2.5"/><text x="4" y="202" fill="white">380 nm</text><text x="540" y="202" fill="white">730 nm</text><text x="8" y="14" fill="white">R(λ) 0–1</text></svg>';}
      html+='<p><b>'+escape(c.ref)+'</b> · '+(m.checked?'ΔE00 '+m.delta_e00.toFixed(5)+' · '+(m.within_tolerance?'Within selected tolerance':'Outside selected tolerance'):'Not checked')+'</p>';
      if(m.checked&&!m.within_tolerance){
        const alternatives=store.closest(c.id,['textilergb_fogra58_roundtrip_8bit'],t,5);
        html+='<p>Closest qualifying ATLAS alternatives (CIEDE2000 to target):</p><ol>'+alternatives.candidates.map(a=>'<li>'+escape(a.reference)+' · ΔE00 '+a.delta_e00_to_target.toFixed(3)+'</li>').join('')+'</ol>';
      }
    }
  }
  results.innerHTML=html+'<small>ICC calculation only. No substrate, printing, washing or measured QC evidence.</small>';
}
input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file)return;
  status.textContent='Checking CSV and profile provenance…';results.textContent='';
  try{
    const bytes=await file.arrayBuffer(),hash=await digest(bytes);
    if(hash!==CSV_SHA)throw Error('CSV SHA-256 differs from validated source; import rejected');
    const lines=new TextDecoder('utf-8',{fatal:true}).decode(bytes).trim().split(/\r?\n/);
    const header=lines.shift().split(','),refIndex=header.indexOf('ATLAS_Referenz'),deIndex=header.indexOf('DeltaE00_Roundtrip');
    if(refIndex<0||deIndex<0||lines.length!==13283)throw Error('Unexpected CSV schema or reference count');
    const rows=lines.map(line=>{const fields=line.split(',');return {reference:fields[refIndex],delta_e00:Number(fields[deIndex])};});
    if(rows.some(r=>!Number.isFinite(r.delta_e00)))throw Error('Invalid ΔE00');
    const imported=store.importResults('textilergb_fogra58_roundtrip_8bit',rows);
    if(!imported.complete)throw Error('Incomplete profile');
    status.textContent='Verified FOGRA58 CSV · 13,283 reference mappings · ICC-roundtrip only';
    render();
  }catch(e){status.textContent='Import failed: '+e.message;}
});
$('multi-gamut-spectral-file').addEventListener('change',async()=>{
 const file=$('multi-gamut-spectral-file').files?.[0];if(!file)return;
 try{
  const payload=JSON.parse(await file.text());
  const result=spectral.importSpectra(payload);
  $('multi-gamut-spectral-status').textContent='Spectral references imported: '+result.imported+' / 13,283. Source: '+payload.source.description;
  render();
 }catch(e){$('multi-gamut-spectral-status').textContent='Spectral import rejected: '+e.message;}
});
threshold.addEventListener('input',render);search.addEventListener('input',render);
status.textContent='Awaiting verified FOGRA58 CSV (SHA-256 '+CSV_SHA.slice(0,12)+'…)';
})();
