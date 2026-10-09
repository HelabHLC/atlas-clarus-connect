'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.env.IMAGE_TEST_OUTPUT||'/tmp/atlas-image-projects-browser');fs.mkdirSync(out,{recursive:true});
const target=path.resolve(process.env.IMAGE_PROJECTS_HTML||path.join(root,'browser-bundle/build-images/atlas-clarus-browser-bundle/index.html'));
const fixture=path.join(__dirname,'fixtures/image-project-start.png'),kit=require('./fixtures/colour-kit-030-two-greens.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  const done=async prefix=>{await page.waitForFunction(p=>(document.getElementById('ip-status').textContent.startsWith(p)||document.getElementById('ip-status').dataset.error==='true')&&!document.getElementById('ip-import').disabled,prefix);assert((await page.locator('#ip-status').innerText()).startsWith(prefix),await page.locator('#ip-status').innerText());};
  async function save(button,name){const [d]=await Promise.all([page.waitForEvent('download'),page.locator(button).click()]);const p=path.join(out,name);await d.saveAs(p);return p;}
  const upload=(selector,value)=>page.locator(selector).setInputFiles({name:'image-project.clarus.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
  await page.goto(pathToFileURL(target).href+'#colour-projects');await page.waitForFunction(()=>!document.getElementById('cp-new').disabled);
  await page.locator('#cp-new-name').fill('Startup logo palette');await page.locator('#cp-new').click();await page.waitForFunction(()=>document.getElementById('cp-status').textContent.startsWith('Project created'));
  await page.locator('#cp-set-name').fill('Recorded greens');await upload('#cp-add-json',kit);await page.waitForFunction(()=>document.getElementById('cp-status').textContent.startsWith('Colour set added'));
  await page.locator('a[href="#image-projects"]').click();await page.waitForFunction(()=>!document.getElementById('ip-image').disabled);
  await page.locator('#ip-name').fill('Our startup image');await page.locator('#ip-attach').check();await page.locator('#ip-image').setInputFiles(fixture);await done('Original image retained');
  const initial=JSON.parse(fs.readFileSync(await save('#ip-json','initial.json')));assert.equal(initial.history.length,0);assert.equal(initial.original.file_sha256,sha(fs.readFileSync(fixture)));assert(initial.colour_project);
  await page.waitForFunction(()=>!document.getElementById('ip-image').disabled);await page.locator('#ip-canvas').scrollIntoViewIfNeeded();const box=await page.locator('#ip-canvas').boundingBox();await page.mouse.click(box.x+box.width*50/320,box.y+box.height*50/200);
  assert.equal(await page.locator('#ip-match').inputValue(),'#3D7B19');assert((await page.locator('#ip-sample').innerText()).includes('H130_L045_C055'));
  await page.locator('#ip-replacement').fill('#112233');await page.locator('#ip-note').fill('Darker green for the logo.');await page.locator('#ip-recolour').click();await done('Image change recorded');
  const recoloured=JSON.parse(fs.readFileSync(await save('#ip-json','recoloured.json')));assert.equal(recoloured.history[0].changed_pixels,20800);
  // Drag-to-rectangle is an actual pointer interaction; numeric controls refine it.
  await page.waitForFunction(()=>!document.getElementById('ip-image').disabled);await page.locator('#ip-canvas').scrollIntoViewIfNeeded();const b=await page.locator('#ip-canvas').boundingBox();await page.mouse.move(b.x+b.width*20/320,b.y+b.height*20/200);await page.mouse.down();await page.mouse.move(b.x+b.width*100/320,b.y+b.height*100/200,{steps:5});await page.mouse.up();
  assert(Number(await page.locator('#ip-width').inputValue())<320);
  for(const [id,v]of [['ip-x',20],['ip-y',20],['ip-width',130],['ip-height',160]])await page.locator('#'+id).fill(String(v));
  await page.locator('#ip-height').blur();await page.locator('#ip-mode').selectOption('area');await page.locator('#ip-note').fill('Remove the green block while preserving its history.');await page.locator('#ip-transparent').click();await done('Image change recorded');
  const removed=JSON.parse(fs.readFileSync(await save('#ip-json','removed.json')));assert.equal(removed.history[1].changed_pixels,20800);
  await page.locator('#ip-undo').click();await done('Image change recorded');let p=JSON.parse(fs.readFileSync(await save('#ip-json','undo.json')));assert.equal(p.history.at(-1).after_rgba_sha256,recoloured.history[0].after_rgba_sha256);
  await page.locator('#ip-undo').click();await done('Image change recorded');p=JSON.parse(fs.readFileSync(await save('#ip-json','original-restored.json')));assert.equal(p.history.at(-1).after_rgba_sha256,initial.original.rgba_sha256);
  await page.locator('#ip-redo').click();await done('Image change recorded');await page.locator('#ip-redo').click();await done('Image change recorded');
  const latest=JSON.parse(fs.readFileSync(await save('#ip-json','latest.json'))),zip=await save('#ip-zip','project.zip');assert.equal(latest.history.length,6);assert.deepEqual(latest.original,initial.original);assert.deepEqual(latest.colour_project,initial.colour_project);
  await save('#ip-png','edited.png');
  // A separate browser session plays the role of a colleague.
  const colleagueContext=await browser.newContext({acceptDownloads:true}),colleague=await colleagueContext.newPage();await colleague.goto(pathToFileURL(target).href+'#image-projects');await colleague.waitForFunction(()=>!document.getElementById('ip-import').disabled);
  await colleague.locator('#ip-import').setInputFiles(zip);await colleague.waitForFunction(()=>document.getElementById('ip-status').textContent.startsWith('Image project opened'));
  await colleague.locator('#ip-undo').click();await colleague.waitForFunction(()=>document.getElementById('ip-status').textContent.startsWith('Image change recorded'));
  const [dl]=await Promise.all([colleague.waitForEvent('download'),colleague.locator('#ip-json').click()]);const returned=path.join(out,'colleague-return.json');await dl.saveAs(returned);const returnedData=JSON.parse(fs.readFileSync(returned));assert.equal(returnedData.history.length,7);assert.deepEqual(returnedData.history.slice(0,6),latest.history);
  await page.locator('#ip-import').setInputFiles(returned);await done('Image project opened');
  await upload('#ip-import',latest);await page.waitForFunction(()=>document.getElementById('ip-status').dataset.error==='true');assert((await page.locator('#ip-status').innerText()).includes('older'));
  const tampered=structuredClone(returnedData);tampered.original.file_sha256='0'.repeat(64);await upload('#ip-import',tampered);await page.waitForFunction(()=>document.getElementById('ip-status').dataset.error==='true');
  const preserved=JSON.parse(fs.readFileSync(await save('#ip-json','after-invalid.json')));assert.deepEqual(preserved,returnedData);
  await page.evaluate(text=>{const dt=new DataTransfer();dt.items.add(new File([text],'image-project.clarus.json',{type:'application/json'}));document.getElementById('ip-drop').dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));},JSON.stringify(returnedData));await done('Image project opened');
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  for(const viewport of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow');assert(await page.locator('#ip-zip').isVisible());await page.screenshot({path:path.join(out,`viewport-${viewport.width}.png`),fullPage:true});}
  // JPEG EXIF orientation is frozen into the recorded RGBA dimensions.
  await colleague.locator('#ip-image').setInputFiles(path.join(__dirname,'fixtures/image-project-rotated.jpg'));
  await colleague.waitForFunction(()=>document.getElementById('ip-status').textContent.startsWith('Original image retained'));
  const [jpegDownload]=await Promise.all([colleague.waitForEvent('download'),colleague.locator('#ip-json').click()]);
  const jpegPath=path.join(out,'oriented-jpeg.json');await jpegDownload.saveAs(jpegPath);const jpeg=JSON.parse(fs.readFileSync(jpegPath));
  assert.equal(jpeg.original.mime,'image/jpeg');assert.equal(jpeg.original.width,200);assert.equal(jpeg.original.height,320);
  assert.equal(jpeg.original.file_sha256,sha(fs.readFileSync(path.join(__dirname,'fixtures/image-project-rotated.jpg'))));
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  const report={status:'PASS',image_upload_and_linked_palette:true,jpeg_orientation_and_original_retained:true,click_sample_and_drag_rectangle:true,recolour_and_transparency:true,undo_redo_keeps_history:true,separate_browser_colleague_zip_roundtrip:true,returned_history_extends_original:true,invalid_or_older_import_keeps_workspace:true,viewports:[1440,390,844],native_adobe_validation:'NOT_TESTED'};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await colleagueContext.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
