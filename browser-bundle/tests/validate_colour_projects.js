// Project exchange and provenance checks against the real 13,283-row master.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webcrypto,createHash}=require('node:crypto');
if(!global.crypto)Object.defineProperty(global,'crypto',{value:webcrypto});
const H=global.ClarusHandoff=require('../vendor/clarus-handoff/clarus-handoff.js');
require('../src/palette-export.js');require('../src/colour-handoff.js');require('../src/colour-projects.js');
const A=global.ATLAS_COLOUR_HANDOFF,P=global.ATLAS_COLOUR_PROJECTS,E=global.ATLAS_CLARUS_EXPORTS;
const source=require('../../hover-library/data/colors.json'),fixture=require('./fixtures/colour-kit-030-two-greens.json');
const clone=x=>JSON.parse(JSON.stringify(x)),sha=b=>createHash('sha256').update(b).digest('hex');
(async()=>{
  const ctx=await A.createContext(source.colors,source.master_sha256);
  let p=await P.create('Startup logo',ctx),empty=clone(p);
  p=await P.add(p,'Logo greens',fixture,ctx);
  const original=clone(p),id=P.latest(p).entries[0].entry_id,c=fixture.records[0];
  p=await P.choose(p,id,c.decision_id,c.revision_id,'Use the starting green.',ctx);
  const selected=clone(p);
  p=await P.edit(p,id,c.decision_id,'Logo green','#112233','Try a darker colour.',ctx);
  assert.deepEqual(P.latest(p).selected,P.latest(selected).selected);
  const edited=P.palette(p,id),r=edited.records[0];
  assert.equal(r.decision_id,c.decision_id);assert.notEqual(r.revision_id,c.revision_id);
  assert.deepEqual(edited.decisions.nodes.slice(0,fixture.decisions.nodes.length),fixture.decisions.nodes);
  assert.equal(edited.decisions.nodes.at(-1).parent_revision_id,c.revision_id);
  assert.equal(edited.bundle_origin.document_text,fixture.bundle_origin.document_text);
  assert.deepEqual(P.latest(p).entries.map(e=>e.entry_id),[id]);
  assert.deepEqual(p.palettes[0].data,fixture);
  assert.equal(P.palette(original,id).records[0].original.hex,c.original.hex,'input project is immutable');
  // A second source document stays separate, including its image origin.
  const doc=JSON.parse(fixture.bundle_origin.document_text);doc.palette_name='Second source';
  doc.source_assignments.forEach(s=>s.image.name='second-source.png');
  const second=await A.derive(doc,'RECORDED_ORIGINALS',0,2,ctx);
  second.user_metadata={fraction:0.25,label:'Preserve arbitrary palette metadata'};
  p=await P.add(p,'Second image',second,ctx);
  assert.equal(p.palettes.at(-1).data.user_metadata.fraction,0.25);
  const unsafe='<img src=x onerror=alert(1)>';
  p=await P.rename(p,unsafe,ctx);p=await P.note(p,'Reason: '+unsafe,ctx);
  const complete=clone(p);await P.verify(complete,ctx);assert.deepEqual(complete,p);
  const files=await P.exportPackage(p,ctx),manifest=JSON.parse(Buffer.from(files['project-package-manifest.json']));
  for(const [name,hash]of Object.entries(manifest.files))assert.equal(sha(files[name]),hash);
  assert.deepEqual(JSON.parse(Buffer.from(files['project.clarus.json'])),p);
  const passport=Buffer.from(files['colour-passport.html']).toString();
  assert(!passport.includes(unsafe));assert(passport.includes('&lt;img'));
  const working=JSON.parse(Buffer.from(files['working/'+id+'/palette.clarus.json']));
  const chosen=JSON.parse(Buffer.from(files['chosen/'+id+'/palette.clarus.json']));
  await A.verify(working,ctx);await A.verify(chosen,ctx);
  assert.deepEqual(E.readAse(files['working/'+id+'/palette.ase']).map(x=>x.rgb),[[17,34,51],[60,123,25]]);
  assert.deepEqual(E.readAse(files['chosen/'+id+'/palette.ase']).map(x=>x.rgb),[c.source_rgb]);
  assert.equal(chosen.records.length,1);assert.equal(chosen.records[0].revision_id,c.revision_id);
  assert.deepEqual(chosen.decisions,working.decisions);assert.deepEqual(chosen.bundle_origin,fixture.bundle_origin);
  assert.equal(Object.keys(files).filter(k=>k.startsWith('chosen/')).length,4,'only explicitly chosen colours exported');
  const returned=await H.returnHandoff(files['working/'+id+'/palette.clarus.json'],files['working/'+id+'/handoff.json'],files['working/'+id+'/palette.ase'],ctx);
  const updated=await P.update(p,id,returned.data,'Returned swatches.',ctx);
  assert.equal(P.palette(updated,id).decisions.nodes.length,working.decisions.nodes.length+working.records.length);
  assert.deepEqual(P.latest(updated).selected,P.latest(p).selected);
  assert.deepEqual(p,complete,'export and update do not mutate the previous project');
  assert.equal(P.importRelation(p,clone(p)),'SAME');assert.equal(P.importRelation(p,updated),'NEWER');
  assert.equal(P.importRelation(updated,p),'OLDER');
  const branch=await P.note(p,'Alternative note.',ctx);assert.equal(P.importRelation(updated,branch),'CONFLICT');
  assert.equal(P.importRelation(p,await P.create('Different project',ctx)),'NEW');
  let rejected=0;async function reject(fn){await assert.rejects(fn);rejected++;}
  for(const change of [x=>x.document_sha256='0'.repeat(64),x=>x.palettes[0].data.bundle_origin.document_text+=' ',x=>x.revisions[2].selected[0].revision_id='0'.repeat(64),x=>x.revisions.splice(2,1),x=>x.revisions[0].name='Changed',x=>x.palettes.push(clone(x.palettes[0])),x=>x.revisions.at(-1).unknown=true]){
    const bad=clone(p);change(bad);await reject(()=>P.verify(bad,ctx));
  }
  await reject(()=>P.update(p,id,fixture,'Do not silently revert.',ctx));
  await reject(()=>P.update(p,id,second,'Do not replace origin.',ctx));
  await reject(()=>P.choose(p,id,c.decision_id,'0'.repeat(64),'Invalid choice.',ctx));
  await reject(()=>P.edit(p,id,c.decision_id,'Changed','#ZZZZZZ','Bad RGB.',ctx));
  await reject(()=>P.edit(p,id,c.decision_id,'Changed','#123456','',ctx));
  const noChoice=await P.choose(p,id,c.decision_id,null,'Clear design choice.',ctx);
  assert.equal(P.latest(noChoice).selected.length,0);
  // Bounds must fail without shortening the retained history.
  let limit=empty;for(let i=1;i<200;i++)limit=await P.note(limit,'Note '+i,ctx);
  const before=JSON.stringify(limit);await reject(()=>P.note(limit,'Too many versions.',ctx));assert.equal(JSON.stringify(limit),before);
  const oversized=clone(p);oversized.padding='x'.repeat(P.LIMIT);await reject(()=>P.verify(oversized,ctx));
  const out=process.env.PROJECTS_TEST_OUTPUT;
  if(out){fs.mkdirSync(out,{recursive:true});for(const [name,bytes]of Object.entries(files)){const file=path.join(out,'package',name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);}fs.writeFileSync(path.join(out,'project.zip'),H.zipStored(files));}
  console.log(JSON.stringify({status:'PASS',retained_complete_sources:2,chosen_revision_survives_edit:true,project_roundtrip:true,working_and_chosen_handoff_verified:true,returned_decisions_update:true,rejected_cases:rejected,native_adobe_validation:'NOT_TESTED'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
