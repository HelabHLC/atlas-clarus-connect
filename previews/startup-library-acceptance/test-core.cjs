const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]),profilePath=path.resolve(process.argv[3]);
global.window=global;
for(const n of ['atlas-data.js','colour-origin.js','palette-export.js','clarus-handoff.js','image-project-codecs.js','print-handoff.js'])vm.runInThisContext(fs.readFileSync(path.join(root,'assets',n),'utf8'));
for(const n of ['zip-reader.js','print-guide.js','library-acceptance.js','core.js'])vm.runInThisContext(fs.readFileSync(path.join(root,'startup',n),'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root,'icc/profile-catalog.js'),'utf8'));
const K=ATLAS_STARTUP_CORE,A=ATLAS_LIBRARY_ACCEPTANCE,ctx={master:ATLAS_CLARUS_DATA.master_sha256,colors:ATLAS_CLARUS_DATA.colors,views:ATLAS_CLARUS_DATA.views},master=JSON.stringify(ATLAS_CLARUS_DATA);
const copy=v=>JSON.parse(JSON.stringify(v)),bytes=new Uint8Array(fs.readFileSync(profilePath));
const colour=rgb=>({label:'Kundenfarbe',kind:'manual_srgb',source_rgb:rgb,reference_id:K.nearest(rgb,ctx).id,assignment:null});
const checks=[];
(async()=>{
 const profile={name:'PSOcoated_v3.icc',bytes,info:await ATLAS_CLARUS_PRINT.readProfile(bytes,'PSOcoated_v3.icc','4C')};
 const doc=K.defaults(ctx.master);doc.print.library_id='pso_coated_v3_fogra51';doc.print.substrate='Premium coated';doc.print.printing_condition='PSO Coated v3';doc.colours=[colour([234,99,37]),colour([24,74,61]),colour([245,241,222])];
 assert.deepEqual(A.check(doc,ctx,profile.info).rows.map(r=>r.status),['NOT_FOUND','FOUND','FOUND']);assert.throws(()=>A.requireAccepted(doc,ctx,profile.info));
 const reference=doc.colours[0].reference_id;assert.equal(reference,1737);assert.equal(K.nearest([234,99,37],ctx).id,reference);checks.push('Global RGB assignment retained; membership checked afterwards, never nearest-in-library substitution');
 const rejected=await K.pack({doc,profile,result:null,original:null},ctx),files=ATLAS_STARTUP_CODECS.unzip(rejected,K.MAX_ZIP);
 assert.equal(files['colours.clarus.json'],undefined);assert.equal(Object.keys(files).some(n=>n.startsWith('palettes/')),false);assert.ok(files['print/output.icc']);
 const restored=await K.unpack(rejected,ctx);assert.deepEqual(restored.doc,doc);assert.deepEqual(Buffer.from(restored.profile.bytes),Buffer.from(bytes));assert.equal(restored.result,null);checks.push('Rejected draft retains every source/reference and ICC; palette and Clarus outputs absent');
 const forged=copy(JSON.parse(new TextDecoder().decode(files['library-check.json'])));forged.status='ACCEPTED_FOR_LIBRARY';
 files['library-check.json']=new TextEncoder().encode(JSON.stringify(forged));const manifest=JSON.parse(new TextDecoder().decode(files['manifest.json']));manifest.files['library-check.json']={bytes:files['library-check.json'].length,sha256:await K.sha(files['library-check.json'])};files['manifest.json']=new TextEncoder().encode(JSON.stringify(manifest));
 await assert.rejects(()=>K.unpack(ClarusHandoff.zipStored(files),ctx),/Bibliotheksprüfung/);checks.push('Forged acceptance rejected even after checksums are recomputed');
 const good=copy(doc);good.colours=good.colours.slice(1);assert.equal(A.check(good,ctx,profile.info).status,'ACCEPTED_FOR_LIBRARY');
 const approved=await K.pack({doc:good,profile,result:null,original:null},ctx),out=ATLAS_STARTUP_CODECS.unzip(approved,K.MAX_ZIP);assert.ok(out['colours.clarus.json']);assert.equal(Object.keys(out).filter(n=>n.startsWith('palettes/')).length,6);
 assert.deepEqual((await K.unpack(approved,ctx)).doc,good);assert.deepEqual(Buffer.from(await K.pack({doc:good,profile,result:null,original:null},ctx)),Buffer.from(approved));checks.push('Accepted palette contains all six formats; deterministic ZIP and reopen');
 const wrong=copy(good);wrong.print.library_id='pso_uncoated_v3_fogra52';assert.notEqual(A.check(wrong,ctx,profile.info).status,'ACCEPTED_FOR_LIBRARY');
 for(const id of ['', 'core','exchange_fogra58_final','no_such_library','tcx']){wrong.print.library_id=id;assert.notEqual(A.check(wrong,ctx,profile.info).status,'ACCEPTED_FOR_LIBRARY',id);}
 const fogra58=ATLAS_ICC_CATALOG.profiles.textilergb_fogra58_icc;wrong.print.library_id='gamutmap_196';assert.notEqual(A.check(wrong,ctx,{sha256:fogra58.sha256}).status,'ACCEPTED_FOR_LIBRARY');assert.equal(A.suggestedLibrary(ctx,{sha256:fogra58.sha256}),'');
 assert.equal(A.suggestedLibrary(ctx,profile.info),'pso_coated_v3_fogra51');assert.notEqual(A.check(good,ctx,{sha256:'0'.repeat(64)}).status,'ACCEPTED_FOR_LIBRARY');checks.push('Unknown, master-only, hidden, mismatched and final-FOGRA58/beta substitutions fail closed');
 const legacy=copy(doc);delete legacy.acceptance_rule;delete legacy.print.library_id;const repacked=await K.pack({doc:legacy,profile,result:null,original:null},ctx);assert.equal(ATLAS_STARTUP_CODECS.unzip(repacked,K.MAX_ZIP)['colours.clarus.json'],undefined);
 const upgraded=await K.unpack(new Uint8Array(fs.readFileSync(process.argv[4])),ctx);assert.equal(upgraded.doc.acceptance_rule,A.RULE);assert.equal(A.check(upgraded.doc,ctx,profile.info).status,'NOT_ACCEPTED');checks.push('Legacy dossier upgraded; removing rule metadata cannot bypass export check');
 if(process.argv[5]){const original={name:'source-with-icc.png',bytes:new Uint8Array(fs.readFileSync(process.argv[5]))},origin=await ATLAS_COLOUR_ORIGIN.inspect(original.bytes),d=copy(doc),rgb=[234,99,37],ref=K.nearest(rgb,ctx);const assignment=ATLAS_CLARUS_EXPORTS.createSourceAssignment({size:1,count:1,rgb,std:[0,0,0],bounds:[0,0,0,0]},{ix:0,iy:0},{name:original.name,width:1,height:1,sha256:origin.file_sha256,colour_origin:origin},ref,ctx.master);d.colours=[{label:'Bildfarbe',kind:'image',source_rgb:rgb,reference_id:ref.id,assignment}];const z=await K.pack({doc:d,original,profile,result:null},ctx),again=await K.unpack(z,ctx);assert.deepEqual(Buffer.from(again.original.bytes),Buffer.from(original.bytes));assert.deepEqual(again.doc.colours,d.colours);assert.equal(origin.icc.status,'EMBEDDED_ICC');assert.equal(ATLAS_STARTUP_CODECS.unzip(z,K.MAX_ZIP)['colours.clarus.json'],undefined);checks.push('Rejected image colour preserves original PNG including embedded ICC and complete source assignment');}
 const bad=copy(doc);bad.colours[0].reference_id=doc.colours[1].reference_id;assert.throws(()=>K.validate(bad,ctx));
 assert.equal(JSON.stringify(ATLAS_CLARUS_DATA),master);checks.push('All 13,283 master rows and membership lists unchanged');
 console.log(JSON.stringify({status:'PASS',checks},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
