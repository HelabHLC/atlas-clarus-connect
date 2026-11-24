/**
 * Open DCM Print Adapter: actual profile-bound 4C separation (research draft).
 * Calls the existing browser-bundle print-preview-worker.js
 * reference-separation operation: real LittleCMS, 16-bit CMYK device values.
 * No fabricated output. No RIP control, substrate simulation or print approval.
 */
import { requireCataloguedOutputProfile } from './icc-catalog-guard.mjs';
import { createEmbeddedIccWorkerUrl } from './browser-icc-integration.mjs';
import { PRINT_ADAPTER_FORMAT, PRINT_ADAPTER_VERSION } from './print-adapter-contract.mjs';

const SHA=/^[a-f0-9]{64}$/;
const INTENTS=['Perceptual','Relative colorimetric','Saturation','Absolute colorimetric'];
const ORDER=['C','M','Y','K'];
function check(ok,message){ if(!ok) throw new TypeError(message); }
function rgb8(x){return Array.isArray(x)&&x.length===3&&x.every(v=>Number.isInteger(v)&&v>=0&&v<=255);}
function cmyk8(x){return Array.isArray(x)&&x.length===4&&x.every(v=>Number.isInteger(v)&&v>=0&&v<=255);}
function same(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>v===b[i]);}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}

/**
 * Optional comparison is a separate binding, not an independent algorithm.
 * Expected: {profileSha256,sourceRgb,deviceCmyk8,intent,bpc,
 *            binding:'Pillow ImageCms / system LittleCMS'}.
 */
export async function runPrintAdapter4C({
  preparation, catalog, profileId, profileBytes, workerUrl = null,
  intent = 'Relative colorimetric', bpc = false,
  secondBinding = null, tolerance8 = 2
}) {
  check(preparation?.format===PRINT_ADAPTER_FORMAT &&
    preparation.version===PRINT_ADAPTER_VERSION &&
    preparation.status==='PREPARATION_ONLY' &&
    preparation.topology==='PARALLEL_FROM_SAME_FROZEN_REFERENCE',
    'Valid Open DCM preparation record required');
  check(preparation.source?.system==='ATLAS Clarus' &&
    preparation.source.identity_status==='DECLARED_REQUIRES_MASTER_LOOKUP' &&
    /^H\d{3}_L\d{3}_C\d{3}$/.test(preparation.source.hlc??'') &&
    Number.isInteger(preparation.source.atlas_row_id) &&
    preparation.source.atlas_row_id>=0 && preparation.source.atlas_row_id<=13282 &&
    SHA.test(preparation.source.master_sha256??'') &&
    preparation.source.colour_space==='sRGB' &&
    rgb8(preparation.source.rgb8),
    'A declared original sRGB/HLC identity is required; identity is NOT verified by this function');
  check(Array.isArray(preparation.production_paths) &&
    preparation.production_paths.length>=1 && preparation.production_paths.length<=2 &&
    new Set(preparation.production_paths.map(x=>x.path_id)).size===preparation.production_paths.length &&
    preparation.production_paths.every(x=>['4C','ECG'].includes(x.path_id)),
    'Invalid output path list');
  check(preparation.production_paths.every(x=>
    x.source_atlas_row_id===preparation.source.atlas_row_id &&
    x.input_from_path===null &&
    x.expected_device_space===(x.path_id==='4C'?'CMYK':'7CLR') &&
    x.calculation_status==='NOT_CALCULATED' &&
    x.device_values===null && x.predicted_lab===null && x.delta_e00===null &&
    x.output_profile_sha256===null &&
    x.measurement_status==='NOT_MEASURED' && x.production_approval==='NOT_GRANTED'),
    'Every path must start uncalculated, unmeasured and without approval');
  const current=preparation.production_paths.find(x=>x.path_id==='4C');
  check(current && current.source_atlas_row_id===preparation.source.atlas_row_id &&
    current.input_from_path===null && current.expected_device_space==='CMYK' &&
    current.calculation_status==='NOT_CALCULATED' &&
    current.device_values===null && current.predicted_lab===null && current.delta_e00===null &&
    current.output_profile_sha256===null &&
    current.measurement_status==='NOT_MEASURED' && current.production_approval==='NOT_GRANTED',
    'The 4C branch must be uncalculated, unmeasured and independently sourced');
  check(typeof current.substrate==='string'&&current.substrate.trim()!=='',
    'A declared substrate label is required (not a substrate simulation)');
  check(INTENTS.includes(intent)&&typeof bpc==='boolean',
    'A supported rendering intent and explicit BPC boolean are required');
  check(profileBytes instanceof Uint8Array && profileBytes.length>=132 &&
    profileBytes.length<=16*1024*1024, 'Actual ICC profile bytes required');
  check(globalThis.crypto?.subtle && typeof Worker==='function',
    'Secure browser with SubtleCrypto and Worker required');

  const digest=await crypto.subtle.digest('SHA-256',profileBytes);
  const sha=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  const profile=requireCataloguedOutputProfile(catalog,profileId,sha,profileBytes.length);
  check(profile.outputPath==='4C','This integration supports catalogued CMYK profiles only');
  check(typeof profile.printingCondition==='string' && !!profile.printingCondition.trim(),
    'Catalog must describe the printing condition');
  check(current.printing_condition===null||current.printing_condition===profile.printingCondition,
    'Prepared printing condition disagrees with catalogued ICC condition');

  if(secondBinding!==null){
    check(secondBinding && secondBinding.binding==='Pillow ImageCms / system LittleCMS' &&
      secondBinding.profileSha256===sha &&
      same(secondBinding.sourceRgb,preparation.source.rgb8) &&
      cmyk8(secondBinding.deviceCmyk8) &&
      secondBinding.intent===intent && secondBinding.bpc===bpc &&
      Number.isInteger(tolerance8)&&tolerance8>=0&&tolerance8<=5,
      'Invalid/mismatched second-binding reference');
  }

  const url=workerUrl||createEmbeddedIccWorkerUrl();
  let worker;
  try {
    worker=new Worker(url);
    const result=await new Promise((resolve,reject)=>{
      let completed=false;
      const settle=(fn,value)=>{if(completed)return;completed=true;clearTimeout(timeout);fn(value);};
      const timeout=setTimeout(()=>settle(reject,new Error('LittleCMS 4C separation timed out')),30000);
      worker.onmessage=({data})=>{
        if(data?.type==='reference-result')settle(resolve,data.result);
        if(data?.type==='error')settle(reject,new Error(String(data.message??'ICC worker failed')));
      };
      worker.onerror=e=>settle(reject,new Error(e.message||'ICC worker error'));
      worker.onmessageerror=()=>settle(reject,new Error('ICC message decoding error'));
      try {worker.postMessage({
        operation:'reference-separation',path:'4C',
        rgb:[...preparation.source.rgb8], profile:profileBytes,
        intent,bpc,channelOrder:['C','M','Y','K']
      });}catch(e){settle(reject,e);}
    });
    check(result?.path==='4C' && result.channels===4 &&
      same(result.channel_order,ORDER) &&
      result.method==='SRGB_TO_DEVICE16' &&
      typeof result.engine==='string'&&result.engine.startsWith('LittleCMS') &&
      result.intent===intent && result.bpc===bpc &&
      result.measured_qc==='NOT_MEASURED' &&
      result.production_approval==='NOT_PROVIDED' &&
      Array.isArray(result.device_values_16bit) &&
      result.device_values_16bit.length===4 &&
      result.device_values_16bit.every(v=>Number.isInteger(v)&&v>=0&&v<=65535) &&
      Array.isArray(result.device_values_normalized) &&
      result.device_values_normalized.length===4 &&
      result.device_values_normalized.every((v,i)=>typeof v==='number' &&
        Math.abs(v-result.device_values_16bit[i]/65535)<1e-7),
      'Unexpected device16 LittleCMS result; calculation discarded');

    const produced8=result.device_values_16bit.map(v=>Math.round(v/257));
    let comparison={status:'NOT_PROVIDED',note:'No second-binding comparison; no physical proof'};
    if(secondBinding){
      const errors=produced8.map((v,i)=>Math.abs(v-secondBinding.deviceCmyk8[i]));
      comparison={status:errors.every(v=>v<=tolerance8)?'PASS':'FAIL',
        method:'Pillow ImageCms / system LittleCMS vs browser lcms-wasm; NOT algorithmically independent',
        expected_cmyk8:[...secondBinding.deviceCmyk8],computed_cmyk8:produced8,
        absolute_channel_errors:errors,tolerance8};
      if(comparison.status!=='PASS')throw new Error('Second-binding CMYK comparison failed; no validated handoff exported');
    }

    const output={
      ...current, printing_condition:profile.printingCondition,
      output_profile_id:profile.profileId,
      output_profile_sha256:sha,
      rendering_intent:intent,black_point_compensation:bpc,
      calculation_status:'ICC_4C_DEVICE16_CALCULATED_NOT_PROOFED',
      device_values:result.device_values_16bit.map(v=>v),
      device_value_encoding:'UINT16_CMYK',
      device_values_normalized:result.device_values_normalized.map(v=>v),
      channel_order:[...ORDER],
      predicted_lab:null,delta_e00:null,
      measurement_status:'NOT_MEASURED',production_approval:'NOT_GRANTED',
      calculation_evidence:{
        engine:result.engine,method:result.method,
        profile_sha256:sha,
        source_rgb8:[...preparation.source.rgb8],
        second_binding:comparison,
        source_identity_verified:false,
        physical_proof_measured:false
      }
    };
    return freeze({
      ...preparation,
      status:'ICC_4C_CALCULATED_NOT_PROOFED',
      source:{...preparation.source},
      production_paths:preparation.production_paths.map(x=>x.path_id==='4C'?
        output:JSON.parse(JSON.stringify(x)))
    });
  } finally {
    if(worker)worker.terminate();
    if(!workerUrl) URL.revokeObjectURL(url);
  }
}
