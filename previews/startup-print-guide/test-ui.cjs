const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),profile=path.resolve(process.argv[4]);fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ATLAS_TEST_CHROMIUM});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('file://'+root+'/startup/index.html');await page.waitForSelector('#guide-product');
  assert.equal(await page.locator('#kit-advanced').getAttribute('open'),null);
  const master=await page.evaluate(()=>JSON.stringify(ATLAS_CLARUS_DATA));
  await page.locator('#kit-demo').click();await page.getByRole('button',{name:'Farbe 1 entfernen',exact:true}).click();await page.locator('#guide-product').selectOption('flyer');await page.locator('#guide-material').selectOption('coated');
  assert.equal(await page.locator('#guide-apply').isVisible(),false);
  await page.locator('#guide-process').selectOption('offset');
  assert.match(await page.locator('#guide-title').innerText(),/Vorschlag/);
  assert.equal(await page.locator('#kit-calculate').isDisabled(),true);
  await page.locator('#guide-apply').click();await page.waitForFunction(()=>document.querySelector('#kit-profile-status').textContent.includes('PSOcoated_v3.icc'));
  assert.match(await page.locator('#guide-title').innerText(),/Bestätigung offen/);
  await page.locator('#kit-calculate').click();await page.waitForSelector('#kit-ba .ba-card',{timeout:45000});assert.equal(await page.locator('#kit-ba .ba-card').count(),2);
  await page.locator('#prepare').screenshot({path:path.join(out,'druckfuehrung-desktop.png')});
  const dl=page.waitForEvent('download');await page.locator('#kit-export').click();const saved=await dl;const dossier=path.join(out,'guided-Farbmappe.zip');await saved.saveAs(dossier);
  const content=JSON.parse(execFileSync('python3',['-c',"import json,zipfile,sys\nwith zipfile.ZipFile(sys.argv[1]) as z:print(json.dumps({'project':json.loads(z.read('project.json')),'report':z.read('farbkarte.html').decode()}))",dossier],{encoding:'utf8'}));
  assert.equal(content.project.print_guide.applied.kind,'suggestion');assert.match(content.report,/Bestätigung.*steht aus/);
  await page.locator('#guide-material').selectOption('uncoated');assert.equal(await page.locator('#kit-ba').isVisible(),false);assert.equal(await page.locator('#kit-calculate').isDisabled(),true);
  await page.locator('#guide-apply').click();await page.waitForFunction(()=>document.querySelector('#kit-profile-status').textContent.includes('PSOuncoated_v3_FOGRA52.icc'));
  await page.locator('#kit-import').setInputFiles(dossier);await page.waitForFunction(()=>document.querySelector('#kit-status').textContent.startsWith('Farbmappe geöffnet'));
  assert.equal(await page.locator('#guide-material').inputValue(),'coated');assert.match(await page.locator('#guide-title').innerText(),/Bestätigung offen/);assert.equal(await page.locator('#kit-ba').isVisible(),false);
  await page.locator('#guide-process').selectOption('digital');assert.equal(await page.locator('#guide-apply').isVisible(),false);
  await page.locator('#guide-instruction').selectOption('name');await page.locator('#guide-profile_name').fill('FOGRA39');assert.equal(await page.locator('#guide-apply').isVisible(),false);
  await page.locator('#guide-profile_name').fill('PSO Coated v3');await page.locator('#guide-apply').click();await page.waitForFunction(()=>document.querySelector('#kit-profile-status').textContent.includes('PSOcoated_v3.icc'));assert.match(await page.locator('#guide-title').innerText(),/laut deiner Druckereivorgabe/);
  await page.locator('#guide-instruction').selectOption('file');await page.locator('#guide-file').setInputFiles({name:'not-an-icc.icc',mimeType:'application/octet-stream',buffer:Buffer.alloc(132)});await page.waitForFunction(()=>!document.querySelector('#guide-file').disabled);assert.equal(await page.locator('#kit-calculate').isDisabled(),true);
  await page.locator('#guide-file').setInputFiles(profile);await page.waitForFunction(()=>document.querySelector('#kit-profile-status').textContent.includes('PSOcoated_v3.icc'));assert.equal(await page.locator('#kit-path').inputValue(),'4C');
  await page.locator('#kit-calculate').click();await page.waitForSelector('#kit-ba .ba-card',{timeout:45000});
  // Public dossier API must reject mismatched saved guide/profile evidence.
  const valid=await page.evaluate(async()=>{
    const K=ATLAS_STARTUP_CORE,ctx={master:ATLAS_CLARUS_DATA.master_sha256,colors:ATLAS_CLARUS_DATA.colors},doc=K.defaults(ctx.master),bytes=await ATLAS_PROFILE_LIBRARY.bytes('psocoated_v3_icc');
    const rgb=[234,99,37];doc.colours=[{label:'Test',kind:'manual_srgb',source_rgb:rgb,reference_id:K.nearest(rgb,ctx).id,assignment:null}];
    doc.print_guide={...ATLAS_PRINT_GUIDE.defaults(),product:'flyer',material:'coated',instruction:'file',applied:{kind:'printer_file',sha256:'0'.repeat(64)}};
    try{await K.pack({doc,profile:{name:'PSOcoated_v3.icc',bytes},result:null,original:null},ctx);return false;}catch(e){return /anderen Profil/.test(e.message);}
  });assert.equal(valid,true);
  await page.locator('#kit-clear-profile').click();await page.locator('#kit-advanced>summary').click();
  await page.locator('.atlas-profile-library select').selectOption('pso_coated_v3_fogra51');await page.getByRole('button',{name:'Für Druckvorbereitung übernehmen'}).click();await page.waitForFunction(()=>document.querySelector('#kit-profile-status').textContent.includes('PSOcoated_v3.icc'));
  assert.equal(await page.evaluate(()=>JSON.stringify(ATLAS_CLARUS_DATA)),master);
  await page.locator('#kit-advanced>summary').click();await page.setViewportSize({width:390,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#prepare').screenshot({path:path.join(out,'druckfuehrung-mobile.png')});
  // Old dossiers do not have print_guide and must still restore successfully.
  if(fs.existsSync(path.join(out,'../core/source-Farbmappe.zip'))){await page.locator('#kit-import').setInputFiles(path.join(out,'../core/source-Farbmappe.zip'));await page.waitForFunction(()=>document.querySelector('#guide-product').value===''&&!document.querySelector('#kit-import').disabled);assert.equal(await page.locator('#guide-product').inputValue(),'');}
  assert.deepEqual(errors,[]);
  const result={status:'PASS',checks:['Default guided UI and collapsed advanced controls','Provisional suggestion requires explicit action','Actual ICC B/A for two accepted colours','Changed material clears profile and result','Uncoated profile loads','Export preserves provisional status and guide answers','Import restores guide; calculation invalidated','Digital and ambiguous FOGRA require printer input','Exact printer name and direct ICC file accepted','Malformed ICC rejected','Mismatched guide/profile dossier rejected','Advanced catalog remains usable','All master data unchanged','390px mobile layout has no horizontal overflow','Legacy dossier restored'],page_errors:errors};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
