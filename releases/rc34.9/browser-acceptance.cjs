const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(process.argv[2]||'release349/atlas-clarus-browser-bundle');
const out=path.resolve(process.argv[3]||'release349/evidence');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu']});
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  try{
    await page.goto('file://'+root+'/index.html');
    await page.waitForFunction(()=>window.ATLAS_CLARUS_EXPORTS?.quarkXtg);
    await page.locator('#palette-toggle').click();let count=0;page.on('download',()=>count++);
    await page.locator('[data-palette-export="quarkxpress"]').click();
    assert.match(await page.locator('#export-status').textContent(),/Add at least one/);assert.equal(count,0);
    const palette=await page.evaluate(()=>{const D=window.ATLAS_CLARUS_DATA;return window.ATLAS_CLARUS_EXPORTS.clarus(
      ['H075_L060_C045','H335_L050_C055','H125_L075_C080'].map(ref=>D.colors.find(c=>c.ref===ref)),D.master_sha256,'Quark Test');});
    await page.locator('#palette-import-file').setInputFiles({name:'test.clarus.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(palette))});
    await page.waitForFunction(()=>document.querySelector('#export-status').textContent.includes('Imported'));
    const grab=async(selector,name)=>{const pending=page.waitForEvent('download');await page.locator(selector).click();const d=await pending;assert.equal(await d.failure(),null);const p=path.join(out,name);await d.saveAs(p);return p;};
    const xtg=await grab('[data-palette-export="quarkxpress"]','palette.xtg');
    await page.evaluate(({source,palette})=>window.ATLAS_CLARUS_EXPORTS.verifyQuarkXtg(source,palette.references.map(c=>({ref:c.reference,rgb:c.master_rgb})),palette.master_sha256,palette.palette_name),{source:fs.readFileSync(xtg,'utf8'),palette});
    await page.locator('#palette-drawer').screenshot({path:path.join(out,'quark-palette-export.png')});
    await page.locator('#palette-close').click();await page.evaluate(()=>{location.hash='colour-reduction';});
    const source=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=16;const cx=c.getContext('2d');for(const [i,rgb] of [[1,2,3],[240,240,240],[118,205,39],[200,40,70]].entries()){cx.fillStyle='rgb('+rgb.join(',')+')';cx.fillRect((i%2)*8,Math.floor(i/2)*8,8,8);}return c.toDataURL('image/png').split(',')[1];});
    await page.locator('#cr-protection-mode').selectOption('ORIGINAL_RGBA');
    await page.locator('#cr-file').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(source,'base64')});
    await page.waitForFunction(()=>!document.querySelector('#cr-run').disabled);
    await page.locator('#cr-k').fill('4');await page.locator('#cr-lock-hex').fill('#010203');await page.locator('#cr-original-add').click();
    await page.locator('#cr-run').click();await page.waitForFunction(()=>!document.querySelector('#cr-palette').disabled,{},{timeout:30000});
    await page.locator('#cr-format').selectOption('xtg');const mixed=await grab('#cr-palette','mixed.xtg');
    const job=await grab('#cr-zip','job.zip');
    const report=await page.evaluate(({bytes,xtg})=>{const w=window,files=w.ATLAS_REDUCTION_JOB.unzip(new Uint8Array(bytes));const report=JSON.parse(new TextDecoder().decode(files['reduction.json']));const palette=report.palette.map(c=>({ref:c.reference,rgb:c.rgb}));w.ATLAS_CLARUS_EXPORTS.verifyQuarkXtg(xtg,palette,w.ATLAS_CLARUS_DATA.master_sha256,'ATLAS Clarus mixed output');if(new TextDecoder().decode(files['palette.xtg'])!==xtg)throw Error('ZIP XTG mismatch');return report;},{bytes:[...fs.readFileSync(job)],xtg:fs.readFileSync(mixed,'utf8')});
    assert.ok(report.palette.some(c=>c.kind==='ORIGINAL_RGB'));
    await page.locator('#cr-job-import').setInputFiles(job);await page.waitForFunction(()=>document.querySelector('#cr-status').textContent.includes('Complete reduction job restored'),{},{timeout:30000});
    const restored=await grab('#cr-palette','restored.xtg');assert.equal(fs.readFileSync(restored,'utf8'),fs.readFileSync(mixed,'utf8'));
    await page.locator('#cr-protection-mode').selectOption('LIBRARY_REFERENCE');await page.locator('#cr-run').click();
    await page.waitForFunction(()=>!document.querySelector('#cr-palette').disabled,{},{timeout:30000});
    const ref=await grab('#cr-palette','reference.xtg');
    const values=await page.evaluate(source=>window.ATLAS_CLARUS_EXPORTS.readQuarkXtg(source),fs.readFileSync(ref,'utf8'));
    assert.ok(values.length>0&&values.every(c=>/^H\d{3}_L\d{3}_C\d{3}$/.test(c.ref)));
    await page.goto('file://'+root+'/docs/QUARKXPRESS.html');
    assert.match(await page.locator('body').innerText(),/Öffentliche Beta/);
    await page.screenshot({path:path.join(out,'quark-import-guide.png'),fullPage:true});assert.deepEqual(errors,[]);
    const result={browser:'Chromium',empty_palette:'PASS',xtg_download:'PASS',mixed_reduction:'PASS',reference_only_reduction:'PASS',zip_xtg:'PASS',job_reimport:'PASS',guide:'PASS',page_errors:errors,native_quarkxpress_import:'NOT_TESTED'};
    fs.writeFileSync(path.join(out,'quark-browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
  }catch(e){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
