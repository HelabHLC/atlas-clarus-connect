(function (root) {
  'use strict';
  // Workflow 3.4.0: both outputs start at the same frozen reference set.
  // This module prepares an offline request. It does not calculate device values.
  const MASTER = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  const FORMAT = 'ATLAS_CLARUS_PARALLEL_PRINT_HANDOFF';
  const MAX_PROFILE_BYTES = 16 * 1024 * 1024;
  const MAX_PACKAGE_BYTES = 46 * 1024 * 1024;
  const PATHS = ['4C', 'ECG'];
  const INTENTS = ['Perceptual', 'Relative colorimetric', 'Saturation', 'Absolute colorimetric'];
  const clone = value => JSON.parse(JSON.stringify(value));
  function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  function requireThat(ok, message) { if (!ok) throw Error(message); }
  function text(value, max, label) {
    requireThat(typeof value === 'string' && value.length <= max, label + ' is invalid or too long.');
    return value;
  }
  function ascii(bytes, offset, count) { return String.fromCharCode(...bytes.subarray(offset, offset + count)); }
  function toBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    return btoa(binary);
  }
  function fromBase64(value) {
    requireThat(typeof value === 'string' && value.length <= Math.ceil(MAX_PROFILE_BYTES / 3) * 4 &&
      value.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(value), 'Invalid embedded ICC data.');
    const binary = atob(value), bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    requireThat(toBase64(bytes) === value, 'Non-canonical embedded ICC data.');
    return bytes;
  }
  async function readProfile(bytes, fileName, pathId) {
    requireThat(PATHS.includes(pathId), 'Unknown production path.');
    requireThat(bytes instanceof Uint8Array && bytes.length >= 132 && bytes.length <= MAX_PROFILE_BYTES,
      'Choose an ICC output profile between 132 bytes and 16 MiB.');
    text(fileName, 255, 'Profile filename');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    requireThat(view.getUint32(0) === bytes.length && ascii(bytes, 36, 4) === 'acsp', 'Invalid ICC header or declared file size.');
    requireThat([2, 4].includes(bytes[8]), 'Only ICC v2 and v4 output profiles are supported.');
    requireThat(ascii(bytes, 12, 4) === 'prtr', 'A printer/output-class ICC profile is required.');
    const space = ascii(bytes, 16, 4), pcs = ascii(bytes, 20, 4);
    requireThat(space === (pathId === '4C' ? 'CMYK' : '7CLR'),
      pathId === '4C' ? '4C requires a CMYK output profile.' : 'ECG requires a seven-channel (7CLR) output profile.');
    requireThat(['Lab ', 'XYZ '].includes(pcs), 'Unsupported ICC profile connection space.');
    const intent = view.getUint32(64), tagCount = view.getUint32(128);
    requireThat(intent < 4 && tagCount > 0 && tagCount <= Math.floor((bytes.length - 132) / 12), 'Invalid ICC intent or tag table.');
    const names = new Set();
    for (let i = 0; i < tagCount; i++) {
      const pos = 132 + i * 12, name = ascii(bytes, pos, 4), offset = view.getUint32(pos + 4), size = view.getUint32(pos + 8);
      requireThat(!names.has(name) && offset % 4 === 0 && offset >= 132 + tagCount * 12 && size >= 8 && offset + size <= bytes.length,
        'Invalid ICC tag bounds or duplicate tag.');
      names.add(name);
    }
    requireThat(root.crypto?.subtle, 'This browser cannot calculate the required profile SHA-256.');
    const digest = await root.crypto.subtle.digest('SHA-256', bytes);
    return freeze({ file_name: fileName, byte_length: bytes.length,
      sha256: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join(''),
      version: `${bytes[8]}.${bytes[9] >> 4}.${bytes[9] & 15}`, device_class: 'prtr',
      device_space: space, pcs: pcs.trim(), header_intent: INTENTS[intent],
      validation: 'STRUCTURE_CHECKED_TRANSFORM_NOT_VALIDATED',
      encoding: 'base64', data_base64: toBase64(bytes) });
  }
  function emptySettings() {
    return { profile: null, printing_condition: '', substrate: '', rendering_intent: null, black_point_compensation: null };
  }
  function canonicalReferences(entries, colors, master) {
    requireThat(master === MASTER && Array.isArray(colors) && colors.length === 13283, 'The declared master does not match the frozen baseline.');
    requireThat(Array.isArray(entries) && entries.length > 0 && entries.length <= 64, 'Choose between 1 and 64 ATLAS references.');
    const byId = new Map(colors.map(c => [c.id, c])), seen = new Set();
    return entries.map((entry, index) => {
      const c = entry && Number.isInteger(entry.id) && byId.get(entry.id);
      requireThat(c && !seen.has(c.id) && entry.ref === c.ref && entry.hex === c.hex &&
        stable(entry.rgb) === stable(c.rgb) && stable(entry.lab) === stable(c.lab), 'Reference identity does not match the master.');
      seen.add(c.id);
      return { index, source_atlas_row_id: c.id, production_atlas_row_id: c.id,
        reference: c.ref, master_rgb: [...c.rgb], master_hex: c.hex, master_lab: [...c.lab] };
    });
  }
  async function verifiedSettings(settings, pathId) {
    requireThat(settings && typeof settings === 'object', 'Missing path settings.');
    const condition = text(settings.printing_condition, 160, 'Printing condition');
    const substrate = text(settings.substrate, 160, 'Substrate');
    requireThat(settings.rendering_intent === null || INTENTS.includes(settings.rendering_intent), 'Invalid rendering intent.');
    requireThat(settings.black_point_compensation === null || typeof settings.black_point_compensation === 'boolean', 'Invalid black-point-compensation setting.');
    let profile = null;
    if (settings.profile !== null) {
      const p = settings.profile;
      requireThat(p && p.encoding === 'base64', 'The exact ICC file must be embedded in the handoff.');
      profile = await readProfile(fromBase64(p.data_base64), p.file_name, pathId);
      requireThat(stable(profile) === stable(p), 'ICC profile metadata or SHA-256 does not match the embedded file.');
    }
    return { profile, printing_condition: condition, substrate, rendering_intent: settings.rendering_intent,
      black_point_compensation: settings.black_point_compensation };
  }
  async function create({ entries, colors, master = MASTER, name = 'ATLAS print handoff', paths,
    createdAt = new Date().toISOString() }) {
    const references = canonicalReferences(entries, colors, master);
    text(name, 100, 'Job name');
    requireThat(name.trim().length > 0, 'Enter a job name.');
    requireThat(typeof createdAt === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(createdAt) &&
      Number.isFinite(Date.parse(createdAt)) && new Date(createdAt).toISOString() === createdAt, 'Invalid creation timestamp.');
    requireThat(paths && stable(Object.keys(paths).sort()) === stable([...PATHS].sort()), 'Both independent paths, 4C and ECG, are required.');
    // Snapshot before awaiting hashes. Later UI edits cannot change an in-flight package.
    const settingsSnapshot = clone(paths);
    const verified = await Promise.all(PATHS.map(id => verifiedSettings(settingsSnapshot[id], id)));
    const productionPaths = PATHS.map((id, index) => {
      const settings = verified[index];
      const missing = [];
      if (!settings.profile) missing.push('ICC_PROFILE');
      if (!settings.printing_condition.trim()) missing.push('PRINTING_CONDITION');
      if (!settings.substrate.trim()) missing.push('SUBSTRATE');
      if (settings.rendering_intent === null) missing.push('RENDERING_INTENT');
      if (settings.black_point_compensation === null) missing.push('BLACK_POINT_COMPENSATION');
      missing.push('ICC_TRANSFORM');
      return { path_id: id, input_kind: 'FROZEN_ATLAS_REFERENCES', input_from_path: null,
        input_references: references.map(r => ({ source_atlas_row_id: r.source_atlas_row_id, production_atlas_row_id: r.production_atlas_row_id })),
        expected_device_space: id === '4C' ? 'CMYK' : '7CLR',
        channel_order: id === '4C' ? ['C', 'M', 'Y', 'K'] : null,
        channel_order_status: id === '4C' ? 'CMYK' : 'REQUIRES_PROFILE_AND_PRESS_CONFIRMATION',
        ...settings,
        preparation_status: !settings.profile ? 'PROFILE_MISSING' : missing.length > 1 ? 'CONDITIONS_INCOMPLETE' : 'TRANSFORM_REQUIRED',
        missing, device_values: null, feasibility: { status: 'NOT_EVALUATED', result: null },
        measured_qc: { status: 'NOT_MEASURED', record: null }, production_approval: 'NOT_PROVIDED' };
    });
    return freeze({ format: FORMAT, version: '0.1.0', workflow_version: '3.4.0', job_name: name,
      created_at: createdAt, status: 'PREPARATION_ONLY', master_sha256: MASTER, row_id_base: 0,
      freeze_status: 'FROZEN', reference_variant: 'RGB_ONLY_DLambda_POSTHOC',
      topology: 'PARALLEL_FROM_SAME_FROZEN_REFERENCE', references, production_paths: productionPaths });
  }
  async function validate(data, colors, master = MASTER) {
    requireThat(data && data.format === FORMAT && data.version === '0.1.0' && data.master_sha256 === master && master === MASTER,
      'Not a compatible ATLAS parallel print handoff.');
    requireThat(Array.isArray(data.references) && Array.isArray(data.production_paths) && data.production_paths.length === 2,
      'References and both production paths are required.');
    const paths = {};
    for (const p of data.production_paths) {
      requireThat(p && PATHS.includes(p.path_id) && !Object.hasOwn(paths, p.path_id), 'Duplicate or unknown production path.');
      paths[p.path_id] = { profile: p.profile, printing_condition: p.printing_condition, substrate: p.substrate,
        rendering_intent: p.rendering_intent, black_point_compensation: p.black_point_compensation };
    }
    const rebuilt = await create({ entries: data.references.map(r => ({ id: r.source_atlas_row_id, ref: r.reference,
      rgb: r.master_rgb, hex: r.master_hex, lab: r.master_lab })), colors, master, name: data.job_name,
      paths, createdAt: data.created_at });
    requireThat(stable(rebuilt) === stable(data),
      'Handoff rejected: identity, path independence, output status or package fields have changed.');
    return rebuilt;
  }
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function report(data) {
    // Callers supply a package returned by create/validate; all user text is escaped.
    const path = p => `<article><h2>${escape(p.path_id)}</h2><p><b>${escape(p.preparation_status)}</b></p><dl><dt>Input</dt><dd>Same frozen ATLAS references; no input from another production path</dd><dt>Profile</dt><dd>${escape(p.profile?.file_name || 'Not provided')}</dd><dt>Profile SHA-256</dt><dd>${escape(p.profile?.sha256 || 'Not provided')}</dd><dt>Printing condition</dt><dd>${escape(p.printing_condition || 'Not specified')}</dd><dt>Substrate</dt><dd>${escape(p.substrate || 'Not specified')}</dd><dt>Rendering intent</dt><dd>${escape(p.rendering_intent || 'Not specified')}</dd><dt>Black-point compensation</dt><dd>${p.black_point_compensation === null ? 'Not specified' : p.black_point_compensation ? 'On' : 'Off'}</dd><dt>Device values</dt><dd>Not calculated</dd><dt>Feasibility</dt><dd>Not evaluated</dd><dt>Measured QC</dt><dd>NOT_MEASURED</dd></dl><p>Open: ${p.missing.map(escape).join(', ')}</p>${p.path_id === 'ECG' ? '<p>Seven channels alone do not establish CMYKOGV channel order or FOGRA55 conformance.</p>' : ''}</article>`;
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(data.job_name)}</title><style>body{max-width:1100px;margin:40px auto;padding:20px;font:16px/1.5 system-ui;color:#15202c}h1{margin-bottom:0}.paths{display:grid;grid-template-columns:1fr 1fr;gap:22px}article{border:1px solid #bcc6ca;padding:20px}dt{font-weight:700}dd{margin:0 0 12px;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ccc;padding:9px;text-align:left}code{overflow-wrap:anywhere}.notice{padding:16px;background:#eef3e8}@media(max-width:650px){.paths{grid-template-columns:1fr}}@media print{body{margin:0;font-size:10pt}article{break-inside:avoid}}</style><h1>ATLAS Clarus · ${escape(data.job_name)}</h1><p>Workflow 3.4.0 · Parallel 4C / ECG preparation</p><p class="notice">Preparation record — no calculated print output, PDF/X proof or production approval. The JSON companion contains the exact ICC files when supplied. This report is a reference handoff, not a colour proof.</p><p>Created: ${escape(data.created_at)}<br>Master SHA-256: <code>${escape(data.master_sha256)}</code></p><table><thead><tr><th>ATLAS reference</th><th>Source ID</th><th>Production ID</th><th>Master RGB</th></tr></thead><tbody>${data.references.map(r => `<tr><td>${escape(r.reference)}</td><td>${r.source_atlas_row_id}</td><td>${r.production_atlas_row_id}</td><td>${r.master_rgb.join(' / ')}</td></tr>`).join('')}</tbody></table><div class="paths">${data.production_paths.map(path).join('')}</div><p>HLC-derived reference data © freieFarbe e.V. · ATLAS Clarus modified reference data.</p></html>`;
  }
  root.ATLAS_CLARUS_PRINT = { MASTER, FORMAT, MAX_PROFILE_BYTES, MAX_PACKAGE_BYTES, PATHS, INTENTS,
    emptySettings, canonicalReferences, readProfile, create, validate, report };
})(typeof window !== 'undefined' ? window : globalThis);
