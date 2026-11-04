const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
global.window=global;
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
for(const n of ['assets/atlas-data.js','assets/colour-origin.js','assets/palette-export.js','assets/clarus-handoff.js','assets/image-project-codecs.js','assets/print-handoff.js','icc/profile-catalog.js','startup/zip-reader.js','startup/print-guide.js','startup/library-acceptance.js','startup/colour-advice.js','startup/core.js'])vm.runInThisContext(fs.readFileSync(path.join(root,n),'utf8'));
const K=ATLAS_STARTUP_CORE,A=ATLAS_LIBRARY_ACCEPTANCE,D=ATLAS_COLOUR_ADVICE;
const ctx={colors:ATLAS_CLARUS_DATA.colors,views:ATLAS_CLARUS_DATA.views,master:ATLAS_CLARUS_DATA.master_sha256},baseline=JSON.stringify(ATLAS_CLARUS_DATA),copy=x=>JSON.parse(JSON.stringify(x));
const colour=rgb=>({label:'Kundenfarbe',kind:'manual_srgb',source_rgb:rgb,reference_id:K.nearest(rgb,ctx).id,assignment:null});
const checks=[];
(async()=>{
 const pairs=fs.readFileSync(path.join(__dirname,'fixtures/ciede2000-author-tests.txt'),'utf8').trim().split(/\r?\n/).filter(l=>l.trim()).map(l=>l.trim().split(/\s+/).map(Number));
 assert.equal(pairs.length,34);for(const t of pairs){assert.ok(Math.abs(D.deltaE00(t.slice(0,3),t.slice(3,6))-t[6])<.00005,JSON.stringify(t));assert.ok(Math.abs(D.deltaE00(t.slice(3,6),t.slice(0,3))-t[6])<.00005);}
 assert.deepEqual(D.lab([255,255,255]),[100,0,0]);assert.deepEqual(D.lab([0,0,0]),[0,0,0]);assert.ok(Math.abs(D.lab([255,0,0])[0]-53.2371155954)<1e-9);assert.equal(D.deltaE00([50,20,0],[50,20,0]),0);
 checks.push('All 34 Sharma/Wu/Dalal reference pairs, reversed pairs, achromatic/identical and sRGB endpoints pass');
 const doc=K.defaults(ctx.master);doc.print.library_id='pso_coated_v3_fogra51';doc.print.printing_condition='PSO Coated v3';doc.print.substrate='Gestrichenes Papier';doc.colours=[[234,99,37],[24,74,61],[245,241,222]].map(colour);doc.advice={schema:D.SCHEMA,tolerance:null};
 const original=copy(doc.colours),best=D.nearest(doc.colours[0],ctx,doc.print.library_id);
 assert.equal(doc.colours[0].reference_id,1737);assert.equal(best.reference_id,1736);assert.ok(Math.abs(best.delta_e00-1.153921033120213)<1e-12);
 const list=D.alternatives(doc,ctx);assert.ok(list.whole_palette.some(l=>l.library_id==='gamutmap_154'));
 for(const lib of list.whole_palette)for(const c of original)assert.ok(D.members(ctx,lib.library_id).has(c.reference_id));
 assert.ok(!list.whole_palette.some(l=>['core','tcx','exchange_fogra58_final'].includes(l.library_id)));
 assert.equal(D.nearest(original[0],ctx,'exchange_fogra58_final'),null);assert.equal(D.nearest(original[0],ctx,'tcx'),null);
 assert.equal(A.check(doc,ctx).status,'NOT_ACCEPTED');assert.throws(()=>D.decision(doc.colours[0],ctx,doc.print.library_id,null));
 doc.advice.tolerance=best.delta_e00-1e-10;assert.throws(()=>D.decision(doc.colours[0],ctx,doc.print.library_id,doc.advice.tolerance));
 doc.advice.tolerance=best.delta_e00;doc.colours[0].replacement=D.decision(doc.colours[0],ctx,doc.print.library_id,doc.advice.tolerance);assert.equal(A.check(doc,ctx).status,'ACCEPTED_FOR_LIBRARY');assert.equal(A.check(doc,ctx).rows[0].status,'REPLACEMENT_FOUND');
 assert.deepEqual(doc.colours.map(({replacement,...rest})=>rest),original);assert.equal(K.nearest(doc.colours[0].source_rgb,ctx).id,1737);
 checks.push('Real orange: original 1737 retained, nearest PSO51 member 1736; exact unrounded tolerance boundary and explicit acceptance');
 const state={doc,original:null,profile:null,result:null};const zip=await K.pack(state,ctx),restored=await K.unpack(zip,ctx),files=ATLAS_STARTUP_CODECS.unzip(zip,K.MAX_ZIP);
 assert.deepEqual(restored.doc,doc);assert.deepEqual(Buffer.from(await K.pack(state,ctx)),Buffer.from(zip));assert.equal(Object.keys(files).filter(n=>n.startsWith('palettes/')).length,9);
 const originalParsed=ATLAS_CLARUS_EXPORTS.parseClarus(JSON.parse(new TextDecoder().decode(files['colours.clarus.json'])),ctx.colors,ctx.master),selected=ATLAS_CLARUS_EXPORTS.parseClarus(JSON.parse(new TextDecoder().decode(files['accepted.clarus.json'])),ctx.colors,ctx.master);
 assert.ok(originalParsed.colorIds.includes(1737));assert.ok(!selected.colorIds.includes(1737));assert.ok(selected.colorIds.includes(1736));
 assert.deepEqual(K.palette(doc,ctx,'source')[0].rgb,[234,99,37]);assert.deepEqual(K.palette(doc,ctx,'reference')[0].rgb,ctx.colors.find(c=>c.id===1737).rgb);assert.deepEqual(K.palette(doc,ctx,'accepted')[0].rgb,[232,104,42]);
 fs.writeFileSync(path.join(out,'confirmed-Farbmappe.zip'),zip);checks.push('Deterministic ZIP and reopen retain source, original and accepted palettes separately; selected Clarus imports without false source assignments');
 for(const mutate of [d=>d.colours[0].replacement.delta_e00=0,d=>d.colours[0].replacement.reference_id=0,d=>d.colours[0].replacement.confirmed=false,d=>d.colours[0].replacement.source_rgb=[0,0,0],d=>d.colours[0].replacement.master_sha256='0'.repeat(64),d=>d.colours[0].replacement.basis='HLC_LAB']){const bad=copy(doc);mutate(bad);assert.throws(()=>K.validate(bad,ctx));}
 const broken=copy(doc);delete broken.advice;assert.throws(()=>K.validate(broken,ctx));
 const f=ATLAS_STARTUP_CODECS.unzip(zip,K.MAX_ZIP),report=JSON.parse(new TextDecoder().decode(f['colour-advice.json']));report.rows[0].candidate.delta_e00=0;f['colour-advice.json']=new TextEncoder().encode(JSON.stringify(report));const manifest=JSON.parse(new TextDecoder().decode(f['manifest.json']));manifest.files['colour-advice.json']={bytes:f['colour-advice.json'].length,sha256:await K.sha(f['colour-advice.json'])};f['manifest.json']=new TextEncoder().encode(JSON.stringify(manifest));await assert.rejects(()=>K.unpack(ClarusHandoff.zipStored(f),ctx),/Farbberatung/);
 checks.push('Forged replacements, source values, basis, master and recalculated-checksum advisory reports rejected');
 for(const mutate of [d=>d.advice.tolerance=0,d=>d.print.library_id='pso_uncoated_v3_fogra52']){const changed=copy(doc);mutate(changed);assert.equal(D.active(changed.colours[0],changed,ctx),null);assert.equal(A.check(changed,ctx).status,'NOT_ACCEPTED');assert.deepEqual(D.effective(changed.colours[0],changed,ctx).id,1737);const draft=await K.pack({doc:changed,profile:null,original:null,result:null},ctx);assert.equal(ATLAS_STARTUP_CODECS.unzip(draft,K.MAX_ZIP)['accepted.clarus.json'],undefined);assert.deepEqual((await K.unpack(draft,ctx)).doc,changed);}
 const undone=copy(doc);delete undone.colours[0].replacement;assert.equal(A.check(undone,ctx).status,'NOT_ACCEPTED');
 const empty=copy(doc);empty.colours=[];assert.equal(D.alternatives(empty,ctx).whole_palette.length,0);
 for(const invalid of [NaN,Infinity,-1,101,'2'])assert.equal(D.validTolerance(invalid),false);
 checks.push('Changed library/tolerance invalidates earlier decision; undo and no-candidate paths stay draft');
 {
  const image=new Uint8Array(process.argv[4]?fs.readFileSync(process.argv[4]):Buffer.from(fs.readFileSync(path.join(__dirname,'fixtures/source-with-icc.png.base64'),'utf8'),'base64')),origin=await ATLAS_COLOUR_ORIGIN.inspect(image),d=copy(doc),rgb=[234,99,37],ref=ctx.colors.find(c=>c.id===1737);
  const assignment=ATLAS_CLARUS_EXPORTS.createSourceAssignment({size:1,count:1,rgb,std:[0,0,0],bounds:[0,0,0,0]},{ix:0,iy:0},{name:'source-with-icc.png',width:1,height:1,sha256:origin.file_sha256,colour_origin:origin},ref,ctx.master);
  d.colours=[{...copy(doc.colours[0]),kind:'recorded_srgb',assignment}];
  const z=await K.pack({doc:d,original:null,profile:null,result:null},ctx),f=ATLAS_STARTUP_CODECS.unzip(z,K.MAX_ZIP),p=ATLAS_CLARUS_EXPORTS.parseClarus(JSON.parse(new TextDecoder().decode(f['colours.clarus.json'])),ctx.colors,ctx.master);
  assert.equal(p.sourceAssignments.length,1);assert.deepEqual(p.sourceAssignments[0],assignment);assert.equal(p.sourceAssignments[0].atlas_row_id,1737);assert.equal(JSON.parse(new TextDecoder().decode(f['manifest.json'])).original,null);assert.deepEqual((await K.unpack(z,ctx)).doc,d);
  checks.push('Recorded Browser image source survives original Clarus export even when its image file is absent; source is never rebound to replacement');
 }
 const known=ATLAS_ICC_CATALOG.profiles.psocoated_v3_icc;assert.equal(A.check(doc,ctx,{sha256:known.sha256}).status,'ACCEPTED_FOR_LIBRARY');assert.equal(A.check(doc,ctx,{sha256:'0'.repeat(64)}).status,'NOT_ACCEPTED');
 const beta=copy(doc);beta.print.library_id='gamutmap_196';assert.equal(A.check(beta,ctx,{sha256:ATLAS_ICC_CATALOG.profiles.textilergb_fogra58_icc.sha256}).status,'NOT_ACCEPTED');
 // A direct library click is a reference, not an invented customer image colour.
 const direct=copy(doc);direct.colours=[{label:'Direkte Referenz',kind:'atlas_reference',source_rgb:[...ctx.colors[1737].rgb],reference_id:1737,assignment:null}];K.validate(direct,ctx);
 assert.equal(JSON.stringify(ATLAS_CLARUS_DATA),baseline);const tied={master:'test',colors:[{id:1,rgb:[255,0,0]},{id:9,rgb:[254,0,0]},{id:10,rgb:[254,0,0]}],views:{target:{type:'SOURCE_DECLARED_GAMUT_MEMBERSHIP',ids:[10,9]}}};assert.equal(D.nearest({source_rgb:[255,0,0]},tied,'target').reference_id,9);tied.views.bad={type:'SOURCE_DECLARED_GAMUT_MEMBERSHIP',ids:[123]};assert.equal(D.nearest({source_rgb:[255,0,0]},tied,'bad'),null);
 checks.push('Profile mismatch and beta/final guards retained; all master data unchanged');
 console.log(JSON.stringify({status:'PASS',checks,orange:best},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
