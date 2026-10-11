'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { webcrypto } = require('node:crypto');
if (!global.crypto) Object.defineProperty(global, 'crypto', { value: webcrypto });
global.ClarusHandoff = require('../vendor/clarus-handoff/clarus-handoff.js');
require('../src/palette-export.js'); require('../src/reference-card.js');
require('../src/colour-handoff.js'); require('../src/colour-reference-card.js');
const H = global.ClarusHandoff, A = global.ATLAS_COLOUR_HANDOFF;
const C = global.ATLAS_CLARUS_REFERENCE_CARD.colourHandoff;
const master = require('../../hover-library/data/colors.json');
const fixture = require('./fixtures/colour-kit-030-two-greens.json');
const clone = value => JSON.parse(JSON.stringify(value));
const decode = bytes => JSON.parse(new TextDecoder().decode(bytes));
const out = process.env.CARD_TEST_OUTPUT || '/tmp/atlas-colour-reference-card';
const save = (name, data) => { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, name), data); };
(async () => {
  const ctx = await A.createContext(master.colors, master.master_sha256);
  const original = JSON.stringify(fixture), files = await C.exportFiles(fixture, ctx, master.colors);
  const card = decode(files['reference-card.json']), [one, two] = card.cards;
  assert.equal(JSON.stringify(fixture), original, 'export must not modify decisions');
  assert.deepEqual(await C.verifyFiles(files, ctx, master.colors), fixture);
  assert.deepEqual(decode(files['palette.clarus.json']), fixture, 'complete companion, including all history');
  assert.deepEqual(card.cards.map(c => c.original_source.hex), ['#3D7B19', '#3C7B19']);
  assert.deepEqual(card.cards.map(c => c.original_source.rgb), [[61,123,25],[60,123,25]]);
  assert.deepEqual(card.cards.map(c => c.current_colour.reference.distance_squared), [41,30]);
  assert.deepEqual(card.cards.map(c => c.current_colour.reference.atlas_row_id), [4966,4966]);
  assert.deepEqual(card.cards.map(c => c.current_colour.reference.atlas_address), ['H130_L045_C055','H130_L045_C055']);
  assert.deepEqual(card.cards.map(c => c.decision_id), fixture.records.map(r => r.decision_id));
  assert.deepEqual(card.cards.map(c => c.revision_id), fixture.records.map(r => r.revision_id));
  assert.notEqual(one.decision_id, two.decision_id);
  assert.deepEqual(card.cards.map(c => c.provenance.sampling.centre), [[2,3],[3,3]]);
  assert.equal(one.provenance.image_sha256, null);
  const text = new TextDecoder().decode(files['colour-reference-card.html']);
  for (const c of card.cards) for (const value of [c.decision_id,c.revision_id,c.original_source.hex]) assert.ok(text.includes(value));
  assert.equal((text.match(/<article /g) || []).length, 2);
  assert.ok(text.includes('UNKNOWN') && text.includes('2 separate decisions share this ATLAS reference'));
  assert.ok(!text.includes('PRINTED_NOT_MEASURED'), 'must not assert printing already happened');
  assert.deepEqual(await C.exportFiles(fixture, ctx, master.colors), files, 'deterministic bytes');

  // Current design can change independently; roots, IDs and full retained history survive.
  const edited = clone(fixture);
  edited.records[0] = ctx.assign({ ...edited.records[0].original, hex: '#112233' });
  edited.source_values_sha256 = await ctx.sourceDigest(edited.records.map(r => r.original));
  await H.updateHistory(edited, fixture, ctx);
  const result = await C.create(edited, ctx, master.colors);
  assert.equal(result.card.cards[0].starting_colour.hex, '#3D7B19');
  assert.equal(result.card.cards[0].current_colour.hex, '#112233');
  assert.equal(result.card.cards[0].decision_id, one.decision_id);
  assert.equal(result.card.cards[0].starting_revision_id, one.revision_id);
  assert.equal(result.card.cards[0].parent_revision_id, one.revision_id);
  assert.equal(result.card.cards[0].revision_ids.length, 2);
  assert.deepEqual(decode(result.paletteBytes).decisions, edited.decisions);
  const adobe = await H.exportHandoff(edited, ctx);
  const returned = await H.returnHandoff(adobe['palette.clarus.json'], adobe['handoff.json'], adobe['palette.ase'], ctx);
  const returnedCard = await C.create(returned.data, ctx, master.colors);
  assert.equal(returnedCard.card.cards[0].revision_ids.length, 3);
  assert.equal(returnedCard.card.cards[0].starting_revision_id, one.revision_id);

  // No invented original from a legacy reference palette.
  const bundle = JSON.parse(fixture.bundle_origin.document_text);
  const legacy = clone(bundle); delete legacy.source_assignments; legacy.version = '1.1';
  const adopted = await A.derive(legacy, 'REFERENCE_VALUES_AS_NEW_INPUTS', 0, 1, ctx);
  const adoptedFiles = await C.exportFiles(adopted, ctx, master.colors);
  const adoptedCard = decode(adoptedFiles['reference-card.json']).cards[0];
  assert.deepEqual(adoptedCard.original_source, { status:'UNKNOWN',rgb:null,hex:null });
  assert.equal(adoptedCard.starting_colour.hex, '#37791A');
  assert.equal(adoptedCard.provenance.image_name, null);
  assert.ok(new TextDecoder().decode(adoptedFiles['colour-reference-card.html']).includes('Earlier source RGB / HEX: UNKNOWN'));

  // Actual Kit-style inputs have no fabricated image metadata; labels are escaped.
  const kit = clone(fixture); delete kit.bundle_origin; delete kit.decisions;
  kit.records = [ctx.assign({id:'kit-input',name:'<img src=x onerror=alert(1)>',hex:'#3D7B19',source:'Declared by designer',color_space:'sRGB'})];
  kit.source_values_sha256 = await ctx.sourceDigest(kit.records.map(r => r.original));
  await H.updateHistory(kit, null, ctx);
  const kitFiles = await C.exportFiles(kit, ctx, master.colors), kitCard = decode(kitFiles['reference-card.json']).cards[0];
  assert.equal(kitCard.starting_colour.basis, 'DECLARED_INPUT');
  assert.equal(kitCard.provenance.image_sha256, null);
  assert.equal(kitCard.provenance.sampling, null);
  assert.ok(!new TextDecoder().decode(kitFiles['colour-reference-card.html']).includes('<img src=x'));
  assert.ok(new TextDecoder().decode(kitFiles['colour-reference-card.html']).includes('&lt;img'));

  // Area-sampling details stay complete in the machine-readable projection.
  const area = clone(bundle);
  Object.assign(area.source_assignments[0].sampling, {mode:'AREA_MEAN_RGB',requested_size:5,
    bounds:[0,1,4,5],valid_pixel_count:25,channel_std:[0.25,0.5,0.75]});
  const areaData = await A.derive(area, 'RECORDED_ORIGINALS', 0, 1, ctx);
  assert.deepEqual((await C.create(areaData,ctx,master.colors)).card.cards[0].provenance.sampling,
    area.source_assignments[0].sampling);
  assert.deepEqual(one.provenance.sampling, bundle.source_assignments[0].sampling);
  const known = clone(bundle); known.source_assignments[0].image.sha256 = 'a'.repeat(64);
  const knownData = await A.derive(known, 'RECORDED_ORIGINALS', 0, 1, ctx);
  assert.equal((await C.create(knownData,ctx,master.colors)).card.cards[0].provenance.image_sha256, 'a'.repeat(64));

  let rejected = 0;
  for (const mutate of [d=>d.master_sha256='0'.repeat(64), d=>d.records[0].source_rgb[0]++,
    d=>d.records[0].atlas_row_id++, d=>d.records[1].decision_id=d.records[0].decision_id,
    d=>d.decisions.nodes[0].record.original.hex='#FFFFFF', d=>d.bundle_origin.document_text+=' ']) {
    const bad = clone(fixture); mutate(bad);
    await assert.rejects(()=>C.exportFiles(bad,ctx,master.colors)); rejected++;
  }
  // Rehashing the package manifest cannot bless an inconsistent card projection.
  for (const filename of ['reference-card.json','colour-reference-card.html','palette.clarus.json']) {
    const bad = {...files}, manifest = decode(files['card-manifest.json']);
    bad[filename] = H.utf8(new TextDecoder().decode(bad[filename]).replace('#3D7B19','#FFFFFF'));
    manifest.files[filename] = await ctx.sha(bad[filename]); bad['card-manifest.json']=H.utf8(JSON.stringify(manifest,null,2)+'\n');
    await assert.rejects(()=>C.verifyFiles(bad,ctx,master.colors)); rejected++;
  }
  await assert.rejects(()=>C.verifyFiles({...files,extra:H.utf8('extra')},ctx,master.colors)); rejected++;
  const missing={...files}; delete missing['palette.clarus.json'];
  await assert.rejects(()=>C.verifyFiles(missing,ctx,master.colors)); rejected++;

  // Preserve every active decision at the protocol limit; never group by reference.
  const large = clone(bundle); large.source_assignments = Array.from({length:250},(_,i)=>clone(bundle.source_assignments[i%2]));
  const largeData = await A.derive(large,'RECORDED_ORIGINALS',0,250,ctx);
  const largeCard = await C.create(largeData,ctx,master.colors);
  assert.equal(largeCard.card.cards.length,250);
  assert.equal(new Set(largeCard.card.cards.map(c=>c.decision_id)).size,250);
  assert.ok(largeCard.card.cards.every(c=>c.same_current_reference_decisions===250));
  for (const [name,bytes] of Object.entries(files)) save(name,bytes);
  save('two-greens-card.zip',H.zipStored(files));
  save('edited.json',JSON.stringify(edited,null,2));
  save('adopted.json',JSON.stringify(adopted,null,2));
  save('kit-input.json',JSON.stringify(kit,null,2));
  const report={status:'PASS',two_sources_one_reference:true,decision_and_revision_ids_preserved:true,
    full_json_roundtrip:true,edited_and_ase_return_history:true,adopted_reference_original_unknown:true,
    kit_unknown_origin:true,html_escaping:true,active_decisions_limit:250,rejected_cases:rejected};
  save('core-results.json',JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
