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
  const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER PAGE ERROR:',e.message)});
  const target=pathToFileURL(path.resolve('candidate/index.html')).href;
  await page.goto(target+'#picker');
  try{await page.locator('#rc36-file-space').waitFor({timeout:10000})}catch(e){console.error('Picker bootstrap:',await page.evaluate(()=>({ready:document.readyState,source:!!window.ATLAS_RC36_SOURCE,registry:!!window.ATLAS_RC36_BYOS,card:!!window.ATLAS_RC36_CARD,lab:!!window.ATLAS_RC36_LAB_CARD})));throw e}
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
  // Actual card from the reimported active palette; use the drawer action.
  const before=await state();
  const [popup,download]=await Promise.all([page.waitForEvent('popup'),page.waitForEvent('download'),page.locator('#drawer-palette-list [data-rc36-palette-card]').click()]);
  popup.on('pageerror',e=>errors.push(e.message));
  await download.saveAs('evidence/open-dcm-card.json');
  const card=JSON.parse(fs.readFileSync('evidence/open-dcm-card.json'));
  assert.equal(card.schema,'atlas-clarus-open-dcm-card/0.1');
  assert.equal(card.reference.hlc_address,first.references[0].reference);
  assert.equal(card.reference.atlas_row_id,first.references[0].atlas_row_id);
  assert.deepEqual(card.reference.master_rgb,first.references[0].master_rgb);
  assert.deepEqual(card.reference.master_lab,first.references[0].master_lab);
  assert.deepEqual(card.sources.map(s=>s.assignment),first.source_assignments);
  for(const s of card.sources){
    assert.equal(s.open_dcm.reference.hlcAddress,card.reference.hlc_address);
    assert.deepEqual(s.open_dcm.source.rgb8,s.assignment.source_rgb);
    assert.equal(s.open_dcm.source.space,'sRGB');assert.equal(s.open_dcm.source.profile,null);
    assert.equal(s.open_dcm.output.status,'not-calculated');
    assert.deepEqual(s.open_dcm.evidence,{iccCalculated:false,physicalProofMeasured:false});
  }
  assert.equal(card.output.deltaE00,null);assert.equal(card.output.iccProfile,null);assert.equal(card.output.substrate,null);
  assert.deepEqual(card.evidence,{iccCalculated:false,physicalProofMeasured:false,productionApproval:false});
  await popup.locator('h1').waitFor();
  assert.equal(await popup.locator('tbody tr').count(),2);
  const cardText=await popup.locator('main').innerText();
  for(const v of [card.reference.hlc_address,'61 / 123 / 25','60 / 123 / 25','sRGB angenommen','Display P3 deklariert','Not calculated','Not measured'])assert.ok(cardText.includes(v),v);
  assert.deepEqual(await state(),before);
  await popup.screenshot({path:'evidence/open-dcm-card.png',fullPage:true});
  await popup.pdf({path:'evidence/open-dcm-card.pdf',format:'A4',printBackground:true});
  await popup.setViewportSize({width:390,height:844});
  assert.ok(await popup.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile horizontal overflow');
  await popup.setViewportSize({width:1000,height:1000});
  const localProfile=path.resolve(process.env.ATLAS_TEST_CMYK);
  const hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(localProfile)).digest('hex');
  await page.locator('#rc36-byos-panel summary').click();
  await page.locator('#rc36-byos-panel input[type=file]').setInputFiles(localProfile);
  await page.waitForFunction(h=>window.ATLAS_RC36_BYOS.selected()?.sha256===h,hash);
  await popup.getByRole('textbox',{name:'Substrate'}).fill('CI test substrate; not measured');
  const native=JSON.parse(require('node:child_process').execFileSync('python3',['rc36/native-lab-reference.py',localProfile,...card.reference.master_lab.map(String)],{encoding:'utf8'}));
  assert.equal(native.profile_sha256,hash);
  const diagnostics={profile_sha256:hash,target_lab:card.reference.master_lab,native_engine_version:native.native_engine_version,forward_bpc:false,return_bpc:false,flags:256,cases:[]};
  const numericFailures=[];
  const compare=(intent)=>native.cases.find(x=>x.intent===intent);
  for(const intent of ['Relative colorimetric','Absolute colorimetric']){
    await popup.getByRole('combobox',{name:'Rendering intent'}).selectOption(intent);
    await popup.getByRole('button',{name:'Calculate locally'}).click();
    await popup.getByRole('button',{name:'Calculated JSON'}).waitFor();
    await popup.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Calculated JSON').disabled||document.querySelector('pre[role=status]')?.textContent.startsWith('Calculation blocked:'),{},{timeout:40000});
    assert.equal(await popup.getByRole('button',{name:'Calculated JSON'}).isEnabled(),true,await popup.locator('pre[role=status]').innerText());
    const [calculatedDownload]=await Promise.all([page.waitForEvent('download'),popup.getByRole('button',{name:'Calculated JSON'}).click()]);
    const calculated=JSON.parse(fs.readFileSync(await calculatedDownload.path(),'utf8')),expected=compare(intent);
    assert.deepEqual(calculated.reference,card.reference);
    assert.deepEqual(calculated.sources,card.sources);
    assert.equal(calculated.output.iccProfile.sha256,hash);
    const actual=calculated.output.deviceValues,returned=calculated.output.simulatedLab;
    const deviceDiff=actual.map((v,i)=>v-expected.device[i]),labDiff=returned.map((v,i)=>v-expected.returned[i]);
    const deviceExact=deviceDiff.length===4&&deviceDiff.every(v=>v===0),labWithin=labDiff.length===3&&labDiff.every(v=>Math.abs(v)<=.0001);
    diagnostics.cases.push({intent,browser_engine_label:calculated.output.engine,device_actual:actual,device_expected:expected.device,device_difference:deviceDiff,lab_actual:returned,lab_expected:expected.returned,lab_difference:labDiff,deltaE00:calculated.output.deltaE00,device_exact:deviceExact,lab_within_existing_limit:labWithin});
    fs.writeFileSync('evidence/browser-native-numeric-diagnostics.json',JSON.stringify(diagnostics,null,2));
    console.log('NUMERIC DIAGNOSTIC:',JSON.stringify(diagnostics.cases.at(-1)));
    if(!deviceExact||!labWithin)numericFailures.push({intent,deviceDiff,labDiff});
    assert.ok(Number.isFinite(calculated.output.deltaE00));
    assert.equal(calculated.output.renderingIntent,intent);
    assert.equal(calculated.evidence.physicalProofMeasured,false);
    assert.equal(calculated.evidence.productionApproval,false);
    assert.equal(calculated.evidence.iccCalculated,true);
    assert.deepEqual(await state(),before);
  }
  await page.locator('#rc36-byos-panel button').click();
  assert.equal(await page.evaluate(()=>window.ATLAS_RC36_BYOS.selected()),null);
  assert.deepEqual(numericFailures,[],'Browser/native numeric release criteria unchanged');
  console.log('PASS: actual Chromium local profile -> frozen HLC Lab -> CMYK16 -> Lab -> calculated card JSON; both intents match native reference');
  await popup.close();
  fs.writeFileSync('evidence/open-dcm-card-result.json',JSON.stringify({status:'PASS',schema:card.schema,reference:card.reference.hlc_address,source_records:card.sources.length,actual_reimported_palette:true,actual_popup:true,json_download:true,pdf_generated:true,unchanged_palette:true,mobile_width:390,icc_calculated:false,physical_proof_measured:false},null,2));
  console.log('PASS: actual Open DCM card from reimported palette, both source records, JSON, HTML, A4 PDF, no state mutation');
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  fs.writeFileSync('evidence/browser-source-result.json',JSON.stringify({status:'PASS',browser:browser.version(),reference:p.sourceAssignments[0].reference,records:2,source_rgb:p.sourceAssignments.map(r=>r.source_rgb),declarations:p.sourceAssignments.map(r=>r.file_space_decision.choice),json_reload:true,json_reimport:true,network_requests:network.length,page_errors:errors,fixture:'untagged synthetic PNG; P3 is user declaration only'},null,2));
  console.log('PASS: actual Chromium Picker, palette, download, reload, reimport and visible declarations');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
