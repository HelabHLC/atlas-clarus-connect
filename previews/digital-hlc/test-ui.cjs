const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const runtime=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),standalone=path.resolve(process.argv[4]);fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.ATLAS_TEST_CHROMIUM,args:['--force-color-profile=srgb']});
  try{
    const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[],network=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
    await page.goto('file://'+standalone);await page.locator('#address').filter({hasText:'H295_L040_C100'}).waitFor();
    assert.match(await page.locator('#identity-kind').innerText(),/Digitale Farbe/);assert.match(await page.locator('#comparison-ref').innerText(),/H290_L040_C075/);
    assert.equal(await page.locator('#source-swatch').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(55, 73, 248)');
    assert.equal(await page.locator('#master-swatch').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(61, 83, 211)');
    assert.match(await page.locator('#library-counts').innerText(),/12\.009/);
    await page.locator('#colour-name').fill('Mein Blau');await page.locator('#add').click();
    await page.screenshot({path:path.join(out,'digital-desktop.png'),fullPage:true});
    const boxes={source:await page.locator('#source-swatch').boundingBox(),reference:await page.locator('#master-swatch').boundingBox()};fs.writeFileSync(path.join(out,'swatch-boxes.json'),JSON.stringify(boxes));
    await page.locator('#input-kind').selectOption('RGB');assert.equal(await page.locator('#result').isVisible(),false);
    await page.locator('#rgb-space').selectOption('display-p3');await page.locator('#rgb-scale').selectOption('1');
    for(const [id,value] of [['red','1'],['green','0'],['blue','0']])await page.locator('#'+id).fill(value);
    await page.locator('#colour-name').fill('<script>window.bad=1</script>');await page.locator('#calculate').click();
    assert.match(await page.locator('#rgb-values tr').first().innerText(),/Außerhalb/);assert.match(await page.locator('#preview-status').innerText(),/begrenzte/);
    await page.locator('#add').click();assert.equal(await page.evaluate(()=>window.bad),undefined);
    const save=async(selector,name)=>{const event=page.waitForEvent('download');await page.locator(selector).click();const p=path.join(out,name);await(await event).saveAs(p);return p;};
    const de=await save('#save','palette-de.digital-colours.json'),css=await save('#css','palette.css');
    const doc=JSON.parse(fs.readFileSync(de));assert.equal(doc.entries.length,2);assert.equal(doc.entries[0].colour.address,'H295_L040_C100');assert.equal(doc.entries[0].colour.identity.atlas_row_id,null);assert.equal(doc.entries[1].colour.source.space,'display-p3');assert.match(fs.readFileSync(css,'utf8'),/@media \(color-gamut: p3\)/);
    await page.locator('#language').selectOption('en');const en=await save('#save','palette-en.digital-colours.json');assert.deepEqual(fs.readFileSync(de),fs.readFileSync(en));
    await page.locator('[data-remove="0"]').click();assert.equal(await page.locator('.palette-row').count(),1);
    await page.locator('#open').setInputFiles(de);await page.locator('#status').filter({hasText:'verified'}).waitFor();assert.equal(await page.locator('.palette-row').count(),2);
    doc.entries[0].colour.identity.atlas_row_id=10646;const forged=path.join(out,'forged.json');fs.writeFileSync(forged,JSON.stringify(doc));await page.locator('#open').setInputFiles(forged);await page.locator('#status.error').waitFor();assert.equal(await page.locator('.palette-row').count(),2);
    await page.locator('#library').selectOption('pso_coated_v3_fogra51');assert.match(await page.locator('#library-status').innerText(),/9,034/);
    await page.locator('#input-kind').selectOption('HLC');await page.locator('#hlc').fill('H290_L040_C075');await page.locator('#calculate').click();assert.match(await page.locator('#identity-kind').innerText(),/Existing master/);
    await page.locator('#hlc').fill('H295_L040_C100');assert.equal(await page.locator('#result').isVisible(),false);await page.locator('#calculate').click();
    await page.locator('#language').selectOption('de');await page.setViewportSize({width:390,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(out,'digital-mobile.png'),fullPage:true});
    // Exercise the P3 capability branch; this is not a physical P3 display test.
    const p3=await browser.newPage();p3.on('pageerror',e=>errors.push(e.message));await p3.addInitScript(()=>{const original=window.matchMedia.bind(window);window.matchMedia=q=>q==='(color-gamut: p3)'?{matches:true}:original(q);});
    await p3.goto('file://'+standalone+'?lang=en');await p3.locator('#address').waitFor();assert.match(await p3.locator('#preview-status').innerText(),/Display-P3/);assert.match(await p3.locator('#source-swatch').evaluate(e=>getComputedStyle(e).backgroundColor),/^color\(display-p3/);await p3.close();
    const entries=[];
    for(const file of ['START_HERE.html','index.html?lang=en#library','startup/index.html?lang=de']){
      const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+runtime+'/'+file);
      const link=file==='START_HERE.html'?p.locator('a[href="digital/index.html?lang=de"]'):p.locator('#digital-colour-entry');await link.waitFor();
      const href=await link.getAttribute('href');assert.match(href,/digital\/index\.html/);
      if(file.startsWith('startup')){const select=p.locator('#kit-language');if(await select.count()){await select.selectOption('en');await p.locator('#digital-colour-entry').filter({hasText:'Digital HLC'}).waitFor();}}
      const target=new URL(href,p.url()).href,other=await browser.newPage();await other.goto(target);await other.locator('#address').filter({hasText:'H295_L040_C100'}).waitFor();await other.close();entries.push(file);await p.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
    const results={status:'PASS',entries,checks:['Offline standalone and full-bundle entry','Exact requested source/reference sRGB swatches','HLC and tagged P3 input; clipped-preview label','JSON download/reopen and unchanged DE/EN bytes','Tampered identity rejected without losing existing palette','Known master identity and PSO library totals','Text-only rendering of user names','390px responsive layout','P3 capability branch (emulated, not measured)'],errors,network_requests:network.length};fs.writeFileSync(path.join(out,'ui-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
