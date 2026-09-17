(function (root) {
  'use strict';
  function init(context) {
    const panel = document.querySelector('#print-image-preview');
    if (!panel) return null;
    const $ = selector => panel.querySelector(selector);
    const paths = ['4C', 'ECG'], P = root.ATLAS_CLARUS_PRINT;
    const pkl = root.ATLAS_CLARUS_PKL_IMAGE.create(context.colors, context.master);
    const states = Object.fromEntries(paths.map(id => [id, { revision: 0, worker: null, result: null, timer: null }]));
    let source = null, loading = false, loadRevision = 0, workerURL = null;
    const card = id => $(`[data-preview-path="${id}"]`);
    const digest = async bytes => Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    function status(id, text, error = false) {
      const el = card(id).querySelector('[data-preview-status]');
      el.textContent = text; el.classList.toggle('error', error);
    }
    function ready(id) {
      const s = context.getSettings()[id];
      return source && !loading && s.profile && P.INTENTS.includes(s.rendering_intent) && typeof s.black_point_compensation === 'boolean';
    }
    function refresh() {
      paths.forEach(id => {
        const c = card(id), state = states[id];
        c.querySelector('[data-preview-run]').disabled = !ready(id) || !!state.worker;
        c.querySelector('[data-preview-save]').disabled = !state.result;
        c.querySelector('[data-preview-metadata]').disabled = !state.result;
      });
      $('#preview-run-both').disabled = loading || !paths.some(id => ready(id) && !states[id].worker);
      $('#preview-use-picker').disabled = loading || !context.getPickerImage?.();
    }
    function invalidate(id) {
      const s = states[id];
      s.revision++;
      if (s.worker) s.worker.terminate();
      s.worker = null; clearTimeout(s.timer); s.timer = null; s.result = null;
      card(id).querySelector('[data-preview-after]').hidden = true;
      status(id, !source ? 'Load an image to begin.' : !context.getSettings()[id].profile ?
        `Attach the ${id} output profile above.` : 'Settings changed. Create a new preview.');
      refresh();
    }
    function draw(canvas, pixels, width, height) {
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d', { colorSpace: 'srgb' });
      const image = ctx.createImageData(width, height); image.data.set(pixels); ctx.putImageData(image, 0, 0);
      canvas.hidden = false;
    }
    async function capture(image, name, revision) {
      const originalWidth = image.naturalWidth || image.width, originalHeight = image.naturalHeight || image.height;
      if (!originalWidth || !originalHeight || originalWidth * originalHeight > 100000000) throw Error('Image dimensions are invalid or exceed 100 megapixels.');
      const scale = Math.min(1, 1200 / Math.max(originalWidth, originalHeight));
      const width = Math.max(1, Math.round(originalWidth * scale)), height = Math.max(1, Math.round(originalHeight * scale));
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true });
      if (!ctx) throw Error('An sRGB canvas is required for image previews.');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); ctx.drawImage(image, 0, 0, width, height);
      const pixels = new Uint8Array(ctx.getImageData(0, 0, width, height).data);
      const sha = await digest(pixels);
      if (revision !== loadRevision) return;
      const bound = pkl.bind(pixels), pklHash = await digest(bound.pixels);
      if (revision !== loadRevision) return;
      source = { pixels, width, height, sha256: sha, name, original_width: originalWidth, original_height: originalHeight,
        pkl_pixels: bound.pixels, pkl_sha256: pklHash, pkl_evidence: bound.evidence };
      paths.forEach(id => { invalidate(id); draw(card(id).querySelector('[data-preview-original]'), bound.pixels, width, height); });
      $('#preview-image-status').textContent = `${name} · ${width} × ${height} from ${originalWidth} × ${originalHeight} · browser sRGB source bound to PKL Full Reference · ${bound.evidence.assigned_master_rows} master rows · 0 foreign colors`;
    }
    async function usePicker() {
      const picked = context.getPickerImage?.();
      if (!picked) { $('#preview-image-status').textContent = 'Load an image in the Image Picker first.'; return; }
      const revision = ++loadRevision; loading = true; paths.forEach(invalidate); refresh();
      try { await capture(picked.canvas, picked.name, revision); }
      catch (error) { $('#preview-image-status').textContent = error.message; }
      finally { if (revision === loadRevision) { loading = false; refresh(); } }
    }
    $('#preview-use-picker').onclick = usePicker;
    $('#preview-image-file').onchange = async event => {
      const file = event.target.files[0]; event.target.value = '';
      if (!file) return;
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 40 * 1024 * 1024) {
        $('#preview-image-status').textContent = 'Choose a PNG, JPEG or WebP image up to 40 MiB.'; return;
      }
      const revision = ++loadRevision; loading = true; paths.forEach(invalidate); refresh();
      const url = URL.createObjectURL(file);
      try {
        const image = await new Promise((resolve, reject) => {
          const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(Error('The image could not be decoded.')); img.src = url;
        });
        await capture(image, file.name, revision);
      } catch (error) { if (revision === loadRevision) $('#preview-image-status').textContent = error.message; }
      finally { URL.revokeObjectURL(url); if (revision === loadRevision) { loading = false; refresh(); } }
    };
    function getWorkerURL() {
      if (!workerURL) {
        const element = document.querySelector('#atlas-print-worker-source');
        if (!element) throw Error('The embedded ICC engine is missing. Rebuild the offline bundle.');
        workerURL = URL.createObjectURL(new Blob([JSON.parse(element.textContent)], { type: 'text/javascript' }));
      }
      return workerURL;
    }
    function run(id) {
      if (!ready(id)) { status(id, 'Choose an image, matching output profile, rendering intent and BPC setting.'); return; }
      invalidate(id);
      const state = states[id], revision = state.revision, image = source;
      const settings = JSON.parse(JSON.stringify(context.getSettings()[id]));
      try {
        if (typeof Worker !== 'function') throw Error('This browser does not support local image workers.');
        const worker = new Worker(getWorkerURL()); state.worker = worker;
        status(id, 'Calculating local ICC preview…'); refresh();
        const fail = message => {
          if (state.revision !== revision) return;
          worker.terminate(); clearTimeout(state.timer); state.worker = null; state.timer = null;
          status(id, message, true); refresh();
        };
        state.timer = setTimeout(() => fail('Calculation timed out. Try a smaller image or another validated profile.'), 90000);
        worker.onerror = () => fail('The local ICC worker failed. This browser or profile may be unsupported.');
        worker.onmessage = async event => {
          if (state.revision !== revision) return;
          const response = event.data;
          if (response.type === 'progress') { status(id, `Calculating ${id} · ${response.percent}%`); return; }
          if (response.type === 'error') { fail(response.message); return; }
          if (response.type !== 'result') { fail('Unexpected ICC worker response.'); return; }
          try {
            const result = response.result;
            if (result.path !== id || result.width !== image.width || result.height !== image.height ||
              result.pixels.length !== image.pixels.length) throw Error('Preview does not match the source image.');
            const outputHash = await digest(result.pixels);
            if (state.revision !== revision) return;
            const { pixels, ...calculation } = result;
            const metadata = {
              format: 'ATLAS_CLARUS_IMAGE_PREVIEW', version: '0.1.0', status: 'COMPUTATIONAL_PREVIEW_NOT_MEASURED',
              created_at: new Date().toISOString(), path: id, input_from_path: null,
              input_kind: 'PKL_FULL_REFERENCE_IMAGE', atlas_reference_reassignment: true,
              source: { name: image.name, width: image.width, height: image.height, original_width: image.original_width,
                original_height: image.original_height, rgba_sha256: image.sha256, transparency: 'COMPOSITED_ON_WHITE' },
              pkl_reference: { rgba_sha256: image.pkl_sha256, ...image.pkl_evidence },
              output_rgba_sha256: outputHash,
              profile: { file_name: settings.profile.file_name, sha256: settings.profile.sha256, device_space: settings.profile.device_space },
              printing_condition: settings.printing_condition, substrate: settings.substrate,
              calculation, production_approval: 'NOT_PROVIDED',
            };
            state.result = { pixels, metadata };
            draw(card(id).querySelector('[data-preview-after]'), pixels, image.width, image.height);
            worker.terminate(); clearTimeout(state.timer); state.worker = null; state.timer = null;
            status(id, `${id} preview ready · ${settings.profile.file_name} · ${settings.rendering_intent} · BPC ${settings.black_point_compensation ? 'on' : 'off'}`);
            refresh();
          } catch (error) { fail(error.message); }
        };
        const pixels = image.pkl_pixels.slice();
        const profile = Uint8Array.from(atob(settings.profile.data_base64), c => c.charCodeAt(0));
        worker.postMessage({ path: id, width: image.width, height: image.height, pixels, profile,
          intent: settings.rendering_intent, bpc: settings.black_point_compensation }, [pixels.buffer, profile.buffer]);
      } catch (error) { invalidate(id); status(id, error.message, true); }
    }
    function stem(id) { return `ATLAS_${id}_Before_After`; }
    function save(id) {
      const result = states[id].result; if (!result || !source) return;
      const { width, height } = source, gap = 24, margin = 24, top = 100, bottom = 100;
      const canvas = document.createElement('canvas');
      // Keep labels legible even for a tiny source image. Upscaling is display-only.
      const displayWidth = Math.max(480, width), displayHeight = Math.min(1200, Math.max(180, Math.round(height * displayWidth / width)));
      canvas.width = displayWidth * 2 + gap + margin * 2; canvas.height = displayHeight + top + bottom;
      const ctx = canvas.getContext('2d', { colorSpace: 'srgb' });
      ctx.fillStyle = '#0a0d12'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#9bff55'; ctx.font = 'bold 22px system-ui'; ctx.fillText(`ATLAS CLARUS · PKL FULL REFERENCE ↔ ${id} PREVIEW`, margin, 34);
      ctx.fillStyle = '#eef2f6'; ctx.font = '18px system-ui';
      ctx.fillText('PKL Full Reference · exact master RGB', margin, 75); ctx.fillText(`${id} · ICC preview`, margin + displayWidth + gap, 75);
      const imageScale = Math.min(displayWidth / width, displayHeight / height), dw = width * imageScale, dh = height * imageScale;
      const dx = (displayWidth - dw) / 2, dy = (displayHeight - dh) / 2;
      ctx.drawImage(card(id).querySelector('[data-preview-original]'), margin + dx, top + dy, dw, dh);
      ctx.drawImage(card(id).querySelector('[data-preview-after]'), margin + displayWidth + gap + dx, top + dy, dw, dh);
      ctx.font = '16px system-ui';
      const meta = result.metadata;
      ctx.fillText(`${meta.profile.file_name.slice(0, 55)} · ${meta.calculation.forward_intent} · BPC ${meta.calculation.forward_bpc ? 'on' : 'off'}`, margin, canvas.height - 65);
      ctx.fillText('ICC ROUND-TRIP PREVIEW · NO PAPER-WHITE SIMULATION · NOT PHYSICALLY VERIFIED', margin, canvas.height - 39);
      ctx.fillText(`Profile SHA-256: ${meta.profile.sha256}`, margin, canvas.height - 14);
      const revision = states[id].revision;
      canvas.toBlob(blob => {
        if (!blob || states[id].revision !== revision) return;
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = stem(id) + '.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    }
    paths.forEach(id => {
      card(id).querySelector('[data-preview-run]').onclick = () => run(id);
      card(id).querySelector('[data-preview-save]').onclick = () => save(id);
      card(id).querySelector('[data-preview-metadata]').onclick = () => {
        const r = states[id].result;
        if (r) context.download(stem(id) + '.preview.json', JSON.stringify(r.metadata, null, 2), 'application/json');
      };
    });
    $('#preview-run-both').onclick = () => paths.forEach(run);
    root.addEventListener('hashchange', refresh);
    root.addEventListener('atlas-picker-image-loaded', refresh);
    root.addEventListener('pagehide', () => { paths.forEach(invalidate); if (workerURL) URL.revokeObjectURL(workerURL); workerURL = null; });
    refresh();
    return { invalidate, refresh };
  }
  root.ATLAS_CLARUS_PREVIEW_UI = { init };
})(window);
