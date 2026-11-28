'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('../browser-bundle/tests/node_modules/playwright');
require('../browser-bundle/src/image-project-codecs.js');
const C=globalThis.ATLAS_IMAGE_CODECS;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const errors=[],network=[];
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
  await context.route(/^https?:/,r=>{network.push(r.request().url());return r.abort()});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const target=pathToFileURL(path.resolve('candidate/index.html')).href;
  await page.goto(target+'#picker');await page.locator('#rc36-file-space').waitFor();
  const png=Buffer.from(C.png(2,1,Uint8Array.from([61,123,25,255,60,123,25,255])));
  async function pick(choice,fx){
   await page.evaluate(()=>location.hash='picker');
   await page.locator('#picker-canvas').waitFor({state:'visible'});
   await page.locator('#picker-file').setInputFiles({name:'two-greens.png',mimeType:'image/png',buffer:png});
   await page.waitForFunction(()=>document.querySelector('#picker-result').textContent.includes('Image ready.'));
   assert.equal(await page.locator('#rc36-file-space').inputValue(),'assumed');
   await page.locator('#rc36-file-space').selectOption(choice);
   const cv=page.locator('#picker-canvas');await cv.scrollIntoViewIfNeeded();
   const pos=await cv.evaluate((c,f)=>{const r=c.getBoundingClientRect(),s=Math.min(c.width/2,c.height);return {x:r.width*(c.width/2+(f-.5)*2*s)/c.width,y:r.height/2}},fx);
   await cv.click({position:pos});
   await page.locator('#picker-result [data-picker-hover]').click();
   await page.locator('#selection [data-add-palette]').click();
   await page.locator('#palette-close').click();
  }
  await pick('assumed',.25);await pick('display_p3',.75);
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('atlasClarusPalettesV3')));
  const p=(await state()).palettes[0];assert.equal(p.colorIds.length,1);assert.equal(p.sourceAssignments.length,2);
  assert.deepEqual(p.sourceAssignments.map(r=>r.source_rgb),[[61,123,25],[60,123,25]]);
  assert.deepEqual(p.sourceAssignments.map(r=>r.file_space_decision.choice),['assumed','display_p3']);
  assert.ok(p.sourceAssignments.every(r=>r.color_space==='sRGB'&&r.file_space_decision.native_rgb==='NOT_CAPTURED'));
  await page.locator('#palette-toggle').click();
  async function save(name){const [d]=await Promise.all([page.waitForEvent('download'),page.locator('[data-palette-export="clarus"]').first().click()]);await d.saveAs('evidence/'+name);return JSON.parse(fs.readFileSync('evidence/'+name))}
  const first=await save('browser-palette.clarus.json');assert.deepEqual(first.source_assignments,p.sourceAssignments);
  await page.reload();await page.locator('#palette-toggle').click();
  const reloaded=await save('browser-reloaded.clarus.json');assert.deepEqual(reloaded,first);
  await page.locator('#palette-import-file').setInputFiles(path.resolve('evidence/browser-palette.clarus.json'));
  await page.waitForFunction(()=>document.querySelector('#export-status').textContent.includes('Imported'));
  assert.deepEqual(await save('browser-reimport.clarus.json'),first);
  const details=page.locator('#drawer-palette-list details.drawer-source-records');await details.locator('summary').first().click();
  assert.match(await details.innerText(),/sRGB assumed/);assert.match(await details.innerText(),/Display P3 confirmed/);
  await page.screenshot({path:'evidence/source-browser.png'});
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  fs.writeFileSync('evidence/browser-source-result.json',JSON.stringify({status:'PASS',browser:browser.version(),reference:p.sourceAssignments[0].reference,records:2,source_rgb:p.sourceAssignments.map(r=>r.source_rgb),declarations:p.sourceAssignments.map(r=>r.file_space_decision.choice),json_reload:true,json_reimport:true,network_requests:network.length,page_errors:errors,fixture:'untagged synthetic PNG; P3 is user declaration only'},null,2));
  console.log('PASS: actual Chromium Picker, palette, download, reload, reimport and visible declarations');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
