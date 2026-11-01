'use strict';
// Runs against the UNMODIFIED published RC34.9 bundle, including its inline UI.
// npm install playwright; npx playwright install chromium
// node provenance-regression.cjs /path/to/atlas-clarus-browser-bundle /path/to/output
// CHROMIUM_EXECUTABLE may point to an already installed Chromium.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {createHash} = require('node:crypto');
const {chromium} = require('playwright');
const root = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3] || 'provenance-evidence');
fs.mkdirSync(out, {recursive: true});
const master = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
const sources = [[61, 123, 25], [60, 123, 25]];
const rgba = sources.flatMap(rgb => [...rgb, 255]);
const reference = {ref: 'H130_L045_C055', rgb: [55, 121, 26]};
const rowId = 4966;
const sha = b => createHash('sha256').update(b).digest('hex');
const json = b => JSON.parse(Buffer.from(b).toString('utf8'));
const writeJSON = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2) + '\n');
function checkBundle() {
  const sums = fs.readFileSync(path.join(root, 'SHA256SUMS.txt'), 'utf8').trim().split('\n');
  for (const line of sums) {
    const [, hash, name] = /^([a-f0-9]{64})  (.+)$/.exec(line);
    assert.equal(sha(fs.readFileSync(path.join(root, name))), hash, name);
  }
  const m = json(fs.readFileSync(path.join(root, 'BUNDLE_MANIFEST.json')));
  assert.equal(m.version, '0.2.0-rc34.9-quarkxpress');
  assert.equal(m.master_sha256, master);
  return sums.length;
}
const checkedFiles = checkBundle();
// These published codecs create the tiny fixture and read the actual downloaded jobs.
require(path.join(root, 'assets/image-project-codecs.js'));
require(path.join(root, 'assets/reduction-job.js'));
const sourcePNG = Buffer.from(global.ATLAS_IMAGE_CODECS.png(2, 1, Uint8Array.from(rgba)));
const sourcePath = path.join(out, 'two-source-colours.png');
fs.writeFileSync(sourcePath, sourcePNG);
const unzip = bytes => global.ATLAS_REDUCTION_JOB.unzip(new Uint8Array(bytes));
function parseXTG(bytes) {
  // Independent check of definitions, separate from the application's own reader.
  const text = Buffer.from(bytes).toString('utf8');
  assert.ok(text.startsWith('<v21.00><e9>\r\n'));
  assert.ok(text.includes('Master SHA-256: ' + master));
  return [...text.matchAll(/^@([^=\r\n]+)=\[C\]<"RGB",P,([^>]+)>\r$/gm)].map(m => ({
    ref: m[1], rgb: m[2].split(',').map(v => Math.round(Number(v) * 255))
  }));
}
function assertAssignments(palette) {
  assert.equal(palette.references.length, 1);
  assert.equal(palette.references[0].reference, reference.ref);
  assert.equal(palette.references[0].atlas_row_id, rowId);
  assert.deepEqual(palette.references[0].master_rgb, reference.rgb);
  assert.deepEqual(palette.source_assignments.map(r => r.source_rgb), sources);
  assert.deepEqual(palette.source_assignments.map(r => r.source_hex), ['#3D7B19', '#3C7B19']);
  assert.deepEqual(palette.source_assignments.map(r => r.atlas_row_id), [rowId, rowId]);
  assert.deepEqual(palette.source_assignments.map(r => r.reference), [reference.ref, reference.ref]);
  assert.deepEqual(palette.source_assignments.map(r => r.sampling.centre), [[0, 0], [1, 0]]);
  assert.deepEqual(palette.source_assignments.map(r => r.distance_squared), [41, 30]);
  for (const r of palette.source_assignments) {
    assert.equal(r.image.sha256, sha(sourcePNG));
    assert.equal(r.master_sha256, master);
    assert.deepEqual(r.reference_rgb, reference.rgb);
  }
}
function u16(bytes) {
  const b = Buffer.from(bytes);
  return Array.from({length: b.length / 2}, (_, i) => b.readUInt16LE(i * 2));
}
function checkJob(bytes, protectedMode) {
  const files = unzip(bytes), report = json(files['reduction.json']), state = json(files['job.json']);
  const manifest = json(files['job-package-manifest.json']);
  for (const [name, hash] of Object.entries(manifest.files)) assert.equal(sha(files[name]), hash, name);
  assert.deepEqual(Buffer.from(files['original.png']), sourcePNG);
  assert.deepEqual([...files['input-rgba.bin']], rgba);
  assert.deepEqual(u16(files['input-atlas-row-id.u16le']), [rowId, rowId]);
  const outputIndices = u16(files['output-palette-index.u16le']);
  if (!protectedMode) assert.deepEqual(outputIndices, [0, 0]);
  assert.deepEqual(outputIndices.map(i => report.palette[i].rgb),
    protectedMode ? sources : [reference.rgb, reference.rgb]);
  assert.deepEqual([...files[state.input.rgba.$binary]], rgba);
  assert.deepEqual(Buffer.from(files[state.input.sourceBytes.$binary]), sourcePNG);
  const chunks = Object.keys(files).filter(n => /^palette-part-.*\.clarus\.json$/.test(n));
  for (const name of chunks) assert.deepEqual(json(files[name]).source_assignments, []);
  if (!protectedMode) {
    assert.equal(chunks.length, 1);
    assert.equal(report.palette.length, 1);
    assert.equal(report.palette[0].reference, reference.ref);
    assert.equal(report.palette[0].atlas_row_id, rowId);
    assert.deepEqual(parseXTG(files['palette.xtg']), [reference]);
    // Without selecting source locks, reduction.json is not a list of original RGBs.
    assert.deepEqual(report.reference_protection.original_rgbs, []);
    assert.deepEqual(report.reference_protection.source_bindings, []);
  } else {
    assert.equal(chunks.length, 0); // This fixture has only two original output swatches.
    assert.deepEqual(report.palette.map(c => c.kind), ['ORIGINAL_RGB', 'ORIGINAL_RGB']);
    assert.deepEqual(report.palette.map(c => c.rgb).sort(), sources.map(c => c.slice()).sort());
    assert.deepEqual(report.palette.map(c => c.atlas_row_id), [null, null]);
    assert.deepEqual(report.palette.map(c => c.source_atlas_row_id), [rowId, rowId]);
    assert.deepEqual(report.palette.map(c => c.source_atlas_reference), [reference.ref, reference.ref]);
    assert.deepEqual(parseXTG(files['palette.xtg']).map(c => c.rgb), report.palette.map(c => c.rgb));
    assert.ok(!Buffer.from(files['palette.xtg']).toString('utf8').includes(reference.ref));
  }
  return {files, report, state};
}
(async () => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
    args: ['--no-sandbox', '--disable-gpu']});
  const errors = [], contexts = [];
  async function fresh() {
    const context = await browser.newContext({viewport: {width: 1440, height: 1200}, acceptDownloads: true});
    contexts.push(context);
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.waitForFunction(() => window.ATLAS_CLARUS_EXPORTS?.quarkXtg);
    return page;
  }
  async function download(page, selector, name) {
    const pending = page.waitForEvent('download');
    await page.locator(selector).click();
    const d = await pending;
    assert.equal(await d.failure(), null);
    const file = path.join(out, name);
    await d.saveAs(file);
    return fs.readFileSync(file);
  }
  try {
    const page = await fresh();
    // Independent exhaustive winner check, against all 13,283 shipped reference rows.
    const winners = await page.evaluate(sources => {
      const D = window.ATLAS_CLARUS_DATA;
      return {rows: D.colors.length, master: D.master_sha256, winners: sources.map(rgb =>
        D.colors.map(c => ({id: c.id, ref: c.ref, rgb: c.rgb,
          d2: c.rgb.reduce((s, v, j) => s + (v - rgb[j]) ** 2, 0)}))
          .sort((a, b) => a.d2 - b.d2 || a.id - b.id)[0])};
    }, sources);
    assert.equal(winners.rows, 13283); assert.equal(winners.master, master);
    assert.deepEqual(winners.winners.map(w => [w.id, w.ref, w.d2]),
      [[rowId, reference.ref, 41], [rowId, reference.ref, 30]]);
    await page.locator('#picker-file').setInputFiles(sourcePath);
    await page.waitForFunction(() => document.querySelector('#picker-result').textContent.includes('Image ready'));
    for (const i of [0, 1]) {
      await page.evaluate(() => {location.hash = 'picker';});
      const canvas = page.locator('#picker-canvas');
      await canvas.scrollIntoViewIfNeeded();
      const b = await canvas.boundingBox();
      await canvas.click({position: {x: b.width * (i ? .75 : .25), y: b.height / 2}});
      assert.match(await page.locator('#picker-result').innerText(), new RegExp(reference.ref));
      await page.locator('[data-picker-hover]').click();
      await page.locator('#selection [data-add-palette]').click();
      await page.locator('#palette-close').click();
    }
    await page.locator('#palette-toggle').click();
    await page.locator('#palette-name').fill('Two sources one Atlas reference');
    await page.locator('#palette-rename').click();
    const xtg = await download(page, '[data-palette-export="quarkxpress"]', 'two-sources.xtg');
    const paletteBytes = await download(page, '[data-palette-export="clarus"]', 'two-sources.clarus.json');
    const palette = json(paletteBytes); assertAssignments(palette);
    assert.deepEqual(parseXTG(xtg), [reference]);
    for (const text of ['#3D7B19', '#3C7B19', '61 / 123 / 25', '60 / 123 / 25']) assert.ok(!xtg.includes(text));
    const parsed = await page.evaluate(({text, p}) => {
      const E = window.ATLAS_CLARUS_EXPORTS;
      E.verifyQuarkXtg(text, [{ref: p.references[0].reference, rgb: p.references[0].master_rgb}], p.master_sha256, p.palette_name);
      return E.readQuarkXtg(text);
    }, {text: xtg.toString('utf8'), p: palette});
    assert.deepEqual(parsed, [reference]);
    const imported = await fresh();
    await imported.locator('#palette-import-file').setInputFiles(path.join(out, 'two-sources.clarus.json'));
    await imported.waitForFunction(() => document.querySelector('#export-status').textContent.includes('1 verified identities and 2 source records'));
    await imported.locator('#palette-toggle').click();
    const paletteBack = await download(imported, '[data-palette-export="clarus"]', 'two-sources.reimported.clarus.json');
    assertAssignments(json(paletteBack)); assert.deepEqual(paletteBack, paletteBytes);
    assert.deepEqual(await download(imported, '[data-palette-export="quarkxpress"]', 'two-sources.reimported.xtg'), xtg);
    const negative = await imported.evaluate(p => {
      const E = window.ATLAS_CLARUS_EXPORTS, D = window.ATLAS_CLARUS_DATA;
      const attempt = mutate => {const q = structuredClone(p); mutate(q); try {E.parseClarus(q, D.colors, D.master_sha256); return false;} catch {return true;}};
      const refsOnly = structuredClone(p); refsOnly.source_assignments = [];
      return {changed_source: attempt(q => q.source_assignments[0].source_rgb[0]++),
        changed_address: attempt(q => q.source_assignments[0].atlas_row_id++),
        changed_master: attempt(q => q.master_sha256 = '0'.repeat(64)),
        empty_sources_restored: E.parseClarus(refsOnly, D.colors, D.master_sha256).sourceAssignments.length};
    }, palette);
    assert.deepEqual(negative, {changed_source: true, changed_address: true, changed_master: true, empty_sources_restored: 0});
    const jobs = {};
    for (const protectedMode of [false, true]) {
      const label = protectedMode ? 'protected-originals' : 'reference-reduction';
      const p = await fresh();
      await p.evaluate(() => {location.hash = 'colour-reduction';});
      await p.waitForFunction(() => !document.querySelector('#cr-file').disabled);
      await p.locator('#cr-protection-mode').selectOption(protectedMode ? 'ORIGINAL_RGBA' : 'LIBRARY_REFERENCE');
      if (!protectedMode) {
        const full = await p.evaluate(() => Object.entries(window.ATLAS_CLARUS_DATA.views).find(([, v]) => v.ids.length === 13283)?.[0]);
        assert.ok(full, 'Full master view must exist');
        await p.locator('#cr-library').selectOption(full);
      }
      await p.locator('#cr-file').setInputFiles(sourcePath);
      await p.waitForFunction(() => !document.querySelector('#cr-run').disabled);
      await p.locator('#cr-k').fill(protectedMode ? '2' : '1');
      if (protectedMode) for (const hex of ['#3D7B19', '#3C7B19']) {
        await p.locator('#cr-lock-hex').fill(hex); await p.locator('#cr-original-add').click();
        assert.match(await p.locator('#cr-status').innerText(), /protected/);
      }
      await p.locator('#cr-run').click();
      await p.waitForFunction(() => !document.querySelector('#cr-palette').disabled);
      await p.locator('#cr-format').selectOption('xtg');
      const single = await download(p, '#cr-palette', label + '.xtg');
      const bytes = await download(p, '#cr-zip', label + '.job.zip');
      const before = checkJob(bytes, protectedMode);
      assert.deepEqual(Buffer.from(before.files['palette.xtg']), single);
      fs.writeFileSync(path.join(out, label + '.reduction.json'), before.files['reduction.json']);
      for (const name of Object.keys(before.files).filter(n => /^palette-part-/.test(n))) {
        fs.writeFileSync(path.join(out, label + '.' + name), before.files[name]);
        const paletteOnlyPage = await fresh();
        await paletteOnlyPage.locator('#palette-import-file').setInputFiles(path.join(out, label + '.' + name));
        await paletteOnlyPage.waitForFunction(() => document.querySelector('#export-status').textContent.includes('1 verified identities and 0 source records'));
        await paletteOnlyPage.locator('#palette-toggle').click();
        const paletteOnlyBack = json(await download(paletteOnlyPage, '[data-palette-export="clarus"]', label + '.palette-only.reimported.clarus.json'));
        assert.deepEqual(paletteOnlyBack.source_assignments, []);
        assert.equal(paletteOnlyBack.references[0].reference, reference.ref);
      }
      const backPage = await fresh();
      await backPage.evaluate(() => {location.hash = 'colour-reduction';});
      await backPage.waitForFunction(() => !document.querySelector('#cr-job-import').disabled);
      await backPage.locator('#cr-job-import').setInputFiles(path.join(out, label + '.job.zip'));
      await backPage.waitForFunction(() => document.querySelector('#cr-status').textContent.includes('Complete reduction job restored'));
      const backBytes = await download(backPage, '#cr-zip', label + '.reimported.job.zip');
      const after = checkJob(backBytes, protectedMode);
      assert.deepEqual(after.state, before.state);
      assert.deepEqual(after.report, before.report);
      for (const name of ['original.png', 'input-rgba.bin', 'input-atlas-row-id.u16le', 'output-palette-index.u16le', 'palette.xtg']) {
        assert.deepEqual(after.files[name], before.files[name], label + ': ' + name);
      }
      jobs[label] = {status: 'PASS', source_bytes_exact: true, rgba_exact: true,
        input_atlas_row_ids: [rowId, rowId], state_equal_after_fresh_context_import: true,
        output_palette: before.report.palette, archive_sha256: sha(bytes)};
      console.log('PASS ' + label + ' export, fresh-context import and re-export');
    }
    assert.deepEqual(errors, []); assert.equal(checkBundle(), checkedFiles);
    const results = {status: 'PASS', release_commit: 'ad158876aa3615bef74a671a3b191f0274ff9fd2',
      published_archive_sha256: '5699974d6b5742786b92babc3315d32f3b1af0fd4d89b23cf7fbddc4d5cc2156',
      browser: await browser.version(), playwright: require('playwright/package.json').version,
      master_sha256: master, bundle_files_checked_before_and_after: checkedFiles,
      source_png_sha256: sha(sourcePNG), sources, winners,
      sampled_palette_json_roundtrip: 'PASS_BYTE_IDENTICAL', xtg_definitions: parsed,
      xtg_contains_original_to_reference_mapping: false,
      reduction_palette_json_has_source_assignments: false,
      negative_checks: negative, jobs, page_errors: errors,
      native_quarkxpress_import: 'NOT_TESTED', icc_embedded_in_xtg: false};
    writeJSON('results.json', results);
    console.log(JSON.stringify({status: results.status, browser: results.browser, checkedFiles,
      sampled_palette_json_roundtrip: results.sampled_palette_json_roundtrip,
      native_quarkxpress_import: results.native_quarkxpress_import}));
  } finally {for (const c of contexts) await c.close(); await browser.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
