'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'reference-card.js'), 'utf8');
const sandbox = { globalThis: null };
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox);

const R = sandbox.ATLAS_CLARUS_REFERENCE_CARD;
const colors = Array.from({ length: 13283 }, (_, id) => ({
  id,
  ref: `H${String(id % 360).padStart(3, '0')}_L${String(5 + (id % 19) * 5).padStart(3, '0')}_C${String((id % 15) * 5).padStart(3, '0')}`,
  rgb: [id % 256, (id * 3) % 256, (id * 7) % 256],
  hex: '#' + [id % 256, (id * 3) % 256, (id * 7) % 256].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(),
  lab: [5 + (id % 19) * 5, (id % 101) - 50, ((id * 2) % 101) - 50]
}));
const selected = JSON.parse(JSON.stringify(colors[1721]));
const createdAt = '2026-09-16T12:00:00.000Z';
const card = R.create({ entry: selected, colors, master: R.MASTER, createdAt });

assert.equal(card.freeze_status, 'FROZEN');
assert.equal(card.reference.atlas_row_id, selected.id);
assert.equal(card.reference.atlas_address, selected.ref);
assert.deepEqual(card.reference.master_rgb, selected.rgb);
assert.equal(card.identity_change, 'NONE');
assert.equal(card.reproduction.output_status, 'PRINTED_NOT_MEASURED');
assert.equal(card.reproduction.measured_qc_status, 'NOT_MEASURED');
assert.equal(card.reproduction.icc_transform, 'NOT_APPLIED');
assert.equal(card.reproduction.device_values, null);
assert.equal(card.reproduction.production_approval, 'NOT_PROVIDED');
assert.ok(Object.isFrozen(card));
assert.ok(Object.isFrozen(card.reference));
assert.deepEqual(R.validate(JSON.parse(JSON.stringify(card)), colors, R.MASTER), card);

const printable = R.html(card);
assert.match(printable, /PRINTED_NOT_MEASURED/);
assert.match(printable, /unmeasured reproduction/);
assert.match(printable, /not a colour proof/);
assert.match(printable, new RegExp(selected.ref));

function rejected(mutator, pattern) {
  const candidate = JSON.parse(JSON.stringify(card));
  mutator(candidate);
  assert.throws(() => R.validate(candidate, colors, R.MASTER), pattern);
}
rejected(x => { x.reference.atlas_row_id += 1; }, /identity|master/i);
rejected(x => { x.reference.master_hex = '#000000'; }, /identity|master/i);
rejected(x => { x.master_sha256 = '0'.repeat(64); }, /compatible/i);
rejected(x => { x.freeze_status = 'MUTABLE'; }, /changed/i);
rejected(x => { x.identity_change = 'REASSIGNED'; }, /changed/i);
rejected(x => { x.reproduction.output_status = 'MEASURED'; }, /changed/i);
rejected(x => { x.reproduction.measured_qc_status = 'PASS'; }, /changed/i);
rejected(x => { x.reproduction.icc_transform = 'APPLIED'; }, /changed/i);
rejected(x => { x.reproduction.device_values = { c: 0 }; }, /changed/i);
rejected(x => { x.reproduction.production_approval = 'APPROVED'; }, /changed/i);

assert.throws(() => R.create({
  entry: { ...selected, rgb: [0, 0, 0] }, colors, master: R.MASTER, createdAt
}), /identity|master/i);
assert.throws(() => R.create({
  entry: selected, colors, master: '0'.repeat(64), createdAt
}), /baseline/i);

console.log('reference-card contract and rejection vectors: OK');
