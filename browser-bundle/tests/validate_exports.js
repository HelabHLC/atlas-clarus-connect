const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = {window:{},TextEncoder};
vm.createContext(context);
vm.runInContext(fs.readFileSync('browser-bundle/src/palette-export.js','utf8'), context);
const exportsApi = context.window.ATLAS_CLARUS_EXPORTS;
assert.ok(exportsApi, 'export API missing');

const palette = [
  {id:0,ref:'H000_L095_C000',rgb:[240,240,240],hex:'#F0F0F0',lab:[95,0,0]},
  {id:4665,ref:'H125_L050_C040',rgb:[91,132,85],hex:'#5B8455',lab:[50,-32.7664,22.9431]}
];
const master = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
const ase = exportsApi.ase(palette);
const roundTrip = exportsApi.readAse(ase);
assert.deepEqual(JSON.parse(JSON.stringify(roundTrip)), palette.map(c=>({ref:c.ref,rgb:c.rgb})), 'ASE round-trip mismatch');

const clarus = exportsApi.clarus(palette,master,'Validation Palette');
assert.equal(clarus.master_sha256,master);
assert.deepEqual(clarus.references.map(r=>r.atlas_row_id),[0,4665]);
assert.match(exportsApi.css(palette,master,'Validation Palette'),/Master SHA-256/);
assert.match(exportsApi.gpl(palette,master,'Validation Palette'),/^GIMP Palette/);
assert.equal(exportsApi.tokens(palette,master,'Validation Palette').color.H000_L095_C000.$value,'#F0F0F0');
console.log('PASS: palette export structure and ASE round-trip');
