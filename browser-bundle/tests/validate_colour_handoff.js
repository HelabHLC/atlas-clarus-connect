// Protocol checks against real master data and a previously exported Colour Kit fixture.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webcrypto,createHash}=require('node:crypto');
if(!global.crypto)Object.defineProperty(global,'crypto',{value:webcrypto});
const H=global.ClarusHandoff=require('../vendor/clarus-handoff/clarus-handoff.js');
require('../src/palette-export.js');require('../src/colour-handoff.js');
const A=global.ATLAS_COLOUR_HANDOFF,E=global.ATLAS_CLARUS_EXPORTS;
const source=require('../../hover-library/data/colors.json');
const fixture=require('./fixtures/colour-kit-030-two-greens.json');
const clone=x=>JSON.parse(JSON.stringify(x));
// Independent binary writer: reverse order, group blocks, cosmetic suffix and edits.
function ase(entries){
  const u16=n=>{const b=Buffer.alloc(2);b.writeUInt16BE(n);return b;},u32=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n);return b;};
  const name=s=>Buffer.concat([u16(s.length+1),...Array.from({length:s.length},(_,i)=>u16(s.charCodeAt(i))),u16(0)]);
  const block=(type,b)=>Buffer.concat([u16(type),u32(b.length),b]);
  const blocks=[block(0xc001,name('Returned'))];
  for(const e of entries){const rgb=Buffer.alloc(12);e.rgb.forEach((v,i)=>rgb.writeFloatBE(v/255,i*4));blocks.push(block(1,Buffer.concat([name(e.name),Buffer.from('RGB '),rgb,u16(2)])));}
  blocks.push(block(0xc002,Buffer.alloc(0)));
  return Buffer.concat([Buffer.from('ASEF'),u16(1),u16(0),u32(blocks.length),...blocks]);
}
(async()=>{
  const ctx=await A.createContext(source.colors,source.master_sha256);
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../vendor/clarus-handoff/clarus-handoff.js'))).digest('hex'),'d1f1cc6fb8a1abff1cbcf3c7221d92c528a9ad1e64158090a4f56071eebc419e');
  await A.verify(fixture,ctx);
  const doc=JSON.parse(fixture.bundle_origin.document_text),d=await A.derive(doc,'RECORDED_ORIGINALS',0,2,ctx);
  assert.deepEqual(d.records.map(r=>r.source_rgb),[[61,123,25],[60,123,25]]);
  assert.deepEqual(d.records.map(r=>r.atlas_row_id),[4966,4966]);
  assert.notEqual(d.records[0].decision_id,d.records[1].decision_id);
  assert.deepEqual((await A.derive(doc,'RECORDED_ORIGINALS',0,2,ctx,d)).decisions,d.decisions);
  const files=await H.exportHandoff(d,ctx);
  assert.deepEqual(E.readAse(files['palette.ase']).map(s=>s.rgb),[[61,123,25],[60,123,25]]);
  const rows=d.records.map((r,i)=>({name:H.token(r)+' | '+(i?'Second':'Renamed'),rgb:i?r.source_rgb:[17,34,51]})).reverse();
  const returned=ase(rows),result=await H.returnHandoff(files['palette.clarus.json'],files['handoff.json'],returned,ctx);
  await A.verify(result.data,ctx);
  assert.equal(result.report.rgb_changed,1);
  assert.deepEqual(result.data.records.map(r=>r.decision_id),d.records.map(r=>r.decision_id));
  assert.deepEqual(result.data.decisions.nodes.slice(0,2),d.decisions.nodes);
  assert.equal(result.data.decisions.nodes.length,4);
  assert.equal(result.data.bundle_origin.document_text,d.bundle_origin.document_text);
  const repeat=await H.exportHandoff(result.data,ctx),again=await H.returnHandoff(repeat['palette.clarus.json'],repeat['handoff.json'],repeat['palette.ase'],ctx);
  assert.equal(again.data.decisions.nodes.length,6);
  // Invalid files must fail, not be guessed by RGB or substituted references.
  let rejected=0;
  async function reject(fn){await assert.rejects(fn);rejected++;}
  for(const change of [x=>x.master_sha256='0'.repeat(64),x=>x.method.deltaE_in_selection=true,x=>x.records[0].source_rgb[0]++,x=>x.decisions.nodes[0].record.original.hex='#FFFFFF',x=>x.decisions.nodes[0].revision_id='0'.repeat(64),x=>x.bundle_origin.document_text+=' ',x=>x.bundle_origin.start=1,x=>x.decisions.nodes.reverse(),x=>x.records[1].decision_id=x.records[0].decision_id]){
    const bad=clone(result.data);change(bad);await reject(()=>A.verify(bad,ctx));
  }
  const returnCheck=b=>H.returnHandoff(files['palette.clarus.json'],files['handoff.json'],b,ctx);
  await reject(()=>returnCheck(ase(rows.slice(1))));
  await reject(()=>returnCheck(ase([rows[0],rows[0]])));
  await reject(()=>returnCheck(ase([{...rows[0],name:'missing identifier'},rows[1]])));
  await reject(()=>returnCheck(ase([{...rows[0],name:H.token(d.records[1]).slice(0,-16)+'0000000000000000 | stale revision'},rows[1]])));
  await reject(()=>returnCheck(returned.subarray(0,returned.length-1)));
  await reject(()=>returnCheck(Buffer.concat([returned,Buffer.from([0])])));
  const badModel=Buffer.from(returned),offset=badModel.indexOf(Buffer.from('RGB '));badModel.write('LAB ',offset);await reject(()=>returnCheck(badModel));
  const badFloat=Buffer.from(returned);badFloat.writeFloatBE(NaN,offset+4);await reject(()=>returnCheck(badFloat));
  const badManifest=JSON.parse(new TextDecoder().decode(files['handoff.json']));badManifest.swatches[0].revision_id='0'.repeat(64);
  await reject(()=>H.returnHandoff(files['palette.clarus.json'],H.utf8(JSON.stringify(badManifest)),returned,ctx));
  await reject(()=>H.returnHandoff(H.utf8(new TextDecoder().decode(files['palette.clarus.json'])+' '),files['handoff.json'],returned,ctx));
  // Legacy palettes do not invent originals. Deliberate reference adoption works.
  const legacy=clone(doc);legacy.version='1.1';delete legacy.source_assignments;
  await reject(()=>A.derive(legacy,'RECORDED_ORIGINALS',0,1,ctx));
  const adopted=await A.derive(legacy,'REFERENCE_VALUES_AS_NEW_INPUTS',0,1,ctx);
  assert.equal(adopted.records[0].original.hex,legacy.references[0].master_hex);
  assert.equal(adopted.decisions.nodes[0].origin.basis,'REFERENCE_VALUES_AS_NEW_INPUTS');
  // Full attached source survives an explicit small selection of a large palette.
  const large=clone(doc);large.source_assignments=Array.from({length:260},(_,i)=>clone(doc.source_assignments[i%2]));
  const subset=await A.derive(large,'RECORDED_ORIGINALS',250,10,ctx);
  assert.equal(subset.records.length,10);assert.equal(JSON.parse(subset.bundle_origin.document_text).source_assignments.length,260);
  await reject(()=>A.derive(large,'RECORDED_ORIGINALS',0,251,ctx));
  if(process.env.HANDOFF_TEST_OUTPUT){const out=process.env.HANDOFF_TEST_OUTPUT;fs.mkdirSync(out,{recursive:true});for(const [name,bytes]of Object.entries(files))fs.writeFileSync(path.join(out,name),bytes);fs.writeFileSync(path.join(out,'returned.ase'),returned);fs.writeFileSync(path.join(out,'returned.json'),JSON.stringify(result.data,null,2)+'\n');}
  console.log(JSON.stringify({status:'PASS',two_originals_one_reference:true,kit_030_fixture:true,grouped_reordered_edited_return:true,repeat_handoff:true,large_palette_explicit_range:true,rejected_cases:rejected,native_adobe_validation:'NOT_TESTED'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
