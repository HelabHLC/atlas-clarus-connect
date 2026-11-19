/* beta15i.6 read-only handoff into existing colour advice.
 * No automatic acceptance, profile selection, ICC calculation or print approval.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.ATLAS_BETA15I6_COLOUR_ADVICE_HANDOFF=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MASTER='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
 function prepare({assessment,master,sourceRgb=null}){
   if(!assessment||assessment.schema!=='ATLAS_BETA15I6_ASSESSMENT_V1')throw Error('Valid integration assessment required');
   if(!master||master.master_sha256!==MASTER||master.colors?.length!==13283)throw Error('Verified master required');
   const identity=assessment.identity;
   if(!identity||!['MASTER_REFERENCE','DIGITAL_COLOUR'].includes(identity.kind))throw Error('Invalid colour identity');
   if(typeof assessment.material_id!=='string'||!assessment.material_id)throw Error('Material required');
   if(identity.kind==='DIGITAL_COLOUR'){
     if(identity.atlas_row_id!==null)throw Error('Digital colour cannot carry master row ID');
     return Object.freeze({schema:'ATLAS_BETA15I6_ADVICE_HANDOFF_V1',status:'DIGITAL_COLOUR_REQUIRES_SEPARATE_ADVICE_PATH',address:identity.address,
       material_id:assessment.material_id,legacy_seed:null,production_status:'NOT_VERIFIED'});
   }
   const id=identity.atlas_row_id;
   const row=master.colors[id];
   if(!Number.isInteger(id)||!row||row.id!==id||row.ref!==identity.address)throw Error('Master reference identity mismatch');
   if(!Array.isArray(row.rgb)||row.rgb.length!==3)throw Error('Master RGB unavailable');
   const rgb=sourceRgb===null?row.rgb:sourceRgb;
   if(!Array.isArray(rgb)||rgb.length!==3||rgb.some(n=>!Number.isInteger(n)||n<0||n>255))throw Error('Invalid original sRGB8');
   // Existing advice's atlas_reference and recorded_srgb are deliberately distinct.
   const kind=sourceRgb===null?'atlas_reference':'recorded_srgb';
   return Object.freeze({
     schema:'ATLAS_BETA15I6_ADVICE_HANDOFF_V1',status:'READY_FOR_EXPLICIT_LEGACY_ADVICE',
     address:row.ref,material_id:assessment.material_id,
     legacy_seed:{kind,reference_id:id,source_rgb:[...rgb],assignment:null},
     selected_library:null,selected_icc:null,accepted_replacement:null,
     production_status:'NOT_VERIFIED'
   });
 }
 return Object.freeze({prepare});
});
