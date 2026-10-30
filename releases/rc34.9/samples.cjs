const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(process.argv[2]);
const context = vm.createContext({TextEncoder, TextDecoder});
context.window = context;
for (const file of ['atlas-data.js', 'palette-export.js', 'quarkxpress-export.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), context);
}
const data = context.ATLAS_CLARUS_DATA, E = context.ATLAS_CLARUS_EXPORTS;
const refs = ['H075_L060_C045', 'H335_L050_C055', 'H125_L075_C080'];
const palette = refs.map(ref => {
  const row = data.colors.find(c => c.ref === ref);
  if (!row) throw Error('Sample reference missing from master: ' + ref);
  return row;
});
if (String(palette[0].rgb) !== '180,136,67') throw Error('Documented sample changed.');
palette.push({ref:'Original #010203',rgb:[1,2,3],kind:'ORIGINAL_RGB'});
const name = 'ATLAS Clarus QuarkXPress Import Test';
const xtg = E.quarkXtg(palette, data.master_sha256, name);
E.verifyQuarkXtg(xtg, palette, data.master_sha256, name);
fs.mkdirSync(path.join(root, 'examples'), {recursive:true});
fs.writeFileSync(path.join(root, 'examples', 'ATLAS_Clarus_QuarkXPress_Test.xtg'), xtg);
fs.writeFileSync(path.join(root, 'examples', 'QUARKXPRESS_EXPECTED.json'), JSON.stringify({
  master_sha256:data.master_sha256,
  native_quarkxpress_import:'NOT_TESTED',
  source_profile:'sRGB IEC61966-2.1',
  palette:palette.map(c => ({name:c.ref,rgb:c.rgb,hex:'#'+c.rgb.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase(),kind:c.kind||'ATLAS_REFERENCE'}))
}, null, 2)+'\n');
