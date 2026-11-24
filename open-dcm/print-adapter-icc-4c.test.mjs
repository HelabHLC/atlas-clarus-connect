import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createColourRecord } from './reference-record.mjs';
import { createPrintAdapterPreparation } from './print-adapter-contract.mjs';
import { runPrintAdapter4C } from './print-adapter-icc-4c.mjs';

const M='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
const bytes=new Uint8Array(132).fill(7);
const rgb=[232,104,42];
const values=[0,25700,51400,65535];
const normalized=values.map(v=>Number((v/65535).toFixed(8)));
const masterDocument={master_sha256:M,colors:Array.from({length:13283},(_,id)=>({id,ref:'fixture',rgb:[0,0,0]}))};
masterDocument.colors[100]={id:100,ref:'H050_L060_C075',rgb:[...rgb]};
const make=()=>createPrintAdapterPreparation({
  colourRecord:createColourRecord({hlcAddress:'H050_L060_C075',sourceRgb:rgb}),
  masterSha256:M,atlasRowId:100,paths:['4C','ECG'],
  contextByPath:{'4C':{printing_condition:'fixture condition',substrate:'fixture substrate'}}
});
const workerResult=()=>({
  path:'4C',channels:4,channel_order:['C','M','Y','K'],
  device_values_16bit:[...values],device_values_normalized:[...normalized],
  engine:'LittleCMS 2.16 / lcms-wasm 1.0.5',
  method:'SRGB_TO_DEVICE16',
  intent:'Relative colorimetric',bpc:false,
  measured_qc:'NOT_MEASURED',production_approval:'NOT_PROVIDED'
});
async function runMock(overrides={},editWorker=x=>x){
  const originalWorker=globalThis.Worker,originalCrypto=globalThis.crypto;
  const digest=await webcrypto.subtle.digest('SHA-256',bytes);
  const sha=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  const catalog={schema:'ATLAS_LIBRARY_ICC_CATALOG_V1',profiles:{
    fixture:{device_class:'prtr',output_path:'4C',beta:false,sha256:sha,bytes:bytes.length,printing_condition:'fixture condition'},
    ecg:{device_class:'prtr',output_path:'ECG',beta:false,sha256:sha,bytes:bytes.length,printing_condition:'fixture condition'}
  }};
  let didTerminate=false;
  class FakeWorker{
    constructor(url){assert.equal(url,'fixture-worker');}
    postMessage(data){
      assert.equal(data.operation,'reference-separation');
      assert.equal(data.path,'4C');
      assert.deepEqual(data.rgb,rgb);
      assert.deepEqual([...data.profile],[...bytes]);
      queueMicrotask(()=>this.onmessage({data:{type:'reference-result',result:editWorker(workerResult())}}));
    }
    terminate(){didTerminate=true;}
  }
  try{
    Object.defineProperty(globalThis,'crypto',{configurable:true,value:webcrypto});
    globalThis.Worker=FakeWorker;
    const result=await runPrintAdapter4C({
      preparation:make(),masterDocument,catalog,profileId:'fixture',profileBytes:bytes,
      workerUrl:'fixture-worker',
      ...overrides
    });
    return {result,didTerminate,sha};
  }finally{
    if(originalWorker===undefined)delete globalThis.Worker;
    else globalThis.Worker=originalWorker;
    if(originalCrypto===undefined)delete globalThis.crypto;
    else Object.defineProperty(globalThis,'crypto',{configurable:true,value:originalCrypto});
  }
}

test('worker 4C output is attached, ECG stays untouched and no print approval is claimed',async()=>{
  const {result,didTerminate,sha}=await runMock();
  assert.equal(didTerminate,true);
  assert.equal(result.status,'ICC_4C_CALCULATED_NOT_PROOFED');
  assert.equal(result.source.identity_status,'MASTER_ROW_RGB_CROSSCHECK_PASS');
  const c=result.production_paths.find(p=>p.path_id==='4C');
  const e=result.production_paths.find(p=>p.path_id==='ECG');
  assert.equal(c.output_profile_sha256,sha);
  assert.deepEqual(c.device_values,values);
  assert.equal(c.device_value_encoding,'UINT16_CMYK');
  assert.deepEqual(c.channel_order,['C','M','Y','K']);
  assert.equal(c.calculation_evidence.second_binding.status,'NOT_PROVIDED');
  assert.equal(c.calculation_evidence.source_identity_verified,true);
  assert.equal(c.delta_e00,null);
  assert.equal(c.predicted_lab,null);
  assert.equal(c.measurement_status,'NOT_MEASURED');
  assert.equal(c.production_approval,'NOT_GRANTED');
  assert.equal(e.calculation_status,'NOT_CALCULATED');
  assert.equal(e.device_values,null);
  assert.equal(e.production_approval,'NOT_GRANTED');
  assert.ok(Object.isFrozen(result));
});
test('Pillow comparison is labelled as a second LittleCMS binding, not independent algorithm',async()=>{
  const digest=await webcrypto.subtle.digest('SHA-256',bytes);
  const sha=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  const {result}=await runMock({secondBinding:{
    binding:'Pillow ImageCms / system LittleCMS',
    profileSha256:sha,sourceRgb:rgb,deviceCmyk8:[0,100,200,255],
    intent:'Relative colorimetric',bpc:false
  }});
  const c=result.production_paths[0];
  assert.equal(c.calculation_evidence.second_binding.status,'PASS');
  assert.match(c.calculation_evidence.second_binding.method,/NOT algorithmically independent/);
});
test('wrong ICC catalog profile, source RGB or printing condition fail closed',async()=>{
  await assert.rejects(runMock({profileId:'ecg'}),/CMYK profiles/);
  const bad=make();
  const modified={...bad,source:{...bad.source,colour_space:'Display-P3'}};
  await assert.rejects(runMock({preparation:modified}),/original sRGB/);
  const wrong=JSON.parse(JSON.stringify(make()));wrong.production_paths[0].printing_condition='other';
  await assert.rejects(runMock({preparation:wrong}),/read only|printing condition/i);
});
test('malformed worker values and false evidence never become output',async()=>{
  await assert.rejects(runMock({},x=>({...x,device_values_16bit:[0,1,2,70000]})),/Unexpected device16/);
  await assert.rejects(runMock({},x=>({...x,production_approval:'GRANTED'})),/Unexpected device16/);
  await assert.rejects(runMock({},x=>({...x,channel_order:['K','C','M','Y']})),/Unexpected device16/);
});
test('comparison failure rejects the calculation instead of reporting verified output',async()=>{
  const digest=await webcrypto.subtle.digest('SHA-256',bytes);
  const sha=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  await assert.rejects(runMock({secondBinding:{
    binding:'Pillow ImageCms / system LittleCMS',
    profileSha256:sha,sourceRgb:rgb,deviceCmyk8:[250,250,250,250],
    intent:'Relative colorimetric',bpc:false
  }}),/comparison failed/);
});
test('zero device values are not interpreted as null or proof',async()=>{
  const {result}=await runMock({},x=>({...x,device_values_16bit:[0,0,0,0],device_values_normalized:[0,0,0,0]}));
  assert.deepEqual(result.production_paths[0].device_values,[0,0,0,0]);
  assert.equal(result.production_paths[0].production_approval,'NOT_GRANTED');
});

test('rejects a forged ECG approval or stale device output in a parallel branch',async()=>{
  const forged=JSON.parse(JSON.stringify(make()));
  forged.production_paths[1].production_approval='GRANTED';
  await assert.rejects(runMock({preparation:forged}),/Every path must start/);
  const stale=JSON.parse(JSON.stringify(make()));
  stale.production_paths[1].device_values=[1,2,3,4,5,6,7];
  await assert.rejects(runMock({preparation:stale}),/Every path must start/);
});

test('real master crosscheck rejects false HLC address, master row and RGB context',async()=>{
  const forged=JSON.parse(JSON.stringify(make()));
  forged.source.hlc='H001_L001_C001';
  await assert.rejects(runMock({preparation:forged}),/HLC row or original RGB/);
  const wrong=JSON.parse(JSON.stringify(make()));
  wrong.source.rgb8=[1,2,3];
  await assert.rejects(runMock({preparation:wrong}),/HLC row or original RGB/);
  const altered={...masterDocument,master_sha256:'a'.repeat(64)};
  await assert.rejects(runMock({masterDocument:altered}),/Master metadata/);
});
