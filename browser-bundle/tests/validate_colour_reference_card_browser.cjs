'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../..');
const out=process.env.CARD_TEST_OUTPUT||'/tmp/atlas-colour-reference-card';
const target=process.env.CARD_HTML||path.join(root,'browser-bundle/build-colour-reference-card/atlas-clarus-browser-bundle/index.html');
const fixture=require('./fixtures/colour-kit-030-two-greens.json');
fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
    const page=await context.newPage(),errors=[],requests=[];
    context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
    page.on('pageerror',e=>errors.push(e.message));
    context.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
    await page.goto(pathToFileURL(target).href+'#colour-handoff');
    await page.waitForFunction(()=>!document.getElementById('ch-import').disabled);
    assert.equal(await page.locator('#ch-reference-card').isDisabled(),true);
    await page.locator('#ch-import').setInputFiles(path.join(__dirname,'fixtures/colour-kit-030-two-greens.json'));
    await page.waitForFunction(()=>!document.getElementById('ch-reference-card').disabled);
    await page.reload();await page.waitForFunction(()=>!document.getElementById('ch-reference-card').disabled);
    async function save(button,name){const [dl]=await Promise.all([page.waitForEvent('download'),page.locator(button).click()]);const dest=path.join(out,name);await dl.saveAs(dest);return dest;}
    const archive=await save('#ch-reference-card','browser-two-greens.zip');
    execFileSync('python3',['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])',archive,path.join(out,'browser-export')]);
    const palettePath=path.join(out,'browser-export/palette.clarus.json');
    assert.deepEqual(JSON.parse(fs.readFileSync(palettePath)),fixture);
    const projection=JSON.parse(fs.readFileSync(path.join(out,'browser-export/reference-card.json')));
    assert.deepEqual(projection.cards.map(c=>c.decision_id),fixture.records.map(r=>r.decision_id));
    // Downloading is read-only, and the unmodified companion reopens via existing UI.
    const before=JSON.parse(fs.readFileSync(await save('#ch-save','ui-after-export.json')));
    assert.deepEqual(before,fixture);
    await page.locator('#ch-import').setInputFiles(palettePath);
    await page.waitForFunction(()=>document.getElementById('ch-status').textContent.startsWith('Decision JSON verified'));
    assert.deepEqual(JSON.parse(fs.readFileSync(await save('#ch-save','ui-reopened.json'))),fixture);
    await page.screenshot({path:path.join(out,'bundle-desktop.png'),fullPage:true});
    for(const size of [{width:390,height:844},{width:844,height:390}]){
      await page.setViewportSize(size);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.equal(await page.locator('#ch-reference-card').isVisible(),true);
    }
    // A separate context opens the exported card with no application state or network.
    const receiver=await browser.newContext({viewport:{width:1000,height:1200}});
    receiver.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
    const card=await receiver.newPage();card.on('pageerror',e=>errors.push(e.message));
    await card.goto(pathToFileURL(path.join(out,'browser-export/colour-reference-card.html')).href);
    assert.equal(await card.locator('article.sheet').count(),2);
    for(let i=0;i<2;i++){
      const text=await card.locator('article.sheet').nth(i).innerText(),record=fixture.records[i];
      for(const value of [record.original.hex,record.decision_id,record.revision_id,'H130_L045_C055','4966','UNKNOWN'])assert.ok(text.includes(value),value);
    }
    await card.screenshot({path:path.join(out,'card-desktop.png'),fullPage:true});
    for(const size of [{width:390,height:844},{width:844,height:390}]){
      await card.setViewportSize(size);
      assert.equal(await card.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'card horizontal overflow');
      assert.equal(await card.locator('article.sheet').count(),2);
    }
    await card.setViewportSize({width:1000,height:1200});
    await card.pdf({path:path.join(out,'two-greens.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false});
    // Independent PDF parser: each decision gets a separate complete A4 page.
    execFileSync('python3',['-c',`
import json,sys
from pypdf import PdfReader
p=PdfReader(sys.argv[1]); f=json.load(open(sys.argv[2]))
assert len(p.pages)==2, len(p.pages)
for page,r in zip(p.pages,f['records']):
 text=page.extract_text()
 for value in [r['original']['hex'],r['decision_id'],r['revision_id'],'H130_L045_C055','UNKNOWN']:
  assert value in text,(value,text)
 assert abs(float(page.mediabox.width)-595.28)<2
 assert abs(float(page.mediabox.height)-841.89)<2
`,path.join(out,'two-greens.pdf'),palettePath]);
    // Revisions, adopted references, and hostile labels through actual export UI.
    for(const scenario of ['edited','adopted','kit-input']){
      await page.locator('#ch-import').setInputFiles(path.join(out,scenario+'.json'));
      await page.waitForFunction(()=>document.getElementById('ch-status').textContent.startsWith('Decision JSON verified'));
      const file=await save('#ch-reference-card',scenario+'-browser.zip');assert.ok(fs.statSync(file).size>1000);
    }
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
    const report={status:'PASS',browser:await browser.version(),actual_export_button:true,full_json_reimport:true,
      separate_session_html:true,two_distinct_A4_pages:true,viewports:[1440,390,844],page_errors:errors,network_requests:0,
      physical_print:'NOT_TESTED',physical_mobile:'NOT_TESTED',native_adobe:'NOT_TESTED'};
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
