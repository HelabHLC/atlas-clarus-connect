/* Independent Lab D50 -> user CMYK ICC -> Lab D50 roundtrip; no physical proof. */
(function(root){
'use strict';
const ensure=(v,m)=>{if(!v)throw Error(m)};
const intents={'Relative colorimetric':1,'Absolute colorimetric':3};
const LAB_DBL=0x4a0018;
async function roundtrip(job){
  const {lab,profile,intent,bpc}=job;
  ensure(Array.isArray(lab)&&lab.length===3&&lab.every(Number.isFinite)&&lab[0]>=0&&lab[0]<=100&&lab.slice(1).every(v=>v>=-128&&v<=127),'Expected D50 Lab');
  ensure(Object.hasOwn(intents,intent)&&typeof bpc==='boolean','Choose supported intent and BPC');
  ensure(!(intent==='Absolute colorimetric'&&bpc),'Absolute path requires BPC off');
  ensure(profile instanceof Uint8Array&&profile.length>=132&&profile.length<=16777216,'Invalid profile size');
  const d=new DataView(profile.buffer,profile.byteOffset,profile.byteLength),sig=o=>String.fromCharCode(...profile.subarray(o,o+4));
  ensure(d.getUint32(0)===profile.length&&sig(36)==='acsp'&&sig(12)==='prtr'&&sig(16)==='CMYK','CMYK output ICC required');
  const count=d.getUint32(128);ensure(count>0&&count<=4096&&132+12*count<=profile.length,'Invalid tag table');
  const tags=new Set();for(let i=0;i<count;i++){const p=132+12*i,t=sig(p),o=d.getUint32(p+4),n=d.getUint32(p+8);ensure(!tags.has(t)&&o>=132+12*count&&o%4===0&&n>=8&&o+n<=profile.length,'Invalid ICC tag');tags.add(t)}
  ensure(['A2B0','A2B1','A2B2'].some(t=>tags.has(t))&&['B2A0','B2A1','B2A2'].some(t=>tags.has(t)),'Both transform directions required');
  const cms=await root.ATLAS_LOAD_LCMS();
  ensure(typeof cms._cmsCreateLab4Profile==='function','Pinned WASM does not expose Lab4 profile creation');
  let memory=0,out=0,labProfile=0,forward=0,reverse=0,inp=0,dev=0,back=0;
  try{
    memory=cms._malloc(profile.length);ensure(memory,'Allocation failed');cms.HEAPU8.set(profile,memory);
    out=cms._cmsOpenProfileFromMem(memory,profile.length);ensure(out,'LittleCMS rejected ICC');
    labProfile=cms._cmsCreateLab4Profile(0);ensure(labProfile,'Lab4 profile failed');
    const fmt=cms.cmsFormatterForColorspaceOfProfile(out,2,false);ensure(((fmt>>3)&15)===4,'Expected four device channels');
    forward=cms.cmsCreateTransform(labProfile,LAB_DBL,out,fmt,intents[intent],0x100|(bpc?0x2000:0));
    reverse=cms.cmsCreateTransform(out,fmt,labProfile,LAB_DBL,intents[intent],0x100);
    ensure(forward&&reverse,'LittleCMS transform failed');
    inp=cms._malloc(24);dev=cms._malloc(8);back=cms._malloc(24);ensure(inp&&dev&&back,'Allocation failed');
    cms.HEAPF64.set(lab,inp>>3);cms._cmsDoTransform(forward,inp,dev,1);cms._cmsDoTransform(reverse,dev,back,1);
    const device=Array.from(cms.HEAPU16.subarray(dev>>1,(dev>>1)+4)),returned=Array.from(cms.HEAPF64.subarray(back>>3,(back>>3)+3));
    ensure(returned.every(Number.isFinite),'Nonfinite Lab return');
    return {method:'LAB_D50_TO_CMYK16_TO_LAB_D50',target_lab:[...lab],returned_lab:returned,device_values_16bit:device,channel_order:['C','M','Y','K'],forward_intent:intent,return_intent:intent,forward_bpc:bpc,return_bpc:false,engine:'LittleCMS 2.16 / lcms-wasm 1.0.5',physical_proof:'NOT_MEASURED',production_approval:false};
  }finally{
    if(forward)cms.cmsDeleteTransform(forward);if(reverse)cms.cmsDeleteTransform(reverse);
    if(out)cms.cmsCloseProfile(out);if(labProfile)cms.cmsCloseProfile(labProfile);
    for(const p of [inp,dev,back,memory])if(p)cms._free(p);
  }
}
root.ATLAS_RC36_LAB_ROUNDTRIP=roundtrip;
const previous=root.onmessage;
root.onmessage=async e=>{if(e.data.operation!=='rc36-lab-roundtrip'){if(previous)return previous(e);return;}try{root.postMessage({type:'rc36-lab-result',result:await roundtrip(e.data)})}catch(err){root.postMessage({type:'error',message:String(err.message||err)})}};
})(globalThis);
