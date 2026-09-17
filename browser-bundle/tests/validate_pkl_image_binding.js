const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const scope = {};
vm.runInNewContext(fs.readFileSync('browser-bundle/src/pkl-image-binding.js', 'utf8'), scope);
const master = '8'.repeat(64);
const colors = [
  { id: 9, ref: 'RIGHT', rgb: [2, 0, 0] },
  { id: 3, ref: 'LEFT', rgb: [0, 0, 0] },
  { id: 7, ref: 'WHITE', rgb: [255, 255, 255] },
];
const binder = scope.ATLAS_CLARUS_PKL_IMAGE.create(colors, master);
assert.equal(binder.nearest([1, 0, 0]).row.id, 3, 'equal RGB distance must use the smallest atlas_row_id');
const input = Uint8Array.from([1, 0, 0, 255, 254, 255, 255, 255, 1, 0, 0, 255]);
const result = binder.bind(input);
assert.deepEqual([...result.pixels], [0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255]);
assert.equal(result.evidence.foreign_colors, 0);
assert.equal(result.evidence.master_sha256, master);
assert.equal(result.evidence.assigned_master_rows, 2);
assert.equal(JSON.stringify(result.evidence.assignments.map(x => [x.atlas_row_id, x.pixel_count])), '[[3,2],[7,1]]');
console.log('PASS: PKL image binding uses exact master RGB with deterministic atlas_row_id ties and zero foreign colors');
