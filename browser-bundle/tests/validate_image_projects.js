'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{webcrypto,createHash}=require('node:crypto');
if(!global.crypto)Object.defineProperty(global,'crypto',{value:webcrypto});
global.ClarusHandoff=require('../vendor/clarus-handoff/clarus-handoff.js');
for(const file of ['palette-export','colour-handoff','colour-projects','image-project-codecs','image-projects'])require('../src/'+file+'.js');
const H=global.ClarusHandoff,A=global.ATLAS_COLOUR_HANDOFF,P=global.ATLAS_COLOUR_PROJECTS,I=global.ATLAS_IMAGE_PROJECTS,C=global.ATLAS_IMAGE_CODECS;
const data=require('../../hover-library/data/colors.json'),clone=x=>JSON.parse(JSON.stringify(x));
const sha=b=>createHash('sha256').update(b).digest('hex');
(async()=>{
  const ctx=await A.createContext(data.colors,data.master_sha256),green=[61,123,25],blue=[17,34,51],red=[185,73,65];
  const rgba=Uint8Array.from([...green,255,...red,255,...green,128,1,2,3,0,...green,255,...red,255,...green,255,...red,255]);
  const bytes=C.png(4,2,rgba);
  let palette=await P.create('Linked logo colours',ctx);palette=await P.add(palette,'Greens',require('./fixtures/colour-kit-030-two-greens.json'),ctx);
  let p=await I.create({name:'Image test',filename:'original.png',bytes,width:4,height:2,rgba,colourProject:palette},ctx);
  const original=clone(p);
  p=await I.edit(p,{kind:'RECOLOUR',rect:[0,0,4,2],match:green,replacement:blue,note:'Darker logo green.'},ctx);
  assert.deepEqual(p.history[0].affected_runs,[0,1,2,1,4,1,6,1]);assert.equal(p.history[0].changed_pixels,4);
  assert.equal(p.history[0].operation.source_reference.atlas_row_id,4966);
  let frame=(await I.verify(p,ctx)).frame;assert.deepEqual(Array.from(frame.slice(8,12)),[17,34,51,128]);assert.deepEqual(Array.from(frame.slice(12,16)),[1,2,3,0]);
  const recoloured=clone(p);
  p=await I.edit(p,{kind:'TRANSPARENT',rect:[0,0,2,2],match:null,note:'Remove the left block.'},ctx);
  frame=(await I.verify(p,ctx)).frame;assert.deepEqual(Array.from(frame.slice(0,4)),[17,34,51,0]);assert.deepEqual(p.history.at(-1).affected_runs,[0,2,4,2]);
  const removed=clone(p);
  p=await I.edit(p,{kind:'UNDO',note:'Restore the removed area.'},ctx);assert.equal(sha((await I.verify(p,ctx)).frame),recoloured.history.at(-1).after_rgba_sha256);
  p=await I.edit(p,{kind:'UNDO',note:'Back to the original.'},ctx);assert.deepEqual((await I.verify(p,ctx)).frame,rgba);assert.equal(p.history.length,4);
  p=await I.edit(p,{kind:'REDO',note:'Use darker green again.'},ctx);p=await I.edit(p,{kind:'REDO',note:'Repeat removal.'},ctx);assert.equal(sha((await I.verify(p,ctx)).frame),removed.history.at(-1).after_rgba_sha256);
  assert.deepEqual(p.history.slice(0,2),removed.history);assert.deepEqual(p.original,original.original);assert.deepEqual(p.colour_project,palette);
  const files=await I.exportFiles(p,ctx),zip=H.zipStored(files),opened=await I.importZip(zip,ctx);
  assert.deepEqual(opened,p);assert.deepEqual(files['original/image.png'],bytes);
  assert.deepEqual(JSON.parse(Buffer.from(files['colour-project.clarus.json'])),palette);
  assert.equal(I.relation(recoloured,p),'NEWER');assert.equal(I.relation(p,recoloured),'OLDER');assert.equal(I.relation(p,opened),'SAME');
  let fork=await I.edit(recoloured,{kind:'RECOLOUR',rect:[0,0,1,1],match:null,replacement:[1,1,1],note:'Alternative branch.'},ctx);
  assert.equal(I.relation(p,fork),'CONFLICT');
  let branch=await I.edit(p,{kind:'UNDO',note:'Try another route.'},ctx);
  branch=await I.edit(branch,{kind:'RECOLOUR',rect:[0,0,1,1],match:null,replacement:[2,2,2],note:'New route after undo.'},ctx);
  assert.equal((await I.verify(branch,ctx)).redo.length,0);assert.deepEqual(branch.history.slice(0,p.history.length),p.history);
  let rejected=0;async function reject(fn){await assert.rejects(fn);rejected++;}
  await reject(()=>I.edit(original,{kind:'UNDO',note:'Nothing to undo.'},ctx));
  await reject(()=>I.edit(branch,{kind:'REDO',note:'Abandoned redo.'},ctx));
  await reject(()=>I.edit(p,{kind:'RECOLOUR',rect:[0,0,5,2],match:null,replacement:blue,note:'Outside image.'},ctx));
  await reject(()=>I.edit(p,{kind:'RECOLOUR',rect:[0,0,4,2],match:[250,250,250],replacement:blue,note:'No matching pixels.'},ctx));
  await reject(()=>I.edit(p,{kind:'TRANSPARENT',rect:[0,0,4,2],match:null,note:''},ctx));
  for(const mutate of [x=>x.original.file_base64=x.original.file_base64.slice(4),x=>x.original.rgba_base64='AAAA',x=>x.original.width=5,x=>x.history[0].affected_runs[0]=1,x=>x.history[0].changed_pixels++,x=>x.history[2].operation.target_version=1,x=>x.history[0].operation.replacement_reference.atlas_row_id=0,x=>x.history[0].after_rgba_sha256='0'.repeat(64),x=>x.history.pop(),x=>x.history[1].parent_sha256=null,x=>x.colour_project.palettes[0].data.records[0].original.hex='#FFFFFF',x=>x.document_sha256='0'.repeat(64)]){
    const bad=clone(p);mutate(bad);await reject(()=>I.verify(bad,ctx));
  }
  const badFiles={...files,'edited.png':files['edited.png'].slice()};badFiles['edited.png'][40]^=1;await reject(()=>I.importZip(H.zipStored(badFiles),ctx));
  await reject(()=>I.importZip(zip.slice(0,-1),ctx));await reject(()=>I.importZip(H.zipStored({...files,'../escape':new Uint8Array()}),ctx));
  assert.throws(()=>I.dimensions(8193,1));assert.throws(()=>I.dimensions(4096,4096));
  // Large base64 input exercises the bounded decoder without recursive regexes.
  const large=new Uint8Array(1024*1024);large[large.length-1]=99;assert.deepEqual(I.unbase64(I.base64(large),large.length),large);
  const out=process.env.IMAGE_TEST_OUTPUT||'/tmp/atlas-image-projects-core';fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'project.zip'),zip);fs.writeFileSync(path.join(out,'expected-rgba.bin'),(await I.verify(p,ctx)).frame);fs.writeFileSync(path.join(out,'original.png'),bytes);
  console.log(JSON.stringify({status:'PASS',exact_rgb_and_region_masks:true,alpha_and_hidden_rgb_preserved:true,undo_redo_and_abandoned_history_retained:true,json_zip_roundtrip:true,linked_colour_project_retained:true,rejected_cases:rejected,native_adobe_validation:'NOT_TESTED'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
