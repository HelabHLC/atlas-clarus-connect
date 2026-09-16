// DOM interaction + real worker/WASM computation. Canvas raster IO is stubbed;
// this does not claim browser visual acceptance or physical press validation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Worker: NodeWorker } = require('node:worker_threads');
const { webcrypto, createHash } = require('node:crypto');
const { JSDOM } = require('jsdom');
const fixture = require('./preview-vectors.json');
const dom = new JSDOM(fs.readFileSync('browser-bundle/src/index.html', 'utf8'), { url: 'https://offline.test/#print', runScripts: 'outside-only' });
const w = dom.window, d = w.document, $ = s => d.querySelector(s);
Object.defineProperty(w.crypto, 'subtle', { value: webcrypto.subtle });
w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder; w.Blob = Blob;
const pixels = Uint8Array.from(fixture.input_rgb.flatMap((v, i) => i % 3 === 2 ? [v, 255] : [v]));
const raster = new WeakMap();
w.HTMLCanvasElement.prototype.getContext = function () {
  const canvas = this;
  return { fillRect() {}, drawImage() {}, fillText() {},
    getImageData: () => ({ data: pixels.slice() }),
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    putImageData: img => raster.set(canvas, new Uint8Array(img.data)),
  };
};
const downloads = [], urls = new Map(), workers = [];
w.URL.createObjectURL = blob => { const url = 'blob:test-' + urls.size; urls.set(url, blob); return url; };
w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () { downloads.push({ name: this.download, blob: urls.get(this.href) }); };
w.HTMLCanvasElement.prototype.toBlob = function (fn) { fn(new Blob(['PNG canvas export test'], { type: 'image/png' })); };
let sent = [], holdResults = false;
w.Worker = class {
  constructor(url) {
    this.ended = false; this.thread = null;
    workers.push(this);
    this.ready = urls.get(url).text().then(code => {
      if (this.ended) return;
      this.thread = new NodeWorker(`const {parentPort}=require('node:worker_threads'); globalThis.postMessage=(data,transfer)=>parentPort.postMessage(data,transfer); globalThis.fetch=()=>{throw Error('Network forbidden')}; globalThis.XMLHttpRequest=()=>{throw Error('Network forbidden')};\n${code}\nparentPort.on('message',data=>globalThis.onmessage({data}));`, { eval: true });
      this.thread.on('message', data => { if (!this.ended && !(holdResults && data.type === 'result')) this.onmessage?.({ data }); });
      this.thread.on('error', error => this.onerror?.(error));
    });
  }
  postMessage(data) {
    sent.push({ path: data.path, pixels: new Uint8Array(data.pixels), profile: new Uint8Array(data.profile) });
    this.ready.then(() => { if (!this.ended) this.thread.postMessage(data); });
  }
  terminate() { this.ended = true; this.thread?.terminate(); }
};
$('#atlas-print-worker-source').textContent = JSON.stringify(fs.readFileSync('browser-bundle/build/atlas-clarus-browser-bundle/assets/lcms-worker.js', 'utf8'));
for (const name of ['print-handoff.js', 'print-preview-ui.js', 'print-ui.js']) w.eval(fs.readFileSync(`browser-bundle/src/${name}`, 'utf8'));
const data = JSON.parse(fs.readFileSync('hover-library/data/colors.json'));
const picker = d.createElement('canvas'); picker.width = 7; picker.height = 1;
w.ATLAS_CLARUS_PRINT_UI.init({ colors: data.colors, master: data.master_sha256,
  getSelected: () => data.colors[10519], getPalette: () => [data.colors[10519]], getPaletteName: () => 'Test',
  getPickerImage: () => ({ canvas: picker, name: 'synthetic-pixels.png' }),
  download: (name, text, type) => downloads.push({ name, text, type }) });
const input = (selector, value) => { const el = $(selector); el.value = value; el.dispatchEvent(new w.Event('input')); };
async function waitFor(fn) {
  const end = Date.now() + 10000;
  while (!fn()) { if (Date.now() > end) throw Error('Preview timeout: ' + $('[data-preview-path="4C"] [data-preview-status]').textContent); await new Promise(r => setTimeout(r, 10)); }
}
const beforeCanvas = id => $(`[data-preview-path="${id}"] [data-preview-original]`);
const afterCanvas = id => $(`[data-preview-path="${id}"] [data-preview-after]`);
const run = id => $(`[data-preview-path="${id}"] [data-preview-run]`);
const details = id => {
  $(`[data-preview-path="${id}"] [data-preview-metadata]`).click();
  return JSON.parse(downloads.at(-1).text);
};
async function attach(id, bytes) {
  const el = $(`[data-print-path="${id}"] [data-profile-file]`);
  Object.defineProperty(el, 'files', { configurable: true, value: [{ name: `synthetic-${id}.icc`, size: bytes.length, arrayBuffer: async () => bytes.buffer }] });
  el.dispatchEvent(new w.Event('change'));
  await waitFor(() => !$('#print-import').disabled);
}
(async () => {
  assert.ok(run('4C').disabled && run('ECG').disabled);
  await $('#preview-use-picker').onclick();
  assert.deepEqual(raster.get(beforeCanvas('4C')), pixels);
  assert.deepEqual(raster.get(beforeCanvas('ECG')), pixels);
  for (const p of fixture.cases) {
    await attach(p.path, new Uint8Array(Buffer.from(p.icc_base64, 'base64')));
    input(`[data-print-path="${p.path}"] [data-setting="rendering_intent"]`, 'Relative colorimetric');
    input(`[data-print-path="${p.path}"] [data-setting="black_point_compensation"]`, 'false');
  }
  $('#preview-run-both').click();
  await waitFor(() => !afterCanvas('4C').hidden && !afterCanvas('ECG').hidden);
  assert.deepEqual(sent[0].pixels, pixels); assert.deepEqual(sent[1].pixels, pixels);
  assert.notDeepEqual(raster.get(afterCanvas('4C')), raster.get(afterCanvas('ECG')));
  const four = details('4C'), ecg = details('ECG');
  assert.equal(four.source.rgba_sha256, ecg.source.rgba_sha256);
  assert.equal(four.source.rgba_sha256, createHash('sha256').update(pixels).digest('hex'));
  assert.equal(four.input_from_path, null); assert.equal(ecg.input_from_path, null);
  assert.equal(four.atlas_reference_reassignment, false);
  assert.notEqual(four.profile.sha256, ecg.profile.sha256);
  $(`[data-preview-path="4C"] [data-preview-save]`).click();
  assert.match(downloads.at(-1).name, /4C_Before_After\.png$/);
  assert.equal(downloads.at(-1).blob.type, 'image/png');
  // Every relevant setting invalidates just its path, including report labels.
  input('[data-print-path="4C"] [data-setting="substrate"]', 'Another paper');
  assert.ok(afterCanvas('4C').hidden); assert.equal(afterCanvas('ECG').hidden, false);
  assert.equal(details('ECG').output_rgba_sha256, ecg.output_rgba_sha256);
  run('4C').click(); await waitFor(() => !afterCanvas('4C').hidden);
  assert.equal(details('4C').substrate, 'Another paper');
  // A setting change cancels a live worker and stale results cannot reappear.
  holdResults = true; run('4C').click();
  await waitFor(() => workers.at(-1).thread);
  const active = workers.at(-1);
  input('[data-print-path="4C"] [data-setting="rendering_intent"]', 'Perceptual');
  assert.equal(active.ended, true); assert.ok(afterCanvas('4C').hidden);
  holdResults = false;
  // Header/class validation accepts this; the real engine rejects missing transforms.
  const broken = new Uint8Array(Buffer.from(fixture.cases[0].icc_base64, 'base64'));
  const v = new DataView(broken.buffer);
  for (let i = 0; i < v.getUint32(128); i++) {
    const at = 132 + i * 12;
    if (String.fromCharCode(...broken.slice(at, at + 4)) === 'B2A0') broken.set([100, 101, 97, 100], at);
  }
  await attach('4C', broken); run('4C').click();
  await waitFor(() => /both A2B and B2A/.test($('[data-preview-path="4C"] [data-preview-status]').textContent));
  assert.ok(afterCanvas('4C').hidden);
  assert.equal(afterCanvas('ECG').hidden, false);
  // New image snapshots always invalidate both paths.
  await $('#preview-use-picker').onclick();
  assert.ok(afterCanvas('4C').hidden && afterCanvas('ECG').hidden);
  assert.equal($('[data-preview-path="ECG"] [data-preview-save]').disabled, true);
  assert.match($('#print-references').textContent, /H285_L025_C065/);
  console.log('PASS: actual ICC workers through DOM, two same-source B/A comparisons, per-path invalidation, cancellation, malformed transforms, metadata/PNG actions and frozen identity preservation (canvas IO stubbed)');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { workers.forEach(w => w.terminate()); dom.window.close(); });
