/* Optional spectral reference binding. Never derive reflectance from ICC/RGB/Lab.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ATLAS_SPECTRAL_BINDING=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
function create(master){
 if(!master||master.master_sha256!==MASTER||master.entry_count!==13283||!Array.isArray(master.colors)||master.colors.length!==13283)throw Error('Spectral binding: master mismatch');
 const ids=new Map(master.colors.map(c=>[c.ref,c.id])),spectra=new Map();
 if(ids.size!==13283)throw Error('Spectral binding: duplicate reference');
 function importSpectra(payload){
  if(!payload||payload.schema!=='ATLAS_SPECTRAL_REFERENCE_V1'||payload.master_sha256!==MASTER||!Array.isArray(payload.records)||!payload.source||typeof payload.source.description!=='string'||!payload.source.description.trim()||typeof payload.source.sha256!=='string'||!/^[a-f0-9]{64}$/.test(payload.source.sha256))throw Error('Spectral binding: invalid source provenance');
  const next=new Map();
  for(const r of payload.records){
   if(!r||typeof r.reference!=='string'||!ids.has(r.reference)||next.has(r.reference))throw Error('Spectral binding: unknown or duplicate reference');
   if(r.atlas_row_id!==ids.get(r.reference))throw Error('Spectral binding: identity mismatch');
   if(!Array.isArray(r.wavelength_nm)||!Array.isArray(r.reflectance)||r.wavelength_nm.length<2||r.wavelength_nm.length!==r.reflectance.length)throw Error('Spectral binding: invalid arrays');
   for(let i=0;i<r.wavelength_nm.length;i++){
    if(!Number.isFinite(r.wavelength_nm[i])||(i&&r.wavelength_nm[i]<=r.wavelength_nm[i-1])||!Number.isFinite(r.reflectance[i])||r.reflectance[i]<0||r.reflectance[i]>1)throw Error('Spectral binding: invalid sample');
   }
   next.set(r.reference,Object.freeze({reference:r.reference,atlas_row_id:r.atlas_row_id,wavelength_nm:[...r.wavelength_nm],reflectance:[...r.reflectance],source:payload.source}));
  }
  spectra.clear();for(const [k,v] of next)spectra.set(k,v);
  return {imported:spectra.size,complete:spectra.size===13283};
 }
 return Object.freeze({importSpectra,get:ref=>spectra.get(ref)||null,count:()=>spectra.size});
}
return Object.freeze({MASTER,create});
});
