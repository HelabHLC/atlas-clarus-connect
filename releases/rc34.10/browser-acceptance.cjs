'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3] || 'source-zip-evidence');
fs.mkdirSync(out, {recursive: true});
const version = process.env.ATLAS_BUNDLE_VERSION || '0.2.0-rc34.10-quarkxpress-source-zip-preview';
assert.ok(['0.2.0-rc34.10-quarkxpress-source-zip-preview', '0.2.0-rc34.10-quarkxpress-source-zip', '0.2.0-rc34.11-colour-origin-preview', '0.2.0-rc34.11-colour-origin'].includes(version));
const master = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
const sources = [[61, 123, 25], [60, 123, 25]];
const sha = b => createHash('sha256').update(b).digest('hex');
const json = bytes => JSON.parse(Buffer.from(bytes).toString('utf8'));
const text = bytes => Buffer.from(bytes).toString('utf8');
function checkBundle() {
  const manifest = json(fs.readFileSync(path.join(root, 'BUNDLE_MANIFEST.json')));
  assert.equal(manifest.version, version); assert.equal(manifest.master_sha256, master);
  assert.equal(manifest.deployment_allowed, !version.endsWith('-preview'));
  const sums = fs.readFileSync(path.join(root, 'SHA256SUMS.txt'), 'utf8').trim().split('\n');
  for (const row of sums) {
    const [, hash, filename] = /^([a-f0-9]{64})  (.+)$/.exec(row);
    assert.equal(sha(fs.readFileSync(path.join(root, filename))), hash, filename);
  }
  return sums.length;
}
const checkedFiles = checkBundle();
require(path.join(root, 'assets/reduction-job.js'));
require(path.join(root, 'assets/image-project-codecs.js'));
const sourcePNG = Buffer.from(global.ATLAS_IMAGE_CODECS.png(2, 1, Uint8Array.from(sources.flatMap(rgb => [...rgb, 255]))));
const sourcePath = path.join(out, 'two-source-colours.png'); fs.writeFileSync(sourcePath, sourcePNG);
function checkPackage(bytes, expectedCount = 2) {
  const files = global.ATLAS_REDUCTION_JOB.unzip(new Uint8Array(bytes));
  assert.deepEqual(Object.keys(files).sort(), ['README.txt', 'package-manifest.json', 'palette.clarus.json', 'palette.xtg']);
  const m = json(files['package-manifest.json']), p = json(files['palette.clarus.json']);
  assert.equal(m.schema, 'atlas-clarus-quarkxpress-package/1.0');
  assert.equal(m.master_sha256, master); assert.equal(m.source_assignment_count, expectedCount);
  assert.equal(m.reference_count, p.references.length); assert.equal(p.source_assignments.length, expectedCount);
  assert.equal(m.native_quarkxpress_import, 'NOT_TESTED'); assert.equal(m.image_bytes_included, false);
  assert.deepEqual(Object.keys(m.files).sort(), ['README.txt', 'palette.clarus.json', 'palette.xtg']);
  for (const [n, hash] of Object.entries(m.files)) assert.equal(sha(files[n]), hash, n);
  assert.ok(text(files['palette.xtg']).includes(master));
  assert.ok(text(files['README.txt']).includes(expectedCount ? 'getrennte Datensaetze' : 'Keine Original-Quellfarben'));
  if (expectedCount === 2) {
    assert.equal(p.references.length, 1);
    assert.deepEqual(p.source_assignments.map(r => r.source_rgb), sources);
    assert.deepEqual(p.source_assignments.map(r => r.source_hex), ['#3D7B19', '#3C7B19']);
    assert.deepEqual(p.source_assignments.map(r => r.reference), ['H130_L045_C055', 'H130_L045_C055']);
    assert.deepEqual(p.source_assignments.map(r => r.atlas_row_id), [4966, 4966]);
    assert.deepEqual(p.source_assignments.map(r => r.sampling.centre), [[0, 0], [1, 0]]);
    assert.deepEqual(p.source_assignments.map(r => r.image.sha256), [sha(sourcePNG), sha(sourcePNG)]);
    assert.deepEqual(p.source_assignments.map(r => r.distance_squared), [41, 30]);
    assert.deepEqual(m.references_without_recorded_sources, []);
    assert.equal(m.source_scope, 'RECORDED_PALETTE_SAMPLES');
    // Independent XTG definition parsing, not just the application's reader.
    const rows = [...text(files['palette.xtg']).matchAll(/^@([^=\r\n]+)=\[C\]<"RGB",P,([^>]+)>\r$/gm)];
    assert.equal(rows.length, 1); assert.equal(rows[0][1], 'H130_L045_C055');
    assert.deepEqual(rows[0][2].split(',').map(v => Math.round(Number(v) * 255)), [55, 121, 26]);
  }
  return {files, manifest: m, palette: p};
}
(async () => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-gpu']});
  const contexts = [], errors = [];
  async function fresh() {
    const context = await browser.newContext({viewport: {width: 1440, height: 1200}, acceptDownloads: true});
    contexts.push(context); const p = await context.newPage(); p.setDefaultTimeout(30000);
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await p.waitForFunction(() => typeof window.ATLAS_CLARUS_EXPORTS?.quarkPackage === 'function');
    return p;
  }
  async function download(p, selector, filename) {
    const promise = p.waitForEvent('download'); await p.locator(selector).click();
    const d = await promise; assert.equal(await d.failure(), null);
    await d.saveAs(path.join(out, filename)); return fs.readFileSync(path.join(out, filename));
  }
  try {
    const page = await fresh();
    let downloads = 0; page.on('download', () => downloads++);
    await page.locator('#palette-toggle').click();
    await page.locator('[data-palette-export="quark-package"]').click();
    assert.match(await page.locator('#export-status').innerText(), /Add at least one/); assert.equal(downloads, 0);
    await page.locator('#palette-close').click();
    await page.locator('#picker-file').setInputFiles(sourcePath);
    await page.waitForFunction(() => document.querySelector('#picker-result').textContent.includes('Image ready'));
    for (const i of [0, 1]) {
      await page.evaluate(() => {location.hash = 'picker';});
      const canvas = page.locator('#picker-canvas'); await canvas.scrollIntoViewIfNeeded();
      const b = await canvas.boundingBox();
      await canvas.click({position: {x: b.width * (i ? .75 : .25), y: b.height / 2}});
      await page.locator('[data-picker-hover]').click();
      await page.locator('#selection [data-add-palette]').click();
      await page.locator('#palette-close').click();
    }
    await page.locator('#palette-toggle').click();
    await page.locator('#palette-name').fill('Two sources one Atlas reference'); await page.locator('#palette-rename').click();
    const bytes = await download(page, '[data-palette-export="quark-package"]', 'two-sources.quarkxpress.zip');
    const sample = checkPackage(bytes);
    assert.match(await page.locator('#export-status').innerText(), /1 references and 2 recorded source assignments/);
    assert.deepEqual(Buffer.from(sample.files['palette.xtg']), await download(page, '[data-palette-export="quarkxpress"]', 'standalone.xtg'));
    assert.deepEqual(Buffer.from(sample.files['palette.clarus.json']), await download(page, '[data-palette-export="clarus"]', 'standalone.clarus.json'));
    const imported = await fresh();
    await imported.locator('#palette-import-file').setInputFiles({name: 'palette.clarus.json', mimeType: 'application/json', buffer: Buffer.from(sample.files['palette.clarus.json'])});
    await imported.waitForFunction(() => document.querySelector('#export-status').textContent.includes('1 verified identities and 2 source records'));
    await imported.locator('#palette-toggle').click();
    const back = await download(imported, '[data-palette-export="quark-package"]', 'two-sources.reimported.quarkxpress.zip');
    checkPackage(back); assert.deepEqual(back, bytes, 'Whole ZIP must be byte-identical after fresh-context reimport');
    await imported.locator('#palette-drawer').screenshot({path: path.join(out, 'internal-ui-check.png')});

    // A palette with no captured sources must say so, never invent them.
    const emptySource = structuredClone(sample.palette); emptySource.source_assignments = [];
    const refsOnly = await fresh();
    await refsOnly.locator('#palette-import-file').setInputFiles({name: 'references-only.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(emptySource))});
    await refsOnly.waitForFunction(() => document.querySelector('#export-status').textContent.includes('0 source records'));
    await refsOnly.locator('#palette-toggle').click();
    const zero = checkPackage(await download(refsOnly, '[data-palette-export="quark-package"]', 'references-only.quarkxpress.zip'), 0);
    assert.equal(zero.manifest.source_scope, 'NO_SOURCE_RECORDS'); assert.deepEqual(zero.manifest.references_without_recorded_sources, [4966]);
    assert.match(await refsOnly.locator('#export-status').innerText(), /1 references have no recorded source colours/);

    const edgeCases = await page.evaluate(async p => {
      const E = window.ATLAS_CLARUS_EXPORTS, D = window.ATLAS_CLARUS_DATA;
      const c = D.colors.find(c => c.id === 4966), other = D.colors.find(c => c.id !== 4966);
      const records = p.source_assignments;
      const rejected = async fn => {try {await fn(); return false;} catch {return true;}};
      const invalid = structuredClone(records); invalid[0].source_rgb[0]++;
      const changedRef = structuredClone(records); changedRef[1].atlas_row_id++;
      const many = Array.from({length: 4096}, (_, i) => records[i % 2]);
      const maximum = await E.quarkPackage([c], D.colors, D.master_sha256, 'All captured records', many);
      const files = window.ATLAS_REDUCTION_JOB.unzip(maximum.bytes);
      const manyBack = JSON.parse(new TextDecoder().decode(files['palette.clarus.json'])).source_assignments;
      const partial = await E.quarkPackage([c, other], D.colors, D.master_sha256, 'Partial sources', records);
      // Mutate caller-owned arrays while hashes are pending: the ZIP must remain a snapshot.
      const pendingSources = structuredClone(records), pendingPalette = [structuredClone(c)];
      const pending = E.quarkPackage(pendingPalette, D.colors, D.master_sha256, 'Snapshot', pendingSources);
      pendingSources.length = 0; pendingPalette[0].rgb[0] = 255;
      const snapshot = await pending;
      const snapshotFiles = window.ATLAS_REDUCTION_JOB.unzip(snapshot.bytes);
      const snapshotJSON = JSON.parse(new TextDecoder().decode(snapshotFiles['palette.clarus.json']));
      return {
        invalid_source_rejected: await rejected(() => E.quarkPackage([c], D.colors, D.master_sha256, 'Bad source', invalid)),
        invalid_address_rejected: await rejected(() => E.quarkPackage([c], D.colors, D.master_sha256, 'Bad address', changedRef)),
        invalid_master_rejected: await rejected(() => E.quarkPackage([c], D.colors, '0'.repeat(64), 'Bad master', records)),
        too_many_sources_rejected: await rejected(() => E.quarkPackage([c], D.colors, D.master_sha256, 'Too many', [...many, records[0]])),
        too_many_references_rejected: await rejected(() => E.quarkPackage(D.colors.slice(0, 65), D.colors, D.master_sha256, 'Too many refs', [])),
        all_4096_sources_retained: JSON.stringify(manyBack) === JSON.stringify(many),
        partial_source_count: partial.sourceCount, partial_missing_references: partial.referencesWithoutSources,
        snapshot_sources: snapshotJSON.source_assignments.map(r => r.source_rgb),
        snapshot_reference_rgb: snapshotJSON.references[0].master_rgb
      };
    }, sample.palette);
    for (const key of ['invalid_source_rejected', 'invalid_address_rejected', 'invalid_master_rejected', 'too_many_sources_rejected', 'too_many_references_rejected', 'all_4096_sources_retained']) assert.equal(edgeCases[key], true, key);
    assert.equal(edgeCases.partial_source_count, 2); assert.equal(edgeCases.partial_missing_references, 1);
    assert.deepEqual(edgeCases.snapshot_sources, sources); assert.deepEqual(edgeCases.snapshot_reference_rgb, [55, 121, 26]);
    assert.deepEqual(errors, []); assert.equal(checkBundle(), checkedFiles);
    const results = {status: 'PASS', bundle_version: version, browser: await browser.version(),
      actual_picker_to_zip_download: 'PASS', json_import_in_fresh_context: 'PASS',
      whole_zip_roundtrip: 'BYTE_IDENTICAL', standalone_xtg_and_json_equivalent: true,
      empty_palette_blocked: true, missing_sources_explicit: true, edge_cases: edgeCases,
      bundle_files_checked_before_and_after: checkedFiles, sample_zip_sha256: sha(bytes),
      master_sha256: master, page_errors: errors, native_quarkxpress_import: 'NOT_TESTED'};
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify(results, null, 2));
  } finally {for (const c of contexts) await c.close(); await browser.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
