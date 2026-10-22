'use strict';
const assert=require('node:assert/strict');
if(!global.crypto)global.crypto=require('node:crypto').webcrypto;
global.ClarusHandoff=require('../vendor/clarus-handoff/clarus-handoff.js');
for(const name of ['palette-export','colour-handoff','colour-projects','image-project-codecs','image-projects','reduction-job','tool-exchange'])require('../src/'+name+'.js');
const X=global.ATLAS_TOOL_EXCHANGE,H=global.ClarusHandoff,J=global.ATLAS_REDUCTION_JOB;
const master=require('../../hover-library/data/colors.json'),row=master.colors[4966],enc=s=>new TextEncoder().encode(s);
const hash=async b=>Buffer.from(await crypto.subtle.digest('SHA-256',b)).toString('hex');
(async()=>{
 const image=global.ATLAS_IMAGE_CODECS.png(1,1,Uint8Array.from([1,2,3,255]));
 // Deliberately different from the PNG pixel: verification must not remeasure or reassign.
 const record={schema:'atlas-clarus-camera-selection/1.0',source_rgb:[61,123,25],source_hex:'#3D7B19',reference_rgb:row.rgb,reference_hex:'#'+row.rgb.map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase(),atlas_row_id:row.id,atlas_reference:row.ref,library_id:'historical-unavailable-library',library_name:'Original historical selection',master_sha256:master.master_sha256,captured_at:'2026-10-21T10:00:00.000Z',status:'CAMERA_ESTIMATE',assignment:'RGB_NEAREST_LOWER_ROW_ID_TIEBREAK',sampling:{mode:'AREA_MEAN_RGB',bounds:[0,0,0,0],width:1,height:1,pixel_count:1},image:{name:'original.png',mime:'image/png',width:1,height:1,sha256:await hash(image)},extra:{preserve:'unknown fields'}};
 const raw=enc(' \n'+JSON.stringify(record,null,3)+'\n');
 const ctx=await X.context({colors:master.colors,master:master.master_sha256,decodeSource:()=>{throw Error('MUST NOT DECODE');},reduce:()=>{throw Error('MUST NOT REDUCE');}});
 let result=await X.addCamera(X.create(ctx),{imageBytes:image,recordBytes:raw},ctx),pkg=result.package;
 for(let i=0;i<3;i++)pkg=await X.importZip(await X.exportZip(pkg,ctx),ctx);
 const files=J.unzip(pkg.payloads[result.id]);assert.deepEqual(files['camera-image.png'],image);assert.deepEqual(files['camera-selection.json'],raw);
 assert.deepEqual((await X.verify(pkg,ctx)).get(result.id).data,record);
 for(const target of ['DECISIONS','REFERENCE_VIEW','PRINT_HANDOFF','COLOUR_PROJECT'])await assert.rejects(()=>X.derive(pkg,result.id,target,ctx),/archival only/);
 let rejected=0;async function reject(fn){await assert.rejects(fn);rejected++;}
 for(const name of Object.keys(files)){const missing={...files};delete missing[name];await reject(()=>X.inspect(H.zipStored(missing),ctx));}
 const changed=image.slice();changed[changed.length-1]^=1;
 await reject(()=>X.addCamera(pkg,{imageBytes:changed,recordBytes:raw},ctx));
 for(const change of [d=>d.image.sha256='not-a-hash',d=>d.image.sha256='0'.repeat(64),d=>d.master_sha256='0'.repeat(64),d=>d.reference_rgb=[0,0,0],d=>d.sampling.bounds=[0,0,4,4],d=>d.source_hex='#FFFFFF']){const bad=structuredClone(record);change(bad);await reject(()=>X.addCamera(pkg,{imageBytes:image,recordBytes:enc(JSON.stringify(bad))},ctx));}
 // Rehashing the outer exchange cannot hide a changed inner image.
 const bad=structuredClone(pkg);bad.payloads[result.id]=H.zipStored({...files,'camera-image.png':changed});bad.documents[0].sha256=await hash(bad.payloads[result.id]);bad.documents[0].size_bytes=bad.payloads[result.id].length;await reject(()=>X.verify(bad,ctx));
 assert.equal(pkg.documents.length,1);console.log(JSON.stringify({status:'PASS',roundtrips:3,exact_png_and_json:true,no_remeasurement:true,historical_library_retained:true,rejected}));
})().catch(e=>{console.error(e);process.exitCode=1;});
