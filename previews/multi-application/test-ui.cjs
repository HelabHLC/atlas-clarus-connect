const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
const fileInZip=(file,name)=>execFileSync('python3',['-c','import zipfile,sys;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]))',file,name],{maxBuffer:60*1024*1024});
const json=(file,name)=>JSON.parse(fileInZip(file,name));
async function save(page,name){const promise=page.waitForEvent('download');await page.locator('#save').click();const f=path.join(out,name);await(await promise).saveAs(f);return f;}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ATLAS_TEST_CHROMIUM});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('file://'+root+'/startup/index.html?lang=de');await page.locator('#kit-demo').click();
  const popupPromise=page.waitForEvent('popup');await page.locator('#kit-multi').click();const multi=await popupPromise;multi.on('pageerror',e=>errors.push(e.message));multi.on('dialog',d=>d.accept());
  await multi.locator('#source-status').filter({hasText:'3 Farben'}).waitFor();assert.equal(await multi.locator('.source-chip').count(),3);
  const ids=['psocoated_v3_icc','psouncoated_v3_fogra52_icc','isocoated_v2_300_eci_icc','gracol2013unc_crpc3_icc'];
  for(let i=0;i<4;i++){
   const target=multi.locator('[data-target]').nth(i);await target.locator('[data-profile]').selectOption(ids[i]);await multi.waitForFunction(()=>!document.querySelector('#calculate').disabled);
   assert.match(await target.innerText(),/ICC geladen|SHA|[0-9a-f]{64}/);
   await target.locator('[data-field="name"]').fill(['Vehicle test only','Business card test only','Wall test only','Fourth test only'][i]);
   await target.locator('[data-field="material"]').fill('Software fixture — no production material confirmed by test');await target.locator('[data-field="process"]').fill('ICC test fixture');await target.locator('[data-field="condition_confirmed"]').check();
  }
  for(const key of ['source','output','pair'])await multi.locator('#tolerance-'+key).fill(key==='source'?'12':'3');
  await multi.locator('#calculate').click();await multi.waitForFunction(()=>!document.querySelector('#calculate').disabled);
  if(!await multi.locator('#results .colour-result').count())throw Error('Comparison failed: '+await multi.locator('#status').innerText());
  assert.equal(await multi.locator('#results .colour-result').count(),3);assert.equal(await multi.locator('#results tbody tr').count(),12);
  assert.equal(await multi.locator('[data-confirm]').count(),3);assert.match(await multi.locator('#save-status').innerText(),/Entwurf/);
  await multi.locator('[data-confirm="2"]').click();assert.match(await multi.locator('#save-status').innerText(),/Entwurf|Draft/);await multi.locator('[data-confirm="0"]').click();await multi.locator('[data-confirm="1"]').click();
  assert.match(await multi.locator('#save-status').innerText(),/innerhalb/);
  const de=await save(multi,'four-profiles-de.zip'),project=json(de,'project.json'),comparison=json(de,'comparison.json');
  assert.equal(project.targets.length,4);assert.equal(comparison.colours.length,3);assert.ok(comparison.common_count>0);
  for(const c of comparison.colours){assert.equal(c.outputs.length,4);assert.ok(c.source_delta<=12);assert.ok(c.max_output_delta<=3);assert.ok(c.max_pair_delta<=3);assert.equal(c.source.reference_id,c.source.assignment?.atlas_row_id??c.source.reference_id);}
  const sourcePath=path.join(out,'source.zip');fs.writeFileSync(sourcePath,fileInZip(de,'source-dossier.zip'));assert.deepEqual(json(sourcePath,'project.json').colours[0].source_rgb,[234,99,37]);assert.equal(json(sourcePath,'project.json').colours[0].reference_id,1737);
  await multi.locator('#multi-language').selectOption('en');assert.match(await multi.locator('h1').innerText(),/Brand colours/);assert.equal(await multi.locator('#results tbody tr').count(),12);
  const en=await save(multi,'four-profiles-en.zip');for(const name of ['project.json','source-dossier.zip','comparison.json','common.ase','common.clarus.json'])assert.deepEqual(fileInZip(de,name),fileInZip(en,name));
  assert.match(fileInZip(en,'report.html').toString(),/Lab D50/);assert.match(fileInZip(en,'report.html').toString(),/HLC target Lab values are not used/);
  await multi.locator('[data-target]').first().locator('[data-field="material"]').fill('Changed finishing');assert.equal(await multi.locator('#comparison-section').isVisible(),false);assert.match(await multi.locator('#save-status').innerText(),/Draft/);
  await multi.locator('#open').setInputFiles(en);await multi.locator('#status').filter({hasText:'Recalculate'}).waitFor();assert.equal(await multi.locator('#comparison-section').isVisible(),false);
  // Previous choices are visible and preselected, but still require a fresh confirmation.
  assert.match(await multi.locator('#source-colours').innerText(),/Previous shared selection/);
  await multi.locator('#calculate').click();await multi.waitForSelector('[data-confirm="0"]',{timeout:60000});
  for(let i=0;i<3;i++)assert.equal(Number(await multi.locator('[data-proposal="'+i+'"]').inputValue()),project.choices[i]);
  assert.match(await multi.locator('#save-status').innerText(),/Draft/);
  // Explicit profile-derived lists work independently of catalog membership.
  for(let i=0;i<4;i++)await multi.locator('[data-target]').nth(i).locator('[data-field="library_mode"]').selectOption('profile');
  await multi.locator('#calculate').click();await multi.waitForSelector('[data-confirm="0"]',{timeout:60000});assert.match(await multi.locator('#application-summary').innerText(),/Compute a check list/);
  await multi.locator('[data-confirm="2"]').click();assert.match(await multi.locator('#save-status').innerText(),/Entwurf|Draft/);await multi.locator('[data-confirm="0"]').click();await multi.locator('[data-confirm="1"]').click();
  await multi.screenshot({path:path.join(out,'multi-desktop.png'),fullPage:true});
  await multi.setViewportSize({width:390,height:900});assert.equal(await multi.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await multi.locator('#results .colour-result').first().screenshot({path:path.join(out,'multi-mobile.png')});
  const cardFile=path.join(out,'comparison-card.html');fs.writeFileSync(cardFile,fileInZip(en,'report.html'));const card=await browser.newPage({viewport:{width:390,height:900}});await card.goto('file://'+cardFile);assert.equal(await card.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await card.screenshot({path:path.join(out,'report-mobile.png')});await card.close();
  // Clearing the selected profile must clear its identity and invalidate the comparison.
  await multi.locator('[data-target]').first().locator('[data-profile]').selectOption('');assert.match(await multi.locator('[data-target]').first().innerText(),/No output profile/);assert.equal(await multi.locator('#comparison-section').isVisible(),false);
  // Eight slots allowed, ninth blocked; conditions cannot silently pass.
  for(let i=0;i<4;i++)await multi.locator('#add').click();assert.equal(await multi.locator('[data-target]').count(),8);assert.equal(await multi.locator('#add').isDisabled(),true);await multi.locator('#calculate').click();assert.match(await multi.locator('#status').innerText(),/Complete starting/);
  // Browser Edition image -> embedded Startup iframe -> new multi-application tab.
  const fixture=path.join(out,'source-with-icc.png');fs.writeFileSync(fixture,Buffer.from(fs.readFileSync(path.join(__dirname,'../colour-advice/fixtures/source-with-icc.png.base64'),'utf8'),'base64'));
  await page.goto('file://'+root+'/index.html?lang=en#picker');await page.locator('#picker-file').setInputFiles(fixture);await page.waitForFunction(()=>document.querySelector('#picker-result').textContent.includes('Image ready'));
  await page.locator('#picker-canvas').click({position:{x:300,y:260}});await page.waitForSelector('[data-picker-hover]');await page.locator('[data-picker-hover]').click();await page.locator('[data-advice-selected]').click();
  const frame=page.frameLocator('.atlas-advice-dialog iframe');await frame.locator('#kit-status').filter({hasText:'Imported from Browser Edition'}).waitFor();const nativeSelection=await page.locator('#selection').innerText();
  const imagePopup=page.waitForEvent('popup');await frame.locator('#kit-multi').click();const imageMulti=await imagePopup;imageMulti.on('dialog',d=>d.accept());imageMulti.on('pageerror',e=>errors.push(e.message));await imageMulti.locator('#source-status').filter({hasText:'1 colours'}).waitFor();
  const imageProject=await save(imageMulti,'image-project.zip'),imageSource=path.join(out,'image-source.zip');fs.writeFileSync(imageSource,fileInZip(imageProject,'source-dossier.zip'));
  assert.deepEqual(fileInZip(imageSource,'original/image.png'),fs.readFileSync(fixture));const imageColour=json(imageSource,'project.json').colours[0];assert.equal(imageColour.kind,'image');assert.deepEqual(imageColour.source_rgb,[234,99,37]);assert.equal(imageColour.reference_id,1737);assert.equal(imageColour.assignment.atlas_row_id,1737);assert.equal(await page.locator('#selection').innerText(),nativeSelection);
  await imageMulti.locator('#open').setInputFiles(imageProject);await imageMulti.locator('#status').filter({hasText:'Recalculate'}).waitFor();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({status:'PASS',common_count:comparison.common_count,choices:project.choices,comparison:comparison.colours.map(c=>({source:c.source.source_rgb,id:c.confirmed_reference_id,source_delta:c.source_delta,max_output:c.max_output_delta,max_pair:c.max_pair_delta})),errors},null,2));console.log(fs.readFileSync(path.join(out,'result.json'),'utf8'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
