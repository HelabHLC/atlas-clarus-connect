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
// Import uses the same validator shipped to the browser, against the real
// public master projection. Export order must survive without re-binding RGB.
const source = JSON.parse(fs.readFileSync('hover-library/data/colors.json','utf8'));
assert.equal(source.master_sha256,master);
const realPalette = [source.colors[0],source.colors[4966],source.colors[10519]];
const exported = exportsApi.clarus(realPalette,master,'Round-trip fixture');
const importedIds = data=>Array.from(exportsApi.validateClarus(data,source.colors,master));
assert.deepEqual(importedIds(JSON.parse(JSON.stringify(exported))),realPalette.map(c=>c.id));
const corrupt = change=>{
  const candidate=JSON.parse(JSON.stringify(exported));change(candidate);
  assert.throws(()=>importedIds(candidate));
};
corrupt(d=>d.master_sha256='different master');
corrupt(d=>d.version='99');
corrupt(d=>d.row_id_base=1);
corrupt(d=>d.row_id_base='0');
corrupt(d=>d.freeze_status='UNFROZEN');
corrupt(d=>d.measured_qc_status='MEASURED');
corrupt(d=>d.palette_name={name:'not a string'});
for(const value of [null,false,true,'0',[],0.5,-1,13283]){
  corrupt(d=>d.references[0].atlas_row_id=value);
}
corrupt(d=>d.references[0].reference='H999_L999_C999');
corrupt(d=>d.references[0].master_hex='#NOTHEX');
corrupt(d=>d.references[0].master_rgb.push(255));
corrupt(d=>d.references[0].master_rgb.pop());
corrupt(d=>d.references[0].master_rgb[0]=String(d.references[0].master_rgb[0]));
corrupt(d=>d.references[0].master_rgb[0]=null);
corrupt(d=>d.references[0]=null);
corrupt(d=>d.references.push(d.references[0]));
corrupt(d=>d.references=[]);
const full = exportsApi.clarus(source.colors.slice(0,64),master,'64 colours');
assert.equal(importedIds(full).length,64);
assert.throws(()=>importedIds(exportsApi.clarus(source.colors.slice(0,65),master,'65 colours')));
// The complete file is rejected even if its first references are valid.
corrupt(d=>d.references[d.references.length-1].reference='wrong last reference');
console.log('PASS: palette exports, ASE round-trip and strict full-master Clarus import vectors');
