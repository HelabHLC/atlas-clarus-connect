const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});
const unzip=(file,name)=>execFileSync('python3',['-c','import zipfile,sys;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]))',file,name],{maxBuffer:20*1024*1024});
async function download(page,button,name){const done=page.waitForEvent('download');await button.click();const file=path.join(out,name);await (await done).saveAs(file);return file;}
async function language(page,value){await page.locator('#kit-language').selectOption(value);await page.waitForFunction(v=>document.documentElement.lang===v,value);}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ATLAS_TEST_CHROMIUM});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('file://'+root+'/startup/index.html?lang=de');
  await page.locator('#kit-name').fill('Plakat');await page.locator('#kit-label').fill('Druck vorbereiten');await page.locator('#kit-add').click();
  await page.locator('#guide-product').selectOption('flyer');await page.locator('#guide-material').selectOption('coated');await page.locator('#guide-material_detail').fill('Gestrichenes Papier');await page.locator('#guide-process').selectOption('offset');await page.locator('#guide-apply').click();
  await page.waitForFunction(()=>document.querySelector('#kit-profile-status').textContent.includes('PSOcoated_v3.icc'));
  await language(page,'en');assert.match(await page.locator('#prepare h2').innerText(),/Prepare for print/);
  assert.equal(await page.locator('#kit-name').inputValue(),'Plakat');assert.equal(await page.locator('#kit-colours input').inputValue(),'Druck vorbereiten');
  assert.match(await page.locator('#kit-acceptance-rows').innerText(),/Druck vorbereiten/);assert.equal(await page.locator('.advice-card h4').innerText(),'Druck vorbereiten');
  const inquiry=await page.locator('#guide-inquiry').inputValue();assert.match(inquiry,/Hello/);assert.match(inquiry,/Material: Gestrichenes Papier/);assert.match(inquiry,/Printing process: Offset printing/);
  await page.locator('[data-tolerance]').fill('1');await page.locator('[data-tolerance]').press('Tab');assert.match(await page.locator('.advice-result').innerText(),/outside/);assert.equal(await page.locator('[data-confirm="0"]').isDisabled(),true);
  await page.locator('[data-tolerance]').fill('2');await page.locator('[data-tolerance]').press('Tab');await page.locator('[data-confirm="0"]').click();
  assert.match(await page.locator('#kit-acceptance-title').innerText(),/Accepted/);
  await page.locator('#kit-calculate').click();await page.waitForSelector('#kit-ba .ba-card',{timeout:45000});
  const before=await download(page,page.locator('#kit-export'),'english.zip');
  const beforeResult=await page.locator('#kit-ba').innerText();
  assert.match(beforeResult,/#E8682A/);assert.match(beforeResult,/Druck vorbereiten/);
  await language(page,'de');assert.equal(await page.locator('#kit-ba').isVisible(),true);assert.match(await page.locator('#prepare h2').innerText(),/Druck vorbereiten/);
  const after=await download(page,page.locator('#kit-export'),'german.zip');
  for(const file of ['project.json','print/output.icc','print/calculation.json','colour-advice.json','library-check.json','colours.clarus.json','accepted.clarus.json','palettes/source.ase','palettes/reference.ase','palettes/accepted.ase'])assert.deepEqual(unzip(before,file),unzip(after,file),file+' changed on language switch');
  const html=unzip(before,'farbkarte.html').toString();assert.match(html,/<html lang="en"/);assert.match(html,/Starting colour/);assert.match(html,/Confirmed selection/);assert.match(html,/data-user-content[^>]*>Plakat</);assert.match(html,/data-user-content[^>]*>Druck vorbereiten</);assert.match(html,/data-user-content[^>]*>Gestrichenes Papier</);assert.match(html,/class="ba-pair"/);assert.doesNotMatch(html,/Toleranz:|Druckbedingung:|Keine Verwendung/);
  assert.match(unzip(before,'read-me.txt').toString(),/COLOUR ADVICE/);
  await language(page,'en');assert.equal(await page.locator('#kit-ba').innerText(),beforeResult);
  await page.locator('#kit-import').setInputFiles(after);await page.waitForFunction(()=>document.querySelector('#kit-status').textContent.includes('Dossier opened'));
  assert.equal(await page.locator('#kit-language').inputValue(),'en');assert.equal(await page.locator('#kit-ba').isVisible(),false);assert.match(await page.locator('.advice-result').innerText(),/accepted/);
  await page.setViewportSize({width:390,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('[data-advice-row="0"]').screenshot({path:path.join(out,'english-mobile.png')});
  await page.setViewportSize({width:1360,height:1000});await page.locator('#prepare').screenshot({path:path.join(out,'english-workspace.png')});
  // Direct-reference report: true membership, no replacement/tolerance required.
  const direct=await page.evaluate(()=>{const K=ATLAS_STARTUP_CORE,d=ATLAS_CLARUS_DATA,ctx={colors:d.colors,views:d.views,master:d.master_sha256},r=d.colors.find(c=>c.ref==='H005_L050_C075'),doc=K.defaults(ctx.master);doc.name='Material';doc.print.library_id='pso_coated_v3_fogra51';doc.colours=[{label:'Plakat',kind:'atlas_reference',source_rgb:r.rgb,reference_id:r.id,assignment:null}];doc.advice={schema:ATLAS_COLOUR_ADVICE.SCHEMA,tolerance:null};return K.report(doc,ctx,null,null);});
  assert.match(direct,/No replacement colour required; tolerance is not needed/);assert.match(direct,/Direct reference selection/);assert.match(direct,/#E31470/);assert.match(direct,/>Plakat</);
  // Browser launcher language follows the child, without changing native colour state.
  await page.goto('file://'+root+'/index.html?lang=en#library');await page.waitForSelector('[data-advice-selected]');
  assert.match(await page.locator('[data-advice-selected]').innerText(),/selected colour/);
  const selected=await page.locator('#selection').innerText();await page.locator('[data-advice-selected]').click();
  let frame=page.frameLocator('.atlas-advice-dialog iframe');await frame.locator('#kit-status').filter({hasText:'Imported from Browser Edition'}).waitFor();assert.equal(await frame.locator('#kit-language').inputValue(),'en');
  await frame.locator('#kit-language').selectOption('de');await page.waitForFunction(()=>document.querySelector('#browser-advice-language').value==='de');assert.match(await page.locator('[data-close-advice]').innerText(),/Zurück/);
  await frame.locator('#kit-language').selectOption('en');await page.waitForFunction(()=>document.querySelector('#browser-advice-language').value==='en');
  await page.locator('[data-close-advice]').click();assert.equal(await page.locator('#selection').innerText(),selected);
  await page.goto('file://'+root+'/startup/index.html');assert.equal(await page.locator('#kit-language').inputValue(),'en');
  // URL selection still works when storage is unavailable.
  const isolated=await browser.newContext();await isolated.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('disabled')}}));const noStorage=await isolated.newPage();await noStorage.goto('file://'+root+'/startup/index.html?lang=en');assert.equal(await noStorage.locator('#kit-language').inputValue(),'en');await noStorage.locator('#kit-language').selectOption('de');assert.equal(await noStorage.locator('#kit-language').inputValue(),'de');await isolated.close();
  fs.writeFileSync(path.join(out,'english-card.html'),html);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'PASS',checks:['DE/EN dynamic guidance and tolerance states','User names and material preserved even when matching dictionary keys','Real ICC result and project/decision/palette/profile bytes unchanged by language switch','English inquiry, dossier notes and exported card','Reopen retains language and confirmed choice while invalidating calculation as before','Direct-reference membership needs no replacement tolerance','Browser launcher and iframe language sync; native selection unchanged','390px English layout','Preference persists; URL still works without storage'],errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
