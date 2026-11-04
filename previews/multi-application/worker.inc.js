/* Dedicated multi-output operation. Existing image/reference operations are unchanged. */
(function(root){
  'use strict';
  const previous=root.onmessage,need=(ok,msg)=>{if(!ok)throw Error(msg);};
  async function compare(job){
    const {rgb,profile}=job,n=rgb?.length/3;
    need(rgb instanceof Uint8Array&&Number.isInteger(n)&&n>0&&n<=13300,'Invalid comparison input.');
    need(profile instanceof Uint8Array&&profile.length>=132&&profile.length<=16777216,'Invalid ICC size.');
    const sig=at=>String.fromCharCode(...profile.slice(at,at+4)),v=new DataView(profile.buffer,profile.byteOffset,profile.byteLength);
    need(sig(36)==='acsp'&&sig(12)==='prtr'&&v.getUint32(0)===profile.length,'A printer ICC profile is required.');
    const channels={'RGB ':3,CMYK:4,'7CLR':7}[sig(16)];need(channels,'Unsupported device space.');
    const cms=await root.ATLAS_LOAD_LCMS(),mem=[],profiles=[],transforms=[];
    const alloc=bytes=>{const p=cms._malloc(bytes);need(p,'Memory allocation failed.');mem.push(p);return p;};
    const transform=(a,af,b,bf,intent)=>{const t=cms._cmsCreateTransform(a,af,b,bf,intent,0x0100);need(t,'ICC transform unavailable.');transforms.push(t);return t;};
    try{
      const p=alloc(profile.length);cms.HEAPU8.set(profile,p);
      const device=cms._cmsOpenProfileFromMem(p,profile.length);need(device,'ICC could not be opened.');profiles.push(device);
      const srgb=cms._cmsCreate_sRGBProfile(),lab=cms._cmsCreateLab4Profile(0);profiles.push(srgb,lab);need(srgb&&lab,'Reference profiles unavailable.');
      const rgb8=(4<<16)|(3<<3)|1,lab64=(1<<22)|(10<<16)|(3<<3),device16=cms._cmsFormatterForColorspaceOfProfile(device,2,0);
      need(((device16>>3)&15)===channels,'ICC channel mismatch.');
      const toLab=transform(srgb,rgb8,lab,lab64,1),toDevice=transform(lab,lab64,device,device16,3),toOutputLab=transform(device,device16,lab,lab64,3),toDisplay=transform(lab,lab64,srgb,rgb8,1);
      const ip=alloc(n*3),lp=alloc(n*3*8),dp=alloc(n*channels*2),op=alloc(n*3*8),sp=alloc(n*3);
      cms.HEAPU8.set(rgb,ip);cms._cmsDoTransform(toLab,ip,lp,n);cms._cmsDoTransform(toDevice,lp,dp,n);cms._cmsDoTransform(toOutputLab,dp,op,n);cms._cmsDoTransform(toDisplay,op,sp,n);
      const result={input_lab:new Float64Array(cms.HEAPF64.subarray(lp/8,lp/8+n*3)),output_lab:new Float64Array(cms.HEAPF64.subarray(op/8,op/8+n*3)),device16:new Uint16Array(cms.HEAPU16.subarray(dp/2,dp/2+n*channels)),preview_rgb:new Uint8Array(cms.HEAPU8.subarray(sp,sp+n*3)),channels,
        method:'SRGB8_TO_LAB_D50_TO_DEVICE16_TO_LAB_D50_ABSOLUTE_V1',engine:'LittleCMS 2.16 / lcms-wasm 1.0.5',forward_intent:'Absolute colorimetric',return_intent:'Absolute colorimetric',bpc:false,physical_approval:false};
      need([...result.input_lab,...result.output_lab].every(Number.isFinite),'Non-finite ICC output.');return result;
    }finally{transforms.forEach(p=>cms._cmsDeleteTransform(p));profiles.filter(Boolean).forEach(p=>cms._cmsCloseProfile(p));mem.forEach(p=>cms._free(p));}
  }
  root.ATLAS_MULTI_COMPARE=compare;
  root.onmessage=async e=>{if(e.data?.operation!=='multi-compare')return previous(e);try{const r=await compare(e.data);root.postMessage({type:'multi-result',result:r},[r.input_lab.buffer,r.output_lab.buffer,r.device16.buffer,r.preview_rgb.buffer]);}catch(error){root.postMessage({type:'error',message:error.message});}};
})(globalThis);
