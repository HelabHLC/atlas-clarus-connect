// Exercise the actual handoff module against the full master. Synthetic ICC
// containers below test parsing only; they are not printer profiles or transforms.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { webcrypto, createHash } = require('node:crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;
require('../src/print-handoff.js');
const P = globalThis.ATLAS_CLARUS_PRINT;
const master = JSON.parse(fs.readFileSync('hover-library/data/colors.json', 'utf8'));
const colors = master.colors;
const entries = [colors.find(c => c.id === 10519), colors.find(c => c.id === 4966)];
const copy = obj => JSON.parse(JSON.stringify(obj));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(space) {
  const bytes = new Uint8Array(160), view = new DataView(bytes.buffer);
  const put = (offset, value) => bytes.set(new TextEncoder().encode(value), offset);
  view.setUint32(0, bytes.length); bytes[8] = 4; bytes[9] = 0x30;
  put(12, 'prtr'); put(16, space); put(20, 'Lab '); put(36, 'acsp');
  view.setUint32(64, 1); view.setUint32(128, 1); put(132, 'cprt');
  view.setUint32(136, 144); view.setUint32(140, 16); put(144, 'text'); put(152, 'TEST');
  return bytes;
}
const make = (paths, overrides = {}) => P.create({ entries, colors, master: master.master_sha256,
  name: 'Parallel fixture', createdAt: '2026-09-13T00:00:00.000Z', paths, ...overrides });
async function rejectsMutation(base, edit, label) {
  const value = copy(base); edit(value);
  await assert.rejects(P.validate(value, colors), undefined, label);
}
(async () => {
  const empty = { '4C': P.emptySettings(), ECG: P.emptySettings() };
  const before = JSON.stringify(entries), pending = await make(empty);
  assert.equal(JSON.stringify(entries), before, 'preparation must not mutate the master');
  assert.equal(pending.topology, 'PARALLEL_FROM_SAME_FROZEN_REFERENCE');
  assert.deepEqual(pending.production_paths.map(p => p.path_id), ['4C', 'ECG']);
  const [a, b] = pending.production_paths;
  assert.deepEqual(a.input_references, b.input_references);
  for (const path of pending.production_paths) {
    assert.equal(path.input_from_path, null);
    assert.equal(path.preparation_status, 'PROFILE_MISSING');
    assert.equal(path.device_values, null);
    assert.equal(path.measured_qc.status, 'NOT_MEASURED');
  }
  assert.ok(Object.isFrozen(pending.references[0].master_rgb));
  assert.ok(Object.isFrozen(a.input_references));
  assert.deepEqual(await P.validate(copy(pending), colors), pending, 'pending package round-trip');
  const cmyk = fixture('CMYK'), ecg = fixture('7CLR');
  const p4 = await P.readProfile(cmyk, 'synthetic-4C.icc', '4C');
  const p7 = await P.readProfile(ecg, 'synthetic-ECG.icc', 'ECG');
  assert.equal(p4.sha256, hash(cmyk)); assert.equal(p7.sha256, hash(ecg));
  assert.notEqual(p4.sha256, p7.sha256);
  await assert.rejects(P.readProfile(cmyk, 'wrong-path.icc', 'ECG'));
  await assert.rejects(P.readProfile(ecg, 'wrong-path.icc', '4C'));
  const badBounds = cmyk.slice(); new DataView(badBounds.buffer).setUint32(136, 999999);
  await assert.rejects(P.readProfile(badBounds, 'bad-bounds.icc', '4C'));
  const badSize = cmyk.slice(); new DataView(badSize.buffer).setUint32(0, 159);
  await assert.rejects(P.readProfile(badSize, 'bad-size.icc', '4C'));
  const rgb = fixture('RGB ');
  await assert.rejects(P.readProfile(rgb, 'screen.icc', '4C'));
  const paths = { '4C': { ...P.emptySettings(), profile: p4, printing_condition: 'SYNTHETIC 4C TEST',
    substrate: 'TEST ONLY', rendering_intent: 'Relative colorimetric', black_point_compensation: false },
    ECG: { ...P.emptySettings(), profile: p7, printing_condition: 'SYNTHETIC ECG TEST',
      substrate: 'TEST ONLY', rendering_intent: 'Perceptual', black_point_compensation: true } };
  const ready = await make(paths);
  assert.deepEqual(ready.production_paths.map(p => p.preparation_status), ['TRANSFORM_REQUIRED', 'TRANSFORM_REQUIRED']);
  assert.equal(ready.production_paths[1].channel_order, null, '7CLR must not assert an unverified ink order');
  assert.deepEqual(await P.validate(JSON.parse(JSON.stringify(ready)), colors), ready, 'embedded-profile round-trip');
  const changed4 = copy(paths); changed4['4C'].rendering_intent = 'Saturation';
  changed4['4C'].profile = null;
  const next4 = await make(changed4);
  assert.deepEqual(next4.production_paths[1], ready.production_paths[1], '4C changes must not affect ECG');
  assert.deepEqual(next4.references, ready.references);
  const changed7 = copy(paths); changed7.ECG.substrate = 'Different ECG substrate';
  const next7 = await make(changed7);
  assert.deepEqual(next7.production_paths[0], ready.production_paths[0], 'ECG changes must not affect 4C');
  const volatilePaths = copy(paths), building = make(volatilePaths);
  volatilePaths.ECG.substrate = 'Changed while hashing';
  assert.deepEqual((await building).production_paths, ready.production_paths, 'async export must snapshot inputs');
  await rejectsMutation(ready, d => { d.production_paths[1].input_from_path = '4C'; }, '4C → ECG rejected');
  await rejectsMutation(ready, d => { d.production_paths[0].input_from_path = 'ECG'; }, 'ECG → 4C rejected');
  await rejectsMutation(ready, d => { d.production_paths[1].input_references.reverse(); }, 'different path inputs rejected');
  await rejectsMutation(ready, d => { d.references[0].production_atlas_row_id = 1; }, 'silent production rematch rejected');
  await rejectsMutation(ready, d => { d.references[0].source_atlas_row_id = '10519'; }, 'type coercion rejected');
  await rejectsMutation(ready, d => { d.master_sha256 = '0'.repeat(64); }, 'wrong master rejected');
  await rejectsMutation(ready, d => { d.references[0].master_lab[0] += 1; }, 'altered master Lab rejected');
  await rejectsMutation(ready, d => { d.references.push(d.references[0]); }, 'duplicate references rejected');
  await rejectsMutation(ready, d => { d.production_paths.pop(); }, 'one-path export rejected');
  await rejectsMutation(ready, d => { d.production_paths[1] = copy(d.production_paths[0]); }, 'duplicate path rejected');
  await rejectsMutation(ready, d => { d.production_paths[0].device_values = [0,0,0,0]; }, 'fabricated device values rejected');
  await rejectsMutation(ready, d => { d.production_paths[0].measured_qc.status = 'PASS'; }, 'unmeasured PASS rejected');
  await rejectsMutation(ready, d => { d.production_paths[1].profile.sha256 = '0'.repeat(64); }, 'forged profile digest rejected');
  await rejectsMutation(ready, d => { d.production_paths[1].profile.data_base64 = p4.data_base64; }, 'swapped profile bytes rejected');
  await rejectsMutation(ready, d => { d.production_paths[0].black_point_compensation = 'false'; }, 'untyped settings rejected');
  await rejectsMutation(ready, d => { d.production_paths[1].hidden_chain = '4C'; }, 'unknown fields rejected');
  await rejectsMutation(ready, d => { d.status = 'PRODUCTION_APPROVED'; }, 'false overall approval rejected');
  const hostile = await make(empty, { name: '<script>alert(1)</script>' });
  assert.doesNotMatch(P.report(hostile), /<script>/);
  assert.match(P.report(hostile), /&lt;script&gt;/);
  assert.match(P.report(ready), /Not calculated/);
  assert.match(P.report(ready), /NOT_MEASURED/);
  const example = JSON.parse(fs.readFileSync('browser-bundle/examples/parallel-print-row-10519.print-handoff.json','utf8'));
  await P.validate(example, colors);
  assert.equal(example.references[0].source_atlas_row_id, 10519);
  assert.deepEqual(example.production_paths.map(p => p.profile), [null,null]);
  console.log('PASS: full-master parallel 4C/ECG inputs, branch isolation, embedded ICC SHA-256, round-trip and rejection vectors');
})().catch(error => { console.error(error); process.exitCode = 1; });
