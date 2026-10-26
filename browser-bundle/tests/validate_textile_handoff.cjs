'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{webcrypto}=require('node:crypto');
if(!global.crypto)Object.defineProperty(global,'crypto',{value:webcrypto});
require('../textile/print-handoff.js');const P=global.ATLAS_CLARUS_PRINT;
const master=require('../../hover-library/data/colors.json'),colors=master.colors,entries=[colors[4966],colors[10519]],copy=x=>JSON.parse(JSON.stringify(x));
const make=paths=>P.create({entries,colors,paths,name:'Textile fixture',createdAt:'2026-10-26T00:00:00.000Z'});
(async()=>{
 const legacy=await make({'4C':P.emptySettings(),ECG:P.emptySettings()});assert.equal(legacy.version,'0.1.0');await P.validate(copy(legacy),colors);
 assert(process.env.TEXTILE_PROFILE,'Set TEXTILE_PROFILE');
 const raw=new Uint8Array(fs.readFileSync(process.env.TEXTILE_PROFILE)),profile=await P.readProfile(raw,'renamed-but-identical.icc','TEXTILE_RGB');
 assert.equal(profile.sha256,P.FOGRA58_SHA256);assert.equal(profile.device_space,'RGB ');
 const paths={'4C':P.emptySettings(),ECG:P.emptySettings(),TEXTILE_RGB:{...P.emptySettings(),profile,printing_condition:'Test request',substrate:'Unmeasured fabric',rendering_intent:'Relative colorimetric',black_point_compensation:false}};
 const before=JSON.stringify(entries),job=await make(paths);assert.equal(JSON.stringify(entries),before);assert.equal(job.version,'0.2.0');assert.equal(job.production_paths.length,3);
 assert.deepEqual(job.production_paths.slice(0,2),legacy.production_paths);assert.deepEqual(job.references,legacy.references);
 const t=job.production_paths[2];assert.equal(t.transform_status,'NOT_PERFORMED');assert.equal(t.target_rgb_values,null);assert.equal(t.production_approval,'NOT_PROVIDED');assert.equal(t.beta_library_replacement,false);assert.equal(t.profile_identity,'FOGRA58_FINAL_PINNED');assert.equal(t.input_from_path,null);assert.deepEqual(t.input_references,job.production_paths[0].input_references);
 assert.deepEqual(await P.validate(copy(job),colors),job);assert.deepEqual(Buffer.from(t.profile.data_base64,'base64'),Buffer.from(raw));
 let rejected=0;async function reject(f){await assert.rejects(f);rejected++}
 for(const edit of [x=>x.production_paths[2].profile.sha256='0'.repeat(64),x=>x.production_paths[2].input_from_path='4C',x=>x.production_paths[2].target_rgb_values=[1,2,3],x=>x.production_paths[2].beta_library_replacement=true,x=>x.production_paths[2].measured_qc.status='PASS',x=>x.references[0].master_rgb[0]++,x=>x.production_paths.pop(),x=>x.version='0.1.0']){const bad=copy(job);edit(bad);await reject(()=>P.validate(bad,colors))}
 const bad=raw.slice();bad[bad.length-1]^=1;await reject(()=>P.readProfile(bad,'TextileRGB_FOGRA58.icc','TEXTILE_RGB'));await reject(()=>P.readProfile(raw,'fogra58.icc','4C'));await reject(()=>P.readProfile(raw,'fogra58.icc','ECG'));
 const changed=copy(paths);changed.TEXTILE_RGB.substrate='Different fabric';assert.deepEqual((await make(changed)).production_paths.slice(0,2),job.production_paths.slice(0,2));assert.match(P.report(job),/FOGRA58 RGB exchange space/);assert.match(P.report(job),/NOT_PERFORMED/);
 console.log(JSON.stringify({status:'PASS',official_profile_sha256:profile.sha256,profile_bytes_retained:true,legacy_import:true,branch_isolation:true,rejected_cases:rejected,conversion:'NOT_PERFORMED',textile_print:'NOT_MEASURED'}));
})().catch(e=>{console.error(e);process.exitCode=1});
