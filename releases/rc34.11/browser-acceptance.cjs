'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const [candidate,baseline,fixtures,evidence]=process.argv.slice(2).map(p=>path.resolve(p));
fs.mkdirSync(evidence,{recursive:true});
const key='atlasClarusPalettesV3',oracle=JSON.parse(fs.readFileSync(path.join(fixtures,'oracle.json')));
const strip=r=>{const x=structuredClone(r);delete x.image.colour_origin;return x};
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  const errors=[],contexts=[];
  async function fresh(root,viewport={width:1440,height:1100}) {
    const ctx=await browser.newContext({viewport,acceptDownloads:true});contexts.push(ctx);const page=await ctx.newPage();
    page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    await page.waitForFunction(()=>typeof window.ATLAS_CLARUS_EXPORTS?.quarkPackage==='function');return page;
  }
  async function sample(page,name) {
    await page.evaluate(()=>{location.hash='picker'});
    await page.locator('#picker-file').setInputFiles(path.join(fixtures,name));
    await page.waitForFunction(()=>document.querySelector('#picker-result').textContent.includes('Image ready.'));
    const canvas=page.locator('#picker-canvas');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();
    await canvas.click({position:{x:box.width*.25,y:box.height/2}});
    await page.locator('[data-picker-hover]').click();await page.locator('#selection [data-add-palette]').click();
    await page.locator('#palette-close').click();
    return page.evaluate(({key,name})=>{
      const state=JSON.parse(localStorage.getItem(key)),p=state.palettes.find(p=>p.id===state.activeId);
      return p.sourceAssignments.find(r=>r.image.name===name);
    },{key,name});
  }
  async function download(page,selector,name) {
    const event=page.waitForEvent('download');await page.locator(selector).click();const d=await event;
    assert.equal(await d.failure(),null);await d.saveAs(path.join(evidence,name));return fs.readFileSync(path.join(evidence,name));
  }
  try {
    const a=await fresh(candidate),b=await fresh(baseline),records=[];
    for(const [name,expected] of Object.entries(oracle)) {
      const original=await sample(b,name),current=await sample(a,name);assert.deepEqual(strip(current),original,name+' unchanged RGB/reference/sampling');
      assert.equal(current.image.colour_origin.file_sha256,expected.file_sha256);
      assert.equal(current.image.colour_origin.icc.sha256,expected.icc_sha256);
      assert.match(await a.locator('#selection .colour-origin').innerText(),/Colour origin/);
      records.push(current);
    }
    await a.locator('#palette-toggle').click();
    const exported=await download(a,'[data-palette-export="clarus"]','origin.clarus.json'),doc=JSON.parse(exported);
    assert.equal(doc.source_assignments.length,8);
    const zip=await download(a,'[data-palette-export="quark-package"]','origin.quarkxpress.zip');
    const imported=await fresh(candidate);
    await imported.locator('#palette-import-file').setInputFiles({name:'origin.json',mimeType:'application/json',buffer:exported});
    await imported.waitForFunction(()=>document.querySelector('#export-status').textContent.includes('8 source records'));
    await imported.locator('#palette-toggle').click();
    assert.deepEqual(await download(imported,'[data-palette-export="clarus"]','origin.reimported.json'),exported);
    assert.deepEqual(await download(imported,'[data-palette-export="quark-package"]','origin.reimported.zip'),zip);
    await imported.reload();await imported.locator('#palette-toggle').click();
    assert.deepEqual(await download(imported,'[data-palette-export="clarus"]','origin.reloaded.json'),exported);
    const saved=await imported.evaluate(k=>localStorage.getItem(k),key),bad=structuredClone(doc);
    bad.source_assignments[0].image.colour_origin.processing.source_profile_assumption='sRGB';
    await imported.locator('#palette-import-file').setInputFiles({name:'tampered.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
    await imported.waitForFunction(()=>document.querySelector('#export-status').textContent.includes('Import blocked'));
    assert.equal(await imported.evaluate(k=>localStorage.getItem(k),key),saved);
    const legacy=structuredClone(doc);for(const r of legacy.source_assignments)delete r.image.colour_origin;
    await imported.locator('#palette-import-file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
    await imported.waitForFunction(()=>document.querySelector('#export-status').textContent.includes('8 source records'));
    assert.match(await imported.locator('#drawer-palette-list').textContent(),/Not inspected — older or unsupported source record/);
    // Read the source panel at desktop and phone widths; ensure it does not overflow.
    await a.locator('#palette-close').click();await a.evaluate(()=>{location.hash='picker'});
    await a.locator('#picker-file').setInputFiles(path.join(fixtures,'profiled.png'));
    await a.waitForFunction(()=>document.querySelector('#picker-result').textContent.includes('Embedded ICC:'));
    assert.equal(await a.locator('#picker-result .colour-origin').first().evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
    await a.locator('#picker-result .colour-origin').first().screenshot({path:path.join(evidence,'colour-origin-desktop.png'),animations:'disabled'});
    await a.setViewportSize({width:390,height:844});
    await a.locator('#picker-result .colour-origin').first().screenshot({path:path.join(evidence,'colour-origin-mobile.png'),animations:'disabled'});
    assert.equal(await a.locator('#picker-result .colour-origin').first().evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
    // Overlapping image loads must not attach the earlier file's profile to the later image.
    await a.locator('#picker-file').setInputFiles(path.join(fixtures,'profiled.png'));
    await a.locator('#picker-file').setInputFiles(path.join(fixtures,'untagged.png'));
    await a.waitForFunction(()=>document.querySelector('#picker-result').textContent.includes('No embedded ICC found'));
    assert.match(await a.locator('#picker-result').innerText(),/untagged.png/);
    assert.deepEqual(errors,[]);
    const result={status:'PASS',browser:browser.version(),source_images:8,baseline_rgb_reference_equivalence:true,
      palette_json_roundtrip:true,source_zip_byte_identical_roundtrip:true,reload:true,tamper_rejected:true,
      legacy_not_inspected:true,mobile_panel_no_overflow:true,overlapping_loads:true,page_errors:errors};
    fs.writeFileSync(path.join(evidence,'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
