'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');require('../src/image-project-codecs.js');
const out=process.env.JOB_TEST_OUTPUT||'/tmp/atlas-reduction-job-browser',target=path.resolve(__dirname,'../build-reduction-job/atlas-clarus-browser-bundle/index.html');
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});const errors=[];
 try{
 const ctx=await browser.newContext({acceptDownloads:true}),page=await ctx.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 const open=async p=>{await p.goto(pathToFileURL(target).href+'#colour-reduction');await p.waitForFunction(()=>!document.getElementById('cr-file').disabled);};
 await open(page);console.log('PASS page ready');
 const rgba=new Uint8Array(16*8*4),rgbs=[[61,123,25],[60,123,25],[17,34,51],[200,40,80],[220,200,30],[0,0,0]];
 for(let p=0;p<128;p++)rgba.set([...rgbs[p%6],p===127?0:p===126?128:255],p*4);
 const source=Buffer.from(ATLAS_IMAGE_CODECS.png(16,8,rgba));
 await page.locator('#cr-protection-mode').selectOption('ORIGINAL_RGBA');await page.locator('#cr-file').setInputFiles({name:'motif.png',mimeType:'image/png',buffer:source});
 await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Source ready'));
 await page.locator('#cr-k').fill('8');
 for(const hex of ['#3D7B19','#3C7B19']){await page.locator('#cr-lock-hex').fill(hex);await page.locator('#cr-original-add').click();}
 await page.locator('#cr-before').press('Enter');await page.locator('#cr-region-start').click();await page.locator('#cr-loupe-detail').press('ArrowRight');await page.locator('#cr-region-end').click();
 const ready=async p=>{await p.waitForFunction(()=>!document.getElementById('cr-run').disabled&&document.getElementById('cr-status').textContent.startsWith('Reduced preview ready'));};
 await page.locator('#cr-run').click();await ready(page);console.log('PASS original reduction');await page.locator('#cr-variant-save').click();await page.locator('#cr-variant-select').selectOption('current');
 await page.locator('#cr-cleanup-min').fill('3');await page.locator('#cr-cleanup-scope').selectOption('MASK_ONLY');await page.locator('#cr-cleanup').click();
 const save=async(p,name)=>{const[d]=await Promise.all([p.waitForEvent('download'),p.locator('#cr-zip').click()]);const file=path.join(out,name);await d.saveAs(file);console.log('PASS download '+name);return file;};
 const pixels=p=>p.locator('#cr-after').evaluate(c=>c.toDataURL());
 const originalPixels=await pixels(page),originalZip=await save(page,'original-job.zip');
 // A new browser profile proves that no localStorage is required to restore the job.
 const ctx2=await browser.newContext({acceptDownloads:true}),p=await ctx2.newPage();p.setDefaultTimeout(120000);p.on('pageerror',e=>errors.push(e.message));await open(p);
 const restore=async file=>{await p.locator('#cr-job-import').setInputFiles(file);await p.waitForFunction(()=>!document.getElementById('cr-job-import').disabled&&document.getElementById('cr-status').textContent.startsWith('Complete reduction job restored'));};
 await restore(originalZip);console.log('PASS original restore');assert.equal(await pixels(p),originalPixels);assert.equal(await p.locator('#cr-original-locks button').count(),2);assert.equal(await p.locator('#cr-region-locks button').count(),1);assert.equal(await p.locator('#cr-variant-select option').count(),2);assert(await p.locator('#cr-cleanup-reset').isEnabled());
 await p.locator('#cr-cleanup-reset').click();await p.locator('#cr-cleanup').click();assert.equal(await pixels(p),originalPixels);
 await p.locator('#cr-protection-mode').selectOption('LIBRARY_REFERENCE');await p.locator('#cr-run').click();await ready(p);console.log('PASS reduced result');
 for(const [n,v]of Object.entries({x0:0,y0:0,x1:1,y1:0}))await p.locator('#cr-correction-'+n).fill(String(v));
 await p.locator('#cr-correction-hex').fill('#3D7B19');await p.locator('#cr-correction-match').click();await p.locator('#cr-correction-preview').click();await p.locator('#cr-correction-apply').click();await ready(p);console.log('PASS reduced result');
 // Add a non-overlapping deliberately filled reference correction.
 for(const [n,v]of Object.entries({x0:2,y0:0,x1:2,y1:0}))await p.locator('#cr-correction-'+n).fill(String(v));
 await p.locator('#cr-correction-mode').selectOption('REFERENCE');await p.locator('#cr-correction-preview').click();await p.locator('#cr-correction-apply').click();await ready(p);console.log('PASS reduced result');
 await p.locator('#cr-cleanup').click();await p.locator('#cr-variant-save').click();await p.locator('#cr-compare-zoom').selectOption('2');await p.locator('#cr-difference-overlay').check();
 const expected=await pixels(p),job=await save(p,'corrected-job.zip');await restore(job);
 assert.equal(await pixels(p),expected);assert.equal(await p.locator('#cr-corrections button').count(),2);assert.equal(await p.locator('#cr-variant-select option').count(),3);assert.equal(await p.locator('#cr-compare-zoom').inputValue(),'2');assert(await p.locator('#cr-difference-overlay').isChecked());assert.equal(await p.locator('#cr-variant-select').inputValue(),'variant-1');
 const second=await save(p,'second-export.zip');await restore(second);assert.equal(await pixels(p),expected);
 // Bad ZIP and rehashed semantic corruption must preserve the complete working state.
 const before={pixels:await pixels(p),corrections:await p.locator('#cr-corrections').innerText(),mode:await p.locator('#cr-protection-mode').inputValue(),variants:await p.locator('#cr-variant-select').innerHTML()};
 const corrupt=async buffer=>{await p.locator('#cr-job-import').setInputFiles({name:'bad.zip',mimeType:'application/zip',buffer});await p.waitForFunction(()=>document.getElementById('cr-status').dataset.error==='true'&&!document.getElementById('cr-job-import').disabled);assert.deepEqual({pixels:await pixels(p),corrections:await p.locator('#cr-corrections').innerText(),mode:await p.locator('#cr-protection-mode').inputValue(),variants:await p.locator('#cr-variant-select').innerHTML()},before);};
 await corrupt(fs.readFileSync(job).subarray(0,100));
 const semantic=await p.evaluate(async encoded=>{const b=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),J=ATLAS_REDUCTION_JOB,files=J.unzip(b),doc=JSON.parse(new TextDecoder().decode(files['job.json']));doc.settings.k=1;files['job.json']=new TextEncoder().encode(JSON.stringify(doc));const m=JSON.parse(new TextDecoder().decode(files['job-package-manifest.json']));m.files['job.json']=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',files['job.json']))).map(x=>x.toString(16).padStart(2,'0')).join('');files['job-package-manifest.json']=new TextEncoder().encode(JSON.stringify(m));return Array.from(ClarusHandoff.zipStored(files));},fs.readFileSync(job).toString('base64'));await corrupt(Buffer.from(semantic));
 await p.locator('#cr-variant-select').selectOption('current');await p.locator('#cr-corrections button').last().click();await ready(p);console.log('PASS reduced result');assert.equal(await p.locator('#cr-corrections button').count(),1);
 await p.locator('#cr-run').click();await ready(p);console.log('PASS reduced result');await save(p,'continued-job.zip');
 assert.deepEqual(errors,[]);console.log('PASS actual original/library correction ZIP export, clean-profile restore, second export/import, variants, cleanup reset, continued editing, truncated/rehash-tampered import atomicity');
 await ctx.close();await ctx2.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
