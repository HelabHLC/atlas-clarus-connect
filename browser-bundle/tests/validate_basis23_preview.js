const assert = require('node:assert/strict');
const fs = require('node:fs');
const api = require('../src/basis23-recipes.js');

const root = 'hover-library/data';
const colors = JSON.parse(fs.readFileSync(`${root}/colors.json`, 'utf8'));
const displayData = JSON.parse(fs.readFileSync(`${root}/basis23-mix-display.json`, 'utf8'));
const recipes = [];
for (const file of fs.readdirSync(`${root}/basis23-recipes`).filter(name => name.endsWith('.json')).sort()) {
  recipes.push(...JSON.parse(fs.readFileSync(`${root}/basis23-recipes/${file}`, 'utf8')));
}

assert.equal(displayData.dataset, 'ATLAS_BASIS23_MIX_DISPLAY_V1');
assert.equal(displayData.atlas_master_sha256, colors.master_sha256);
assert.equal(displayData.basis_version, api.BASIS);
assert.equal(displayData.source_artifact_sha256, '4dd1dc4927f075610512ed01dbe1b47323e9f14424b110b268b1b0c4cc4caf1b');
assert.equal(displayData.boundary, 'COMPUTATIONAL_PREVIEW_NOT_PHYSICALLY_VERIFIED');
assert.equal(displayData.rows, 13283);
assert.equal(displayData.displays.length, 13283);
assert.equal(recipes.length, 13283);

for (let id = 0; id < recipes.length; id++) {
  const displayRow = displayData.displays[id];
  assert.equal(recipes[id].source_atlas_row_id, id);
  assert.equal(displayRow.source_atlas_row_id, id);
  assert.equal(api.displayValid({...recipes[id], mix_display: displayRow.mix_display}), true);
}

const id = 1702;
const recipe = {...recipes[id], mix_display: displayData.displays[id].mix_display};
const store = {get(c) { assert.equal(c.id, id); return recipe; }};
const html = api.render(store, colors.colors[id]);
assert.match(html, /Before — ATLAS Target/);
assert.match(html, /After — Computed Mix/);
assert.match(html, /#FF874B/);
assert.match(html, /#FD884E/);
assert.match(html, /COMPUTATIONAL PREVIEW · NOT PHYSICALLY VERIFIED/);
assert.doesNotMatch(html, /Mix preview unavailable/);

console.log('PASS: 13,283 verified Basis-23 B/A displays and RC20 regression fixture');
