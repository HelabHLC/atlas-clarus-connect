(function (root) {
  'use strict';
  function init(context) {
    const section = document.querySelector('#print');
    if (!section) return null;
    const P = root.ATLAS_CLARUS_PRINT;
    const $ = selector => section.querySelector(selector);
    const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    let entries = [], busy = false, preview = null;
    const settings = { '4C': P.emptySettings(), ECG: P.emptySettings() };
    function message(value, error = false) {
      $('#print-message').textContent = value;
      $('#print-message').classList.toggle('error', error);
    }
    function lock(value) {
      busy = value;
      section.querySelectorAll('button,input,select').forEach(el => { if (!el.closest('#print-image-preview')) el.disabled = value; });
      $('#print-export').disabled = value || !entries.length;
      $('#print-report').disabled = value || !entries.length;
      P.PATHS.forEach(id => { $(`[data-print-path="${id}"] [data-profile-clear]`).disabled = value || !settings[id].profile; });
    }
    function renderReferences() {
      $('#print-references').innerHTML = entries.length ? entries.map(c =>
        `<span class="print-reference"><i style="background:${escape(c.hex)}"></i><b>${escape(c.ref)}</b><small>Row ${c.id}</small></span>`).join('') : '<p>Choose a reference in Hover or Wheel, or add colours to a palette.</p>';
      $('#print-count').textContent = `${entries.length} frozen reference${entries.length === 1 ? '' : 's'} · shared by both paths`;
      lock(busy);
    }
    function renderPath(id) {
      const s = settings[id], card = $(`[data-print-path="${id}"]`);
      const status = card.querySelector('[data-path-status]');
      status.textContent = !s.profile ? 'Profile missing' : !s.printing_condition.trim() || !s.substrate.trim() ||
        s.rendering_intent === null || s.black_point_compensation === null ? 'Complete the print settings' : 'Prepared · reference output calculation still required';
      const p = s.profile;
      card.querySelector('[data-profile-summary]').innerHTML = p ?
        `<b>${escape(p.file_name)}</b><span>ICC ${escape(p.version)} · ${escape(p.device_space)} / ${escape(p.pcs)}</span><code>${escape(p.sha256)}</code><small>File structure checked. Transform not validated.</small>` : '<span>No output profile attached.</span>';
      card.querySelector('[data-profile-clear]').disabled = busy || !p;
      card.querySelector('[data-profiled-reference]').disabled = busy || entries.length !== 1 || !p ||
        !s.printing_condition.trim() || !s.substrate.trim() || s.rendering_intent === null || s.black_point_compensation === null;
    }
    const profileBytes = profile => {
      const binary = atob(profile.data_base64);
      return Uint8Array.from(binary, ch => ch.charCodeAt(0));
    };
    function runSeparation(job) {
      return new Promise((resolve, reject) => {
        const encoded = document.querySelector('#atlas-print-worker-source')?.textContent;
        if (!encoded || encoded === 'null') return reject(Error('The embedded LittleCMS worker is unavailable.'));
        let source;
        try { source = JSON.parse(encoded); } catch (_) { return reject(Error('The embedded LittleCMS worker is invalid.')); }
        const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        const worker = new Worker(url);
        let settled = false;
        const finish = (error, result) => {
          if (settled) return;
          settled = true; clearTimeout(timer); worker.terminate(); URL.revokeObjectURL(url);
          error ? reject(error) : resolve(result);
        };
        const timer = setTimeout(() => finish(Error('LittleCMS reference separation timed out. Try another validated output profile.')), 30000);
        worker.onmessage = event => {
          if (event.data.type === 'reference-result') finish(null, event.data.result);
          else if (event.data.type === 'error') finish(Error(event.data.message));
          else finish(Error('Unexpected LittleCMS worker response.'));
        };
        worker.onerror = event => finish(Error(event.message || 'LittleCMS worker failed.'));
        worker.postMessage(job, [job.profile.buffer]);
      });
    }
    async function createProfiledReference(id) {
      if (busy) return;
      const card = $(`[data-print-path="${id}"]`), s = settings[id]; lock(true);
      try {
        if (entries.length !== 1) throw Error('Choose exactly one frozen ATLAS reference.');
        const channelOrder = id === 'ECG' ? card.querySelector('[data-profiled-channel-order]').value.split(',').map(x => x.trim()).filter(Boolean) : undefined;
        message(`Calculating ${id} device channels locally with LittleCMS…`);
        const separation = await runSeparation({ operation: 'reference-separation', path: id, rgb: [...entries[0].rgb],
          profile: profileBytes(s.profile), intent: s.rendering_intent, bpc: s.black_point_compensation, channelOrder });
        const data = root.ATLAS_CLARUS_PROFILED_REFERENCE_CARD.create({ entry: entries[0], colors: context.colors,
          master: context.master, profile: s.profile, settings: { ...s, path_id: id }, separation });
        const stem = `ATLAS_Profiled_Reference_${data.reference.atlas_address}_${id}`;
        context.download(stem + '.profiled-reference.json', JSON.stringify(data, null, 2), 'application/json');
        message(`${id} reference separated and exported. Profile-bound, not measured, not certified; no device PDF was generated.`);
      } catch (error) { message(`Profile-bound reference blocked: ${error.message}`, true); }
      finally { lock(false); P.PATHS.forEach(renderPath); }
    }
    function use(scope) {
      if (busy) return;
      const picked = scope === 'palette' ? context.getPalette() : [context.getSelected()].filter(Boolean);
      try {
        P.canonicalReferences(picked, context.colors, context.master);
        entries = JSON.parse(JSON.stringify(picked));
        $('#print-name').value = scope === 'palette' ? context.getPaletteName().slice(0,100) : `Print handoff · ${entries[0].ref}`;
        renderReferences();
        message('Reference selection copied to both paths. Later palette changes do not change this handoff.');
        document.querySelector('#palette-drawer')?.classList.remove('open');
        location.hash = 'print';
      } catch (error) { message(error.message, true); location.hash = 'print'; }
    }
    for (const id of P.PATHS) {
      const card = $(`[data-print-path="${id}"]`);
      const intent = card.querySelector('[data-setting="rendering_intent"]');
      P.INTENTS.forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; intent.append(option); });
      card.querySelectorAll('[data-setting]').forEach(input => input.addEventListener('input', () => {
        const key = input.dataset.setting;
        settings[id][key] = key === 'black_point_compensation' ? (input.value === '' ? null : input.value === 'true') :
          key === 'rendering_intent' ? input.value || null : input.value;
        preview?.invalidate(id); renderPath(id);
      }));
      card.querySelector('[data-profile-file]').addEventListener('change', async event => {
        const file = event.target.files[0]; event.target.value = '';
        if (!file || busy) return;
        settings[id].profile = null; preview?.invalidate(id); renderPath(id); lock(true);
        message(`Checking ${id} output profile…`);
        try {
          if (file.size > P.MAX_PROFILE_BYTES) throw Error('ICC files must be no larger than 16 MiB.');
          const profile = await P.readProfile(new Uint8Array(await file.arrayBuffer()), file.name, id);
          settings[id].profile = profile; preview?.invalidate(id);
          message(`${id} profile attached. The other path is unchanged. No device values have been calculated.`);
        } catch (error) { message(`${id} profile rejected: ${error.message}`, true); }
        finally { lock(false); renderPath(id); }
      });
      card.querySelector('[data-profile-clear]').onclick = () => {
        settings[id].profile = null; preview?.invalidate(id); renderPath(id); message(`${id} profile removed. The other path is unchanged.`);
      };
      card.querySelector('[data-profiled-reference]').onclick = () => createProfiledReference(id);
      renderPath(id);
    }
    $('#print-use-selected').onclick = () => use('selected');
    $('#print-use-palette').onclick = () => use('palette');
    async function exportFile(asReport) {
      if (busy) return;
      lock(true);
      try {
        const data = await P.create({ entries, colors: context.colors, master: context.master, name: $('#print-name').value, paths: settings });
        const stem = data.job_name.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'ATLAS_Print_Handoff';
        context.download(stem + (asReport ? '.print-report.html' : '.print-handoff.json'),
          asReport ? P.report(data) : JSON.stringify(data, null, 2), asReport ? 'text/html' : 'application/json');
        message(asReport ? 'Readable preparation report exported. Export JSON as well to carry attached ICC files.' :
          'Both parallel paths exported together, including any attached ICC files. Device calculation and measured QC remain open.');
      } catch (error) { message(`Export blocked: ${error.message}`, true); }
      finally { lock(false); }
    }
    $('#print-export').onclick = () => exportFile(false);
    $('#print-report').onclick = () => exportFile(true);
    $('#print-import').onclick = () => $('#print-import-file').click();
    $('#print-import-file').onchange = async event => {
      const file = event.target.files[0]; event.target.value = '';
      if (!file || busy) return;
      lock(true); message('Verifying both paths, frozen identities and attached ICC files…');
      try {
        if (file.size > P.MAX_PACKAGE_BYTES) throw Error('The handoff file is too large.');
        const data = await P.validate(JSON.parse(await file.text()), context.colors, context.master);
        // Mutate the workspace only after the entire package has passed validation.
        const byId = new Map(context.colors.map(c => [c.id, c]));
        entries = data.references.map(r => JSON.parse(JSON.stringify(byId.get(r.source_atlas_row_id))));
        $('#print-name').value = data.job_name;
        for (const p of data.production_paths) {
          const id = p.path_id, card = $(`[data-print-path="${id}"]`);
          settings[id] = { profile: p.profile, printing_condition: p.printing_condition, substrate: p.substrate,
            rendering_intent: p.rendering_intent, black_point_compensation: p.black_point_compensation };
          card.querySelectorAll('[data-setting]').forEach(input => { const value = settings[id][input.dataset.setting]; input.value = value === null ? '' : String(value); });
          preview?.invalidate(id); renderPath(id);
        }
        renderReferences(); message('Handoff restored: identities, independent paths and embedded profile hashes verified.');
      } catch (error) { message(`Import blocked: ${error.message} The current handoff was retained.`, true); }
      finally { lock(false); P.PATHS.forEach(renderPath); }
    };
    root.addEventListener('hashchange', () => { if (location.hash === '#print' && !entries.length) use('selected'); });
    preview = root.ATLAS_CLARUS_PREVIEW_UI?.init({ ...context, getSettings: () => settings });
    renderReferences();
    if (location.hash === '#print') use('selected');
    return { open: use };
  }
  root.ATLAS_CLARUS_PRINT_UI = { init };
})(window);
