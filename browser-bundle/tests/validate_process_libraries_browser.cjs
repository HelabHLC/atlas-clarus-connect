'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const target=path.resolve(process.env.PROCESS_HTML||path.join(__dirname,'../build-process-libraries/atlas-clarus-browser-bundle/index.html')),fixtures=process.env.PROCESS_TEST_OUTPUT||'/tmp/atlas-process-libraries-core',out=process.env.PROCESS_BROWSER_OUTPUT||'/tmp/atlas-process-libraries-browser';fs.mkdirSync(out,{recursive:true});
const views=require('../../hover-library/data/views.json').views;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});const errors=[];
 try{
  const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(target).href+'#library');await page.waitForFunction(()=>document.querySelectorAll('#library-view option').length>0);
  for(const select of ['#library-view','#cr-library']){
   const ids=await page.locator(select+' option').evaluateAll(os=>os.map(o=>o.value));assert(!ids.includes('solid_c'));assert(!ids.includes('solid_u'));assert(!ids.includes('xgc'));for(const id of Object.keys(views).filter(id=>views[id].type==='SOURCE_DECLARED_GAMUT_MEMBERSHIP'))assert(ids.includes(id));
  }
  for(const id of Object.keys(views).filter(id=>views[id].type==='SOURCE_DECLARED_GAMUT_MEMBERSHIP')){
   await page.locator('#library-view').selectOption(id);assert((await page.locator('#library-status').innerText()).includes(views[id].ids.length.toLocaleString('en')));
  }
  await page.goto(pathToFileURL(target).href+'#colour-reduction');await page.waitForFunction(()=>!document.getElementById('cr-file').disabled);
  for(const id of ['solid_c','solid_u','xgc','pso_coated_v3_fogra51','pso_uncoated_v3_fogra52','pso_fogra51_fogra52_common']){
   await page.locator('#cr-job-import').setInputFiles(path.join(fixtures,id+'.zip'));await page.waitForFunction(()=>!document.getElementById('cr-job-import').disabled&&(document.getElementById('cr-status').textContent.startsWith('Complete reduction job restored')||document.getElementById('cr-status').dataset.error==='true'));assert.match(await page.locator('#cr-status').innerText(),/^Complete reduction job restored/);
   assert.equal(await page.locator('#cr-library').inputValue(),id);const originalPixels=await page.locator('#cr-after').evaluate(c=>c.toDataURL());
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#cr-zip').click()]);const saved=path.join(out,id+'.zip');await download.saveAs(saved);
   await page.locator('#cr-job-import').setInputFiles(saved);await page.waitForFunction(()=>!document.getElementById('cr-job-import').disabled&&(document.getElementById('cr-status').textContent.startsWith('Complete reduction job restored')||document.getElementById('cr-status').dataset.error==='true'));assert.match(await page.locator('#cr-status').innerText(),/^Complete reduction job restored/);assert.equal(await page.locator('#cr-after').evaluate(c=>c.toDataURL()),originalPixels);
   if(views[id].hidden_from_new_selection){assert.match(await page.locator('#cr-library option:checked').textContent(),/retained/);await page.locator('#cr-library').selectOption('core');assert.equal(await page.locator('#cr-library option[value="'+id+'"]').count(),0);}
   console.log('PASS browser reopen, export, second reopen, unchanged output:',id);
  }
  await page.goto(pathToFileURL(target).href+'#library');await page.locator('#library-view').selectOption('pso_coated_v3_fogra51');await page.screenshot({path:path.join(out,'process-library-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS public selection hides legacy; native job restore reveals it only for retained work; desktop and narrow view');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
