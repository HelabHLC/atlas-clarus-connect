'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto'),{execFileSync}=require('node:child_process');
const native=JSON.parse(execFileSync('python3',['browser-bundle/tests/textile_native_oracle.py'],{encoding:'utf8',env:process.env}));
const code=fs.readFileSync(process.env.TEXTILE_WORKER||((process.env.TEXTILE_BUNDLE_DIR||'browser-bundle/build-textile-conversion/atlas-clarus-browser-bundle')+'/assets/lcms-worker.js'),'utf8');let network=0;
const env=vm.createContext({Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,Float32Array,Float64Array,ArrayBuffer,DataView,WebAssembly,console,TextDecoder,TextEncoder,atob,btoa,setTimeout,clearTimeout,performance,crypto:webcrypto,fetch:()=>{network++;throw Error('Network forbidden')}});vm.runInContext(code,env);
const profile=new Uint8Array(fs.readFileSync(process.env.TEXTILE_PROFILE)),intents=['Perceptual','Relative colorimetric','Saturation','Absolute colorimetric'];
const pixels=new Uint8Array(native.rgb.flatMap((c,i)=>[...c,i*37]));
require('../textile/print-handoff.js');require('../src/reference-card.js');require('../textile/textile-reference-card.js');
const master=require('../../hover-library/data/colors.json');
(async()=>{
 let max16=0,max8=0;let chosen;
 for(const v of native.cases){
  const job={path:'TEXTILE_RGB',width:native.rgb.length,height:1,pixels:pixels.slice(),profile:profile.slice(),intent:intents[v.intent],bpc:v.bpc};
  const out=await env.ATLAS_PREVIEW_CALCULATE(job);assert.deepEqual(job.pixels,pixels);assert.equal(out.channels,3);assert.equal(out.profile_role,'TEXTILE_RGB_EXCHANGE_SPACE');
  const rgb=Array.from(out.pixels).filter((x,i)=>i%4!==3);rgb.forEach((x,i)=>max8=Math.max(max8,Math.abs(x-v.roundtrip[i])));
  for(let i=0;i<native.rgb.length;i++){
   assert.equal(out.pixels[i*4+3],pixels[i*4+3]);
   const sep=await env.ATLAS_REFERENCE_SEPARATE({path:'TEXTILE_RGB',rgb:native.rgb[i],profile:profile.slice(),intent:intents[v.intent],bpc:v.bpc});
   Array.from(sep.device_values_16bit).forEach((x,j)=>max16=Math.max(max16,Math.abs(x-v.rgb16[i*3+j])));
   if(i===0&&v.intent===1&&!v.bpc)chosen=sep;
  }
 }
 assert(max16<=2,'Native/WASM RGB16 mismatch '+max16);assert(max8<=1,'Native/WASM preview mismatch '+max8);
 const P=global.ATLAS_CLARUS_PRINT,card=global.ATLAS_CLARUS_TEXTILE_CARD,metadata=await P.readProfile(profile,'TextileRGB_FOGRA58.icc','TEXTILE_RGB');
 const data=await card.create({entry:master.colors[4966],colors:master.colors,master:master.master_sha256,profile:metadata,profileBytes:profile,settings:{path_id:'TEXTILE_RGB',printing_condition:'FOGRA58 computational reference test',substrate:'Fabric not measured',rendering_intent:'Relative colorimetric',black_point_compensation:false},separation:JSON.parse(JSON.stringify(chosen)),createdAt:'2026-10-26T12:00:00.000Z'});
 assert.equal(data.reference.atlas_row_id,4966);assert.deepEqual(data.reference.master_rgb,[55,121,26]);assert.equal(data.identity_change,'NONE');
 const pdf=await card.pdf(data,profile);assert(Buffer.from(pdf).includes(Buffer.from(profile)));assert.match(Buffer.from(pdf).toString('latin1'),/\/ICCBased 6 0 R/);
 fs.mkdirSync('tmp/textile-conversion',{recursive:true});fs.writeFileSync('tmp/textile-conversion/reference.pdf',pdf);fs.writeFileSync('tmp/textile-conversion/reference.json',JSON.stringify(data,null,2));
 const bad=profile.slice();bad[bad.length-1]^=1;await assert.rejects(env.ATLAS_REFERENCE_SEPARATE({path:'TEXTILE_RGB',rgb:[55,121,26],profile:bad,intent:'Perceptual',bpc:false}));
 const stale=JSON.parse(JSON.stringify(chosen));stale.source_rgb[0]++;await assert.rejects(card.create({entry:master.colors[4966],colors:master.colors,master:master.master_sha256,profile:metadata,profileBytes:profile,settings:{path_id:'TEXTILE_RGB',rendering_intent:'Relative colorimetric',black_point_compensation:false},separation:stale}));
 assert.equal(network,0);
 const result={status:'PASS',native_lcms_version:native.native_lcms_version,wasm_engine:'LittleCMS 2.16',real_profile_test_vectors:native.rgb.length*native.cases.length,max_rgb16_difference:max16,max_preview_rgb8_difference:max8,alpha_preserved:true,profile_tamper_rejected:true,source_mismatch_rejected:true,network_calls:network,physical_textile:'NOT_MEASURED'};fs.writeFileSync('tmp/textile-conversion/results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1});
