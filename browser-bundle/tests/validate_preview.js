// Execute the shipped WASM engine with native-LittleCMS reference vectors.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const vectors = require('./preview-vectors.json');
const code = fs.readFileSync('browser-bundle/build/atlas-clarus-browser-bundle/assets/lcms-worker.js', 'utf8');
let networkCalls = 0;
const blocked = () => { networkCalls++; throw Error('Network forbidden in offline test'); };
const env = vm.createContext({ Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array,
  Float32Array, Float64Array, ArrayBuffer, DataView, WebAssembly, console, TextDecoder, TextEncoder,
  atob, btoa, setTimeout, clearTimeout, performance, fetch: blocked, XMLHttpRequest: blocked });
vm.runInContext(code, env);
const calc = env.ATLAS_PREVIEW_CALCULATE;
const separate = env.ATLAS_REFERENCE_SEPARATE;
const pixels = Uint8Array.from(vectors.input_rgb.flatMap((v, i) => i % 3 === 2 ? [v, 255] : [v]));
const intentNames = ['Perceptual', 'Relative colorimetric', 'Saturation', 'Absolute colorimetric'];
const job = p => ({ path: p.path, width: 7, height: 1, pixels: pixels.slice(),
  profile: new Uint8Array(Buffer.from(p.icc_base64, 'base64')), intent: 'Relative colorimetric', bpc: false });
(async () => {
  const results = [];
  for (const p of vectors.cases) {
    for (const vector of p.vectors) {
      const j = { ...job(p), intent: intentNames[vector.intent], bpc: vector.bpc };
      const before = j.pixels.slice(), profileBefore = j.profile.slice();
      const out = await calc(j);
      const rgb = Array.from(out.pixels).filter((_, i) => i % 4 !== 3);
      // Native 2.14 and WASM 2.16 currently match exactly for these CLUTs.
      assert.deepEqual(rgb, vector.rgb, `${p.path}, intent ${vector.intent}, BPC ${vector.bpc}`);
      assert.deepEqual(j.pixels, before); assert.deepEqual(j.profile, profileBefore);
      assert.equal(out.channels, p.path === '4C' ? 4 : 7);
      assert.equal(out.paper_white_simulation, false);
      assert.equal(out.measured_qc, 'NOT_MEASURED');
      results.push(out);
    }
  }
  assert.notDeepEqual(results[0].pixels, pixels, 'The output is a duplicate of the original');
  assert.notDeepEqual(results[0].pixels, results[8].pixels, 'The two profiles were ignored');
  // Processing ECG cannot affect a subsequent 4C result.
  assert.deepEqual((await calc(job(vectors.cases[0]))).pixels, results[2].pixels);
  const large = new Uint8Array(9000 * 4);
  for (let i = 0; i < 9000; i++) large.set([128, 128, 128, i % 256], i * 4);
  const progress = [];
  const big = await calc({ ...job(vectors.cases[1]), width: 900, height: 10, pixels: large }, x => progress.push(x));
  assert.equal(progress.at(-1), 100); assert.ok(progress.length > 1);
  for (let i = 0; i < 9000; i++) {
    assert.deepEqual(Array.from(big.pixels.slice(i * 4, i * 4 + 3)), vectors.cases[1].vectors[2].rgb.slice(15, 18));
    assert.equal(big.pixels[i * 4 + 3], large[i * 4 + 3]);
  }
  await assert.rejects(calc({ ...job(vectors.cases[0]), path: 'ECG' }), /does not match/);
  await assert.rejects(calc({ ...job(vectors.cases[0]), intent: null }), /rendering intent/);
  await assert.rejects(calc({ ...job(vectors.cases[0]), width: 120000 }), /oversized/);
  const bad = job(vectors.cases[0]);
  // Remove B2A tag without changing the valid header; never show a fake preview.
  const dv = new DataView(bad.profile.buffer);
  for (let i = 0; i < dv.getUint32(128); i++) {
    const at = 132 + i * 12;
    if (String.fromCharCode(...bad.profile.slice(at, at + 4)) === 'B2A0') bad.profile.set([0, 0, 0, 0], at);
  }
  await assert.rejects(calc(bad), /both A2B and B2A/);
  for (const p of vectors.cases) {
    const result = await separate({ path: p.path, rgb: [128, 64, 32], profile: job(p).profile,
      intent: 'Relative colorimetric', bpc: false,
      channelOrder: p.path === 'ECG' ? ['C','M','Y','K','O','G','V'] : undefined });
    assert.equal(result.device_values_16bit.length, p.path === '4C' ? 4 : 7);
    assert.ok(result.device_values_16bit.every(v => Number.isInteger(v) && v >= 0 && v <= 65535));
    assert.equal(result.method, 'SRGB_TO_DEVICE16'); assert.equal(result.measured_qc, 'NOT_MEASURED');
  }
  await assert.rejects(separate({ path: 'ECG', rgb: [1,2,3], profile: job(vectors.cases[1]).profile,
    intent: 'Relative colorimetric', bpc: false }), /channel order/i);
  assert.equal(networkCalls, 0);
  console.log('PASS: 16 exact native/WASM ICC vectors, real 4C and 7-channel round trips, isolated inputs, chunking, alpha, unsupported-profile rejection, zero network calls');
})().catch(error => { console.error(error); process.exitCode = 1; });
