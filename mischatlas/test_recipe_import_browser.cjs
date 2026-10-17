'use strict';
const {chromium}=require(process.env.ATLAS_PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const p=await b.newPage({acceptDownloads:true}),errors=[];p.setDefaultTimeout(120000);p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve('mischatlas/dist/recipe-import-preview/atlas-clarus-mixing-recipe-import-preview.html')).href);
 await p.waitForFunction(()=>document.querySelectorAll('#lcLights input').length===38);
 // Import must not start a Worker or call any spectral calculation/rendering routine.
 await p.evaluate(()=>{window.mrTestCounts={worker:0,lab:0};const W=window.Worker;window.Worker=class extends W{constructor(...args){mrTestCounts.worker++;super(...args);}};const lab=lcFunctions.labFromR;lcFunctions.labFromR=(...a)=>{mrTestCounts.lab++;return lab(...a);};});
 const fixture=path.resolve('mischatlas/dist/recipe-exchange-test/snapshot.json'),raw=fs.readFileSync(fixture);
 await p.locator('#mr-file').setInputFiles(fixture);await p.waitForFunction(()=>document.getElementById('mr-status').textContent.startsWith('Recipe imported:'));
 assert.deepEqual(await p.evaluate(()=>mrTestCounts),{worker:0,lab:0});
 assert((await p.locator('#mr-record').textContent()).includes('SHA256_CONSISTENT'));
 await p.locator('#mr-export').click();let [d]=await Promise.all([p.waitForEvent('download'),p.locator('#downloadPanel a').filter({hasText:'snapshot.json'}).click()]);await d.saveAs('/tmp/mixing-import-reexport.json');assert.deepEqual(fs.readFileSync('/tmp/mixing-import-reexport.json'),raw);
 // A structurally valid snapshot with another engine remains a stored document.
 const foreign=await p.evaluate(async()=>{const replay=structuredClone(mrSaved.replay);replay.environment.engine_sha256='0'.repeat(64);return Array.from(await MR.seal(mrSaved.originalBytes,mrContext,replay));});
 await p.locator('#mr-file').setInputFiles({name:'foreign-engine.json',mimeType:'application/json',buffer:Buffer.from(foreign)});
 await p.waitForFunction(()=>mrSaved.filename==='foreign-engine.json');await p.locator('#mr-resume').click();
 await p.waitForFunction(()=>document.getElementById('mr-resume-status').textContent.includes('Engine SHA-256 differs'));
 assert.equal(await p.evaluate(()=>mrTestCounts.worker),0);
 await p.locator('#mr-file').setInputFiles(fixture);await p.waitForFunction(()=>mrSaved.filename==='snapshot.json');
 // Adoption restores UI only; a second explicit action starts the unchanged Worker.
 const immutable=await p.evaluate(()=>Array.from(mrSaved.bytes));
 await p.locator('#mr-resume').click();await p.waitForFunction(()=>document.getElementById('mr-resume-status').textContent.startsWith('Parameters restored'));
 assert.equal(await p.evaluate(()=>mrTestCounts.worker),0);
 assert.equal(await p.locator('#lcBudget').inputValue(),'16');assert.equal(await p.locator('#lcPalette').inputValue(),'snapshot');
 await p.locator('#lcSearch').click();await p.waitForFunction(()=>document.getElementById('lcProgress').textContent.startsWith('Recipe calculated')||document.getElementById('lcProgress').textContent.startsWith('Calculation failed'));
 const crossRuntime=await p.evaluate(()=>({comparison:JSON.parse(document.getElementById('mr-compare').textContent),result:lcResult,request:mrCompletedJob}));
 assert.deepEqual(crossRuntime.request,JSON.parse(raw).replay.job);
 const originalResult=JSON.parse(raw).record.result;
 assert.deepEqual(crossRuntime.result.recipe,originalResult.recipe);
 assert.deepEqual(crossRuntime.result.model_spectrum,originalResult.model_spectrum);
 const exactLights=JSON.stringify(crossRuntime.result.lights)===JSON.stringify(originalResult.lights);
 assert.equal(crossRuntime.comparison.status,exactLights?'EXACT_NUMERICAL_MATCH':'DIFFERENT');
 assert(crossRuntime.comparison.illuminants.every(x=>Math.abs(x.delta_DE00)<1e-10));
 assert.equal(await p.evaluate(()=>mrTestCounts.worker),1);
 assert.equal(await p.evaluate(()=>JSON.parse(document.getElementById('mr-compare').textContent).same_inputs),true);
 assert.deepEqual(await p.evaluate(()=>Array.from(mrSaved.bytes)),immutable);
 await p.locator('#lcBudget').selectOption('4000');await p.locator('#lcSearch').click();await p.waitForFunction(()=>document.getElementById('lcProgress').textContent.startsWith('Recipe calculated'));
 assert.equal(await p.evaluate(()=>JSON.parse(document.getElementById('mr-compare').textContent).same_inputs),false);
 await p.evaluate(()=>{document.getElementById('lcSearch').click();document.getElementById('lcCancel').click();});
 assert(!(await p.locator('#mr-compare').textContent()).includes('EXACT_NUMERICAL_MATCH'));
 assert.deepEqual(await p.evaluate(()=>Array.from(mrSaved.bytes)),immutable);
 const before=await p.locator('#mr-record').textContent(),bad=JSON.parse(raw);bad.record.result.recipe[0].parts++;
 await p.locator('#mr-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await p.waitForFunction(()=>document.getElementById('mr-status').dataset.error==='true');assert.equal(await p.locator('#mr-record').textContent(),before);
 await p.locator('#mr-file').setInputFiles(path.resolve('mischatlas/tests/fixtures/light-recipe-v1.json'));await p.waitForFunction(()=>document.getElementById('mr-status').textContent.includes('LEGACY_UNSEALED'));
 assert.equal(await p.locator('#mr-resume').isDisabled(),true);
 await p.locator('#lcPalette').selectOption('golden');
 // A new calculation is explicit. Fresh exports must contain the actual complete worker input.
 await p.locator('#lcBudget').selectOption('4000');await p.locator('#lcSearch').click();await p.waitForFunction(()=>document.getElementById('lcProgress').textContent.startsWith('Recipe calculated'));
 await p.locator('#lcExport').click();const link=p.locator('#downloadPanel a').filter({hasText:'Recipe_Snapshot_preview.json'});await link.waitFor();[d]=await Promise.all([p.waitForEvent('download'),link.click()]);await d.saveAs('/tmp/mixing-new-snapshot.json');const fresh=JSON.parse(fs.readFileSync('/tmp/mixing-new-snapshot.json'));assert(fresh.replay.job.samples.length===31);assert.equal(fresh.replay.job.poolSize,4000);assert.equal(Object.keys(fresh.replay.job.kernels).length,38);
 await p.locator('#mr-file').setInputFiles('/tmp/mixing-new-snapshot.json');await p.waitForFunction(()=>document.getElementById('mr-status').textContent.includes('SHA256_CONSISTENT'));
 // Capture and replay inside one browser runtime: exact result equality is required here.
 const browserOriginal=await p.evaluate(()=>Array.from(mrSaved.bytes));
 await p.locator('#mr-resume').click();await p.waitForFunction(()=>document.getElementById('mr-resume-status').textContent.startsWith('Parameters restored'));
 await p.locator('#lcSearch').click();await p.waitForFunction(()=>document.getElementById('lcProgress').textContent.startsWith('Recipe calculated'));
 assert.equal(await p.evaluate(()=>JSON.parse(document.getElementById('mr-compare').textContent).status),'EXACT_NUMERICAL_MATCH');
 assert.equal(await p.evaluate(()=>JSON.parse(document.getElementById('mr-compare').textContent).same_inputs),true);
 assert.deepEqual(await p.evaluate(()=>Array.from(mrSaved.bytes)),browserOriginal);
 await p.setViewportSize({width:390,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow: '+JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,15).map(e=>({tag:e.tagName,id:e.id,width:e.getBoundingClientRect().width,text:e.textContent.slice(0,60)})))));
 // Exchange UI identifies the native recipe and retains it through a fresh workspace.
 const x=await b.newPage({acceptDownloads:true});x.setDefaultTimeout(120000);x.on('pageerror',e=>errors.push(e.message));await x.goto(pathToFileURL(path.resolve('browser-bundle/build-tool-exchange/atlas-clarus-browser-bundle/index.html')).href+'#exchange');await x.waitForFunction(()=>!document.getElementById('xe-add').disabled);
 await x.locator('#xe-add').setInputFiles(fixture);await x.waitForFunction(()=>document.getElementById('xe-status').textContent.startsWith('Files added'));assert((await x.locator('#xe-files').textContent()).includes('MIXING_RECIPE'));
 await x.locator('#xe-native-open').click();await x.waitForFunction(()=>document.getElementById('xe-status').textContent.startsWith('Verified computational recipe'));
 [d]=await Promise.all([x.waitForEvent('download'),x.locator('#xe-save').click()]);await d.saveAs('/tmp/mixing-browser-exchange.zip');
 const y=await b.newPage({acceptDownloads:true});y.setDefaultTimeout(120000);await y.goto(pathToFileURL(path.resolve('browser-bundle/build-tool-exchange/atlas-clarus-browser-bundle/index.html')).href+'#exchange');await y.waitForFunction(()=>!document.getElementById('xe-add').disabled);await y.locator('#xe-import').setInputFiles('/tmp/mixing-browser-exchange.zip');await y.waitForFunction(()=>document.getElementById('xe-status').textContent.startsWith('Exchange opened'));
 [d]=await Promise.all([y.waitForEvent('download'),y.locator('#xe-original').click()]);await d.saveAs('/tmp/mixing-browser-recovered.json');assert.deepEqual(fs.readFileSync('/tmp/mixing-browser-recovered.json'),raw);
 assert.deepEqual(errors,[]);console.log('PASS browser: adoption starts no Worker; foreign engine rejected; full worker request restored; cross-runtime numeric differences labeled; same-browser exact replay; changed inputs and cancellation; original bytes retained; fresh export, exchange reopen and mobile layout');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
