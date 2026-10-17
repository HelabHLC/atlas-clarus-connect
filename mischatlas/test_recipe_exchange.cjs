'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {webcrypto,createHash}=require('node:crypto');if(!global.crypto)Object.defineProperty(global,'crypto',{value:webcrypto});
require('./recipe-exchange.js');
global.ClarusHandoff=require('../browser-bundle/vendor/clarus-handoff/clarus-handoff.js');
for(const n of ['palette-export','colour-handoff','colour-projects','image-project-codecs','image-projects','pkl-image-binding','colour-reduction','reference-card','colour-reference-card','print-handoff','reduction-job','tool-exchange'])require('../browser-bundle/src/'+n+'.js');
const R=global.ATLAS_MIXING_RECIPE,X=global.ATLAS_TOOL_EXCHANGE,m=require('../hover-library/data/colors.json'),LC=require('./light-mixing/data.json');
const source=fs.readFileSync(path.join(__dirname,'dist/atlas-clarus-mischatlas/assets/mischatlas.html'),'utf8');
const D=JSON.parse(source.match(/<script id="data" type="application\/json">(.*?)<\/script>/s)[1]);
const row=D.rows.find(r=>r.atlas_reference==='H140_L055_C040'),ctx={colors:m.colors,master:m.master_sha256,rows:D.rows};
const engine=fs.readFileSync(path.join(__dirname,'light-mixing/kernel.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'light-mixing/worker.js'),'utf8');
const sandbox={};vm.createContext(sandbox);vm.runInContext(engine,sandbox);
const job={samples:LC.samples,target:{atlas_reference:row.atlas_reference,atlas_row_id:row.atlas_row_id,reference_spectrum:row.reference_spectrum},kernels:LC.kernels,lights:['D50','D65','FL11','LED-B3'],objective:'multi',poolSize:16,seed:42,seedRecipe:row.recipe.map(p=>({name:D.labels[p.source_index],parts:p.model_parts}))};
const result=JSON.parse(JSON.stringify(sandbox.searchLight(job,()=>{})));
const document={schema:R.LIGHT,master_sha256:m.master_sha256,physical_measurements:false,reflectance_interval_nm:[380,730,10],provenance:LC.provenance,result};
const replay={job,environment:{engine_sha256:createHash('sha256').update(engine).digest('hex'),whitepoints:LC.whitepoints,provenance:LC.provenance,physical_measurements:false}};
const bytes=d=>new TextEncoder().encode(JSON.stringify(d,null,3)+'\n'),hash=b=>createHash('sha256').update(b).digest('hex');
(async()=>{
 const out=path.join(__dirname,'dist/recipe-exchange-test');fs.mkdirSync(out,{recursive:true});
 const fixture=fs.readFileSync(path.join(__dirname,'tests/fixtures/light-recipe-v1.json'));assert.deepEqual(JSON.parse(fixture),document);
 const original=new Uint8Array(fixture),sealed=await R.seal(original,ctx,replay),state=await R.inspect(sealed,ctx);
 assert.deepEqual(state.result,result);assert.deepEqual(state.replay,replay);assert.deepEqual(state.originalBytes,original);
 const exchangeCtx=await X.context({colors:m.colors,master:m.master_sha256});
 let pkg=X.create(exchangeCtx);const added=await X.add(pkg,{filename:'recipe.snapshot.json',bytes:sealed},exchangeCtx);pkg=added.package;assert.equal(added.native.kind,'MIXING_RECIPE');
 const zip=await X.exportZip(pkg,exchangeCtx),back=await X.importZip(zip,exchangeCtx),after=await R.inspect(back.payloads[added.id],ctx);
 assert.deepEqual(after.bytes,sealed);assert.deepEqual(after.originalBytes,original);assert.equal(hash(after.bytes),hash(sealed));
 const view=await X.derive(pkg,added.id,'REFERENCE_VIEW',exchangeCtx);assert.deepEqual(pkg.payloads[added.id],sealed);assert.equal((await X.inspect(view.package.payloads[view.ids[0]],exchangeCtx)).data.references[0].atlas_row_id,row.atlas_row_id);
 let rejected=0;const reject=async d=>{await assert.rejects(()=>R.inspect(bytes(d),ctx));rejected++;};
 for(const mutate of [d=>d.master_sha256='0'.repeat(64),d=>d.record.result.recipe[0].parts++,d=>d.record.result.atlas_reference='H999_L999_C999',d=>d.replay.job.samples[0].R[0]+=.01,d=>d.original.bytes_base64=d.original.bytes_base64.slice(4),d=>d.physical_measurements=true]){const d=JSON.parse(new TextDecoder().decode(sealed));mutate(d);await reject(d);}
 for(const mutate of [d=>d.result.atlas_row_id=999999,d=>d.result.recipe[0].parts++,d=>d.result.reference_spectrum[0]=-1,d=>d.result.lights[0].DE00=-1]){const d=structuredClone(document);mutate(d);await reject(d);}
 const semantic=JSON.parse(new TextDecoder().decode(sealed));semantic.replay.job.samples[result.recipe[0].index].R[0]+=.001;semantic.replay_sha256=await R.sha(new TextEncoder().encode(R.canon(semantic.replay)));await reject(semantic);
 const wrongReference=structuredClone(document);wrongReference.result.atlas_reference='H999_L999_C999';await reject(wrongReference);
 const legacy=await R.inspect(original,ctx);assert.equal(legacy.integrity,'LEGACY_UNSEALED');assert.equal(legacy.replay,undefined);
 const older={master_sha256:m.master_sha256,physical_measurements:false,row,labels:row.recipe.map(p=>({source_index:p.source_index,label:D.labels[p.source_index]})),light_names:D.light_names,light_observations:D.light_names.map(n=>({light:n,target_lab:[0,0,0],model_lab:[0,0,0]})),method:D.summary.integration};
 assert.equal((await R.inspect(bytes(older),ctx)).mode,'LEGACY_ROW');
 const modified=structuredClone(back);modified.payloads[added.id][10]^=1;await assert.rejects(()=>X.verify(modified,exchangeCtx));rejected++;
 // A coordinated attacker can replace data and hashes. Hashes are consistency checks, not signatures.
 for(const [name,b]of Object.entries({'original.json':original,'snapshot.json':sealed,'exchange.zip':zip,'reexport.json':after.bytes,'legacy-row.json':bytes(older)}))fs.writeFileSync(path.join(out,name),b);
 fs.writeFileSync(path.join(out,'expected.json'),JSON.stringify({original:hash(original),snapshot:hash(sealed),reexport:hash(after.bytes),exchange:hash(zip)},null,2));
 console.log(JSON.stringify({status:'PASS',rejected,exact_original:true,exact_reexport:true,full_search_inputs_retained:true,legacy_light_and_row:true,stored_result_not_recomputed:true,out}));
})().catch(e=>{console.error(e);process.exitCode=1;});
