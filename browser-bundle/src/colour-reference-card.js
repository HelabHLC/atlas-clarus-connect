/* Additive Colour Handoff view of the existing reference-card component.
 * Decision JSON remains the authoritative interchange; no IDs are generated here.
 */
(function (root) {
  'use strict';
  const R = root.ATLAS_CLARUS_REFERENCE_CARD, H = root.ClarusHandoff;
  const A = root.ATLAS_COLOUR_HANDOFF;
  const SCHEMA = 'atlas-clarus-colour-reference-card/1.0';
  const clone = value => JSON.parse(JSON.stringify(value));
  const json = value => JSON.stringify(value, null, 2) + '\n';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const unknown = value => value === null || value === undefined || value === '' ? 'UNKNOWN' : value;
  const show = value => esc(Array.isArray(value) ? value.join(' / ') : unknown(value));
  const need = (ok, message) => { if (!ok) throw Error(message); };

  function mapping(record, colors, master) {
    // Reuse v0.1's frozen-row boundary, after the handoff's full-master checks.
    const entry = colors[record.atlas_row_id];
    const reference = R.canonicalReference({ ...entry, ref: record.atlas_reference,
      rgb: record.reference_rgb, hex: record.reference_hex }, colors, master);
    return { ...reference, metric: 'RGB_SQUARED_DISTANCE', distance_squared: record.distance_squared,
      nearest_tie_count: record.nearest_tie_count };
  }

  async function create(data, ctx, colors) {
    // Snapshot before the first await: caller/UI changes cannot alter this export.
    const palette = clone(data);
    await A.verify(palette, ctx);
    const nodes = new Map(palette.decisions.nodes.map(n => [n.revision_id, n]));
    const bundle = palette.bundle_origin ? JSON.parse(palette.bundle_origin.document_text.replace(/^\uFEFF/, '')) : null;
    const cards = palette.records.map((record, index) => {
      const chain = [];
      for (let n = nodes.get(record.revision_id); n; n = nodes.get(n.parent_revision_id)) chain.unshift(n);
      const start = chain[0], origin = start.origin;
      const fromBundle = origin.kind === 'BUNDLE_DERIVATION';
      const adopted = fromBundle && origin.basis === 'REFERENCE_VALUES_AS_NEW_INPUTS';
      const sample = fromBundle && !adopted ? bundle.source_assignments[origin.index] : null;
      return {
        card_index: index + 1, decision_id: record.decision_id,
        revision_id: record.revision_id, starting_revision_id: start.revision_id,
        parent_revision_id: nodes.get(record.revision_id).parent_revision_id,
        revision_ids: chain.map(n => n.revision_id),
        starting_colour: { input_id: start.record.original.id, name: start.record.original.name,
          rgb: start.record.source_rgb, hex: start.record.original.hex, source: start.record.original.source,
          basis: adopted ? 'REFERENCE_DELIBERATELY_ADOPTED' : sample ? 'RECORDED_ORIGINAL' : 'DECLARED_INPUT',
          reference: mapping(start.record, colors, palette.master_sha256) },
        original_source: { status: adopted ? 'UNKNOWN' : 'RECORDED',
          rgb: adopted ? null : start.record.source_rgb, hex: adopted ? null : start.record.original.hex },
        current_colour: { input_id: record.original.id, name: record.original.name,
          rgb: record.source_rgb, hex: record.original.hex, source: record.original.source,
          reference: mapping(record, colors, palette.master_sha256) },
        same_current_reference_decisions: palette.records.filter(r => r.atlas_row_id === record.atlas_row_id).length,
        provenance: {
          origin: clone(origin), bundle_filename: fromBundle ? palette.bundle_origin.filename : null,
          source_representation: sample?.source_representation || null,
          image_name: sample?.image.name || null, image_width: sample?.image.width ?? null,
          image_height: sample?.image.height ?? null, image_sha256: sample?.image.sha256 || null,
          sampling: sample?.sampling ? clone(sample.sampling) : null,
          author: null, capture_time: null, signature_status: 'NOT_SIGNED',
          source_notice: bundle?.example_notice || null
        }
      };
    });
    const paletteBytes = H.utf8(json(palette));
    const card = { schema: SCHEMA, master_sha256: palette.master_sha256, freeze_status: 'FROZEN',
      palette_schema: palette.schema, palette_file: 'palette.clarus.json',
      palette_sha256: await ctx.sha(paletteBytes), run_id: palette.run_id,
      palette_created_utc: palette.created_utc, cards,
      reproduction: { colour_representation: 'SRGB_8BIT', output_status: 'PRINTABLE_NOT_MEASURED',
        icc_transform: 'NOT_APPLIED', measured_qc_status: 'NOT_MEASURED', production_approval: 'NOT_PROVIDED' },
      signature_status: 'NOT_SIGNED', unknown_fields: 'null means UNKNOWN; never inferred from reference values' };
    return { card, paletteBytes };
  }

  function html(data) {
    const row = (label, value, mono = false) => `<dt>${esc(label)}</dt><dd${mono ? ' class="mono"' : ''}>${show(value)}</dd>`;
    const patch = (title, hex, rgb, note) => `<div class="swatch"><h3>${esc(title)}</h3><div class="patch" style="background:${esc(hex)}"></div><b>${esc(hex)}</b><p>RGB ${show(rgb)}</p><small>${esc(note)}</small></div>`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>ATLAS Clarus Colour Reference Card</title><style>
@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#e8edf0;color:#17222b;font:10pt/1.4 Arial,sans-serif}
.controls{max-width:186mm;margin:20px auto;padding:12px 20px;background:#fff}.sheet{width:186mm;min-height:273mm;margin:20px auto;background:#fff;padding:9mm 10mm;box-shadow:0 2px 15px #0001}
header{border-top:2mm solid #a7e951;padding-top:4mm}header p{margin:0;color:#425867;font-size:8pt;font-weight:bold;letter-spacing:.12em}h1{margin:3mm 0;font-size:24pt;line-height:1.1}h2{margin:0;font-size:13pt;overflow-wrap:anywhere}
.meta{display:flex;justify-content:space-between;gap:4mm;margin:3mm 0;font-size:8pt;color:#425867}.notice{padding:3mm 4mm;background:#f1f5f2;border-left:1mm solid #6ba529;margin:4mm 0;font-size:9pt}
.swatches{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4mm;margin:5mm 0}.swatch h3{font-size:8pt;min-height:9mm;margin:0}.patch{height:31mm;border:1px solid #89979c;print-color-adjust:exact;-webkit-print-color-adjust:exact}.swatch b{display:block;margin-top:2mm;font-size:16pt}.swatch p{margin:1mm 0}.swatch small{font-size:8pt;color:#425867}
section{margin-top:4mm}h3{font-size:10pt;margin:0 0 1mm}dl{display:grid;grid-template-columns:42mm minmax(0,1fr);margin:0;font-size:8pt}dt,dd{padding:1mm 0;border-bottom:1px solid #e0e5e8;overflow-wrap:anywhere}dt{color:#425867}dd{margin:0}.mono{font-family:monospace;font-size:7.5pt;word-break:break-all}.foot{font-size:8pt;color:#425867;margin-top:4mm}.source-note{white-space:pre-wrap;overflow-wrap:anywhere}header,.swatches,dl{break-inside:avoid}
@media screen and (max-width:740px){.sheet{width:auto;margin:12px;padding:22px}.controls{margin:12px}.swatches{gap:10px}dl{grid-template-columns:32% minmax(0,1fr)}h1{font-size:26px}.swatch b{font-size:18px}}
@media print{body{background:#fff}.controls{display:none}.sheet{margin:0;padding:9mm 10mm;box-shadow:none;break-before:page}.sheet:first-of-type{break-before:auto}.patch{border-color:#777}}
</style></head><body><div class="controls">Print / Save PDF: Ctrl+P (Windows/Linux) or Command+P (Mac). Choose A4 and disable browser headers/footers. Keep this HTML with the JSON companions. All patches are unmeasured sRGB reproductions.</div>
${data.cards.map(c => {
      const s = c.starting_colour, now = c.current_colour, r = now.reference, p = c.provenance;
      const adopted = s.basis === 'REFERENCE_DELIBERATELY_ADOPTED';
      return `<article class="sheet" data-decision-id="${esc(c.decision_id)}">
<header><p>ATLAS CLARUS / COLOUR HANDOFF</p><h1>Colour Reference Card</h1><h2>${esc(now.name)}</h2><div class="meta"><span>Decision ${c.card_index} / ${data.cards.length}</span><span>sRGB 8-bit · NOT MEASURED · NOT SIGNED</span></div></header>
<p class="notice">${c.same_current_reference_decisions > 1 ? `${c.same_current_reference_decisions} separate decisions share this ATLAS reference. A shared address does not make their source colours or decisions identical.` : 'Source colour, design decision and ATLAS reference are separate records.'}</p>
<div class="swatches">${patch(adopted ? 'STARTING DESIGN / ADOPTED REFERENCE' : 'ORIGINAL / STARTING INPUT', s.hex, s.rgb, adopted ? 'Earlier source RGB / HEX: UNKNOWN' : s.basis === 'DECLARED_INPUT' ? 'Declared input; image origin may be unknown' : 'Recorded source RGB')}${patch('CURRENT DESIGN', now.hex, now.rgb, 'Selected revision; no automatic colour advice')}${patch('ASSIGNED ATLAS REFERENCE', r.master_hex, r.master_rgb, r.atlas_address + ' · row ' + r.atlas_row_id)}</div>
<section><h3>Reference assignment</h3><dl>${row('Current HLC / row', r.atlas_address + ' / ' + r.atlas_row_id)}${row('Current RGB distance²', r.distance_squared)}${row('Starting HLC / row / d²', s.reference.atlas_address + ' / ' + s.reference.atlas_row_id + ' / ' + s.reference.distance_squared)}${row('Master SHA-256', data.master_sha256, true)}</dl></section>
<section><h3>Source and provenance</h3><dl>${row('Starting input ID / basis', s.input_id + ' / ' + s.basis)}${row('Starting source declaration', s.source)}${now.source !== s.source ? row('Current source declaration', now.source) : ''}${row('Image name', p.image_name)}${row('Image dimensions (pixels)', p.image_width === null ? null : p.image_width + ' × ' + p.image_height)}${row('Sample mode / centre', p.sampling ? p.sampling.mode + ' / ' + p.sampling.centre.join(', ') : null)}${row('Sample bounds', p.sampling?.bounds)}${row('Image SHA-256', p.image_sha256, true)}${row('Author / capture time', 'UNKNOWN / UNKNOWN')}${row('Origin kind / document hash', p.origin.kind + ' / ' + unknown(p.origin.document_sha256), true)}</dl>${p.source_notice ? `<p class="foot source-note">${esc(p.source_notice)}</p>` : ''}</section>
<section><h3>Decision and revision identity</h3><dl>${row('Decision ID', c.decision_id, true)}${row('Current revision ID', c.revision_id, true)}${row('Starting revision ID', c.starting_revision_id, true)}${row('Parent revision ID', c.parent_revision_id === null ? 'NONE (starting revision)' : c.parent_revision_id, true)}${row('Revisions in this chain', c.revision_ids.length)}${row('Companion JSON SHA-256', data.palette_sha256, true)}</dl></section>
<p class="foot">Full history and available sampling metadata: <b>palette.clarus.json</b>. Missing origin details are UNKNOWN. Hashes check file consistency; they do not prove authorship or authenticity. This is not a measured colour proof, PDF/X approval or production approval. Output colour depends on the receiving screen/print workflow.</p>
</article>`;
    }).join('\n')}</body></html>`;
  }

  async function exportFiles(data, ctx, colors) {
    const { card, paletteBytes } = await create(data, ctx, colors);
    const files = { 'colour-reference-card.html': H.utf8(html(card)),
      'reference-card.json': H.utf8(json(card)), 'palette.clarus.json': paletteBytes };
    const manifest = { schema: 'atlas-clarus-colour-reference-card-package/1.0',
      master_sha256: card.master_sha256, signature_status: 'NOT_SIGNED', files: {} };
    for (const [name, bytes] of Object.entries(files)) manifest.files[name] = await ctx.sha(bytes);
    files['card-manifest.json'] = H.utf8(json(manifest));
    return files;
  }

  // Trusted host API for checking extracted files; the UI reopens palette.clarus.json.
  async function verifyFiles(files, ctx, colors) {
    const names = ['card-manifest.json', 'colour-reference-card.html', 'palette.clarus.json', 'reference-card.json'];
    need(JSON.stringify(Object.keys(files).sort()) === JSON.stringify(names), 'Incomplete or extra card package files.');
    for (const bytes of Object.values(files)) need(bytes instanceof Uint8Array && bytes.length <= A.LIMIT,
      'Invalid or oversized card file.');
    const palette = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(files['palette.clarus.json']));
    const expected = await exportFiles(palette, ctx, colors);
    for (const name of names) need(await ctx.sha(files[name]) === await ctx.sha(expected[name]),
      'Card package differs from its verified decision JSON: ' + name);
    return palette;
  }

  R.colourHandoff = { SCHEMA, create, exportFiles, verifyFiles };
})(typeof window === 'undefined' ? globalThis : window);
