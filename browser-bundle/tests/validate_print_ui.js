// DOM execution of the shipped offline application; not a visual browser test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { webcrypto } = require('node:crypto');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('browser-bundle/src/index.html', 'utf8');
const dom = new JSDOM(html, { url: 'https://offline.test/#wheel', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, d = w.document, $ = selector => d.querySelector(selector);
Object.defineProperty(w.crypto, 'subtle', { value: webcrypto.subtle });
w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder; w.scrollTo = () => {};
const context = new Proxy({}, { get(target, key) {
  if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
  if (key === 'createImageData') return (width,height) => ({ data: new Uint8ClampedArray(width*height*4) });
  return target[key] || (() => {});
} });
w.HTMLCanvasElement.prototype.getContext = () => context;
const blobs = new Map(), downloads = [];
w.URL.createObjectURL = blob => { const url = `blob:offline-${blobs.size}`; blobs.set(url, blob); return url; };
w.URL.revokeObjectURL = () => {};
const nativeClick = w.HTMLAnchorElement.prototype.click;
w.HTMLAnchorElement.prototype.click = function () {
  if (this.download) downloads.push({ name: this.download, blob: blobs.get(this.href) });
  else nativeClick.call(this);
};
// No remote resources are loaded. These are the actual generated local data and
// source modules, with canvas drawing stubbed because this is a DOM test.
for (const name of ['atlas-data.js','basis23-data.js']) w.eval(fs.readFileSync(`browser-bundle/build/atlas-clarus-browser-bundle/assets/${name}`, 'utf8'));
for (const name of ['basis23-recipes.js','palette-export.js','image-sampling.js','print-handoff.js','print-ui.js','app.js']) w.eval(fs.readFileSync(`browser-bundle/src/${name}`, 'utf8'));
const input = (selector, value) => { const el = $(selector); el.value = value; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
async function waitFor(check) {
  const end = Date.now() + 5000;
  while (!check()) { if (Date.now() > end) throw Error('Timed out: ' + $('#print-message').textContent); await new Promise(resolve => setImmediate(resolve)); }
}
function profileBytes(space) {
  const bytes = new Uint8Array(160), view = new DataView(bytes.buffer);
  const put = (at,s) => bytes.set(new TextEncoder().encode(s),at);
  view.setUint32(0,160); bytes[8]=4; put(12,'prtr'); put(16,space); put(20,'Lab '); put(36,'acsp');
  view.setUint32(128,1); put(132,'cprt'); view.setUint32(136,144); view.setUint32(140,16); put(144,'text'); put(152,'TEST');
  return bytes;
}
async function attach(selector, file) {
  const el = $(selector);
  Object.defineProperty(el, 'files', { configurable: true, value: [file] });
  el.dispatchEvent(new w.Event('change', { bubbles: true }));
  await waitFor(() => !$('#print-import').disabled);
}
const textFile = value => ({ name: 'test.print-handoff.json', size: value.length, text: async () => value });
async function exportJson() {
  await $('#print-export').onclick();
  const result = downloads.at(-1); assert.match(result.name, /\.print-handoff\.json$/);
  const source = await new Promise((resolve,reject) => { const reader = new w.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(result.blob); });
  return JSON.parse(source);
}
(async () => {
  $('#wheel-selection [data-prepare-print]').click();
  assert.equal(w.location.hash, '#print');
  const firstName = $('#print-name').value, firstRefs = $('#print-references').textContent;
  assert.match($('#print-count').textContent, /1 frozen reference/);
  assert.equal($('#print-export').disabled, false);
  input('[data-print-path="4C"] [data-setting="substrate"]', '4C test stock');
  assert.equal($('[data-print-path="ECG"] [data-setting="substrate"]').value, '');
  const missing = await exportJson();
  assert.equal(missing.production_paths.length, 2);
  assert.equal(missing.production_paths[0].substrate, '4C test stock');
  assert.equal(missing.production_paths[1].substrate, '');
  assert.equal(missing.production_paths[0].profile, null);
  // A different reference selected elsewhere must not silently retarget the job.
  input('#search', '10519'); $('#colour-grid button').click();
  assert.equal($('#print-references').textContent, firstRefs);
  assert.equal($('#print-name').value, firstName);
  $('#selection [data-prepare-print]').click();
  assert.match($('#print-references').textContent, /H285_L025_C065/);
  for (const [id, space] of [['4C','CMYK'],['ECG','7CLR']]) {
    const bytes = profileBytes(space);
    await attach(`[data-print-path="${id}"] [data-profile-file]`, { name: `synthetic-${id}.icc`, size: bytes.length, arrayBuffer: async () => bytes.buffer });
    assert.match($(`[data-print-path="${id}"] [data-profile-summary]`).textContent, /synthetic-/);
    input(`[data-print-path="${id}"] [data-setting="printing_condition"]`, 'Synthetic parser test');
    input(`[data-print-path="${id}"] [data-setting="substrate"]`, `${id} test stock`);
    input(`[data-print-path="${id}"] [data-setting="rendering_intent"]`, 'Relative colorimetric');
    input(`[data-print-path="${id}"] [data-setting="black_point_compensation"]`, 'false');
  }
  const exported = await exportJson();
  assert.deepEqual(exported.production_paths.map(p => p.preparation_status), ['TRANSFORM_REQUIRED','TRANSFORM_REQUIRED']);
  assert.equal(exported.references[0].source_atlas_row_id, 10519);
  assert.notEqual(exported.production_paths[0].profile.sha256, exported.production_paths[1].profile.sha256);
  input('#print-name', 'Temporary change');
  await attach('#print-import-file', textFile(JSON.stringify(exported)));
  assert.equal($('#print-name').value, exported.job_name);
  assert.match($('#print-message').textContent, /Handoff restored/);
  const roundtrip = await exportJson();
  delete roundtrip.created_at; const expected = JSON.parse(JSON.stringify(exported)); delete expected.created_at;
  assert.deepEqual(roundtrip, expected);
  const forged = JSON.parse(JSON.stringify(exported)); forged.production_paths[1].input_from_path = '4C';
  await attach('#print-import-file', textFile(JSON.stringify(forged)));
  assert.match($('#print-message').textContent, /Import blocked/);
  assert.equal($('#print-name').value, exported.job_name);
  assert.match($('[data-print-path="ECG"] [data-profile-summary]').textContent, /synthetic-ECG/);
  // Invalid replacement fails closed for its path; the other profile survives.
  const rgb = profileBytes('RGB ');
  await attach('[data-print-path="4C"] [data-profile-file]', { name: 'screen.icc', size: rgb.length, arrayBuffer: async () => rgb.buffer });
  assert.match($('#print-message').textContent, /4C profile rejected/);
  const afterRejected = await exportJson();
  assert.equal(afterRejected.production_paths[0].profile, null);
  assert.equal(afterRejected.production_paths[1].profile.sha256, exported.production_paths[1].profile.sha256);
  // Empty palette selection cannot erase the prepared reference set.
  $('#print-use-palette').click();
  assert.match($('#print-message').textContent, /between 1 and 64/);
  assert.match($('#print-references').textContent, /H285_L025_C065/);
  $('#selection [data-add-palette]').click();
  $('#palette-drawer [data-print-palette]').click();
  assert.equal($('#palette-drawer').classList.contains('open'), false);
  assert.match($('#print-references').textContent, /H285_L025_C065/);
  await $('#print-report').onclick();
  assert.match(downloads.at(-1).name, /\.print-report\.html$/);
  console.log('PASS: shipped UI selection/palette handoff, independent settings, profile attach/rejection, JSON downloads, atomic re-import and report export (DOM; not visual QA)');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => dom.window.close());
