'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sandbox = { globalThis: null, Uint8Array, TextEncoder }; sandbox.globalThis = sandbox;
for (const name of ['reference-card.js', 'profiled-reference-card.js'])
  vm.runInNewContext(fs.readFileSync(`browser-bundle/src/${name}`, 'utf8'), sandbox);
const R = sandbox.ATLAS_CLARUS_REFERENCE_CARD, P = sandbox.ATLAS_CLARUS_PROFILED_REFERENCE_CARD;
const colors = Array.from({ length: 13283 }, (_, id) => ({ id, ref: `R${id}`, rgb: [id % 256, 2, 3],
  hex: '#010203', lab: [50, 0, 0] }));
const profile = { file_name: 'press.icc', sha256: 'a'.repeat(64), byte_length: 1234, version: '4.3', device_space: 'CMYK', pcs: 'Lab ' };
const settings = { path_id: '4C', printing_condition: 'Press A', substrate: 'Paper B', rendering_intent: 'Relative colorimetric', black_point_compensation: true };
const separation = { path: '4C', channels: 4, channel_order: ['C','M','Y','K'], device_values_16bit: [1,2,3,4],
  device_values_normalized: [0.1,0.2,0.3,0.4], engine: 'LittleCMS 2.16 / lcms-wasm 1.0.5', method: 'SRGB_TO_DEVICE16', intent: settings.rendering_intent, bpc: true };
const card = P.create({ entry: colors[7], colors, master: R.MASTER, profile, settings, separation, createdAt: '2026-09-16T12:00:00.000Z' });
assert.equal(card.production.output_status, 'PROFILE_BOUND_NOT_MEASURED');
assert.equal(card.version, '0.2.0');
assert.equal(card.production.printable_device_file, 'DEVICECMYK_PDF_GENERATED_NOT_PDFX');
assert.equal(card.production.profile.sha256, profile.sha256);
assert.equal(JSON.stringify(card.production.transform.device_values_16bit), '[1,2,3,4]');
assert.equal(card.identity_change, 'NONE'); assert.ok(Object.isFrozen(card));
const icc = new Uint8Array(profile.byte_length); for (let i = 0; i < icc.length; i++) icc[i] = i % 251;
const pdf = P.deviceCmykPdf(card, icc);
const pdfLatin = Buffer.from(pdf).toString('latin1');
assert.match(pdfLatin, /^%PDF-1\.7/);
assert.match(pdfLatin, /\/DeviceCMYK/);
assert.match(pdfLatin, /\/DestOutputProfile 6 0 R/);
assert.match(pdfLatin, /0\.00001526 0\.00003052 0\.00004578 0\.00006104 k/);
assert.match(pdfLatin, /NOT PDF\/X CERTIFIED/);
assert.ok(Buffer.from(pdf).includes(Buffer.from(icc)), 'Exact ICC bytes must be embedded');
fs.mkdirSync('tmp/pdfs', { recursive: true });
fs.writeFileSync('tmp/pdfs/profiled-reference-test.pdf', pdf);
assert.equal(JSON.stringify(P.validate(JSON.parse(JSON.stringify(card)), colors, R.MASTER)), JSON.stringify(card));
for (const mutate of [x => x.reference.atlas_row_id++, x => x.production.measured_qc_status = 'PASS',
  x => x.production.printable_device_file = 'PDF']) {
  const bad = JSON.parse(JSON.stringify(card)); mutate(bad); assert.throws(() => P.validate(bad, colors, R.MASTER));
}
console.log('profile-bound reference-card contract and rejection vectors: OK');
