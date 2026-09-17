(function (root) {
  'use strict';
  const FORMAT = 'ATLAS_CLARUS_PROFILED_REFERENCE_CARD';
  const VERSION = '0.2.0';
  const stable = value => JSON.stringify(value);
  const clone = value => JSON.parse(stable(value));
  const requireThat = (ok, message) => { if (!ok) throw Error(message); };
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };

  function create({ entry, colors, master, profile, settings, separation, createdAt = new Date().toISOString() }) {
    const reference = root.ATLAS_CLARUS_REFERENCE_CARD.canonicalReference(entry, colors, master);
    requireThat(profile && /^[a-f0-9]{64}$/.test(profile.sha256) && profile.file_name && profile.device_space,
      'A verified ICC output profile is required.');
    requireThat(settings && settings.rendering_intent === separation.intent &&
      settings.black_point_compensation === separation.bpc, 'ICC settings and separation result differ.');
    requireThat(separation && separation.method === 'SRGB_TO_DEVICE16' && separation.path === settings.path_id &&
      separation.channels === separation.channel_order.length && separation.channels === separation.device_values_16bit.length,
      'Invalid LittleCMS separation result.');
    requireThat(separation.device_values_16bit.every(v => Number.isInteger(v) && v >= 0 && v <= 65535),
      'Invalid 16-bit device values.');
    requireThat(typeof createdAt === 'string' && new Date(createdAt).toISOString() === createdAt, 'Invalid creation timestamp.');
    return freeze({
      format: FORMAT, version: VERSION, created_at: createdAt, master_sha256: master, row_id_base: 0,
      freeze_status: 'FROZEN', reference,
      production: {
        output_status: 'PROFILE_BOUND_NOT_MEASURED', source_representation: 'MASTER_SRGB_8BIT',
        path_id: settings.path_id, printing_condition: settings.printing_condition, substrate: settings.substrate,
        rendering_intent: settings.rendering_intent, black_point_compensation: settings.black_point_compensation,
        profile: { file_name: profile.file_name, sha256: profile.sha256, byte_length: profile.byte_length,
          version: profile.version, device_space: profile.device_space, pcs: profile.pcs },
        transform: { engine: separation.engine, method: separation.method, channel_order: clone(separation.channel_order),
          device_values_16bit: clone(separation.device_values_16bit), device_values_normalized: clone(separation.device_values_normalized) },
        measured_qc_status: 'NOT_MEASURED', production_approval: 'NOT_PROVIDED',
        printable_device_file: settings.path_id === '4C' ? 'DEVICECMYK_PDF_GENERATED_NOT_PDFX' : 'NOT_GENERATED'
      },
      identity_change: 'NONE'
    });
  }

  const latin = value => String(value).normalize('NFKD').replace(/[^\x20-\x7e]/g, '?');
  const pdfText = value => latin(value).replace(/([\\()])/g, '\\$1');
  function deviceCmykPdf(data, profileBytes) {
    requireThat(data?.format === FORMAT && data.version === VERSION && data.production?.path_id === '4C',
      'A compatible 4C profile-bound reference is required.');
    requireThat(profileBytes instanceof Uint8Array && profileBytes.length === data.production.profile.byte_length,
      'The exact bound ICC profile bytes are required.');
    const p = data.production, r = data.reference, values = p.transform.device_values_16bit;
    requireThat(values.length === 4 && values.every(v => Number.isInteger(v) && v >= 0 && v <= 65535),
      'Four valid 16-bit CMYK values are required.');
    const cmyk = values.map(v => (v / 65535).toFixed(8));
    const percent = values.map(v => (v / 655.35).toFixed(2));
    const line = (y, size, text) => `BT /F1 ${size} Tf 50 ${y} Td (${pdfText(text)}) Tj ET\n`;
    let content = 'q\n' + cmyk.join(' ') + ' k\n50 440 495 260 re f\nQ\n';
    content += line(790, 18, `ATLAS Clarus - DeviceCMYK Reference Card`);
    content += line(762, 15, r.atlas_address);
    content += line(735, 9, `atlas_row_id: ${r.atlas_row_id}`);
    content += line(718, 9, `Master SHA-256: ${data.master_sha256}`);
    content += line(415, 11, `CMYK 16-bit: ${values.join(' / ')}`);
    content += line(397, 11, `CMYK percent: ${percent.join(' / ')}`);
    content += line(375, 9, `ICC profile: ${p.profile.file_name}`);
    content += line(358, 8, `ICC SHA-256: ${p.profile.sha256}`);
    content += line(341, 9, `Rendering intent: ${p.rendering_intent}; BPC: ${p.black_point_compensation ? 'On' : 'Off'}`);
    content += line(324, 9, `Printing condition: ${p.printing_condition}`);
    content += line(307, 9, `Substrate: ${p.substrate}`);
    content += line(270, 11, 'DEVICECMYK - PROFILE-BOUND - NOT MEASURED - NOT PDF/X CERTIFIED');
    content += line(246, 9, 'Print without additional colour conversion. The receiving workflow remains responsible for RIP settings.');
    content += line(229, 9, 'This card is not a colour proof, measurement record, certification or production approval.');
    const enc = new TextEncoder(), parts = [], offsets = [0]; let length = 0;
    const add = bytes => { const b = typeof bytes === 'string' ? enc.encode(bytes) : bytes; parts.push(b); length += b.length; };
    const object = (id, body) => { offsets[id] = length; add(`${id} 0 obj\n`); add(body); add('\nendobj\n'); };
    add('%PDF-1.7\n%ATLAS\n');
    object(1, '<< /Type /Catalog /Pages 2 0 R /OutputIntents [7 0 R] /Metadata 8 0 R >>');
    object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    object(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>');
    const contentBytes = enc.encode(content);
    object(4, `<< /Length ${contentBytes.length} >>\nstream\n${content}endstream`);
    object(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    offsets[6] = length; add(`6 0 obj\n<< /N 4 /Alternate /DeviceCMYK /Length ${profileBytes.length} >>\nstream\n`); add(profileBytes); add('\nendstream\nendobj\n');
    object(7, `<< /Type /OutputIntent /S /GTS_PDFX /OutputConditionIdentifier (${pdfText(p.profile.file_name)}) /Info (${pdfText(p.profile.sha256)}) /DestOutputProfile 6 0 R >>`);
    const xmp = `<?xpacket begin=""?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:atlas="https://arbe-lambda-star.com/ns/atlas/" atlas:address="${pdfText(r.atlas_address)}" atlas:rowId="${r.atlas_row_id}" atlas:status="PRINTED_NOT_MEASURED" atlas:pdfx="NOT_CERTIFIED"/></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
    object(8, `<< /Type /Metadata /Subtype /XML /Length ${enc.encode(xmp).length} >>\nstream\n${xmp}\nendstream`);
    const xref = length; add('xref\n0 9\n0000000000 65535 f \n');
    for (let i = 1; i <= 8; i++) add(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    add(`trailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(length); let at = 0;
    for (const part of parts) { out.set(part, at); at += part.length; }
    return out;
  }

  function validate(data, colors, master) {
    requireThat(data && data.format === FORMAT && data.version === VERSION && data.master_sha256 === master,
      'Not a compatible profiled ATLAS reference card.');
    const entry = { id: data.reference?.atlas_row_id, ref: data.reference?.atlas_address,
      rgb: data.reference?.master_rgb, hex: data.reference?.master_hex, lab: data.reference?.master_lab };
    const p = data.production;
    const rebuilt = create({ entry, colors, master, profile: p.profile,
      settings: { path_id: p.path_id, printing_condition: p.printing_condition, substrate: p.substrate,
        rendering_intent: p.rendering_intent, black_point_compensation: p.black_point_compensation },
      separation: { ...p.transform, path: p.path_id, channels: p.transform.channel_order.length,
        intent: p.rendering_intent, bpc: p.black_point_compensation }, createdAt: data.created_at });
    requireThat(stable(rebuilt) === stable(data), 'Profile-bound card rejected: identity or evidence fields have changed.');
    return rebuilt;
  }

  root.ATLAS_CLARUS_PROFILED_REFERENCE_CARD = { FORMAT, VERSION, create, validate, deviceCmykPdf, clone };
})(typeof window !== 'undefined' ? window : globalThis);
