'use strict';
// Recipient-side, local decoder selection. Never imports a report as proof,
// supplies a decoder override, changes the project or relaxes the verifier.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const playwright = require('../tests/node_modules/playwright');
const ENGINES = ['chromium', 'firefox', 'webkit'];
const DEFAULT_HTML = path.resolve(__dirname, '../build-source-binding/atlas-clarus-browser-bundle/index.html');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const prefs = {'gfx.color_management.mode': 2};

async function launch(engine, html = DEFAULT_HTML, headless = true) {
  if (!ENGINES.includes(engine)) throw Error('Unknown browser engine.');
  const browser = await playwright[engine].launch({headless,
    ...(engine === 'firefox' ? {firefoxUserPrefs: prefs} : {})});
  try {
    const context = await browser.newContext({acceptDownloads: true});
    // The inspected bundle is local. Project data is never uploaded.
    await context.route(/^https?:/, route => route.abort());
    const page = await context.newPage();
    await page.goto(pathToFileURL(html).href + '#image-projects');
    await page.waitForFunction(() => !document.getElementById('ip-import').disabled);
    // Refuse an old release that predates strict source binding.
    const hasStrictVerifier = await page.evaluate(() =>
      typeof ATLAS_IMAGE_PROJECTS.decodeSource === 'function' &&
      String(ATLAS_IMAGE_PROJECTS.verify).includes('Source/pixel consistency could not be verified'));
    if (!hasStrictVerifier) throw Error('Build the strict source-binding candidate before using this helper.');
    return {browser, page, engine, version: browser.version()};
  } catch (error) { await browser.close(); throw error; }
}

async function verifyBytes(page, bytes, format) {
  if (!['json', 'zip'].includes(format)) throw Error('Choose an image-project JSON or ZIP.');
  if (bytes.length > (format === 'json' ? 64 : 96) * 1024 * 1024) throw Error('Image project exceeds the size limit.');
  return page.evaluate(async ({encoded, format}) => {
    const I = ATLAS_IMAGE_PROJECTS, H = ClarusHandoff;
    const ctx = await ATLAS_COLOUR_HANDOFF.createContext(ATLAS_CLARUS_DATA.colors, ATLAS_CLARUS_DATA.master_sha256);
    const input = I.unbase64(encoded, 96 * 1024 * 1024);
    const p = format === 'zip' ? await I.importZip(input, ctx) :
      JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(input).replace(/^\uFEFF/, ''));
    const before = JSON.stringify(p), state = await I.verify(p, ctx);
    if (JSON.stringify(p) !== before) throw Error('Verifier changed the project.');
    return {project_id: p.project_id, document_sha256: p.document_sha256,
      source_sha256: p.original.file_sha256, rgba_sha256: p.original.rgba_sha256,
      frame_sha256: await ctx.sha(state.frame), history_events: p.history.length,
      width: p.original.width, height: p.original.height,
      // Re-exports are used by regression tests to verify exact handover bytes.
      json: before, zip_base64: I.base64(H.zipStored(await I.exportFiles(p, ctx)))};
  }, {encoded: bytes.toString('base64'), format});
}

async function probe(bytes, format, html = DEFAULT_HTML, engines = ENGINES) {
  const results = [];
  for (const engine of engines) {
    let session;
    try {
      session = await launch(engine, html);
      try {
        const verified = await verifyBytes(session.page, bytes, format);
        const {json, zip_base64, ...identity} = verified;
        results.push({engine, browser_version: session.version, status: 'VERIFIED', ...identity});
      } catch (error) {
        results.push({engine, browser_version: session.version, status: 'REJECTED', reason: error.message});
      }
    } catch (error) {
      results.push({engine, status: 'UNAVAILABLE', reason: error.message});
    } finally { if (session) await session.browser.close(); }
  }
  return {schema: 'atlas-image-exchange-check/1.0', checked_utc: new Date().toISOString(),
    input_sha256: sha(bytes), input_bytes: bytes.length, format,
    bundle_sha256: sha(fs.readFileSync(html)), playwright_version: require('../tests/node_modules/playwright/package.json').version,
    platform: {os: process.platform, release: os.release(), arch: process.arch},
    firefox_user_prefs: prefs, results, physical_apple_devices: 'NOT_TESTED',
    scope: 'Local source/pixel and journal consistency only. Unsigned report; never an import credential.'};
}

async function openVerified(bytes, format, engine, html = DEFAULT_HTML, headless = false) {
  const session = await launch(engine, html, headless);
  try {
    // Fresh verification in the actual editor process; no cached probe result.
    const verified = await verifyBytes(session.page, bytes, format);
    await session.page.locator('#ip-import').setInputFiles({name: 'image-project.' + format,
      mimeType: format === 'zip' ? 'application/zip' : 'application/json', buffer: bytes});
    await session.page.waitForFunction(() => !document.getElementById('ip-import').disabled &&
      (document.getElementById('ip-status').textContent.startsWith('Image project opened') ||
       document.getElementById('ip-status').dataset.error === 'true'));
    const message = await session.page.locator('#ip-status').innerText();
    if (!message.startsWith('Image project opened')) throw Error(message);
    return {...session, verified};
  } catch (error) { await session.browser.close(); throw error; }
}

async function main(args) {
  const [filename, mode, engine, ...extra] = args;
  if (!filename || extra.length || !['--check', '--open'].includes(mode) ||
      (mode === '--open' ? !ENGINES.includes(engine) : engine !== undefined)) {
    throw Error('Usage: node browser-bundle/tools/image-project-exchange.cjs FILE --check | FILE --open chromium|firefox|webkit');
  }
  const format = path.extname(filename).slice(1).toLowerCase();
  if (!['json', 'zip'].includes(format)) throw Error('Choose an image-project JSON or ZIP.');
  const stat = fs.statSync(filename);
  if (!stat.isFile() || stat.size > (format === 'json' ? 64 : 96) * 1024 * 1024) throw Error('Invalid or oversized project file.');
  // Read once, keep these exact bytes for checks and UI import (no TOCTOU re-read).
  const bytes = fs.readFileSync(filename), before = sha(bytes);
  if (mode === '--check') {
    const report = await probe(bytes, format);
    console.log(JSON.stringify(report, null, 2));
    if (!report.results.some(r => r.status === 'VERIFIED')) process.exitCode = 2;
  } else {
    const session = await openVerified(bytes, format, engine);
    console.log(JSON.stringify({status: 'OPENED_AFTER_FRESH_VERIFICATION', engine,
      browser_version: session.version, input_sha256: before, document_sha256: session.verified.document_sha256}));
    console.log('Use the editor download buttons to save JSON/ZIP. Closing the window does not save edits.');
    // Playwright's temporary download directory is deleted on browser close.
    // Retain user-requested downloads beside the input, with non-overwriting names.
    const folder = fs.mkdtempSync(path.join(path.dirname(path.resolve(filename)), 'atlas-exchange-downloads-'));
    let sequence = 0;
    const pending = new Set();
    session.page.on('download', download => {
      const target = path.join(folder, `${++sequence}-${path.basename(download.suggestedFilename())}`);
      const task = download.saveAs(target).then(() => console.log('Saved: ' + target))
        .catch(error => { console.error('Download failed: ' + error.message); process.exitCode = 1; });
      pending.add(task); task.finally(() => pending.delete(task));
    });
    await new Promise(resolve => session.page.once('close', resolve));
    await Promise.all(pending);
    await session.browser.close();
  }
  if (sha(bytes) !== before) throw Error('Input bytes changed.');
}
module.exports = {ENGINES, DEFAULT_HTML, sha, launch, verifyBytes, probe, openVerified};
if (require.main === module) main(process.argv.slice(2)).catch(error => {console.error(error.message); process.exitCode = 1;});
