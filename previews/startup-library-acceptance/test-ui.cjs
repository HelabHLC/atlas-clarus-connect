const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.ATLAS_TEST_CHROMIUM});
 try{
  const page=await b.newPage({viewport:{width:1360,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('file://'+root+'/startup/index.html');await page.waitForSelector('#guide-product');await page.locator('#kit-demo').click();
  await page.locator('#guide-product').selectOption('flyer');await page.locator('#guide-material').selectOption('coated');await page.locator('#guide-process').selectOption('offset');await page.locator('#guide-apply').click();
  await page.waitForFunction(()=>document.querySelector('#kit-profile-status').textContent.includes('PSOcoated_v3.icc'));
  assert.equal(await page.locator('#kit-library').inputValue(),'pso_coated_v3_fogra51');
  assert.match(await page.locator('#kit-acceptance-summary').innerText(),/1 zugeordnete Referenz fehlt/);assert.match(await page.locator('[data-library-row="0"]').innerText(),/Nicht akzeptiert/);
  assert.equal(await page.locator('#kit-calculate').isDisabled(),true);assert.equal(await page.locator('#kit-json').isDisabled(),true);
  await page.locator('#prepare').screenshot({path:path.join(out,'membership-rejected.png')});
  const download=page.waitForEvent('download');await page.locator('#kit-export').click();const dl=await download,draft=path.join(out,'draft.zip');await dl.saveAs(draft);
  const names=JSON.parse(execFileSync('python3',['-c','import zipfile,json,sys;print(json.dumps(zipfile.ZipFile(sys.argv[1]).namelist()))',draft],{encoding:'utf8'}));assert.ok(names.includes('library-check.json'));assert.equal(names.some(n=>n.startsWith('palettes/')),false);assert.equal(names.includes('colours.clarus.json'),false);
  await page.getByRole('button',{name:'Farbe 1 entfernen',exact:true}).click();assert.match(await page.locator('#kit-acceptance-title').innerText(),/Für diese Bibliothek akzeptiert/);assert.equal(await page.locator('#kit-calculate').isEnabled(),true);
  await page.locator('#kit-calculate').click();await page.waitForSelector('#kit-ba .ba-card',{timeout:45000});assert.equal(await page.locator('#kit-ba .ba-card').count(),2);
  await page.locator('#prepare').screenshot({path:path.join(out,'membership-accepted.png')});
  await page.locator('#guide-material').selectOption('uncoated');assert.equal(await page.locator('#kit-ba').isVisible(),false);await page.locator('#guide-apply').click();await page.waitForFunction(()=>document.querySelector('#kit-profile-status').textContent.includes('PSOuncoated_v3_FOGRA52.icc'));assert.equal(await page.locator('#kit-calculate').isDisabled(),true);
  await page.locator('#guide-instruction').selectOption('name');await page.locator('#guide-profile_name').fill('TextileRGB_FOGRA58.icc');await page.locator('#guide-apply').click();await page.waitForFunction(()=>document.querySelector('#kit-profile-status').textContent.includes('TextileRGB_FOGRA58.icc'));assert.match(await page.locator('#kit-acceptance-summary').innerText(),/fehlt eine zugeordnete Bibliotheksliste/);assert.equal(await page.locator('#kit-calculate').isDisabled(),true);
  await page.locator('#kit-import').setInputFiles(draft);await page.waitForFunction(()=>document.querySelector('#kit-colours').children.length===3&&!document.querySelector('#kit-import').disabled);assert.equal(await page.locator('#kit-calculate').isDisabled(),true);assert.match(await page.locator('[data-library-row="0"]').innerText(),/Nicht akzeptiert/);
  await page.setViewportSize({width:390,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#kit-acceptance').screenshot({path:path.join(out,'membership-mobile.png')});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',checks:['Orange excluded from PSO51 after global address assignment','B/A and Clarus blocked for mixed palette','Draft export excludes all palette formats','Removing failed colour enables actual ICC B/A','Material change invalidates result and checks membership again','Final FOGRA58 cannot use beta membership','Draft import recomputes rejection','390px mobile view fits'],page_errors:errors},null,2));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
