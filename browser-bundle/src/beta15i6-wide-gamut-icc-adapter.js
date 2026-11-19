/* Strict wide-gamut handoff. Original source preserved; no sRGB proxy.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ATLAS_BETA15I6_WIDE_GAMUT_ADAPTER=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const triple=v=>Array.isArray(v)&&v.length===3&&v.every(x=>typeof x==='number'&&Number.isFinite(x));
function request({colour,profileBytes}){
 if(colour?.identity?.kind!=='DIGITAL_COLOUR'||!triple(colour.lab_d50_2deg))throw Error('Digital source with original Lab D50 required');
 if(colour.source?.kind==='RGB'&&!['display-p3','prophoto-rgb'].includes(colour.source.space))throw Error('Explicit P3 or ProPhoto source required');
 if(colour.source?.kind!=='RGB'&&colour.source?.kind!=='HLC')throw Error('Original source required');
 if(!(profileBytes instanceof Uint8Array)||profileBytes.length<132||profileBytes.length>16777216)throw Error('ICC bytes required');
 return {operation:'wide-gamut-compare',lab_d50:new Float64Array(colour.lab_d50_2deg),profile:new Uint8Array(profileBytes)};
}
function report({colour,workerResult,profileSha256,materialId}){
 if(colour?.identity?.kind!=='DIGITAL_COLOUR'||!triple(colour.lab_d50_2deg))throw Error('Digital source required');
 if(!/^[a-f0-9]{64}$/.test(profileSha256||'')||typeof materialId!=='string'||!materialId)throw Error('Profile hash and material required');
 const r=workerResult;
 if(r?.method!=='LAB_D50_TO_DEVICE16_TO_LAB_D50_ABSOLUTE_V1'||r.engine!=='LittleCMS 2.16 / lcms-wasm 1.0.5'||r.physical_approval!==false||r.bpc!==false||!triple(Array.from(r.input_lab||[]))||!triple(Array.from(r.output_lab||[]))||![3,4,7].includes(r.channels)||r.device16?.length!==r.channels)throw Error('Real worker result required');
 if(r.input_lab.some((v,i)=>Math.abs(v-colour.lab_d50_2deg[i])>1e-8))throw Error('Input Lab differs from source');
 const device=Array.from(r.device16);if(device.some(v=>!Number.isInteger(v)||v<0||v>65535))throw Error('Invalid device values');
 return {schema:'ATLAS_BETA15I6_WIDE_GAMUT_ICC_RESULT_V1',source:colour.source,address:colour.address,material_id:materialId,profile_sha256:profileSha256,
  input_lab_d50:Array.from(r.input_lab),output_lab_d50:Array.from(r.output_lab),device_values_16bit:device,method:r.method,
  production_status:'NOT_MEASURED',physical_approval:false};
}
return Object.freeze({request,report});
});
