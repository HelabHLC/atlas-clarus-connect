(function (root) {
  'use strict';
  const E = root.ATLAS_CLARUS_EXPORTS;
  if (!E?.quarkXtg) throw Error('Load the palette and QuarkXPress exporters first.');
  const utf8 = value => new TextEncoder().encode(value);
  const sha = async bytes => Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256', bytes)),
    v => v.toString(16).padStart(2, '0')).join('');

  async function quarkPackage(palette, colors, master, name, sourceAssignments = []) {
    if (!root.ClarusHandoff?.zipStored || !root.ATLAS_REDUCTION_JOB?.unzip || !root.crypto?.subtle) {
      throw Error('ZIP export and SHA-256 verification are unavailable in this browser.');
    }
    // Snapshot everything before the first await. Changing the active palette
    // during hashing must not mix two different exports or drop source records.
    const data = JSON.parse(JSON.stringify(E.clarus(palette, master, name, sourceAssignments)));
    const verified = E.parseClarus(data, colors, master);
    const swatches = data.references.map(c => ({ref: c.reference, rgb: c.master_rgb}));
    const xtg = E.quarkXtg(swatches, master, data.palette_name);
    E.verifyQuarkXtg(xtg, swatches, master, data.palette_name);
    const assigned = new Set(verified.sourceAssignments.map(r => r.atlas_row_id));
    const missing = verified.colorIds.filter(id => !assigned.has(id));
    const count = verified.sourceAssignments.length;
    const readme = [
      'ATLAS Clarus - QuarkXPress XTG + Source JSON',
      '',
      'DE: Dieses ZIP zusammen weitergeben und aufbewahren.',
      'palette.xtg: RGB-Farbfelder fuer QuarkXPress; enthaelt nicht die einzelnen Quellzuordnungen.',
      'palette.clarus.json: Referenzen und alle in dieser Palette aufgezeichneten Source Colours.',
      `Aufgezeichnete Quellzuordnungen: ${count}. Referenzen ohne aufgezeichnete Quelle: ${missing.length}.`,
      count ? 'Mehrere Quellen koennen dieselbe ATLAS-Referenz behalten und bleiben getrennte Datensaetze.'
        : 'Keine Original-Quellfarben aufgezeichnet. Dieses Paket enthaelt nur Referenzen.',
      'Fehlende Quellen werden nicht aus Referenzfarben rekonstruiert. Quelldateien/Bildpixel sind nicht enthalten.',
      'ZIP entpacken; palette.clarus.json in My Palettes > Import Clarus JSON oeffnen.',
      'XTG: leeres QuarkXPress-Projekt, Textrahmen, Datei > Importieren, Interpret XPress Tags, UTF-8.',
      'RGB-Quellprofil sRGB IEC61966-2.1 einstellen. In XTG ist kein ICC-Profil eingebettet.',
      'Nativer QuarkXPress-Import weiterhin NICHT GETESTET. JSON wird dort nicht automatisch eingebunden.',
      'Fuer Colour Reduction den vollstaendigen Reduktionsjob sichern; er enthaelt Originalpixel und palette.xtg.',
      '',
      'EN: Keep and share this whole ZIP. palette.clarus.json retains every recorded source assignment.',
      `Recorded source assignments: ${count}. References without recorded sources: ${missing.length}.`,
      'Unrecorded sources cannot be recovered from reference RGB. Source images are not included.',
      'Extract and import palette.clarus.json using My Palettes > Import Clarus JSON.',
      'Import palette.xtg into a QuarkXPress text box with Interpret XPress Tags, UTF-8 and an sRGB source setup.',
      'Native QuarkXPress import is NOT_TESTED; no embedded ICC, automatic JSON linking or print approval.',
      'package-manifest.json binds the files by SHA-256 for consistency, not authorship.',
      ''
    ].join('\n');
    const files = {
      'palette.xtg': utf8(xtg),
      // Same serialized data as the standalone Clarus JSON export; no reduced view.
      'palette.clarus.json': utf8(JSON.stringify(data, null, 2)),
      'README.txt': utf8(readme)
    };
    const hashes = {};
    for (const [filename, bytes] of Object.entries(files)) hashes[filename] = await sha(bytes);
    const manifest = {
      schema: 'atlas-clarus-quarkxpress-package/1.0',
      master_sha256: master,
      reference_count: swatches.length,
      source_assignment_count: count,
      references_without_recorded_sources: missing,
      source_scope: count ? 'RECORDED_PALETTE_SAMPLES' : 'NO_SOURCE_RECORDS',
      image_bytes_included: false,
      native_quarkxpress_import: 'NOT_TESTED',
      files: hashes
    };
    files['package-manifest.json'] = utf8(JSON.stringify(manifest, null, 2) + '\n');
    const bytes = root.ClarusHandoff.zipStored(files);
    // Check the archive produced by the existing ZIP codec before offering it.
    const back = root.ATLAS_REDUCTION_JOB.unzip(bytes);
    if (Object.keys(back).length !== Object.keys(files).length || Object.entries(files).some(([n, b]) =>
      !back[n] || back[n].length !== b.length || b.some((v, i) => v !== back[n][i]))) {
      throw Error('QuarkXPress ZIP readback failed. No download was created.');
    }
    return {bytes, referenceCount: swatches.length, sourceCount: count,
      referencesWithoutSources: missing.length};
  }

  Object.assign(E, {quarkPackage});
})(typeof window !== 'undefined' ? window : globalThis);
