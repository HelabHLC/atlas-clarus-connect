'use strict';
// Actual Chromium downloads. No download/canvas/worker stubs or intercepted blobs.
const {chromium}=require('playwright'), fs=require('node:fs'), path=require('node:path');
const http=require('node:http'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const dir=path.resolve(process.env.TEXTILE_BUNDLE_DIR), out=path.resolve(process.env.FOGRA58_EVIDENCE_DIR||'tmp/fogra58-browser');
const reproduce=process.argv.includes('--reproduce'), transport=process.env.FOGRA58_TRANSPORT||'http';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const master=require('../../hover-library/data/colors.json'), expected=master.colors.find(c=>c.id===4665);
const profileHash='fad691cc0f25e3d6a91942599755b7f9cf906b91f9e4f4834c3364e6c50a972d';
let browser,server;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');fs.createReadStream(path.join(dir,'index.html')).pipe(res)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=transport==='file'?'file://'+path.join(dir,'index.html'):`http://127.0.0.1:${server.address().port}/`;
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1100}}),page=await context.newPage();
 const errors=[],events=[],pending=[],saved=[],failed=[]; let batch='initial';
 page.on('pageerror',e=>errors.push(e.message));
 page.on('download',download=>{
  const group=batch, filename=download.suggestedFilename();events.push({group,filename});
  pending.push((async()=>{const failure=await download.failure();assert.equal(failure,null,'Browser download failed: '+filename);
   const target=path.join(out,group,filename);fs.mkdirSync(path.dirname(target),{recursive:true});await download.saveAs(target);
   const bytes=fs.readFileSync(target);assert(bytes.length>0,'Empty downloaded file');
   saved.push({group,filename,relative_path:path.relative(out,target),bytes:bytes.length,sha256:hash(bytes)});
  })().catch(e=>failed.push(e)));
 });
 async function flush(){await Promise.all(pending);assert.equal(failed.length,0,failed.map(e=>e.stack).join('\n'));}
 async function waitDownloads(count){const end=Date.now()+15000;while(events.length<count){assert(Date.now()<end,`Expected ${count} browser downloads, got ${events.length}`);await new Promise(r=>setTimeout(r,25));}await flush();assert.equal(events.length,count);}
 await page.goto(url+'#library');
 await page.locator('#search').fill('4665');await page.locator('#colour-grid button').first().click();
 await page.locator('#selection [data-prepare-print]').click();
 assert.match(await page.locator('#print-references').innerText(),/H125_L075_C080/);
 const card=page.locator('[data-print-path="TEXTILE_RGB"]'),run=card.locator('[data-profiled-reference]');
 const preview=page.locator('[data-preview-path="TEXTILE_RGB"]');
 const msg=page.locator('#print-message');
 if(reproduce){
  assert.equal(await run.isDisabled(),false,'Baseline trigger must be reachable through normal UI');
  await run.click();await page.waitForFunction(()=>document.querySelector('#print-message').textContent.includes('data_base64'));
  const message=await msg.innerText();assert.match(message,/Cannot read properties of null/);
  await card.screenshot({path:path.join(out,'baseline-controls.png')});
  fs.writeFileSync(path.join(out,'baseline-browser.json'),JSON.stringify({status:'REPRODUCED',browser:await browser.version(),transport,
   action:'Select row 4665 > Prepare for print > Create FOGRA58 reference without profile',message,downloads:events.length,page_errors:errors},null,2));
  console.log('REPRODUCED in native browser: '+message);return;
 }
 assert(await run.isDisabled());assert.match(await card.locator('[data-path-status]').innerText(),/TextileRGB_FOGRA58\.icc/);
 await card.screenshot({path:path.join(out,'missing-profile.png')});
 for(let i=0;i<2;i++){await page.locator('#print-use-selected').click();assert(await run.isDisabled());}
 // Real file inputs, including an unrelated RGB ICC with a plausible filename.
 const raw=fs.readFileSync(process.env.TEXTILE_PROFILE);assert.equal(hash(raw),profileHash);
 const tampered=Buffer.from(raw);tampered[tampered.length-1]^=1;
 for(const buffer of [Buffer.from('not a profile'),raw.subarray(0,160),tampered]){
  await card.locator('[data-profile-file]').setInputFiles({name:'TextileRGB_FOGRA58.icc',mimeType:'application/octet-stream',buffer});
  await page.waitForFunction(()=>document.querySelector('#print-message').textContent.includes('profile rejected:'));
  assert(await run.isDisabled());assert.match(await msg.innerText(),/TextileRGB_FOGRA58\.icc/);assert.doesNotMatch(await msg.innerText(),/null|undefined|data_base64/);
 }
 await card.locator('[data-profile-file]').setInputFiles(process.env.TEXTILE_PROFILE);
 await page.waitForFunction(()=>document.querySelector('#print-message').textContent.includes('profile attached.'));
 const settings={printing_condition:'FOGRA58 regression download',substrate:'Synthetic test; no textile measurement',rendering_intent:'Relative colorimetric',black_point_compensation:'false'};
 for(const [key,value]of Object.entries(settings)){
  const input=card.locator(`[data-setting="${key}"]`);
  if(key==='printing_condition'||key==='substrate')await input.fill(value);else await input.selectOption(value);
 }
 assert(!await run.isDisabled());
 async function exportReference(label){batch=label;const count=events.length;await run.click();
  await page.waitForFunction(()=>document.querySelector('#print-message').textContent.includes('ICCBased FOGRA58 RGB PDF generated'));
  await waitDownloads(count+2);const files=saved.filter(x=>x.group===label);
  assert(files.some(x=>x.filename.endsWith('.pdf'))&&files.some(x=>x.filename.endsWith('.json')));
  const entry=files.find(x=>x.filename.endsWith('.json')),data=JSON.parse(fs.readFileSync(path.join(out,entry.relative_path),'utf8'));
  assert.equal(data.reference.atlas_row_id,4665);assert.equal(data.reference.atlas_address,expected.ref);assert.deepEqual(data.reference.master_rgb,expected.rgb);
  assert.equal(data.identity_change,'NONE');assert.equal(data.master_sha256,master.master_sha256);assert.equal(data.production.profile.sha256,profileHash);
  assert.equal(data.production.rendering_intent,settings.rendering_intent);assert.equal(data.production.black_point_compensation,settings.black_point_compensation==='true');
  assert.equal(data.production.production_approval,'NOT_PROVIDED');return data;
 }
 const first=await exportReference('reference-1');assert.deepEqual(first.production.transform.rgb16,[25943,64883,4455]);
 const second=await exportReference('reference-2');assert.deepEqual(first.production,second.production);assert.deepEqual(first.reference,second.reference);
 // One input image consisting of the reported master reference lets us verify every pixel independently.
 execFileSync(process.env.PYTHON||'python3',['-c',"from PIL import Image; import sys; Image.new('RGB',(32,32),(118,205,39)).save(sys.argv[1])",path.join(out,'source.png')]);
 await page.locator('#preview-image-file').setInputFiles(path.join(out,'source.png'));
 await page.waitForFunction(()=>!document.querySelector('[data-preview-path="TEXTILE_RGB"] [data-preview-run]').disabled);
 async function exportPreview(label){batch=label;await preview.locator('[data-preview-run]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-preview-path="TEXTILE_RGB"] [data-preview-save]').disabled);
  const count=events.length;await preview.locator('[data-preview-save]').click();await waitDownloads(count+1);
  await preview.locator('[data-preview-metadata]').click();await waitDownloads(count+2);
 }
 await exportPreview('image-1');
 await card.screenshot({path:path.join(out,'valid-reference.png')});await preview.screenshot({path:path.join(out,'valid-preview.png')});
 await card.locator('[data-setting="rendering_intent"]').selectOption('Perceptual');settings.rendering_intent='Perceptual';
 assert(await preview.locator('[data-preview-save]').isDisabled());assert.match(await card.locator('[data-result-values]').innerText(),/Not calculated/);
 await card.locator('[data-setting="black_point_compensation"]').selectOption('true');settings.black_point_compensation='true';
 await exportReference('reference-settings-changed');await exportPreview('image-settings-changed');
 await card.locator('[data-profile-clear]').click();assert(await run.isDisabled());assert(await preview.locator('[data-preview-save]').isDisabled());assert(await preview.locator('[data-preview-metadata]').isDisabled());
 await card.locator('[data-profile-file]').setInputFiles(process.env.TEXTILE_PROFILE);
 await page.waitForFunction(()=>document.querySelector('#print-message').textContent.includes('profile attached.'));
 await exportPreview('image-reloaded');
 // A legacy handoff must invalidate an existing native-worker result, not just the profile summary.
 require('../textile/print-handoff.js');const P=global.ATLAS_CLARUS_PRINT;
 const legacy=await P.create({entries:[expected],colors:master.colors,paths:{'4C':P.emptySettings(),ECG:P.emptySettings()}});
 await page.locator('#print-import-file').setInputFiles({name:'legacy.print-handoff.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
 await page.waitForFunction(()=>document.querySelector('#print-message').textContent.includes('Handoff restored:'));
 assert(await run.isDisabled());assert(await preview.locator('[data-preview-save]').isDisabled());assert(await preview.locator('[data-preview-metadata]').isDisabled());
 assert(await preview.locator('[data-preview-after]').isHidden());
 await page.setViewportSize({width:390,height:844});await card.screenshot({path:path.join(out,'mobile-missing-profile.png')});
 await flush();assert.equal(errors.length,0,errors.join('\n'));
 const result={status:'PASS',browser:await browser.version(),transport,actual_browser_downloads:saved.length,
  profile_sha256:profileHash,reference:{atlas_row_id:4665,atlas_address:expected.ref,rgb16:first.production.transform.rgb16},
  settings,missing_profile_blocked:true,invalid_files_rejected:3,repeated_exports_identical:true,
  stale_result_invalidation:true,legacy_import_invalidation:true,page_errors:errors,downloads:saved,
  physical_textile:'NOT_MEASURED',production_approval:'NOT_PROVIDED'};
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,downloads:undefined}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});
