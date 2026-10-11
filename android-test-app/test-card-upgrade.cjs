'use strict';
// Actual beta.6 -> beta.7 documents, one persisted Chromium profile and the
// unchanged Android HTTPS origin. Native Save Document is a captured boundary,
// not an emulated device acceptance or evidence of a Play update.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict'), {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || path.join(root, 'browser-bundle/tests/node_modules/playwright'));
const oldAssets = path.resolve(process.env.BETA6_ASSETS || '.beta6-baseline/android-test-app/app/src/main/assets/bundle');
const newAssets = path.join(__dirname, 'app/src/main/assets/bundle');
const out = process.env.ANDROID_UPGRADE_OUTPUT || '/tmp/atlas-android-upgrade';
const fixturePath = path.join(root, 'browser-bundle/tests/fixtures/colour-kit-030-two-greens.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath));
const origin = 'https://appassets.androidplatform.net';
const keys = ['atlasClarusPalettesV3', 'atlasClarusColourHandoffV1', 'atlasClarusColourProjectsV1'];
fs.mkdirSync(out, {recursive:true});
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-upgrade-profile-'));

(async () => {
  assert.equal(JSON.parse(fs.readFileSync(path.join(oldAssets, 'ANDROID_CANDIDATE.json'))).version_name, '0.4.0-beta.6');
  assert.equal(JSON.parse(fs.readFileSync(path.join(newAssets, 'ANDROID_CANDIDATE.json'))).version_name, '0.4.0-beta.7');
  let context, page, activeAssets = oldAssets;
  const errors = [], unexpected = [];
  async function open() {
    context = await chromium.launchPersistentContext(profile, {
      headless:true, viewport:{width:1440,height:1100}, args:['--no-sandbox'],
      ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})
    });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) { unexpected.push(url.href); return route.abort(); }
      const name = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
      const file = path.resolve(activeAssets, name);
      assert.ok(file.startsWith(activeAssets + path.sep));
      if (!fs.existsSync(file)) return route.fulfill({status:404, body:''});
      await route.fulfill({path:file});
    });
    await context.addInitScript(() => {
      window.androidSaved = []; window.androidErrors = [];
      window.AndroidExport = {
        save(filename, mime, base64) { window.androidSaved.push({filename,mime,base64}); },
        error(message) { window.androidErrors.push(message); }
      };
    });
    page = context.pages()[0];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/index.html#colour-projects');
    await page.waitForFunction(() => !document.getElementById('cp-new').disabled && !document.getElementById('ch-import').disabled);
  }
  const upload = (selector, data) => page.locator(selector).setInputFiles({
    name:'saved.clarus.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(data))
  });
  const storage = () => page.evaluate(names => Object.fromEntries(names.map(k => [k,localStorage.getItem(k)])), keys);
  async function done(id, prefix) {
    await page.waitForFunction(({id,prefix}) => {
      const e = document.getElementById(id);
      return e.textContent.startsWith(prefix) || e.dataset.error === 'true';
    }, {id,prefix});
    assert.ok((await page.locator('#'+id).innerText()).startsWith(prefix), await page.locator('#'+id).innerText());
  }
  async function save(selector, name) {
    const count = await page.evaluate(() => window.androidSaved.length);
    await page.locator(selector).click();
    await page.waitForFunction(n => window.androidSaved.length > n, count);
    const result = await page.evaluate(n => window.androidSaved[n], count);
    const file = path.join(out,name);
    fs.writeFileSync(file,Buffer.from(result.base64,'base64'));
    assert.deepEqual(await page.evaluate(() => window.androidErrors), []);
    return file;
  }
  try {
    await open();
    // Seed through beta.6's UI, including both original sources on a shared row.
    await upload('#palette-import-file', JSON.parse(fixture.bundle_origin.document_text));
    await page.waitForFunction(() => document.getElementById('export-status').textContent.startsWith('Imported'));
    await page.locator('#palette-toggle').click();
    await page.locator('#palette-duplicate').click();
    await page.locator('#palette-name').fill('Second retained palette');
    await page.locator('#palette-rename').click();
    await page.locator('#palette-close').click();
    await upload('#ch-import',fixture); await done('ch-status','Decision JSON verified');
    await page.locator('#cp-new-name').fill('Retained colour project');
    await page.locator('#cp-new').click(); await done('cp-status','Project created');
    await page.locator('#cp-set-name').fill('Two independent greens');
    await upload('#cp-add-json',fixture); await done('cp-status','Colour set added');
    const card = page.locator('.cp-card').first();
    await card.locator('[data-version]').selectOption(fixture.records[0].revision_id);
    await card.locator('[data-choice-note]').fill('Keep the first original as the chosen colour.');
    await card.locator('[data-choose]').click(); await done('cp-status','Design choice recorded');
    await card.locator('.cp-edit summary').click();
    await card.locator('[data-hex]').fill('#112233');
    await card.locator('[data-edit-note]').fill('Retain an independent working revision.');
    await card.locator('[data-edit]').click(); await done('cp-status','Colour revision saved');
    const projectBefore = JSON.parse(fs.readFileSync(await save('#cp-save','beta6-project.json')));
    await page.locator('#cp-new-name').fill('Second retained project');
    await page.locator('#cp-new').click(); await done('cp-status','Project created');
    await page.locator('#cp-project-list').selectOption(projectBefore.project_id);
    await page.waitForFunction(() => !document.getElementById('cp-save').disabled);

    // Image Projects intentionally has no autosave: preserve an actual exported
    // project with original bytes, a linked palette and an editing event.
    await page.locator('#primary-nav a[href="#image-projects"]').click();
    await page.waitForFunction(() => !document.getElementById('ip-image').disabled);
    await page.locator('#ip-name').fill('Saved image project');
    await page.locator('#ip-attach').check();
    await page.locator('#ip-image').setInputFiles(path.join(root,'browser-bundle/tests/fixtures/image-project-start.png'));
    await done('ip-status','Original image retained');
    await page.locator('#ip-match').fill('#3D7B19');
    await page.locator('#ip-replacement').fill('#112233');
    await page.locator('#ip-note').fill('Before the Android update');
    await page.locator('#ip-recolour').click(); await done('ip-status','Image change recorded');
    const imageBefore = JSON.parse(fs.readFileSync(await save('#ip-json','beta6-image.json')));
    assert.equal(imageBefore.history.length,1);
    const imageZip = await save('#ip-zip','beta6-image.zip');
    const before = await storage();
    keys.forEach(key => assert.ok(before[key],key));
    const palettes = JSON.parse(before[keys[0]]);
    assert.equal(palettes.palettes.filter(p => p.sourceAssignments.length === 2).length,2);
    assert.ok(projectBefore.revisions.length > 2);
    assert.equal(JSON.parse(before[keys[2]]).projects.length,2);
    await context.close(); context = null;

    // Swap the app document, not the profile. No seeding of the new version.
    activeAssets = newAssets; await open();
    assert.deepEqual(await storage(),before,'update changed stored work');
    assert.equal(await page.locator('#cp-project-list').inputValue(),projectBefore.project_id);
    assert.deepEqual(JSON.parse(fs.readFileSync(await save('#cp-save','beta7-project.json'))),projectBefore);
    assert.ok((await page.locator('.cp-chosen').first().innerText()).includes('differs from working colour'));
    await page.locator('#palette-toggle').click();
    assert.equal(await page.locator('#palette-select').inputValue(),palettes.activeId);
    const paletteFile = await save('[data-palette-export="clarus"]','beta7-palette.json');
    assert.deepEqual(JSON.parse(fs.readFileSync(paletteFile)).source_assignments,JSON.parse(fixture.bundle_origin.document_text).source_assignments);
    await page.locator('#palette-close').click();
    await page.locator('#primary-nav a[href="#image-projects"]').click();
    for (const file of [path.join(out,'beta6-image.json'),imageZip]) {
      await page.locator('#ip-import').setInputFiles(file); await done('ip-status','Image project opened');
      assert.deepEqual(JSON.parse(fs.readFileSync(await save('#ip-json','beta7-image.json'))),imageBefore);
    }
    await page.locator('#primary-nav a[href="#colour-handoff"]').click();
    await page.waitForFunction(() => !document.getElementById('ch-reference-card').disabled);
    const zip = await save('#ch-reference-card','android-reference-card.zip');
    const dir = path.join(out,'card');
    execFileSync('python3',['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])',zip,dir]);
    const files = Object.fromEntries(fs.readdirSync(dir).map(n => [n,fs.readFileSync(path.join(dir,n)).toString('base64')]));
    const verified = await page.evaluate(async files => {
      const data = window.ATLAS_CLARUS_DATA;
      const ctx = await window.ATLAS_COLOUR_HANDOFF.createContext(data.colors,data.master_sha256);
      const decoded = Object.fromEntries(Object.entries(files).map(([n,b]) => [n,Uint8Array.from(atob(b),c=>c.charCodeAt(0))]));
      return window.ATLAS_CLARUS_REFERENCE_CARD.colourHandoff.verifyFiles(decoded,ctx,data.colors);
    },files);
    assert.deepEqual(verified,fixture);
    const projection = JSON.parse(fs.readFileSync(path.join(dir,'reference-card.json')));
    assert.deepEqual(projection.cards.map(c=>c.original_source.hex),['#3D7B19','#3C7B19']);
    assert.deepEqual(projection.cards.map(c=>c.current_colour.reference.atlas_row_id),[4966,4966]);
    assert.deepEqual(projection.cards.map(c=>c.decision_id),fixture.records.map(r=>r.decision_id));
    assert.deepEqual(projection.cards.map(c=>c.revision_id),fixture.records.map(r=>r.revision_id));
    assert.equal(new Set(projection.cards.map(c=>c.decision_id)).size,2);
    assert.deepEqual(await storage(),before,'export changed stored work');
    assert.deepEqual(errors,[]); assert.deepEqual(unexpected,[]);
    const report = {status:'PASS',baseline:'0.4.0-beta.6',candidate:'0.4.0-beta.7',
      persistent_profile_restart:true,origin,storage_keys:keys,stored_values_unchanged:true,
      project_revisions_and_chosen_colour_preserved:true,image_project_json_and_zip_reopen:true,
      android_adapter_card_zip_and_checksums:true,two_distinct_sources_and_decisions:true,
      physical_android_update:'NOT_TESTED',native_document_picker:'NOT_TESTED',play_submission:'NOT_PERFORMED'};
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  } finally {
    if (context) await context.close();
    fs.rmSync(profile,{recursive:true,force:true});
  }
})().catch(error => { console.error(error); process.exitCode=1; });
