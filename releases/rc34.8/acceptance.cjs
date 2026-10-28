const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(process.env.CORELDRAW_BUNDLE_DIR || 'release348/atlas-clarus-browser-bundle');
const output = path.resolve(process.env.CORELDRAW_EVIDENCE_DIR || 'release348/evidence');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}), args: ['--no-sandbox', '--disable-gpu'], headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('file://' + root + '/index.html');
    await page.waitForFunction(() => window.ATLAS_CLARUS_EXPORTS && window.ATLAS_CLARUS_DATA);
    const unit = await page.evaluate(() => {
      const E = window.ATLAS_CLARUS_EXPORTS, D = window.ATLAS_CLARUS_DATA;
      const need = (x, message) => { if (!x) throw Error(message); };
      const before = JSON.stringify(D);
      const xml = E.corelXml(D.colors, D.master_sha256, 'Complete Atlas');
      E.verifyCorelXml(xml, D.colors, 'Complete Atlas');
      const variants = Array.from({length:256}, (_, v) => ({ref:'RGB '+v, rgb:[v,255-v,(v*113)%256]}));
      E.verifyCorelXml(E.corelXml(variants,D.master_sha256),variants);
      const name = 'Clarus & "Corel" <XML> – ä ß 🎨\t\n\r';
      const special = [{ref:name,rgb:[0,128,255]},{ref:'ORIGINAL_RGB #010203',rgb:[1,2,3]}];
      const specialXml = E.corelXml(special,D.master_sha256,name);
      E.verifyCorelXml(specialXml,special,name);
      need(E.corelXml(special,D.master_sha256,name)!==specialXml,'Distinct exports need distinct GUIDs');
      let rejected = 0;
      const bad = [[],[{ref:'Bad',rgb:[-1,0,0]}],[{ref:'Bad',rgb:[256,0,0]}],[{ref:'Bad',rgb:[1.2,0,0]}],[{ref:'Bad',rgb:['1',0,0]}],[{ref:'Bad',rgb:[NaN,0,0]}],[{ref:'Bad',rgb:[0,0]}],[{ref:'bad\u0000',rgb:[0,0,0]}],[{ref:'bad\uD800',rgb:[0,0,0]}],[{ref:null,rgb:[0,0,0]}]];
      for (const p of bad) {try {E.corelXml(p,D.master_sha256);} catch {rejected++;}}
      need(rejected===bad.length,'Invalid palettes must be rejected');
      let tampering = 0;
      for (const altered of [specialXml.replace('cs="sRGB"','cs="CMYK"'),specialXml.replace('tints="0,','tints="0.1,'),specialXml.replace('</palette>',''),specialXml.replace('<colors>','<wrong>')]) {
        try {E.verifyCorelXml(altered,special,name);} catch {tampering++;}
      }
      need(tampering===4,'Corrupted XML must fail readback');
      need(JSON.stringify(D)===before,'Export changed immutable master data');
      return {master_rows:D.colors.length,channel_values_tested:256,invalid_cases_rejected:rejected,tampered_cases_rejected:tampering,special_names:'PASS',master_unchanged:true};
    });
    console.log('UNIT',JSON.stringify(unit));
    await page.locator('#palette-toggle').click();
    let downloadCount = 0;
    page.on('download', () => downloadCount++);
    await page.locator('[data-palette-export="coreldraw"]').click();
    assert.match(await page.locator('#export-status').textContent(), /Add at least one colour/);
    assert.equal(downloadCount,0);
    const palette = await page.evaluate(() => {
      const d=window.ATLAS_CLARUS_DATA;
      return window.ATLAS_CLARUS_EXPORTS.clarus([d.colors[4665],d.colors[0],d.colors[13282],d.colors[300]],d.master_sha256,'Clarus & Corel – Windows');
    });
    await page.locator('#palette-import-file').setInputFiles({name:'test.clarus.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(palette))});
    await page.waitForFunction(() => document.querySelector('#export-status').textContent.includes('Imported'));
    const grab = async (selector, name) => {
      const pending = page.waitForEvent('download');
      await page.locator(selector).click();
      const download = await pending;
      assert.equal(await download.failure(), null);
      const destination=path.join(output,name);
      await download.saveAs(destination);
      return {file:destination,suggested:download.suggestedFilename()};
    };
    const ui=await grab('[data-palette-export="coreldraw"]','palette.xml');
    assert.equal(ui.suggested,'Clarus_Corel_Windows.xml');
    await page.evaluate(({xml,palette}) => {
      const E=window.ATLAS_CLARUS_EXPORTS;
      E.verifyCorelXml(xml,palette.references.map(c=>({ref:c.reference,rgb:c.master_rgb})),palette.palette_name);
    },{xml:fs.readFileSync(ui.file,'utf8'),palette});
    assert.match(await page.locator('#export-status').textContent(), /4 exact sRGB swatches/);
    await page.locator('#palette-drawer').screenshot({path:path.join(output,'palette-export.png')});
    // Existing export still works after adding the new format.
    const ase=await grab('[data-palette-export="ase"]','palette.ase');
    const aseValues=await page.evaluate(bytes=>window.ATLAS_CLARUS_EXPORTS.readAse(new Uint8Array(bytes)),[...fs.readFileSync(ase.file)]);
    assert.deepEqual(aseValues,palette.references.map(c=>({ref:c.reference,rgb:c.master_rgb})));
    console.log('PALETTE_UI PASS; EMPTY_PALETTE PASS; EXISTING_ASE PASS');
    await page.locator('#palette-close').click();
    await page.evaluate(() => {location.hash='colour-reduction';});
    const source=await page.evaluate(() => {
      const c=document.createElement('canvas');c.width=16;c.height=16;const ctx=c.getContext('2d');
      for(const [i,rgb] of [[1,2,3],[240,240,240],[118,205,39],[200,40,70]].entries()){ctx.fillStyle='rgb('+rgb.join(',')+')';ctx.fillRect((i%2)*8,Math.floor(i/2)*8,8,8);}
      return c.toDataURL('image/png').split(',')[1];
    });
    await page.locator('#cr-protection-mode').selectOption('ORIGINAL_RGBA');
    await page.locator('#cr-file').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(source,'base64')});
    await page.waitForFunction(()=>!document.querySelector('#cr-run').disabled);
    await page.locator('#cr-k').fill('4');
    await page.locator('#cr-lock-hex').fill('#010203');
    await page.locator('#cr-original-add').click();
    assert.match(await page.locator('#cr-status').textContent(), /Exact original #010203 protected/);
    await page.locator('#cr-run').click();
    await page.waitForFunction(()=>!document.querySelector('#cr-palette').disabled,{},{timeout:30000});
    await page.locator('#cr-format').selectOption('xml');
    await grab('#cr-palette','reduction-palette.xml');
    const reduced = await grab('#cr-zip','reduction-job.zip');
    const report=await page.evaluate(async bytes=>{
      const files=window.ATLAS_REDUCTION_JOB.unzip(new Uint8Array(bytes));
      const r=JSON.parse(new TextDecoder().decode(files['reduction.json']));
      const p=r.palette.map(c=>({ref:c.reference,rgb:c.rgb}));
      const xml=new TextDecoder().decode(files['palette.xml']);
      window.ATLAS_CLARUS_EXPORTS.verifyCorelXml(xml,p,'ATLAS Clarus mixed output');
      return {palette:p,original_count:r.palette.filter(c=>c.kind==='ORIGINAL_RGB').length,xml_in_job:!!files['palette.xml']};
    },[...fs.readFileSync(reduced.file)]);
    assert.ok(report.original_count>0,'Must exercise original RGB protection');
    await page.evaluate(({xml,report})=>window.ATLAS_CLARUS_EXPORTS.verifyCorelXml(xml,report.palette,'ATLAS Clarus mixed output'),{xml:fs.readFileSync(path.join(output,'reduction-palette.xml'),'utf8'),report});
    await page.locator('#cr-job-import').setInputFiles(reduced.file);
    await page.waitForFunction(()=>document.querySelector('#cr-status').textContent.includes('Complete reduction job restored'),{},{timeout:30000});
    await grab('#cr-palette','restored-palette.xml');
    await page.evaluate(({xml,report})=>window.ATLAS_CLARUS_EXPORTS.verifyCorelXml(xml,report.palette,'ATLAS Clarus mixed output'),{xml:fs.readFileSync(path.join(output,'restored-palette.xml'),'utf8'),report});
    console.log('MIXED_REDUCTION',JSON.stringify(report));
    // Exercise the reference-only branch as well.
    await page.locator('#cr-protection-mode').selectOption('LIBRARY_REFERENCE');
    await page.locator('#cr-run').click();
    await page.waitForFunction(()=>!document.querySelector('#cr-palette').disabled,{},{timeout:30000});
    await grab('#cr-palette','reference-reduction.xml');
    assert.match(fs.readFileSync(path.join(output,'reference-reduction.xml'),'utf8'),/name="ATLAS Clarus reduced motif"/);
    console.log('REFERENCE_REDUCTION PASS; JOB_REIMPORT PASS');
    assert.deepEqual(errors,[]);
    const result={unit,palette_ui:'PASS',empty_palette:'PASS',existing_ase:'PASS',mixed_reduction:'PASS',reference_reduction:'PASS',reduction_job_reimport:'PASS',page_errors:errors,native_coreldraw_import:'NOT_TESTED'};
    fs.writeFileSync(path.join(output,'test-results.json'),JSON.stringify(result,null,2)+'\n');
  } catch(error) {
    await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
    console.error('PAGE_ERRORS',errors);
    console.error('CR_STATUS',await page.locator('#cr-status').textContent().catch(()=>''));
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
