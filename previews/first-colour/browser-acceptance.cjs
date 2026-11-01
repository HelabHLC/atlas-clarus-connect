'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const [candidate,baseline,evidence]=process.argv.slice(2).map(p=>path.resolve(p));fs.mkdirSync(evidence,{recursive:true});
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(name,data){const t=Buffer.from(name),n=Buffer.alloc(4),crc=Buffer.alloc(4);n.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([n,t,data,crc]);}
function png(alpha=255){const w=96,h=64,head=Buffer.alloc(13);head.writeUInt32BE(w);head.writeUInt32BE(h,4);head[8]=8;head[9]=6;const raw=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*(w*4+1)+1+x*4;raw.set([x<w/2?61:60,123,25,alpha],p);}return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
const fixture={name:'two-sources.png',mimeType:'image/png',buffer:png()};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 const errors=[],requests=[],passes=[];
 async function fresh(root,viewport={width:1400,height:1050},hash=''){
  const ctx=await browser.newContext({viewport,acceptDownloads:true});const page=await ctx.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.goto(pathToFileURL(path.join(root,'index.html')).href+hash);await page.waitForFunction(()=>!!window.ATLAS_CLARUS_EXPORTS?.quarkPackage);return page;
 }
 async function load(page,file=fixture,guided=true){await page.locator('#picker-file').setInputFiles(file);await page.waitForFunction(guided?()=>document.querySelector('#fc-status').textContent.includes('Wähle jetzt'):()=>document.querySelector('#picker-result').textContent.includes('Image ready.'));}
 async function pick(page,x=.25){const c=page.locator('#picker-canvas');await c.scrollIntoViewIfNeeded();const box=await c.boundingBox();await c.click({position:{x:box.width*x,y:box.height/2}});}
 async function download(page,selector,name){const pending=page.waitForEvent('download');await page.locator(selector).click();const d=await pending;assert.equal(await d.failure(),null);const target=path.join(evidence,name);await d.saveAs(target);return fs.readFileSync(target);}
 async function importDoc(page,doc){await page.locator('#fc-import').setInputFiles({name:'saved.clarus.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});await page.waitForFunction(()=>document.querySelector('#fc-status').textContent.startsWith('Gesicherte Farbe geöffnet.'));}
 try{
  const p=await fresh(candidate),b=await fresh(baseline);
  assert.equal(await p.locator('.view.active').getAttribute('id'),'start');assert.equal(await p.locator('#fc-download').isDisabled(),true);
  assert.equal(await p.locator('#start .atlas-live-button').count(),0);assert.equal(await p.locator('#primary-nav').isVisible(),false);
  await p.screenshot({path:path.join(evidence,'start-desktop.png'),fullPage:true});passes.push('simple default entry and disabled empty download');
  await load(p);await pick(p);const first=JSON.parse(await download(p,'#fc-download','first.clarus.json'));
  assert.equal(first.source_assignments.length,1);assert.deepEqual(first.source_assignments[0].source_rgb,[61,123,25]);assert.equal(first.references[0].reference,'H130_L045_C055');
  assert.equal(await p.locator('#fc-source-hex').innerText(),'#3D7B19');assert.equal(await p.locator('#fc-address').innerText(),'H130_L045_C055');
  await p.screenshot({path:path.join(evidence,'selected-desktop.png'),fullPage:true});passes.push('actual image selection and Clarus JSON download');
  await load(b,fixture,false);await pick(b);await b.locator('[data-picker-hover]').click();await b.locator('#selection [data-add-palette]').click();
  const baselineDoc=JSON.parse(await download(b,'[data-palette-export="clarus"]','baseline.clarus.json'));
  assert.deepEqual(first.source_assignments,baselineDoc.source_assignments);assert.deepEqual(first.references,baselineDoc.references);passes.push('source/reference/metadata identical to published RC34.11');
  await pick(p,.75);const second=JSON.parse(await download(p,'#fc-download','second.clarus.json'));
  assert.deepEqual(second.source_assignments[0].source_rgb,[60,123,25]);assert.equal(second.references[0].reference,first.references[0].reference);
  const both=structuredClone(first);both.source_assignments.push(second.source_assignments[0]);both.palette_name='Two sources';
  const restored=await fresh(candidate);await importDoc(restored,both);
  const reexport=JSON.parse(await download(restored,'#fc-download','both-restored.clarus.json'));assert.deepEqual(reexport,both);
  assert.equal(await restored.locator('#fc-records option').count(),2);await restored.locator('#fc-records').selectOption('1');assert.equal(await restored.locator('#fc-source-hex').innerText(),'#3C7B19');passes.push('fresh-context import and lossless multiple-source re-export');
  const corrupt=structuredClone(both);corrupt.source_assignments[0].source_rgb[0]=0;
  await restored.locator('#fc-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(corrupt))});
  await restored.waitForFunction(()=>document.querySelector('#fc-status').textContent.startsWith('Datei konnte nicht geöffnet'));
  assert.deepEqual(JSON.parse(await download(restored,'#fc-download','after-rejection.json')),both);passes.push('tampered import rejected without replacing valid selection');
  const referenceOnly=structuredClone(first);referenceOnly.source_assignments=[];await importDoc(restored,referenceOnly);
  assert.equal(await restored.locator('#fc-source-hex').innerText(),'Nicht aufgezeichnet');assert.deepEqual(JSON.parse(await download(restored,'#fc-download','reference-only.json')),referenceOnly);passes.push('missing source remains explicit, never reconstructed');
  await p.locator('.fc-tools').click();await p.waitForFunction(()=>document.querySelector('.view.active').id==='picker');
  assert.equal(await p.locator('#picker .atlas-live-button').count(),1);assert.equal(await p.locator('#picker #picker-file').count(),1);
  await p.evaluate(()=>{location.hash='start';});await p.waitForFunction(()=>document.querySelector('.view.active').id==='start');
  assert.equal(await p.locator('#start #picker-file').count(),1);assert.equal(await p.locator('#start .atlas-live-button').count(),0);passes.push('all-tools round-trip restores original Picker and camera entry');
  await load(p);await p.locator('#picker-canvas').focus();await p.keyboard.press('Enter');await p.keyboard.press('ArrowLeft');
  const keyboard=JSON.parse(await download(p,'#fc-download','keyboard.json'));assert.deepEqual(keyboard.source_assignments[0].sampling.centre,[47,32]);assert.deepEqual(keyboard.source_assignments[0].source_rgb,[61,123,25]);passes.push('keyboard selects exact original coordinates');
  await load(p,{name:'transparent.png',mimeType:'image/png',buffer:png(0)});await pick(p);assert.equal(await p.locator('#fc-download').isDisabled(),true);passes.push('transparent selection cannot export a stale colour');
  await p.locator('#picker-file').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not a PNG')});await p.waitForFunction(()=>document.querySelector('#fc-status').textContent.includes('konnte nicht geöffnet'));assert.equal(await p.locator('#fc-download').isDisabled(),true);passes.push('invalid image clears the guided export');
  await importDoc(restored,both);await restored.locator('#fc-next summary').click();await restored.locator('#fc-collect').click();
  await restored.waitForFunction(()=>document.querySelector('#palette-drawer').classList.contains('open'));
  assert.deepEqual(JSON.parse(await download(restored,'[data-palette-export="clarus"]','continued.json')),both);passes.push('continue to palette preserves all recorded sources');
  const print=await fresh(candidate);await importDoc(print,first);await print.locator('#fc-next summary').click();await print.locator('#fc-print').click();await print.waitForFunction(()=>document.querySelector('.view.active').id==='print');passes.push('print action opens existing print workspace');
  const phone=await fresh(candidate,{width:390,height:844});await load(phone);await pick(phone);await download(phone,'#fc-download','mobile.json');
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.equal(await phone.locator('#fc-download').isVisible(),true);
  await phone.evaluate(()=>scrollTo(0,0));await phone.screenshot({path:path.join(evidence,'selected-mobile.png'),fullPage:true});passes.push('390px mobile layout and download');
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);passes.push('no page errors or HTTP requests during local workflow');
  const result={status:'PASS',browser:browser.version(),checks:passes.length,passes,physical_device_testing:'NOT_TESTED',usability_study:'NOT_RUN'};
  fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
