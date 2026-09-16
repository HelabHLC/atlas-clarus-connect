/* Two independent ICC round trips. This module never assigns ATLAS identities. */
(function (root) {
  'use strict';
  const MAX_PIXELS = 1440000;
  const INTENTS = ['Perceptual', 'Relative colorimetric', 'Saturation', 'Absolute colorimetric'];
  const ensure = (ok, message) => { if (!ok) throw Error(message); };
  function inspectProfile(profile, path, requireReturn) {
    ensure(profile instanceof Uint8Array && profile.length >= 132 && profile.length <= 16777216, 'Missing ICC profile.');
    const view = new DataView(profile.buffer, profile.byteOffset, profile.byteLength);
    const sig = at => String.fromCharCode(...profile.subarray(at, at + 4));
    ensure(view.getUint32(0) === profile.length && sig(36) === 'acsp' && sig(12) === 'prtr' &&
      sig(16) === (path === '4C' ? 'CMYK' : '7CLR'), 'ICC profile does not match this path.');
    const tags = new Set(), tagCount = view.getUint32(128);
    ensure(tagCount > 0 && tagCount <= Math.floor((profile.length - 132) / 12), 'Invalid ICC tag table.');
    for (let i = 0; i < tagCount; i++) tags.add(sig(132 + 12 * i));
    ensure(['A2B0', 'A2B1', 'A2B2'].some(t => tags.has(t)), 'This profile has no A2B transform for separation.');
    if (requireReturn) ensure(['B2A0', 'B2A1', 'B2A2'].some(t => tags.has(t)),
      'This profile needs both A2B and B2A transforms for an image preview.');
    return { view, sig, tags };
  }
  async function separateReference(job) {
    const { path, rgb, profile, intent, bpc, channelOrder } = job;
    ensure(['4C', 'ECG'].includes(path), 'Unknown separation path.');
    ensure(Array.isArray(rgb) && rgb.length === 3 && rgb.every(v => Number.isInteger(v) && v >= 0 && v <= 255),
      'A frozen 8-bit sRGB reference is required.');
    ensure(INTENTS.includes(intent) && typeof bpc === 'boolean', 'Choose rendering intent and black-point compensation.');
    inspectProfile(profile, path, false);
    const channels = path === '4C' ? 4 : 7;
    const order = path === '4C' ? ['C', 'M', 'Y', 'K'] : channelOrder;
    ensure(Array.isArray(order) && order.length === channels && order.every(x => typeof x === 'string' && x.trim()) &&
      new Set(order.map(x => x.trim().toUpperCase())).size === channels,
      'Confirm the unique seven-channel order supplied by the ECG workflow.');
    const cms = await root.ATLAS_LOAD_LCMS();
    let memory = 0, output = 0, srgb = 0, transform = 0, inPtr = 0, outPtr = 0;
    try {
      memory = cms._malloc(profile.length); ensure(memory, 'ICC memory allocation failed.');
      cms.HEAPU8.set(profile, memory); output = cms._cmsOpenProfileFromMem(memory, profile.length);
      ensure(output, 'LittleCMS could not open this ICC profile.');
      srgb = cms.cmsCreate_sRGBProfile(); ensure(srgb, 'Could not create the sRGB input profile.');
      const rgb8 = (4 << 16) | (3 << 3) | 1;
      const device16 = cms.cmsFormatterForColorspaceOfProfile(output, 2, false);
      ensure(((device16 >> 3) & 15) === channels, 'Profile channel count differs from this path.');
      transform = cms.cmsCreateTransform(srgb, rgb8, output, device16, INTENTS.indexOf(intent), 0x0100 | (bpc ? 0x2000 : 0));
      ensure(transform, 'The profile cannot separate sRGB into this output space.');
      inPtr = cms._malloc(3); outPtr = cms._malloc(channels * 2); ensure(inPtr && outPtr, 'Reference memory allocation failed.');
      cms.HEAPU8.set(rgb, inPtr); cms._cmsDoTransform(transform, inPtr, outPtr, 1);
      const values = Array.from({ length: channels }, (_, i) => cms.HEAPU16[(outPtr >> 1) + i]);
      return { path, channels, channel_order: order.map(x => x.trim()), device_values_16bit: values,
        device_values_normalized: values.map(v => Number((v / 65535).toFixed(8))),
        engine: 'LittleCMS 2.16 / lcms-wasm 1.0.5', method: 'SRGB_TO_DEVICE16',
        intent, bpc, measured_qc: 'NOT_MEASURED', production_approval: 'NOT_PROVIDED' };
    } finally {
      if (transform) cms.cmsDeleteTransform(transform);
      if (output) cms.cmsCloseProfile(output);
      if (srgb) cms.cmsCloseProfile(srgb);
      for (const ptr of [inPtr, outPtr, memory]) if (ptr) cms._free(ptr);
    }
  }
  async function calculate(job, progress = () => {}) {
    const { path, width, height, pixels, profile, intent, bpc } = job;
    ensure(['4C', 'ECG'].includes(path), 'Unknown preview path.');
    ensure(Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 &&
      width * height <= MAX_PIXELS && pixels instanceof Uint8Array && pixels.length === width * height * 4,
      'Invalid or oversized sRGB image.');
    inspectProfile(profile, path, true);
    ensure(INTENTS.includes(intent) && typeof bpc === 'boolean', 'Choose rendering intent and black-point compensation.');
    const cms = await root.ATLAS_LOAD_LCMS();
    let memory = 0, output = 0, srgb = 0, forward = 0, backward = 0;
    let inPtr = 0, devicePtr = 0, outPtr = 0;
    const channels = path === '4C' ? 4 : 7;
    const chunk = 8192;
    try {
      // Heap allocation avoids the upstream array wrapper's fixed stack limit.
      memory = cms._malloc(profile.length); ensure(memory, 'ICC memory allocation failed.');
      cms.HEAPU8.set(profile, memory);
      output = cms._cmsOpenProfileFromMem(memory, profile.length);
      ensure(output, 'LittleCMS could not open this ICC profile.');
      srgb = cms.cmsCreate_sRGBProfile(); ensure(srgb, 'Could not create the sRGB input profile.');
      const rgb8 = (4 << 16) | (3 << 3) | 1;
      const device16 = cms.cmsFormatterForColorspaceOfProfile(output, 2, false);
      ensure(((device16 >> 3) & 15) === channels, 'Profile channel count differs from this path.');
      // NOOPTIMIZE keeps profile evaluation explicit; BPC applies to the forward
      // separation only. Return to sRGB is relative colorimetric, without BPC.
      forward = cms.cmsCreateTransform(srgb, rgb8, output, device16, INTENTS.indexOf(intent), 0x0100 | (bpc ? 0x2000 : 0));
      ensure(forward, 'The profile cannot separate sRGB into this output space.');
      backward = cms.cmsCreateTransform(output, device16, srgb, rgb8, 1, 0x0100);
      ensure(backward, 'The profile cannot return device values to sRGB.');
      inPtr = cms._malloc(chunk * 3); devicePtr = cms._malloc(chunk * channels * 2); outPtr = cms._malloc(chunk * 3);
      ensure(inPtr && devicePtr && outPtr, 'Image memory allocation failed.');
      const result = new Uint8Array(pixels.length);
      for (let start = 0; start < width * height; start += chunk) {
        const count = Math.min(chunk, width * height - start);
        for (let i = 0; i < count; i++) {
          const at = (start + i) * 4;
          cms.HEAPU8[inPtr + i * 3] = pixels[at];
          cms.HEAPU8[inPtr + i * 3 + 1] = pixels[at + 1];
          cms.HEAPU8[inPtr + i * 3 + 2] = pixels[at + 2];
        }
        cms._cmsDoTransform(forward, inPtr, devicePtr, count);
        cms._cmsDoTransform(backward, devicePtr, outPtr, count);
        for (let i = 0; i < count; i++) {
          const at = (start + i) * 4;
          result[at] = cms.HEAPU8[outPtr + i * 3];
          result[at + 1] = cms.HEAPU8[outPtr + i * 3 + 1];
          result[at + 2] = cms.HEAPU8[outPtr + i * 3 + 2];
          result[at + 3] = pixels[at + 3];
        }
        progress(Math.round((start + count) / (width * height) * 100));
      }
      return { pixels: result, width, height, path, channels, engine: 'LittleCMS 2.16 / lcms-wasm 1.0.5',
        method: 'SRGB_TO_DEVICE16_TO_SRGB', forward_intent: intent, forward_bpc: bpc,
        return_intent: 'Relative colorimetric', return_bpc: false,
        paper_white_simulation: false, measured_qc: 'NOT_MEASURED' };
    } finally {
      if (forward) cms.cmsDeleteTransform(forward);
      if (backward) cms.cmsDeleteTransform(backward);
      if (output) cms.cmsCloseProfile(output);
      if (srgb) cms.cmsCloseProfile(srgb);
      for (const ptr of [inPtr, devicePtr, outPtr, memory]) if (ptr) cms._free(ptr);
    }
  }
  root.ATLAS_PREVIEW_CALCULATE = calculate;
  root.ATLAS_REFERENCE_SEPARATE = separateReference;
  root.onmessage = async event => {
    try {
      if (event.data.operation === 'reference-separation') {
        const result = await separateReference(event.data);
        root.postMessage({ type: 'reference-result', result });
      } else {
        const result = await calculate(event.data, percent => root.postMessage({ type: 'progress', percent }));
        root.postMessage({ type: 'result', result }, [result.pixels.buffer]);
      }
    } catch (error) { root.postMessage({ type: 'error', message: error.message || 'ICC preview failed.' }); }
  };
})(globalThis);
