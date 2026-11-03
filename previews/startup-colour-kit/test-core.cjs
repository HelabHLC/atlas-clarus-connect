// Executable tests use the unchanged embedded LittleCMS worker, not a mock.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {Worker}=require('node:worker_threads');
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
const profilePath=process.argv[4]||'/usr/share/color/icc/ghostscript/default_cmyk.icc';
const context={console,crypto:globalThis.crypto,TextEncoder,TextDecoder,Uint8Array,Uint8ClampedArray,ArrayBuffer,DataView,Map,Set,Blob,Response,DecompressionStream,atob,btoa};context.window=context;
vm.createContext(context);
for(const n of ['atlas-data.js','colour-origin.js','palette-export.js','clarus-handoff.js','image-project-codecs.js','print-handoff.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets',n),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'startup/zip-reader.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'startup/core.js'),'utf8'),context);
const K=context.ATLAS_STARTUP_CORE,P=context.ATLAS_CLARUS_PRINT,ctx={master:context.ATLAS_CLARUS_DATA.master_sha256,colors:context.ATLAS_CLARUS_DATA.colors};
const source=fs.readFileSync(path.join(root,'startup/worker-source.js'),'utf8');
const wrapper=`const {parentPort}=require('node:worker_threads');globalThis.self=globalThis;globalThis.postMessage=m=>parentPort.postMessage(m);${source}\nparentPort.on('message',data=>globalThis.onmessage({data}));`;
function run(job){return new Promise((resolve,reject)=>{const worker=new Worker(wrapper,{eval:true});const timer=setTimeout(()=>{worker.terminate();reject(Error('Worker timeout'));},45000);worker.on('error',e=>{clearTimeout(timer);worker.terminate();reject(e);});worker.on('message',m=>{if(m.type==='progress')return;clearTimeout(timer);worker.terminate();m.type==='error'?reject(Error(m.message)):resolve(m.result);});worker.postMessage(job);});}
const normal=x=>JSON.parse(JSON.stringify(x)),checks=[];const pass=(n)=>checks.push(n);
(async()=>{
  assert.equal(ctx.colors.length,13283);pass('Frozen full-master count');
  const doc=K.defaults(ctx.master);doc.name='Test & <Brand>';doc.print.printing_condition='Generic CMYK test profile — not production';doc.print.substrate='Software test only';
  const values=[[234,99,37],[24,74,61],[245,241,222],[0,255,0],[0,0,0],[255,255,255]];
  doc.colours=values.map((v,i)=>({label:'Farbe '+(i+1),kind:'manual_srgb',source_rgb:v,reference_id:K.nearest(v,ctx).id,assignment:null}));
  K.validate(doc,ctx);const originalInputs=JSON.stringify(doc);pass('Manual sRGB matching and source/reference separation');
  const profile={name:path.basename(profilePath),bytes:new Uint8Array(fs.readFileSync(profilePath))};profile.info=await P.readProfile(profile.bytes,profile.name,'4C');
  const jobs=[];
  for(const basis of ['source','reference']){
    const d=normal(doc);d.print.basis=basis;const input=d.colours.map(c=>basis==='source'?c.source_rgb:ctx.colors.find(x=>x.id===c.reference_id).rgb);
    const preview=await run({path:'4C',width:input.length,height:1,pixels:new Uint8Array(input.flatMap(v=>[...v,255])),profile:profile.bytes,intent:d.print.intent,bpc:d.print.bpc});
    const colours=[];for(const v of input){const r=await run({operation:'reference-separation',path:'4C',rgb:v,profile:profile.bytes,intent:d.print.intent,bpc:d.print.bpc});const i=colours.length;colours.push({input_rgb:v,preview_rgb:Array.from(preview.pixels.slice(i*4,i*4+3)),channel_order:r.channel_order,device_values_16bit:r.device_values_16bit});}
    const result={status:'COMPUTATIONAL_PREVIEW_NOT_MEASURED',profile_sha256:profile.info.sha256,settings:d.print,inputs:d.colours,colours,engine:preview.engine,method:preview.method,return_intent:preview.return_intent,return_bpc:preview.return_bpc,paper_white_simulation:preview.paper_white_simulation};
    K.validateResult(d,ctx,result,profile.info);
    const zip=await K.pack({doc:d,original:null,profile,result},ctx),again=await K.pack({doc:d,original:null,profile,result},ctx);assert.deepEqual(Buffer.from(zip),Buffer.from(again));
    fs.writeFileSync(path.join(out,basis+'-Farbmappe.zip'),zip);const restored=await K.unpack(zip,ctx);
    assert.deepEqual(normal(restored.doc),normal(d));assert.deepEqual(Buffer.from(restored.profile.bytes),Buffer.from(profile.bytes));assert.equal(restored.result,null);
    const files=context.ATLAS_STARTUP_CODECS.unzip(zip,K.MAX_ZIP);assert.match(new TextDecoder().decode(files['farbkarte.html']),/Test &amp; &lt;Brand&gt;/);
    const p=context.ATLAS_CLARUS_EXPORTS.readAse(files[`palettes/${basis}.ase`]);assert.deepEqual(normal(p.map(x=>x.rgb)),normal(input));
    const changed=normal(d);changed.print.bpc=true;assert.throws(()=>K.validateResult(changed,ctx,result,profile.info));
    const corrupt=zip.slice();corrupt[50]^=1;await assert.rejects(()=>K.unpack(corrupt,ctx));
    jobs.push({basis,profile_sha256:profile.info.sha256,settings:d.print,colours});pass(`${basis}: real ICC roundtrip, exact output16, deterministic ZIP, profile bytes, ASE and import invalidation`);
  }
  assert.equal(JSON.stringify(doc),originalInputs);pass('Calculation does not alter original inputs');
  for(const wrong of ['ECG','TEXTILE_RGB'])await assert.rejects(()=>P.readProfile(profile.bytes,profile.name,wrong));
  await assert.rejects(()=>P.readProfile(new Uint8Array(132),'bad.icc','4C'));pass('Wrong path and malformed profiles rejected');
  const bad=normal(doc);bad.colours[0].reference_id=(bad.colours[0].reference_id+1)%13283;assert.throws(()=>K.validate(bad,ctx));
  const many=normal(doc);many.colours=Array(13).fill(doc.colours[0]);assert.throws(()=>K.validate(many,ctx));pass('Mismatched references and palette size limits rejected');
  const fixtureDir=process.argv[5];
  if(fixtureDir){
    const oracle=JSON.parse(fs.readFileSync(path.join(fixtureDir,'oracle.json')));
    for(const [name,expected]of Object.entries(oracle)){
      const bytes=new Uint8Array(fs.readFileSync(path.join(fixtureDir,name))),origin=await context.ATLAS_COLOUR_ORIGIN.inspect(bytes);
      assert.equal(origin.file_sha256,expected.file_sha256);assert.equal(origin.icc.sha256,expected.icc_sha256);
      const d=normal(doc);d.colours=[];
      for(const [x,values]of expected.pixels.entries()){
        const ref=K.nearest(values,ctx),assignment=context.ATLAS_CLARUS_EXPORTS.createSourceAssignment({size:1,count:1,rgb:values,std:[0,0,0],bounds:[x,0,x,0]},{ix:x,iy:0},{name,width:2,height:1,sha256:expected.file_sha256,colour_origin:origin},ref,ctx.master);
        d.colours.push({label:'Bildfarbe '+x,kind:'image',source_rgb:values,reference_id:ref.id,assignment});
      }
      const snapshot={doc:d,original:{name,bytes},profile,result:null},zip=await K.pack(snapshot,ctx),restored=await K.unpack(zip,ctx);
      assert.deepEqual(Buffer.from(restored.original.bytes),Buffer.from(bytes));assert.deepEqual(normal(restored.doc),normal(d));
      assert.deepEqual(Buffer.from(await K.pack(restored,ctx)),Buffer.from(zip));
      fs.writeFileSync(path.join(out,'image-'+name+'.zip'),zip);
      await assert.rejects(()=>K.pack({...snapshot,original:null},ctx));
      const badSource=normal(d);badSource.colours[0].assignment.image.sha256='0'.repeat(64);await assert.rejects(()=>K.pack({...snapshot,doc:badSource},ctx));
    }
    pass('Eight PNG/JPEG/WebP/GIF originals and three embedded ICC profiles preserved byte-for-byte; multiple sources and deterministic reopen; absent/wrong original blocked');
  }
  // All four intents and both BPC options reach the unchanged real ICC engine.
  for(const intent of P.INTENTS)for(const bpc of [false,true]){
    const v=await run({path:'4C',width:1,height:1,pixels:new Uint8Array([234,99,37,255]),profile:profile.bytes,intent,bpc});
    assert.equal(v.forward_intent,intent);assert.equal(v.forward_bpc,bpc);assert.equal(v.return_intent,'Relative colorimetric');assert.equal(v.return_bpc,false);
  }
  pass('Four rendering intents and two BPC settings exercised; return transform fixed and reported');
  fs.writeFileSync(path.join(out,'computations.json'),JSON.stringify({profilePath,jobs},null,2));
  fs.writeFileSync(path.join(out,'core-results.json'),JSON.stringify({status:'PASS',checks,profile_sha256:profile.info.sha256,physical_measurement:'NOT_PERFORMED'},null,2));console.log(JSON.stringify({status:'PASS',checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
