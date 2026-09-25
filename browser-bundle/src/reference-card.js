(function (root) {
  'use strict';

  const MASTER = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  const FORMAT = 'ATLAS_CLARUS_REFERENCE_CARD';
  const VERSION = '0.1.0';

  const stable = value => JSON.stringify(value);
  const clone = value => JSON.parse(stable(value));
  const requireThat = (condition, message) => { if (!condition) throw Error(message); };
  const freeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.values(value).forEach(freeze);
    }
    return value;
  };
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  function canonicalReference(entry, colors, master = MASTER) {
    requireThat(master === MASTER && Array.isArray(colors) && colors.length === 13283,
      'The declared master does not match the frozen ATLAS baseline.');
    requireThat(entry && Number.isInteger(entry.id), 'A selected ATLAS reference is required.');
    const source = colors[entry.id];
    requireThat(source && source.id === entry.id && source.ref === entry.ref && source.hex === entry.hex &&
      stable(source.rgb) === stable(entry.rgb) && stable(source.lab) === stable(entry.lab),
      'Reference identity does not match the frozen master.');
    return {
      atlas_row_id: source.id,
      atlas_address: source.ref,
      master_rgb: [...source.rgb],
      master_hex: source.hex,
      master_lab: [...source.lab]
    };
  }

  function create({ entry, colors, master = MASTER, designerLayer = null, createdAt = new Date().toISOString() }) {
    const reference = canonicalReference(entry, colors, master);
    const descriptor = root.ATLAS_CLARUS_DESIGNER?.get(designerLayer,entry) || null;
    requireThat(typeof createdAt === 'string' && Number.isFinite(Date.parse(createdAt)) &&
      new Date(createdAt).toISOString() === createdAt, 'Invalid creation timestamp.');
    return freeze({
      format: FORMAT,
      version: VERSION,
      created_at: createdAt,
      master_sha256: MASTER,
      row_id_base: 0,
      freeze_status: 'FROZEN',
      reference,
      designer_layer: descriptor ? { schema_version: designerLayer.document.schema_version, status: designerLayer.document.status, designer_name_en: descriptor.designer_name_en, display_name: descriptor.display_name, descriptors: [descriptor.colour_family,descriptor.temperature,descriptor.lightness_character,descriptor.chroma_character].filter(Boolean), suggested_roles: descriptor.suggested_roles, public_release: descriptor.public_release === true } : null,
      reproduction: {
        source_representation: 'MASTER_SRGB_8BIT',
        output_kind: 'PRINTABLE_REFERENCE_CARD',
        output_status: 'PRINTED_NOT_MEASURED',
        measured_qc_status: 'NOT_MEASURED',
        icc_transform: 'NOT_APPLIED',
        device_values: null,
        production_approval: 'NOT_PROVIDED'
      },
      identity_change: 'NONE'
    });
  }

  function validate(data, colors, master = MASTER, designerLayer = null) {
    requireThat(data && data.format === FORMAT && data.version === VERSION &&
      data.master_sha256 === MASTER && master === MASTER, 'Not a compatible ATLAS reference card.');
    const entry = {
      id: data.reference?.atlas_row_id,
      ref: data.reference?.atlas_address,
      rgb: data.reference?.master_rgb,
      hex: data.reference?.master_hex,
      lab: data.reference?.master_lab
    };
    const rebuilt = create({ entry, colors, master, designerLayer, createdAt: data.created_at });
    requireThat(stable(rebuilt) === stable(data),
      'Reference card rejected: identity, reproduction status or evidence fields have changed.');
    return rebuilt;
  }

  function html(data) {
    const r = data.reference;
    const lab = r.master_lab.map(value => Number(value).toFixed(2)).join(' / ');
    const chromaMatch = String(r.atlas_address).match(/_C(\d{3})$/);
    const chroma = chromaMatch ? `C${Number(chromaMatch[1])}` : 'C–';
    const evidence = escape(JSON.stringify(data, null, 2));
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ATLAS Reference Card · ${escape(r.atlas_address)}</title>
<style>
@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;color:#101722;background:#d9dde2;font:11pt/1.4 Arial,sans-serif}
.sheet{width:186mm;min-height:273mm;margin:10mm auto;background:#fff;display:grid;grid-template-rows:auto 106mm auto 1fr;gap:0;box-shadow:0 4mm 12mm #0002}
header{display:grid;grid-template-columns:1fr auto;gap:10mm;padding:13mm 14mm 8mm;background:#101722;color:#fff;border-bottom:1.8mm solid ${escape(r.master_hex)}}
.kicker{margin:0 0 2.5mm;color:#9cfe3a;font-size:8.5pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
h1{margin:0;font-size:24pt;line-height:1.08}h1 small{display:block;margin-top:2.5mm;color:#d7dde5;font-size:9pt;line-height:1.35;letter-spacing:.04em}
.badges{display:flex;align-items:flex-start;gap:2.5mm}.chroma{min-width:18mm;padding:2.6mm 3mm;border:1px solid #fff9;border-radius:999px;text-align:center;font-size:15pt;font-weight:800}
.status{padding:2.8mm 3.4mm;border:1px solid #fff7;border-radius:2mm;color:#fff;font-size:8.5pt;font-weight:700;letter-spacing:.06em;white-space:nowrap}
.patch{margin:10mm 14mm 8mm;background:${escape(r.master_hex)};border:1px solid #aab1ba;border-radius:2mm}
dl{display:grid;grid-template-columns:42mm 1fr;margin:0 14mm 8mm}dt,dd{border-bottom:1px solid #d8dde3;padding:2.2mm 0}dt{color:#465363;font-weight:700}dd{margin:0;font-weight:600;overflow-wrap:anywhere}
.identity{font-size:13pt}.machine-status{font-family:Consolas,monospace;font-size:9pt}
.notes{padding:0 14mm 12mm}.notice{padding:5mm;border-left:1.8mm solid ${escape(r.master_hex)};background:#f1f4f7;font-weight:700}.fineprint{color:#465363;font-size:9.5pt}details{font-size:8pt}pre{white-space:pre-wrap;overflow-wrap:anywhere}
.controls{position:fixed;right:12px;top:12px}button{padding:10px 16px}@media print{body{background:#fff}.sheet{margin:0}.controls{display:none}details{display:none}}
</style><div class="controls"><button onclick="window.print()">Print / Save PDF</button></div><main class="sheet">
<header><div><p class="kicker">ATLAS CLARUS · FROZEN REFERENCE CARD</p><h1>${data.designer_layer?escape(data.designer_layer.designer_name_en):escape(r.atlas_address)}</h1></div><div class="badges"><div class="chroma" aria-label="Chroma ${escape(chroma)}">${escape(chroma)}</div><div class="status">PRINTED — NOT MEASURED</div></div></header>
<div class="patch" role="img" aria-label="sRGB representation ${escape(r.master_hex)}"></div>
<dl><dt>Exact PKL identity</dt><dd class="identity">${escape(r.atlas_address)}</dd><dt>Chroma step</dt><dd>${escape(chroma)}</dd><dt>atlas_row_id</dt><dd>${r.atlas_row_id}</dd><dt>Master SHA-256</dt><dd>${escape(data.master_sha256)}</dd>
<dt>Master RGB</dt><dd>${r.master_rgb.join(' / ')}</dd><dt>Master HEX</dt><dd>${escape(r.master_hex)}</dd>
<dt>Master CIELAB</dt><dd>${lab}</dd><dt>Identity change</dt><dd>NONE</dd>
<dt>ICC transform</dt><dd>NOT_APPLIED</dd><dt>Measured QC</dt><dd>NOT_MEASURED</dd><dt>Machine status</dt><dd class="machine-status">PRINTED_NOT_MEASURED</dd></dl>
<div class="notes"><p class="notice">This print is an unmeasured reproduction of the frozen ATLAS reference. It is not a colour proof, measurement record, PDF/X approval or redefinition of the PKL identity.</p>
<p class="fineprint">The colour patch uses the stored 8-bit sRGB master representation. The receiving print workflow remains responsible for its output profile, device conversion, substrate, process control and any later measurement.</p>
<details><summary>Embedded evidence</summary><pre>${evidence}</pre></details></div></main></html>`;
  }

  function init(context) {
    function open(entry) {
      const data = create({ entry, colors: context.colors, master: context.master, designerLayer: context.designerLayer });
      const stem = `ATLAS_Reference_Card_${data.reference.atlas_address}`;
      context.download(stem + '.reference-card.json', JSON.stringify(data, null, 2), 'application/json');
      const target = root.open('', '_blank');
      requireThat(target, 'The printable reference card was blocked by the browser.');
      target.document.open();
      target.document.write(html(data));
      target.document.close();
      return data;
    }
    return { open };
  }

  root.ATLAS_CLARUS_REFERENCE_CARD = {
    MASTER, FORMAT, VERSION, canonicalReference, create, validate, html, init, clone
  };
})(typeof window !== 'undefined' ? window : globalThis);
