const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{Worker}=require('node:worker_threads');
const root=path.resolve(process.argv[2]),profiles=path.resolve(process.argv[3]);
const ctx={console,crypto:globalThis.crypto,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,DataView,Map,Set,Blob,atob,btoa,setTimeout,clearTimeout,URL};ctx.window=ctx;vm.createContext(ctx);
for(const n of ['assets/print-handoff.js','icc/profile-catalog.js','icc/profile-library.js'])vm.runInContext(fs.readFileSync(path.join(root,n),'utf8'),ctx);
const P=ctx.ATLAS_CLARUS_PRINT,C=ctx.ATLAS_ICC_CATALOG,L=ctx.ATLAS_PROFILE_LIBRARY;
const source=fs.readFileSync(path.join(root,'startup/worker-source.js'),'utf8');
const wrapper=`const {parentPort}=require('node:worker_threads');globalThis.self=globalThis;globalThis.postMessage=m=>parentPort.postMessage(m);${source}\nparentPort.on('message',data=>globalThis.onmessage({data}));`;
function run(job){return new Promise((resolve,reject)=>{const w=new Worker(wrapper,{eval:true}),timer=setTimeout(()=>{w.terminate();reject(Error('timeout'))},45000);w.on('error',e=>{clearTimeout(timer);w.terminate();reject(e)});w.on('message',m=>{if(m.type==='progress')return;clearTimeout(timer);w.terminate();m.type==='error'?reject(Error(m.message)):resolve(m.result)});w.postMessage(job)});}
(async()=>{
 const passed=[];
 for(const [id,p] of Object.entries(C.profiles)){
   const bytes=new Uint8Array(fs.readFileSync(path.join(profiles,id+'.icc')));await L.verify(id,bytes);
   const wrong=bytes.slice();wrong[wrong.length-1]^=1;await assert.rejects(()=>L.verify(id,wrong));
   if(p.output_path){const checked=await P.readProfile(bytes,p.file_name,p.output_path);assert.equal(checked.sha256,p.sha256);
     const result=await run({path:p.output_path,width:3,height:1,pixels:new Uint8Array([234,99,37,255,24,74,61,255,245,241,222,255]),profile:bytes,intent:'Relative colorimetric',bpc:false});
     assert.equal(result.pixels.length,12);assert.equal(result.pixels[3],255);
   }else await assert.rejects(()=>P.readProfile(bytes,p.file_name,p.beta?'TEXTILE_RGB':'4C'));
   passed.push({file:p.file_name,path:p.output_path,status:'PASS'});
 }
 assert.equal(C.libraries.pso_fogra51_fogra52_common.profile_ids.length,2);
 assert.equal(C.libraries.gamutmap_165.profile_ids.length,0);
 assert.equal(C.libraries.gamutmap_196.status,'BETA_REFERENCE_ONLY');
 assert.equal(Object.keys(C.libraries).length,96);
 const dataset=JSON.parse(fs.readFileSync(path.join(root,'assets/atlas-data.js'),'utf8').split('=').slice(1).join('=').trim().replace(/;$/,''));
 for(const key of Object.keys(dataset.views))assert(C.libraries[key]);
 assert.equal(C.master_sha256,dataset.master_sha256);
 console.log(JSON.stringify({status:'PASS',profile_count:passed.length,output_transform_count:passed.filter(x=>x.path).length,all_existing_views_mapped:true,corruption_rejected:true,working_rgb_and_beta_output_rejected:true,profiles:passed},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
