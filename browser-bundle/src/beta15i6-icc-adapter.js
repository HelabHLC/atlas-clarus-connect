/* beta15i.6 adapter for the existing multi-application LittleCMS worker.
 * The worker must actually calculate; this module never fabricates ICC outputs.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ATLAS_BETA15I6_ICC_ADAPTER=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const finite3=a=>a&&a.length===3&&Array.from(a).every(Number.isFinite);
function request({handoff,profileBytes}){
 if(handoff?.schema!=='ATLAS_BETA15I6_ADVICE_HANDOFF_V1'||handoff.status!=='READY_FOR_EXPLICIT_LEGACY_ADVICE'||!handoff.legacy_seed)throw Error('Legacy master handoff required');
 const rgb=handoff.legacy_seed.source_rgb;
 if(!Array.isArray(rgb)||rgb.length!==3||rgb.some(x=>!Number.isInteger(x)||x<0||x>255))throw Error('Valid sRGB8 required');
 if(!(profileBytes instanceof Uint8Array)||profileBytes.length<132||profileBytes.length>16777216)throw Error('Actual ICC bytes required');
 return {operation:'multi-compare',rgb:Uint8Array.from(rgb),profile:new Uint8Array(profileBytes)};
}
function result({handoff,workerResult,profileSha256}){
 if(handoff?.status!=='READY_FOR_EXPLICIT_LEGACY_ADVICE')throw Error('Master handoff required');
 if(typeof profileSha256!=='string'||!/^[a-f0-9]{64}$/.test(profileSha256))throw Error('Verified profile SHA-256 required');
 const r=workerResult;
 if(!r||r.method!=='SRGB8_TO_LAB_D50_TO_DEVICE16_TO_LAB_D50_ABSOLUTE_V1'||r.engine!=='LittleCMS 2.16 / lcms-wasm 1.0.5'||r.physical_approval!==false||r.bpc!==false||!Number.isInteger(r.channels)||![3,4,7].includes(r.channels)||!finite3(r.input_lab)||!finite3(r.output_lab)||r.device16?.length!==r.channels||r.preview_rgb?.length!==3)throw Error('Invalid actual LittleCMS worker result');
 const device=Array.from(r.device16),preview=Array.from(r.preview_rgb);
 if(device.some(x=>!Number.isInteger(x)||x<0||x>65535)||preview.some(x=>!Number.isInteger(x)||x<0||x>255))throw Error('Invalid ICC output values');
 return {schema:'ATLAS_BETA15I6_ICC_RESULT_V1',address:handoff.address,material_id:handoff.material_id,profile_sha256:profileSha256,method:r.method,engine:r.engine,
  input_lab_d50:Array.from(r.input_lab),output_lab_d50:Array.from(r.output_lab),device_values_16bit:device,display_srgb:preview,
  production_status:'NOT_MEASURED',physical_approval:false};
}
return Object.freeze({request,result});
});
