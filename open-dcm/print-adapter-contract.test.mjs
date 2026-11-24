import test from 'node:test';
import assert from 'node:assert/strict';
import { createColourRecord, attachIccResult } from './reference-record.mjs';
import { createPrintAdapterPreparation } from './print-adapter-contract.mjs';

const M='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
const make=()=>createColourRecord({hlcAddress:'H050_L060_C075',sourceRgb:[232,104,42]});
const build=(overrides={})=>createPrintAdapterPreparation({
  colourRecord:make(),masterSha256:M,atlasRowId:100,paths:['4C','ECG'],
  contextByPath:{'4C':{printing_condition:'example coated profile condition',substrate:'coated paper'},ECG:{substrate:'example substrate'}},...overrides
});

test('a new record is safe preparation only, never a print claim',()=>{
  const out=build();
  assert.equal(out.status,'PREPARATION_ONLY');
  assert.equal(out.format,'ATLAS_CLARUS_OPEN_DCM_PRINT_ADAPTER');
  assert.equal(out.source.identity_status,'DECLARED_REQUIRES_MASTER_LOOKUP');
  assert.deepEqual(out.production_paths.map(x=>x.path_id),['4C','ECG']);
  for(const x of out.production_paths){
    assert.equal(x.calculation_status,'NOT_CALCULATED');
    assert.equal(x.device_values,null);
    assert.equal(x.delta_e00,null);
    assert.equal(x.predicted_lab,null);
    assert.equal(x.measurement_status,'NOT_MEASURED');
    assert.equal(x.production_approval,'NOT_GRANTED');
    assert.equal(x.input_from_path,null);
    assert.equal(x.source_atlas_row_id,100);
  }
  assert.equal(out.production_paths[0].expected_device_space,'CMYK');
  assert.equal(out.production_paths[1].expected_device_space,'7CLR');
  assert.ok(Object.isFrozen(out.source));
  assert.ok(Object.isFrozen(out.production_paths));
});
test('does not mutate the original record and copies the RGB source',()=>{
  const src=make();const snap=JSON.stringify(src);
  const out=build({colourRecord:src});
  assert.equal(JSON.stringify(src),snap);
  assert.deepEqual(out.source.rgb8,src.source.rgb8);
  assert.notEqual(out.source.rgb8,src.source.rgb8);
  assert.throws(()=>out.source.rgb8.push(1), TypeError);
});
test('rejects unverified identity and invalid master/row',()=>{
  assert.throws(()=>build({masterSha256:'bad'}),/Master SHA/);
  assert.throws(()=>build({atlasRowId:13283}),/row ID/);
  assert.throws(()=>build({colourRecord:{schemaVersion:'0.1.0'}}),/valid ATLAS/);
});
test('rejects stale or claimed ICC, and measured proof records',()=>{
  const src=make();
  const calculated=attachIccResult(src,{profileId:'dummy',renderingIntent:'relative-colorimetric',substrate:'example',lab:[60,40,30],deltaE00:1.2});
  assert.throws(()=>build({colourRecord:calculated}),/uncalculated and unmeasured/);
  assert.throws(()=>build({colourRecord:{...src,evidence:{iccCalculated:false,physicalProofMeasured:true}}}),/uncalculated and unmeasured/);
});
test('prevents duplicated paths, phantom profile data and pathway chaining',()=>{
  assert.throws(()=>build({paths:['4C','4C']}),/unique output paths/);
  assert.throws(()=>build({paths:['X']}),/unique output paths/);
  assert.throws(()=>build({contextByPath:{'4C':{device_values:[1,2,3,4]}}}),/Only printing_condition and substrate/);
  assert.throws(()=>build({paths:['4C'],contextByPath:{'ECG':{substrate:'x'}}}),/unrequested output path/);
});
test('JSON roundtrip has no ICC output or physical claims',()=>{
  const out=JSON.parse(JSON.stringify(build()));
  assert.equal(out.status,'PREPARATION_ONLY');
  assert.ok(out.production_paths.every(x=>x.device_values===null && x.production_approval==='NOT_GRANTED'));
});
