'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {spawnSync} = require('node:child_process');
const X = require('../tools/image-project-exchange.cjs');
const out = path.resolve(process.env.SOURCE_BINDING_OUTPUT || '/tmp/atlas-source-binding');
const target = X.DEFAULT_HTML, legacy = path.join(out, 'legacy/atlas-clarus-browser-bundle/index.html');
const problematic = ['alpha.png', 'linear-icc.png', 'linear-icc.jpg'];
const fixtures = Object.keys(JSON.parse(fs.readFileSync(path.join(out, 'fixtures-sha256.json'))));
const artifacts = path.join(out, 'cross-engine'); fs.mkdirSync(artifacts, {recursive: true});
const report = {status: 'RUNNING', generated_utc: new Date().toISOString(), playwright_version: require('playwright/package.json').version,
  platform: {os: process.platform, arch: process.arch}, firefox_user_prefs: {'gfx.color_management.mode': 2},
  physical_iphone: 'NOT_TESTED', physical_ipad: 'NOT_TESTED', macos_safari: 'NOT_TESTED',
  bundle_sha256: X.sha(fs.readFileSync(target)), fixtures: [], cases: [], ui: [], exchange_helper: [], attacks: []};
const projects = {}, sessions = {};
async function ready(page, prefix) {
  await page.waitForFunction(prefix => !document.getElementById('ip-import').disabled &&
    (document.getElementById('ip-status').textContent.startsWith(prefix) || document.getElementById('ip-status').dataset.error === 'true'), prefix);
  const text = await page.locator('#ip-status').innerText(); assert(text.startsWith(prefix), text);
}
async function download(page, selector = '#ip-json') {
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator(selector).click()]);
  return fs.readFileSync(await d.path());
}
async function upload(page, bytes, format) {
  await page.locator('#ip-import').setInputFiles({name: 'image-project.' + format,
    mimeType: format === 'zip' ? 'application/zip' : 'application/json', buffer: bytes});
}
function pack(p, zip) { return {p, json: Buffer.from(JSON.stringify(p) + '\n'), zip: Buffer.from(zip, 'base64')}; }

(async () => {
  try {
    // Projects really originate in three separate engines, using the unchanged
    // legacy UI. They are not hand-authored hashes or same-engine roundtrips.
    for (const engine of X.ENGINES) {
      const session = await X.launch(engine, target); sessions[engine] = session;
      report[engine] = {browser_version: session.version};
      const old = await session.browser.newPage({acceptDownloads: true});
      await old.goto(pathToFileURL(legacy).href + '#colour-projects');
      await old.waitForFunction(() => !document.getElementById('cp-new').disabled);
      await old.locator('#cp-new-name').fill('Cross-engine provenance'); await old.locator('#cp-new').click();
      await old.waitForFunction(() => document.getElementById('cp-status').textContent.startsWith('Project created'));
      await old.locator('#cp-set-name').fill('Recorded greens');
      await old.locator('#cp-add-json').setInputFiles(path.join(__dirname, 'fixtures/colour-kit-030-two-greens.json'));
      await old.waitForFunction(() => document.getElementById('cp-status').textContent.startsWith('Colour set added'));
      await old.locator('a[href="#image-projects"]').click(); await ready(old, 'Ready.');
      await old.locator('#ip-attach').check(); projects[engine] = {};
      for (const name of fixtures) {
        await old.locator('#ip-image').setInputFiles(path.join(out, name)); await ready(old, 'Original image retained');
        const p = JSON.parse(await download(old));
        assert.equal(p.original.file_sha256, X.sha(fs.readFileSync(path.join(out, name)))); assert(p.colour_project);
        const variants = await old.evaluate(async p => {
          const I = ATLAS_IMAGE_PROJECTS, H = ClarusHandoff;
          const ctx = await ATLAS_COLOUR_HANDOFF.createContext(ATLAS_CLARUS_DATA.colors, ATLAS_CLARUS_DATA.master_sha256);
          const zip = async p => I.base64(H.zipStored(await I.exportFiles(p, ctx)));
          const initial = {p, zip: await zip(p)};
          // Alpha fixture at (2,3) is visible. Exact sampled RGB + coordinates
          // and both reference identities are retained in the real journal.
          const start = I.unbase64(p.original.rgba_base64, I.MAX_PIXELS * 4), at = (3 * p.original.width + 2) * 4;
          p = await I.edit(p, {kind: 'RECOLOUR', rect: [2,3,1,1], match: Array.from(start.slice(at, at + 3)), replacement: [17,34,51], note: 'Exact sampled RGB at X2 Y3.'}, ctx);
          p = await I.edit(p, {kind: 'TRANSPARENT', rect: [2,3,1,1], note: 'Retain hidden RGB and recorded coordinate.'}, ctx);
          p = await I.edit(p, {kind: 'UNDO', note: 'Restore the edited pixel.'}, ctx);
          p = await I.edit(p, {kind: 'REDO', note: 'Repeat the recorded removal.'}, ctx);
          return {initial, edited: {p, zip: await zip(p)}};
        }, p);
        projects[engine][name] = {};
        for (const [state, v] of Object.entries(variants)) {
          const packet = pack(v.p, v.zip); projects[engine][name][state] = packet;
          for (const format of ['json', 'zip']) fs.writeFileSync(path.join(artifacts, `${engine}-${name}-${state}.${format}`), packet[format]);
        }
        assert.deepEqual(variants.edited.p.original, p.original);
        assert.deepEqual(variants.edited.p.colour_project, p.colour_project);
        report.fixtures.push({engine, name, source_sha256: p.original.file_sha256, rgba_sha256: p.original.rgba_sha256,
          width: p.original.width, height: p.original.height});
      }
      await old.close();
    }
    // Full 3 x 3 x 14 x 2 states x 2 formats. Expected boundaries are pinned:
    // three fixtures reject every off-diagonal import, eleven accept all.
    for (const from of X.ENGINES) for (const to of X.ENGINES) for (const name of fixtures) {
      const expected = from === to || !problematic.includes(name) ? 'VERIFIED' : 'REJECTED';
      assert.equal(projects[from][name].initial.p.original.rgba_sha256 === projects[to][name].initial.p.original.rgba_sha256,
        expected === 'VERIFIED', 'Decoder matrix changed; investigate before changing expectations.');
      for (const state of ['initial', 'edited']) for (const format of ['json', 'zip']) {
        const packet = projects[from][name][state], inputHash = X.sha(packet[format]);
        let actual, error = null, verified;
        try { verified = await X.verifyBytes(sessions[to].page, packet[format], format); actual = 'VERIFIED'; }
        catch (e) { actual = 'REJECTED'; error = e.message; }
        const entry = {from, to, fixture: name, state, format, expected, actual, input_sha256: inputHash,
          document_sha256: packet.p.document_sha256, ...(error ? {error} : {})};
        report.cases.push(entry); assert.equal(actual, expected, JSON.stringify(entry));
        assert.equal(X.sha(packet[format]), inputHash);
        if (verified) {
          assert.deepEqual(JSON.parse(verified.json), packet.p); // all RGB, references, coordinates, palette and history
          assert.deepEqual(Buffer.from(verified.zip_base64, 'base64'), packet.zip); // every ZIP companion byte
          assert.equal(verified.frame_sha256, packet.p.history.at(-1)?.after_rgba_sha256 || packet.p.original.rgba_sha256);
        } else assert.match(error, /Source\/pixel consistency could not be verified/);
      }
    }
    // Real UI imports must preserve a previously open workspace on mismatch.
    // Test all six directions and both formats for the three failing fixtures.
    for (const to of X.ENGINES) {
      const page = sessions[to].page, retained = projects[to]['opaque.png'].edited;
      await upload(page, retained.json, 'json'); await ready(page, 'Image project opened');
      for (const from of X.ENGINES.filter(e => e !== to)) for (const name of problematic) for (const format of ['json', 'zip']) {
        await upload(page, projects[from][name].edited[format], format);
        await page.waitForFunction(() => !document.getElementById('ip-import').disabled && document.getElementById('ip-status').dataset.error === 'true');
        assert.match(await page.locator('#ip-status').innerText(), /Source\/pixel consistency could not be verified/);
        assert.deepEqual(JSON.parse(await download(page)), retained.p);
        report.ui.push({from, to, fixture: name, format, rejected_and_workspace_preserved: true});
      }
      for (const from of X.ENGINES.filter(e => e !== to)) {
        // New workspace avoids unrelated project replacement prompts.
        const colleague = await sessions[to].browser.newPage({acceptDownloads: true});
        await colleague.goto(pathToFileURL(target).href + '#image-projects'); await ready(colleague, 'Ready.');
        await upload(colleague, projects[from]['opaque.png'].edited.zip, 'zip'); await ready(colleague, 'Image project opened');
        assert.deepEqual(JSON.parse(await download(colleague)), projects[from]['opaque.png'].edited.p);
        await colleague.locator('#ip-undo').click(); await ready(colleague, 'Image change recorded');
        const returned = await download(colleague), next = JSON.parse(returned);
        assert.deepEqual(next.history.slice(0,4), projects[from]['opaque.png'].edited.p.history);
        assert.deepEqual(next.original, projects[from]['opaque.png'].edited.p.original);
        assert.deepEqual(next.colour_project, projects[from]['opaque.png'].edited.p.colour_project);
        await X.verifyBytes(sessions[from].page, returned, 'json');
        report.ui.push({from, to, fixture: 'opaque.png', zip_to_returned_json_with_new_edit: 'PASS'});
        await colleague.close();
      }
    }
    // Recipient helper probes full verification (never trusts a sender label),
    // opens unchanged data in a matching engine, and returns an extended journal.
    for (const from of X.ENGINES) for (const name of problematic) for (const format of ['json', 'zip']) {
      const packet = projects[from][name].edited;
      // Use already running sessions for exhaustive probes; separately exercise
      // the public probe launcher once per file format below.
      const matching = [];
      for (const engine of X.ENGINES) {
        try { await X.verifyBytes(sessions[engine].page, packet[format], format); matching.push(engine); }
        catch (e) { assert.match(e.message, /Source\/pixel consistency/); }
      }
      assert.deepEqual(matching, [from]);
      const session = await X.openVerified(packet[format], format, matching[0], target, true);
      try {
        assert.deepEqual(JSON.parse(await download(session.page)), packet.p);
        await session.page.locator('#ip-undo').click(); await ready(session.page, 'Image change recorded');
        const returned = await download(session.page), next = JSON.parse(returned);
        assert.deepEqual(next.original, packet.p.original); assert.deepEqual(next.colour_project, packet.p.colour_project);
        assert.deepEqual(next.history.slice(0,4), packet.p.history); assert.equal(next.history.length, 5);
        await X.verifyBytes(sessions[from].page, returned, 'json');
        report.exchange_helper.push({from, fixture: name, format, matching, unchanged_open_and_edit_return: 'PASS'});
      } finally { await session.browser.close(); }
    }
    for (const format of ['json', 'zip']) {
      const check = await X.probe(projects.chromium['alpha.png'].edited[format], format, target);
      assert.deepEqual(check.results.filter(r => r.status === 'VERIFIED').map(r => r.engine), ['chromium']);
      assert.equal(check.input_sha256, X.sha(projects.chromium['alpha.png'].edited[format]));
      fs.writeFileSync(path.join(artifacts, `helper-check-${format}.json`), JSON.stringify(check, null, 2) + '\n');
    }
    // Test the real CLI check and download persistence used by headed sessions.
    const inputPath = path.join(artifacts, 'chromium-alpha.png-edited.zip');
    const inputBefore = fs.readFileSync(inputPath);
    const cli = spawnSync(process.execPath, [path.join(__dirname, '../tools/image-project-exchange.cjs'), inputPath, '--check'], {encoding: 'utf8', timeout: 120000});
    assert.equal(cli.status, 0, cli.stderr);
    assert.deepEqual(JSON.parse(cli.stdout).results.filter(r => r.status === 'VERIFIED').map(r => r.engine), ['chromium']);
    const editor = await X.openVerified(inputBefore, 'zip', 'chromium', target, true);
    let downloads;
    try {
      downloads = X.retainDownloads(editor.page, inputPath);
      await download(editor.page, '#ip-json'); await downloads.finish();
      await download(editor.page, '#ip-json'); await downloads.finish();
      assert.equal(downloads.saved.length, 2); assert.notEqual(downloads.saved[0], downloads.saved[1]);
      await download(editor.page, '#ip-zip'); await downloads.finish();
    } finally { await editor.browser.close(); }
    for (const saved of downloads.saved.slice(0, 2)) assert.deepEqual(JSON.parse(fs.readFileSync(saved)), projects.chromium['alpha.png'].edited.p);
    assert.deepEqual(fs.readFileSync(downloads.saved[2]), inputBefore);
    assert.deepEqual(fs.readFileSync(inputPath), inputBefore);
    report.helper_cli_and_downloads_survive_close = true;
    // Coherently rehashed one-byte attacks from each origin, in BOTH formats,
    // must fail all three engine probes. Use the actual legacy exporter to make
    // all package hashes/CRCs consistent; no forged document should be "rescued".
    for (const from of X.ENGINES) {
      const old = await sessions[from].browser.newPage(); await old.goto(pathToFileURL(legacy).href + '#image-projects'); await ready(old, 'Ready.');
      for (const name of ['opaque.png', ...problematic]) {
        const forged = await old.evaluate(async p => {
          const I = ATLAS_IMAGE_PROJECTS, H = ClarusHandoff, P = ATLAS_COLOUR_PROJECTS;
          const ctx = await ATLAS_COLOUR_HANDOFF.createContext(ATLAS_CLARUS_DATA.colors, ATLAS_CLARUS_DATA.master_sha256);
          const rgba = I.unbase64(p.original.rgba_base64, I.MAX_PIXELS * 4); rgba[4] ^= 1;
          p.original.rgba_base64 = I.base64(rgba); p.original.rgba_sha256 = await ctx.sha(rgba);
          p.document_sha256 = await ctx.sha(H.utf8(P.canon(Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'document_sha256')))));
          return {p, zip: I.base64(H.zipStored(await I.exportFiles(p, ctx)))};
        }, projects[from][name].initial.p);
        const packet = pack(forged.p, forged.zip);
        for (const to of X.ENGINES) for (const format of ['json', 'zip']) {
          await assert.rejects(() => X.verifyBytes(sessions[to].page, packet[format], format), /Source\/pixel consistency could not be verified/);
          report.attacks.push({from, to, fixture: name, format, rehashed_one_byte_attack: 'REJECTED'});
        }
        if (from === 'chromium' && name === 'opaque.png') {
          const check = await X.probe(packet.json, 'json', target);
          assert(check.results.every(r => r.status === 'REJECTED')); // no compatible engine => no import
          await assert.rejects(() => X.openVerified(packet.zip, 'zip', 'chromium', target, true), /Source\/pixel consistency/);
          const rejectedPath = path.join(artifacts, 'forged.json'); fs.writeFileSync(rejectedPath, packet.json);
          const cli = spawnSync(process.execPath, [path.join(__dirname, '../tools/image-project-exchange.cjs'), rejectedPath, '--check'], {encoding: 'utf8', timeout: 120000});
          assert.equal(cli.status, 2, cli.stderr);
          assert(JSON.parse(cli.stdout).results.every(r => r.status === 'REJECTED'));
          assert.deepEqual(fs.readFileSync(rejectedPath), packet.json);
          report.no_matching_engine_fails_closed = true;
        }
      }
      await old.close();
    }
    const badZip = Buffer.from(projects.chromium['opaque.png'].edited.zip);
    badZip[80] ^= 1;
    for (const to of X.ENGINES) await assert.rejects(() => X.verifyBytes(sessions[to].page, badZip, 'zip'));
    // Unavailable engine/runtime is never reported as rejection or acceptance.
    const unavailable = await X.probe(projects.chromium['opaque.png'].initial.json, 'json', target, ['nonexistent']);
    assert.equal(unavailable.results[0].status, 'UNAVAILABLE');
    report.damaged_zip_rejected_and_unavailable_distinguished = true;
    report.status = 'PASS';
    report.totals = {imports: report.cases.length, verified: report.cases.filter(r => r.actual === 'VERIFIED').length,
      rejected: report.cases.filter(r => r.actual === 'REJECTED').length,
      cross_engine_imports: report.cases.filter(r => r.from !== r.to).length,
      ui_workspace_preservation: report.ui.filter(r => r.rejected_and_workspace_preserved).length,
      helper_roundtrips: report.exchange_helper.length, attacks_rejected: report.attacks.length};
    console.log('CROSS_ENGINE_REPORT ' + JSON.stringify(report));
  } catch (e) { report.status = 'FAIL'; report.failure = e.stack; throw e; }
  finally {
    fs.writeFileSync(path.join(out, 'cross-engine-report.json'), JSON.stringify(report, null, 2) + '\n');
    for (const session of Object.values(sessions)) await session.browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
