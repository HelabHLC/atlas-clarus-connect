// Real browser file:// interactions. No native Adobe application is exercised.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../..');
const out=path.resolve(process.env.HANDOFF_TEST_OUTPUT||'/tmp/atlas-colour-handoff-browser');fs.mkdirSync(out,{recursive:true});
const target=path.resolve(process.env.HANDOFF_HTML||path.join(root,'browser-bundle/build-handoff/atlas-clarus-browser-bundle/index.html'));
const entrypoint=process.env.HANDOFF_TEST_URL||pathToFileURL(target).href;
const classic=JSON.parse(require('./fixtures/colour-kit-030-two-greens.json').bundle_origin.document_text);
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
    const page=await context.newPage(),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
    await page.goto(entrypoint+'#colour-handoff');
    await page.waitForFunction(()=>!document.getElementById('ch-create').disabled);
    // A real classic Bundle palette import; keep normal source workspace separate.
    await page.locator('#palette-toggle').click();
    await page.locator('#palette-import-file').setInputFiles({name:'two-greens.clarus.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(classic))});
    await page.waitForFunction(()=>document.getElementById('export-status').textContent.startsWith('Imported'));
    await page.locator('[data-colour-handoff]').click();
    await page.locator('#ch-create').click();
    await page.waitForFunction(()=>document.getElementById('ch-status').textContent.startsWith('Colour decisions ready'));
    async function save(button,name){const [dl]=await Promise.all([page.waitForEvent('download'),page.locator(button).click()]);const dest=path.join(out,name);await dl.saveAs(dest);return dest;}
    const first=JSON.parse(fs.readFileSync(await save('#ch-save','first.json')));
    assert.equal(first.records.length,2);assert.equal(new Set(first.records.map(r=>r.decision_id)).size,2);
    assert.deepEqual(first.records.map(r=>r.atlas_row_id),[4966,4966]);
    await page.locator('#ch-create').click();await page.waitForFunction(()=>document.getElementById('ch-status').textContent.startsWith('Colour decisions ready'));
    const reopened=JSON.parse(fs.readFileSync(await save('#ch-save','reopened.json')));assert.deepEqual(reopened,first);
    await page.reload();await page.waitForFunction(()=>!document.getElementById('ch-save').disabled);
    const reloaded=JSON.parse(fs.readFileSync(await save('#ch-save','reloaded.json')));assert.deepEqual(reloaded,first);
    const zip=await save('#ch-export','handoff.zip');
    execFileSync('python3',['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])',zip,path.join(out,'handoff')]);
    const original=fs.readFileSync(path.join(out,'handoff/palette.ase')),changed=Buffer.from(original);
    const nameUnits=changed.readUInt16BE(18),rgbOffset=20+nameUnits*2+4;
    [17,34,51].forEach((v,i)=>changed.writeFloatBE(v/255,rgbOffset+i*4));
    const returned=path.join(out,'returned.ase');fs.writeFileSync(returned,changed);
    await page.locator('#ch-return-files').setInputFiles([returned,path.join(out,'handoff/palette.clarus.json'),path.join(out,'handoff/handoff.json')]);
    assert.equal(await page.locator('#ch-return').isDisabled(),true);
    await page.locator('#ch-srgb').check();await page.locator('#ch-return').click();
    await page.waitForFunction(()=>document.getElementById('ch-status').textContent.includes('decisions linked'));
    const returnPath=await save('#ch-save','returned.json'),data=JSON.parse(fs.readFileSync(returnPath));
    assert.deepEqual(data.records.map(r=>r.decision_id),first.records.map(r=>r.decision_id));
    assert.equal(data.decisions.nodes.length,4);assert.equal(data.records[0].original.hex,'#112233');
    assert.equal(data.bundle_origin.document_text,first.bundle_origin.document_text);
    // Bad import preserves the working set, clears old success and displays failure.
    const bad=structuredClone(data);bad.records[0].source_rgb[0]++;
    await page.locator('#ch-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
    await page.waitForFunction(()=>document.getElementById('ch-status').dataset.error==='true');
    const afterBad=JSON.parse(fs.readFileSync(await save('#ch-save','after-bad.json')));assert.deepEqual(afterBad,data);
    // Drag/drop imports exactly the preserved decision document.
    await page.evaluate(async text=>{
      const transfer=new DataTransfer();transfer.items.add(new File([text],'decision.json',{type:'application/json'}));
      document.getElementById('ch-drop').dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:transfer}));
    },JSON.stringify(data));
    await page.waitForFunction(()=>document.getElementById('ch-status').textContent.startsWith('Decision JSON verified'));
    const dropped=JSON.parse(fs.readFileSync(await save('#ch-save','dropped.json')));assert.deepEqual(dropped,data);
    // Quota failure must remain visible while a verified full export stays available.
    await page.evaluate(()=>Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError');});
    await page.locator('#ch-import').setInputFiles(returnPath);
    await page.waitForFunction(()=>!document.getElementById('ch-storage-warning').hidden);
    assert.equal(await page.locator('#ch-save').isEnabled(),true);
    await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
    for(const size of [{width:390,height:844},{width:844,height:390}]){
      await page.setViewportSize(size);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow');
      assert.equal(await page.locator('#ch-save').isVisible(),true);
      await page.screenshot({path:path.join(out,`viewport-${size.width}.png`),fullPage:true});
    }
    // Open the actual, separately delivered Colour Kit, when supplied by the caller.
    let kitRoundtrip='NOT_RUN';
    if(process.env.COLOUR_KIT_HTML){
      const kit=await context.newPage();await kit.goto(pathToFileURL(path.resolve(process.env.COLOUR_KIT_HTML)).href);
      await kit.waitForFunction(()=>!document.getElementById('import').disabled&&!document.getElementById('download-json').disabled);
      await kit.locator('#import').setInputFiles(returnPath);
      await kit.waitForFunction(()=>document.getElementById('status').textContent.includes('imported values and assignments verified'));
      const [dl]=await Promise.all([kit.waitForEvent('download'),kit.locator('#download-json').click()]);
      const kitPath=path.join(out,'kit-resaved.json');await dl.saveAs(kitPath);
      const kitData=JSON.parse(fs.readFileSync(kitPath));assert.deepEqual(kitData.decisions,data.decisions);assert.deepEqual(kitData.records,data.records);
      await page.locator('#ch-import').setInputFiles(kitPath);
      await page.waitForFunction(()=>document.getElementById('ch-status').textContent.startsWith('Decision JSON verified'));
      const back=JSON.parse(fs.readFileSync(await save('#ch-save','kit-back-in-bundle.json')));assert.deepEqual(back,kitData);kitRoundtrip='PASS';
    }
    assert.deepEqual(errors,[]);
    // The public WordPress page may request its own icon; no colour-data request
    // or third-party service should be needed for a self-contained handoff.
    if(process.env.HANDOFF_TEST_URL){
      const origin=new URL(entrypoint).origin;
      assert.equal(requests.every(url=>new URL(url).origin===origin),true,'unexpected third-party request');
    }else assert.deepEqual(requests,[]);
    const report={status:'PASS',entrypoint:process.env.HANDOFF_TEST_URL||'file:// self-contained candidate',create_save_reload:true,repeat_selection_preserves_ids:true,ase_return_same_decisions:true,invalid_import_preserves_current:true,drag_drop:true,storage_failure_visible:true,viewports:[1440,390,844],network_requests:requests.length,page_errors:errors,native_adobe_validation:'NOT_TESTED',colour_kit_030_browser_roundtrip:kitRoundtrip};
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
