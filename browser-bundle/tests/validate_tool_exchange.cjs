'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webcrypto}=require('node:crypto');if(!global.crypto)Object.defineProperty(global,'crypto',{value:webcrypto});
global.ClarusHandoff=require('../vendor/clarus-handoff/clarus-handoff.js');
for(const n of ['palette-export','colour-handoff','colour-projects','image-project-codecs','image-projects','pkl-image-binding','colour-reduction','colour-reduction-original','colour-reduction-region','reference-card','colour-reference-card','print-handoff','reduction-job','tool-exchange'])require('../src/'+n+'.js');
const recovered=path.resolve(__dirname,'../../releases/rc33.8/recovered/assets');for(const n of ['colour-reduction-corrections','colour-reduction-library','colour-reduction-scoped-cleanup'])require(path.join(recovered,n+'.js'));
const X=global.ATLAS_TOOL_EXCHANGE,H=global.ClarusHandoff,E=global.ATLAS_CLARUS_EXPORTS,A=global.ATLAS_COLOUR_HANDOFF,P=global.ATLAS_COLOUR_PROJECTS,I=global.ATLAS_IMAGE_PROJECTS,J=global.ATLAS_REDUCTION_JOB,Print=global.ATLAS_CLARUS_PRINT,C=global.ATLAS_IMAGE_CODECS;
const m=require('../../hover-library/data/colors.json'),fixture=require('./fixtures/colour-kit-030-two-greens.json'),enc=d=>H.utf8(JSON.stringify(d)+'\n'),clone=structuredClone;
(async()=>{
 const rgba=Uint8Array.from([61,123,25,255,60,123,25,255,0,0,0,255,255,255,255,255]),source=C.png(4,1,rgba);
 const ctx=await X.context({colors:m.colors,master:m.master_sha256,libraryViews:{test:{name:'Test',ids:[0,4966,10519]}},decodeSource:async b=>{assert.deepEqual(b,source);return {width:4,height:1,rgba:rgba.slice()};}});
 let pkg=X.create(ctx);const palette=JSON.parse(fixture.bundle_origin.document_text);palette.user_metadata={note:'Do not discard',fraction:.25};
 const raw=H.utf8(' \n'+JSON.stringify(palette,null,3)+'\n'),original=await X.add(pkg,{filename:'Original palette.clarus.json',bytes:raw},ctx);pkg=original.package;
 const initial=clone(pkg),d=await X.derive(pkg,original.id,'DECISIONS',ctx);pkg=d.package;
 const decisions=(await X.inspect(pkg.payloads[d.ids[0]],ctx)).data;assert.deepEqual(decisions.records.map(r=>r.source_rgb),[[61,123,25],[60,123,25]]);assert.deepEqual(decisions.records.map(r=>r.atlas_row_id),[4966,4966]);
 const cp=await X.derive(pkg,d.ids[0],'COLOUR_PROJECT',ctx);pkg=cp.package;let project=(await X.inspect(pkg.payloads[cp.ids[0]],ctx)).data;const entry=P.latest(project).entries[0].entry_id,c=P.palette(project,entry).records[0];
 project=await P.choose(project,entry,c.decision_id,c.revision_id,'Keep original choice.',ctx.native);project=await P.edit(project,entry,c.decision_id,'Edited green','#112233','Designer change.',ctx.native);
 const edited=await X.add(pkg,{filename:'edited-project.json',bytes:enc(project),parents:[cp.ids[0]],operation:'CAPTURED_TOOL_EDIT'},ctx);pkg=edited.package;
 const returned=await X.derive(pkg,edited.id,'DECISIONS',ctx);pkg=returned.package;const rd=(await X.inspect(pkg.payloads[returned.ids[0]],ctx)).data;
 assert.equal(rd.records[0].original.hex,'#112233');assert.equal(rd.decisions.nodes.length,3);assert.equal(JSON.parse(rd.bundle_origin.document_text).user_metadata.fraction,.25);
 const recoveredPalette=await X.derive(pkg,returned.ids[0],'SOURCE_PALETTE',ctx);pkg=recoveredPalette.package;assert.deepEqual(JSON.parse(new TextDecoder().decode(pkg.payloads[recoveredPalette.ids[0]])),palette);
 assert.deepEqual(pkg.payloads[original.id],raw);assert.deepEqual(initial.documents,pkg.documents.slice(0,1));
 const card=await X.derive(pkg,returned.ids[0],'REFERENCE_CARDS',ctx);pkg=card.package;const cards=(await X.inspect(pkg.payloads[card.ids[0]],ctx));assert.equal(cards.kind,'DECISION_CARD');assert.deepEqual(cards.data,rd);
 const fromCard=await X.derive(pkg,card.ids[0],'COLOUR_PROJECT',ctx);pkg=fromCard.package;
 const print=await X.derive(pkg,returned.ids[0],'PRINT_HANDOFF',ctx);pkg=print.package;assert.equal((await X.inspect(pkg.payloads[print.ids[0]],ctx)).kind,'PRINT_HANDOFF');
 // Embedded ICC bytes and separate 4C/ECG settings remain in the complete source.
 function icc(space){const b=new Uint8Array(160),v=new DataView(b.buffer),put=(o,s)=>b.set(H.utf8(s),o);v.setUint32(0,160);b[8]=4;b[9]=0x30;put(12,'prtr');put(16,space);put(20,'Lab ');put(36,'acsp');v.setUint32(64,1);v.setUint32(128,1);put(132,'cprt');v.setUint32(136,144);v.setUint32(140,16);put(144,'text');put(152,'TEST');return b;}
 const p4=await Print.readProfile(icc('CMYK'),'synthetic-4C.icc','4C'),p7=await Print.readProfile(icc('7CLR'),'synthetic-ECG.icc','ECG');
 const printData=await Print.create({entries:[m.colors[4966]],colors:m.colors,master:m.master_sha256,name:'Independent paths',paths:{'4C':{...Print.emptySettings(),profile:p4,substrate:'SYNTHETIC PAPER',rendering_intent:'Relative colorimetric',black_point_compensation:false},ECG:{...Print.emptySettings(),profile:p7,substrate:'SYNTHETIC ECG PAPER',rendering_intent:'Perceptual',black_point_compensation:true}}});
 const profiledBytes=enc(printData),profiled=await X.add(pkg,{filename:'profiled.print-handoff.json',bytes:profiledBytes},ctx);pkg=profiled.package;const pv=await X.derive(pkg,profiled.id,'REFERENCE_VIEW',ctx);pkg=pv.package;assert.deepEqual(pkg.payloads[profiled.id],profiledBytes);assert.equal((await X.inspect(pkg.payloads[profiled.id],ctx)).data.production_paths[1].profile.data_base64,p7.data_base64);
 // Complete native ZIPs retain files with randomized handoff export IDs.
 const cpzip=await X.add(pkg,{filename:'project.zip',bytes:H.zipStored(await P.exportPackage(project,ctx.native))},ctx);pkg=cpzip.package;
 const handoff=await X.add(pkg,{filename:'handoff.zip',bytes:H.zipStored(await H.exportHandoff(rd,ctx.native))},ctx);pkg=handoff.package;
 // A full Image Project travels into the reduction job and back without discarding its palette/history.
 let image=await I.create({name:'Image',filename:'source.png',bytes:source,width:4,height:1,rgba,colourProject:project},ctx.native);
 const imageNode=await X.add(pkg,{filename:'image.json',bytes:enc(image)},ctx);pkg=imageNode.package;
 const imageZip=await X.add(pkg,{filename:'image.zip',bytes:H.zipStored(await I.exportFiles(image,ctx.native))},ctx);pkg=imageZip.package;
 const settings={protectionMode:'ORIGINAL_RGBA',libraryId:'test',libraryName:'Test',libraryIds:[0,4966,10519],k:4,lockedIds:[],originalRgbs:[[61,123,25],[60,123,25]],protectedRectangles:[],regionCorrections:[]};
 const input={width:4,height:1,rgba,name:'Image',sourceName:'source.png',sourceBytes:source,sourceMime:'image/png',project:image},result=global.ATLAS_COLOUR_REDUCTION.reduce({...settings,...input,colors:m.colors,master:m.master_sha256});
 const job={schema:J.SCHEMA,master_sha256:m.master_sha256,input,settings,result,uncleaned:result,variants:[],view:{zoom:1,x:.5,y:.5,selected:null,region:null,active:'current',overlay:false,difference:false,threshold:40,cleanupMin:16,cleanupScope:'MASK_ONLY'}};
 const jobBytes=H.zipStored(await J.exportFiles(job,{},ctx.job)),jobNode=await X.add(pkg,{filename:'job.zip',bytes:jobBytes,parents:[imageNode.id]},ctx);pkg=jobNode.package;
 const backImage=await X.derive(pkg,jobNode.id,'IMAGE_PROJECT_SOURCE',ctx);pkg=backImage.package;assert.deepEqual((await X.inspect(pkg.payloads[backImage.ids[0]],ctx)).data,image);
 const referenceView=await X.derive(pkg,jobNode.id,'REFERENCE_VIEW',ctx);pkg=referenceView.package;assert.deepEqual(pkg.payloads[jobNode.id],jobBytes);
 const outputInputs=await X.derive(pkg,jobNode.id,'DECISIONS',ctx);pkg=outputInputs.package;assert.deepEqual((await X.inspect(pkg.payloads[outputInputs.ids[0]],ctx)).data.records.map(r=>r.source_rgb),result.report.palette.map(c=>c.rgb));
 // Raw formats remain exact attachments; never silently relabel as native.
 const attachment=Uint8Array.from([0,255,17,123,8]),attached=await X.add(pkg,{filename:'recipe.bin',bytes:attachment,attachment:true},ctx);pkg=attached.package;
 const before=clone(pkg),zip=await X.exportZip(pkg,ctx),back=await X.importZip(zip,ctx);assert.deepEqual(back,pkg);assert.deepEqual(back.payloads[original.id],raw);assert.deepEqual(back.payloads[attached.id],attachment);
 const zip2=await X.exportZip(back,ctx);assert.deepEqual(await X.importZip(zip2,ctx),pkg);assert.deepEqual(pkg,before);
 // More than 250 sampled originals are split into complete native sets, never shortened.
 const many=clone(palette);many.source_assignments=Array.from({length:501},(_,i)=>clone(palette.source_assignments[i%2]));
 const bigSource=await X.add(X.create(ctx),{filename:'501-originals.json',bytes:enc(many)},ctx);const bigDecisions=await X.derive(bigSource.package,bigSource.id,'DECISIONS',ctx);assert.equal(bigDecisions.ids.length,3);
 let transferred=0;for(const id of bigDecisions.ids)transferred+=(await X.inspect(bigDecisions.package.payloads[id],ctx)).data.records.length;assert.equal(transferred,501);
 const bigProject=await X.derive(bigSource.package,bigSource.id,'COLOUR_PROJECT',ctx);const bp=(await X.inspect(bigProject.package.payloads[bigProject.ids[0]],ctx)).data;assert.equal(P.latest(bp).entries.length,3);
 let rejected=0;const reject=async fn=>{await assert.rejects(fn);rejected++;};
 await reject(()=>X.exportZip(X.create(ctx),ctx));
 await reject(()=>X.add(pkg,{filename:'invalid.json',bytes:enc({...palette,master_sha256:'0'.repeat(64)})},ctx));
 await reject(()=>X.add(pkg,{filename:'unknown.json',bytes:enc({schema:'UNKNOWN'})},ctx));
 await reject(()=>X.derive(pkg,attached.id,'DECISIONS',ctx));
 await reject(()=>X.add(pkg,{filename:'bad-parent.json',bytes:raw,parents:[crypto.randomUUID()]},ctx));
 for(const change of [p=>p.payloads[original.id][0]^=1,p=>p.documents[1].parents=[p.documents[1].id],p=>p.documents[0].kind='COLOUR_PROJECT',p=>p.documents[0].sha256='0'.repeat(64),p=>p.payloads.extra=new Uint8Array(),p=>p.master_sha256='0'.repeat(64)]){const bad=clone(pkg);change(bad);await reject(()=>X.verify(bad,ctx));}
 const rehashed=clone(pkg),broken=JSON.parse(new TextDecoder().decode(rehashed.payloads[original.id]));broken.references[0].master_rgb[0]^=1;rehashed.payloads[original.id]=enc(broken);rehashed.documents[0].size_bytes=rehashed.payloads[original.id].length;rehashed.documents[0].sha256=await ctx.native.sha(rehashed.payloads[original.id]);await reject(()=>X.verify(rehashed,ctx));
 await reject(()=>X.importZip(zip.slice(0,-1),ctx));
 const out=process.env.EXCHANGE_TEST_OUTPUT;if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'exchange.zip'),zip);fs.writeFileSync(path.join(out,'original-palette.json'),raw);fs.writeFileSync(path.join(out,'expected-documents.json'),JSON.stringify(pkg.documents,null,2));}
 console.log(JSON.stringify({status:'PASS',source_bytes_exact:true,two_originals_one_reference:true,palette_decisions_project_edit_return:true,choices_history_retained:true,cards_print_native_packages:true,embedded_icc_exact:true,all_501_originals_transferred:true,image_job_source_return:true,repeated_exchange_roundtrip:true,opaque_attachment_exact:true,documents:pkg.documents.length,rejected}));
})().catch(e=>{console.error(e);process.exitCode=1;});
