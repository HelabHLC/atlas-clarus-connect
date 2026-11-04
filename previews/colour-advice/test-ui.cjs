const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
const fixture=path.join(out,'source-with-icc.png');fs.writeFileSync(fixture,Buffer.from(fs.readFileSync(path.join(__dirname,'fixtures/source-with-icc.png.base64'),'utf8'),'base64'));
const jsonInZip=(file,name)=>JSON.parse(execFileSync('python3',['-c','import zipfile,sys;print(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]).decode())',file,name],{encoding:'utf8'}));
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.ATLAS_TEST_CHROMIUM});
 try{
  const page=await b.newPage({viewport:{width:1360,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('file://'+root+'/startup/index.html');await page.locator('#kit-demo').click();
  await page.locator('#guide-product').selectOption('flyer');await page.locator('#guide-material').selectOption('coated');await page.locator('#guide-process').selectOption('offset');await page.locator('#guide-apply').click();
  await page.waitForFunction(()=>document.querySelector('#kit-profile-status').textContent.includes('PSOcoated_v3.icc'));
  assert.equal(await page.locator('[data-confirm="0"]').isDisabled(),true);assert.equal(await page.locator('#kit-calculate').isDisabled(),true);
  assert.match(await page.locator('[data-advice-row="0"]').innerText(),/H050_L060_C075/);assert.match(await page.locator('[data-advice-row="0"]').innerText(),/1.15392/);
  await page.locator('[data-tolerance]').fill('1');await page.locator('[data-tolerance]').press('Tab');assert.equal(await page.locator('[data-confirm="0"]').isDisabled(),true);assert.match(await page.locator('.advice-result').innerText(),/außerhalb/);
  await page.locator('[data-tolerance]').fill('2');await page.locator('[data-tolerance]').press('Tab');assert.equal(await page.locator('[data-confirm="0"]').isEnabled(),true);assert.equal(await page.locator('#kit-calculate').isDisabled(),true);
  await page.locator('#kit-advice').screenshot({path:path.join(out,'advice-proposal.png')});
  await page.locator('[data-confirm="0"]').click();assert.equal(await page.locator('#kit-basis').inputValue(),'accepted');assert.equal(await page.locator('#kit-calculate').isEnabled(),true);assert.match(await page.locator('[data-library-row="0"]').innerText(),/Bestätigte Ersatzfarbe/);
  assert.match(await page.locator('#kit-colours').innerText(),/H050_L060_C080/);assert.match(await page.locator('#kit-colours').innerText(),/#EA6325/);
  await page.locator('#kit-calculate').click();await page.waitForSelector('#kit-ba .ba-card',{timeout:45000});assert.equal(await page.locator('#kit-ba .ba-card').count(),3);assert.match(await page.locator('#kit-ba .ba-card').first().innerText(),/#E8682A/);
  const download=page.waitForEvent('download');await page.locator('#kit-export').click();const dl=await download,file=path.join(out,'confirmed-ICC-Farbmappe.zip');await dl.saveAs(file);
  const project=jsonInZip(file,'project.json'),calc=jsonInZip(file,'print/calculation.json');assert.deepEqual(project.colours[0].source_rgb,[234,99,37]);assert.equal(project.colours[0].reference_id,1737);assert.equal(project.colours[0].replacement.reference_id,1736);assert.deepEqual(calc.colours[0].input_rgb,[232,104,42]);
  const stored=jsonInZip(file,'colour-advice.json');assert.equal(stored.rows[0].decision_active,true);
  await page.locator('#kit-import').setInputFiles(file);await page.waitForFunction(()=>document.querySelector('#kit-status').textContent.includes('Farbmappe geöffnet'));assert.equal(await page.locator('#kit-ba').isVisible(),false);assert.match(await page.locator('.advice-result').innerText(),/bewusst übernommen/);
  await page.locator('[data-tolerance]').fill('1');await page.locator('[data-tolerance]').press('Tab');assert.equal(await page.locator('#kit-calculate').isDisabled(),true);assert.match(await page.locator('[data-advice-row="0"]').innerText(),/nicht aktiv/);
  await page.locator('[data-tolerance]').fill('2');await page.locator('[data-tolerance]').press('Tab');assert.equal(await page.locator('#kit-calculate').isDisabled(),true);assert.equal(await page.locator('[data-confirm="0"]').isEnabled(),true);await page.locator('[data-undo="0"]').click();assert.equal(await page.locator('#kit-calculate').isDisabled(),true);
  await page.locator('.advice-whole>summary').click();assert.ok(await page.locator('.advice-whole [data-library="gamutmap_154"]').count());await page.locator('.advice-whole [data-library="gamutmap_154"]').click();
  assert.equal(await page.locator('#kit-library').inputValue(),'gamutmap_154');assert.match(await page.locator('#kit-profile-status').innerText(),/Noch kein/);assert.equal(await page.locator('#kit-calculate').isDisabled(),true);assert.match(await page.locator('#kit-acceptance-title').innerText(),/akzeptiert/);
  await page.locator('#kit-import').setInputFiles(file);await page.waitForFunction(()=>document.querySelector('#kit-library').value==='pso_coated_v3_fogra51');
  await page.setViewportSize({width:390,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('[data-advice-row="0"]').screenshot({path:path.join(out,'advice-mobile.png')});
  await page.setViewportSize({width:1360,height:1100});
  await page.goto('file://'+root+'/index.html#library');await page.waitForSelector('[data-advice-selected]');
  // Native direct reference selection, without inventing an original image source.
  await page.locator('[data-advice-selected]').click();await page.waitForSelector('.atlas-advice-dialog iframe');
  let frame=page.frameLocator('.atlas-advice-dialog iframe');await frame.locator('#kit-status').filter({hasText:'Aus der Browser Edition übernommen'}).waitFor();
  assert.match(await frame.locator('#kit-colours').innerText(),/Referenz als Ausgangsfarbe/);
  await page.locator('[data-close-advice]').click();await page.locator('#selection [data-add-palette]').click();await page.locator('#palette-close').click();
  // Native image sample -> source record -> shared advice, keeping the actual file.
  await page.goto('file://'+root+'/index.html#picker');await page.locator('#picker-file').setInputFiles(fixture);
  await page.waitForFunction(()=>document.querySelector('#picker-result').textContent.includes('Image ready'));
  await page.locator('#picker-canvas').click({position:{x:300,y:260}});
  await page.waitForSelector('[data-picker-hover]');await page.locator('[data-picker-hover]').click();await page.locator('[data-advice-selected]').click();
  frame=page.frameLocator('.atlas-advice-dialog iframe');await frame.locator('#kit-status').filter({hasText:'Aus der Browser Edition übernommen'}).waitFor();assert.match(await frame.locator('#kit-colours').innerText(),/#EA6325/);assert.match(await frame.locator('#kit-origin').textContent(),/Eingebettetes ICC/);
  await frame.locator('#kit-library').selectOption('pso_coated_v3_fogra51',{force:true});await frame.locator('[data-tolerance]').fill('2');await frame.locator('[data-tolerance]').press('Tab');await frame.locator('[data-confirm="0"]').click();
  const browserDownload=page.waitForEvent('download');await frame.locator('#kit-export').click();const bd=await browserDownload,bfile=path.join(out,'browser-image-Farbmappe.zip');await bd.saveAs(bfile);
  const bp=jsonInZip(bfile,'project.json');assert.equal(bp.colours[0].kind,'image');assert.equal(bp.colours[0].assignment.atlas_row_id,1737);assert.equal(bp.colours[0].replacement.reference_id,1736);
  const originalBytes=execFileSync('python3',['-c','import zipfile,sys;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read("original/image.png"))',bfile]);assert.deepEqual(originalBytes,fs.readFileSync(fixture));
  await page.screenshot({path:path.join(out,'browser-advice.png')});
  await page.locator('[data-close-advice]').click();assert.match(await page.locator('#selection').innerText(),/H050_L060_C080/);assert.match(await page.locator('#selection').innerText(),/#EA6325/);
  await page.locator('#selection [data-add-palette]').click();await page.locator('#palette-close').click();
  await page.locator('.atlas-advice-launch [data-advice-palette]').click();frame=page.frameLocator('.atlas-advice-dialog iframe');await frame.locator('#kit-status').filter({hasText:'Aus der Browser Edition übernommen'}).waitFor();assert.equal(await frame.locator('#kit-colours .colour').count(),2);assert.match(await frame.locator('#kit-colours').innerText(),/Referenz als Ausgangsfarbe/);assert.match(await frame.locator('#kit-colours').innerText(),/#EA6325/);await page.locator('[data-close-advice]').click();
  // Reopening the native page retains source records but has no original file.
  await page.reload();await page.locator('.atlas-advice-launch [data-advice-palette]').click();frame=page.frameLocator('.atlas-advice-dialog iframe');await frame.locator('#kit-status').filter({hasText:'Aus der Browser Edition übernommen'}).waitFor();assert.equal(await frame.locator('#kit-colours .colour').count(),2);assert.match(await frame.locator('#kit-colours').innerText(),/Aufgezeichnete Bildfarbe/);
  const recDownload=page.waitForEvent('download');await frame.locator('#kit-export').click();const rd=await recDownload,rfile=path.join(out,'browser-recorded-draft.zip');await rd.saveAs(rfile);const rp=jsonInZip(rfile,'project.json');assert.equal(rp.colours.find(c=>c.reference_id===1737).kind,'recorded_srgb');assert.deepEqual(rp.colours.find(c=>c.reference_id===1737).source_rgb,[234,99,37]);assert.equal(jsonInZip(rfile,'manifest.json').original,null);
  await page.locator('[data-close-advice]').click();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',checks:['Outside tolerance cannot be accepted','Within tolerance still requires explicit click','Original source and reference remain visible','Real ICC uses confirmed replacement','Dossier export/import retains decision and original values','Changed tolerance and undo block output','Alternative library clears incompatible profile','390px comparison fits','Browser direct-reference and image-source handoffs','Image plus embedded ICC preserved byte-for-byte','Native Browser selection unchanged','Native mixed palette handoff and saved source records without an original file'],errors},null,2));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
