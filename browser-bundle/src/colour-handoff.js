/* Bundle adapter for the shared Colour Kit 0.3 decision/handoff protocol. */
(function (root) {
  'use strict';
  const H = root.ClarusHandoff;
  const MASTER = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
  const REFHASH = 'a25f4dbd94d819ed3c9b899d0e0db7d4d9449cf8028201d0776fad93b5a7fab9';
  const ADAPTER_COMMIT = '60bf765e771c3e6493c88a02a046237c9ba69db9';
  const LIMIT = 16 * 1024 * 1024;
  const FIELDS = ['id', 'name', 'hex', 'source', 'color_space'];
  const METHOD = {workflow:'3.4.0',scope:'RGB-only source assignment',selection:'argmin (integer squared sRGB distance, atlas_row_id)',candidate_set:'all 13283 reference rows',deltaE_in_selection:false,delta_lambda_stage:'NOT_PERFORMED',physical_qc:'NOT_MEASURED'};
  const need = (ok, msg) => { if (!ok) throw Error(msg); };
  const copy = x => JSON.parse(JSON.stringify(x));
  const equal = (a, b) => H.canon(a) === H.canon(b);
  async function sha(bytes) {
    return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
  }
  const sourceDigest = rows => sha(H.utf8(JSON.stringify(rows.map(r => FIELDS.map(k => r[k])))));
  function validateRows(rows) {
    need(Array.isArray(rows) && rows.length >= 1 && rows.length <= 250, 'Choose 1–250 colours.');
    const seen = new Set();
    for (const r of rows) {
      need(r && FIELDS.every(k => typeof r[k] === 'string'), 'Incomplete original colour.');
      need(/^[a-z][a-z0-9_-]{0,39}$/.test(r.id) && !seen.has(r.id), 'Invalid or duplicate input ID.');
      seen.add(r.id);
      need(/^#[0-9a-fA-F]{6}$/.test(r.hex) && r.color_space === 'sRGB', 'Documented 8-bit sRGB is required.');
      for (const k of ['name', 'source']) need(r[k].trim() && r[k].length <= 240 && !/[\x00-\x1f\x7f]/.test(r[k]) && !/^[=+@-]/.test(r[k].trimStart()), 'Invalid colour name or source text.');
    }
    return rows;
  }
  function bundleRows(doc, basis, start, count) {
    need(['RECORDED_ORIGINALS', 'REFERENCE_VALUES_AS_NEW_INPUTS'].includes(basis), 'Choose recorded originals or reference values.');
    const originals = basis === 'RECORDED_ORIGINALS', rows = originals ? doc.source_assignments || [] : doc.references;
    need(Number.isInteger(start) && start >= 0 && Number.isInteger(count) && count >= 1 && count <= 250 && start + count <= rows.length, 'Choose an available range of 1–250 colours.');
    return rows.slice(start, start + count).map((r, j) => {
      const n = start + j + 1;
      return {id:(originals?'sample-':'reference-')+n,name:originals?'Bundle sample '+n:r.reference,hex:originals?r.source_hex:r.master_hex,
        source:originals?'Bundle source assignment '+n+'; image and sampling metadata retained in JSON':'Atlas reference '+r.reference+' (row '+r.atlas_row_id+') deliberately adopted as a new design colour',color_space:'sRGB'};
    });
  }
  async function createContext(colors, master) {
    need(H && root.crypto?.subtle && root.crypto?.randomUUID, 'This browser cannot verify the colour handoff.');
    need(master === MASTER && colors.length === 13283 && colors.every((c, i) => c.id === i), 'Reference master mismatch.');
    // Same RGB-only CSV as Colour Kit; verify the embedded data, not just a label.
    const csv = 'atlas_row_id,reference,R,G,B,hex\n' + colors.map(c => [c.id,c.ref,...c.rgb,c.hex].join(',')).join('\n') + '\n';
    need(await sha(H.utf8(csv)) === REFHASH, 'Reference RGB checksum mismatch.');
    const assignments = new Map();
    function assign(original) {
      const hex = original.hex.toUpperCase();
      if (!assignments.has(hex)) {
        const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
        let best = Infinity, winner, ties = 0;
        for (const c of colors) {
          const d = rgb.reduce((sum, v, i) => sum + (v-c.rgb[i])**2, 0);
          if (d < best) { best = d; winner = c; ties = 1; }
          else if (d === best) { ties++; if (c.id < winner.id) winner = c; }
        }
        assignments.set(hex, {source_rgb:rgb,atlas_row_id:winner.id,atlas_reference:winner.ref,reference_hex:winner.hex,reference_rgb:[...winner.rgb],distance_squared:best,nearest_tie_count:ties});
      }
      return {original:copy(original),...copy(assignments.get(hex))};
    }
    function checkBundle(d) { root.ATLAS_CLARUS_EXPORTS.parseClarus(d, colors, MASTER); return d; }
    async function checkAncestry(a) {
      need(a && a.schema === 'atlas-clarus-bundle-origin/1.0' && typeof a.document_text === 'string' && H.utf8(a.document_text).length <= LIMIT, 'Invalid retained Bundle document.');
      need(typeof a.filename === 'string' && a.filename.length <= 1024 && a.github_commit === ADAPTER_COMMIT, 'Unsupported Bundle adapter provenance.');
      need(await sha(H.utf8(a.document_text)) === a.document_sha256, 'Retained Bundle checksum mismatch.');
      const doc = checkBundle(JSON.parse(a.document_text.replace(/^\uFEFF/, '')));
      need(await sourceDigest(bundleRows(doc,a.basis,a.start,a.count)) === a.initial_source_values_sha256, 'Initial Bundle colours changed.');
      return doc;
    }
    const ctx = {sha,uuid:()=>root.crypto.randomUUID(),sourceDigest,assign,checkBundle,checkAncestry,
      verifyRecord(r) {
        validateRows([r.original]);
        need(equal(assign(r.original), H.core(r)), 'Stored RGB or reference assignment does not match the full master.');
      },
      verifyOrigin(o,r,d) {
        if (o.kind !== 'BUNDLE_DERIVATION') return;
        const a = d.bundle_origin;
        need(a && a.document_sha256 === o.document_sha256 && a.basis === o.basis && o.index >= a.start && o.index < a.start+a.count, 'Bundle origin binding mismatch.');
        const doc = JSON.parse(a.document_text.replace(/^\uFEFF/, ''));
        need(equal(bundleRows(doc,a.basis,o.index,1)[0],r.original), 'Original Bundle selection was changed.');
      },
      async verifyPalette(d) {
        need(d && d.schema === H.SCHEMA && d.master_sha256 === MASTER && d.reference_csv_sha256 === REFHASH && d.reference_rows === 13283, 'Use a Colour Kit 0.3 decision JSON with this reference master.');
        need(equal(d.method,METHOD), 'Unsupported colour assignment method.');
        need(Array.isArray(d.records), 'Missing colour records.');
        validateRows(d.records.map(r => r.original));
        need(await sourceDigest(d.records.map(r => r.original)) === d.source_values_sha256, 'Original colour checksum mismatch.');
        if (Object.hasOwn(d,'bundle_origin')) await checkAncestry(d.bundle_origin);
        d.records.forEach(ctx.verifyRecord);
      }
    };
    return ctx;
  }
  async function verify(data, ctx) {
    need(H.utf8(JSON.stringify(data,null,2)+'\n').length <= LIMIT, 'Complete decision JSON exceeds 16 MiB. No history was truncated.');
    await ctx.verifyPalette(data); await H.verifyHistory(data,ctx); return data;
  }
  async function derive(doc, basis, start, count, ctx, previous = null) {
    ctx.checkBundle(doc);
    const document_text = JSON.stringify(doc,null,2)+'\n', rows = validateRows(bundleRows(doc,basis,start,count));
    // Reopening an unchanged source selection keeps its decisions and subsequent edits.
    const a = previous?.bundle_origin;
    if (a && a.document_text === document_text && a.basis === basis && a.start === start && a.count === count) return verify(copy(previous),ctx);
    const document_sha256 = await sha(H.utf8(document_text)), sum = await sourceDigest(rows);
    const data = {schema:H.SCHEMA,kit_version:'0.3.0',status:'DEMONSTRATION_PILOT',created_utc:new Date().toISOString(),run_id:ctx.uuid(),master_sha256:MASTER,reference_csv_sha256:REFHASH,reference_rows:13283,source_values_sha256:sum,input_file_sha256:document_sha256,method:copy(METHOD),records:rows.map(ctx.assign),
      bundle_origin:{schema:'atlas-clarus-bundle-origin/1.0',basis,start,count,filename:'bundle.clarus.json',document_text,document_sha256,github_commit:ADAPTER_COMMIT,initial_source_values_sha256:sum}};
    await H.updateHistory(data,null,ctx,rows.map((_,i)=>({kind:'BUNDLE_DERIVATION',document_sha256,basis,index:start+i})));
    return verify(data,ctx);
  }
  root.ATLAS_COLOUR_HANDOFF = {createContext,verify,derive,bundleRows,LIMIT,MASTER,REFHASH,ADAPTER_COMMIT};
})(typeof window === 'undefined' ? globalThis : window);
