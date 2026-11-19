/* Wide-gamut ICC worker operation; append AFTER existing multi-application worker.
 * Accepts colourimetrically derived D50 Lab, never a clipped sRGB proxy.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
(function(root){
'use strict';
const previous=root.onmessage;
const check=(ok,message)=>{if(!ok)throw Error(message);};
async function compare(job){
 const {lab_d50:lab,profile}=job;
 check(lab instanceof Float64Array&&lab.length>=3&&lab.length%3===0&&lab.length/3<=13300&&Array.from(lab).every(Number.isFinite),'Finite Lab D50 Float64 input required');
 check(profile instanceof Uint8Array&&profile.length>=132&&profile.length<=16777216,'ICC bytes required');
 const sig=i=>String.fromCharCode(...profile.slice(i,i+4));
 const v=new DataView(profile.buffer,profile.byteOffset,profile.byteLength);
 check(sig(36)==='acsp'&&sig(12)==='prtr'&&v.getUint32(0)===profile.length,'Printer ICC required');
 const channels={'RGB ':3,CMYK:4,'7CLR':7}[sig(16)];
 check(channels,'Unsupported ICC device space');
 const cms=await root.ATLAS_LOAD_LCMS(),allocations=[],profiles=[],transforms=[];
 const alloc=n=>{const p=cms._malloc(n);check(p,'WASM memory allocation failed');allocations.push(p);return p;};
 const transform=(a,af,b,bf)=>{const t=cms._cmsCreateTransform(a,af,b,bf,3,0x0100);check(t,'Absolute ICC transform unavailable');transforms.push(t);return t;};
 try{
   const bytes=alloc(profile.length);cms.HEAPU8.set(profile,bytes);
   const device=cms._cmsOpenProfileFromMem(bytes,profile.length);
   check(device,'ICC open failed');profiles.push(device);
   const labProfile=cms._cmsCreateLab4Profile(0);check(labProfile,'Lab D50 profile failed');profiles.push(labProfile);
   const lab64=(1<<22)|(10<<16)|(3<<3),device16=cms._cmsFormatterForColorspaceOfProfile(device,2,0);
   check(((device16>>3)&15)===channels,'Device channel mismatch');
   const toDevice=transform(labProfile,lab64,device,device16);
   const backToLab=transform(device,device16,labProfile,lab64);
   const n=lab.length/3,input=alloc(lab.byteLength),outDevice=alloc(n*channels*2),outLab=alloc(lab.byteLength);
   cms.HEAPF64.set(lab,input/8);
   cms._cmsDoTransform(toDevice,input,outDevice,n);
   cms._cmsDoTransform(backToLab,outDevice,outLab,n);
   const result={input_lab:new Float64Array(lab),output_lab:new Float64Array(cms.HEAPF64.subarray(outLab/8,outLab/8+lab.length)),device16:new Uint16Array(cms.HEAPU16.subarray(outDevice/2,outDevice/2+n*channels)),channels,
     method:'LAB_D50_TO_DEVICE16_TO_LAB_D50_ABSOLUTE_V1',engine:'LittleCMS 2.16 / lcms-wasm 1.0.5',forward_intent:'Absolute colorimetric',return_intent:'Absolute colorimetric',bpc:false,physical_approval:false};
   check(Array.from(result.output_lab).every(Number.isFinite),'Non-finite output Lab');
   return result;
 }finally{transforms.forEach(t=>cms._cmsDeleteTransform(t));profiles.forEach(p=>cms._cmsCloseProfile(p));allocations.forEach(p=>cms._free(p));}
}
root.ATLAS_WIDE_GAMUT_COMPARE=compare;
root.onmessage=async e=>{
 if(e.data?.operation!=='wide-gamut-compare')return previous?.call(root,e);
 try{const r=await compare(e.data);root.postMessage({type:'wide-gamut-result',result:r},[r.input_lab.buffer,r.output_lab.buffer,r.device16.buffer]);}
 catch(err){root.postMessage({type:'error',message:err.message});}
};
})(globalThis);
