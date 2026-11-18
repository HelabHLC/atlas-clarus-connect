import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { runIccBrowserIntegration } from "./browser-icc-integration.mjs";

test("browser wiring sends ICC bytes to worker and records returned pixels", async()=>{
 const originalWorker=globalThis.Worker, originalCrypto=globalThis.crypto;
 const bytes=new Uint8Array([1,2,3,4]);
 const hash=Array.from(new Uint8Array(await webcrypto.subtle.digest("SHA-256",bytes)),x=>x.toString(16).padStart(2,"0")).join("");
 const catalog={schema:"ATLAS_LIBRARY_ICC_CATALOG_V1",profiles:{p:{device_class:"prtr",output_path:"4C",beta:false,sha256:hash,bytes:4}}};
 class FakeWorker {
  constructor(url){assert.equal(url,"worker.js");}
  postMessage(job){
   assert.deepEqual(Array.from(job.profile),[1,2,3,4]);
   assert.deepEqual(Array.from(job.pixels),[20,40,60,255]);
   queueMicrotask(()=>this.onmessage({data:{type:"result",result:{
    method:"SRGB_TO_DEVICE16_TO_SRGB",engine:"LittleCMS 2.16 / lcms-wasm 1.0.5",
    width:1,height:1,pixels:new Uint8Array([21,41,61,255]),
    forward_intent:"Relative colorimetric",forward_bpc:false,
    measured_qc:"NOT_MEASURED",paper_white_simulation:false
   }}}));
  }
  terminate(){}
 }
 try{
  Object.defineProperty(globalThis,"crypto",{configurable:true,value:webcrypto});
  globalThis.Worker=FakeWorker;
  const r=await runIccBrowserIntegration({workerUrl:"worker.js",catalog,profileId:"p",
   profileBytes:bytes,sourceRgb:[20,40,60],hlcAddress:"H050_L060_C075",substrate:"coated",
   independentExpectedRgb:[21,41,61]});
  assert.equal(r.independentCheck.status,"PASS");
  assert.deepEqual(r.record.output.returnedRgb8,[21,41,61]);
  assert.equal(r.comparison.substrateLab,null);
 }finally{
  if(originalWorker===undefined)delete globalThis.Worker;else globalThis.Worker=originalWorker;
  if(originalCrypto===undefined)delete globalThis.crypto;
  else Object.defineProperty(globalThis,"crypto",{configurable:true,value:originalCrypto});
 }
});
