/* beta15i.6 integration adapter — isolated; not loaded into Browser Edition yet.
 * Keeps digital colour identities distinct from master row IDs.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.ATLAS_BETA15I6_BRIDGE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function create({digitalContext,multiGamutStore}){
    if(!digitalContext||typeof digitalContext.resolve!=='function')throw Error('Digital HLC context required');
    if(!multiGamutStore||typeof multiGamutStore.memberships!=='function')throw Error('Multi-Gamut store required');
    function assess({source,material_id,application_id=null,threshold=1}){
      if(!source||typeof source!=='object')throw Error('Explicit colour source required');
      if(typeof material_id!=='string'||!/^[a-z0-9_-]{1,64}$/.test(material_id))throw Error('Explicit material_id required');
      if(application_id!==null&&(typeof application_id!=='string'||!/^[a-z0-9_-]{1,64}$/.test(application_id)))throw Error('Invalid application_id');
      if(typeof threshold!=='number'||!Number.isFinite(threshold)||threshold<0)throw Error('Invalid threshold');
      const colour=digitalContext.resolve(source);
      const identity=colour.identity;
      if(!identity||!['MASTER_REFERENCE','DIGITAL_COLOUR'].includes(identity.kind))throw Error('Unsupported identity');
      const isMaster=identity.kind==='MASTER_REFERENCE';
      if(isMaster&&!Number.isInteger(identity.atlas_row_id))throw Error('Invalid master row ID');
      if(!isMaster&&identity.atlas_row_id!==null)throw Error('Digital colour must not have a master row ID');
      const icc=isMaster?multiGamutStore.memberships(identity.atlas_row_id,threshold):[];
      return {
        schema:'ATLAS_BETA15I6_ASSESSMENT_V1',
        identity:{kind:identity.kind,atlas_row_id:isMaster?identity.atlas_row_id:null,digital_id:colour.digital_id,address:colour.address},
        source:colour.source,
        material_id,application_id,
        source_memberships:colour.digital_library_membership,
        master_library_memberships:colour.library_membership,
        computed_gamuts:Object.fromEntries(Object.entries(colour.representations).map(([space,r])=>[space,{in_gamut:r.in_gamut,preview_clipped:r.preview_clipped}])),
        icc_checks:icc,
        icc_status:!isMaster?'NOT_EVALUATED':icc.some(x=>x.checked)?'ICC_ROUNDTRIP_AVAILABLE':'NO_VERIFIED_PROFILE_RESULT',
        production_evidence:{status:'NOT_VERIFIED_FOR_SELECTED_MATERIAL',material_id,application_id},
        alternatives:{status:'NOT_EVALUATED',candidates:[]},
        warnings:['Digital gamut membership is not physical production approval','No material-specific production evidence has been supplied']
      };
    }
    return Object.freeze({assess});
  }
  return Object.freeze({create});
});
