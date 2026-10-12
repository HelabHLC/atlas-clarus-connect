'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
require('../src/image-project-codecs.js');require('../src/palette-export.js');
const C=globalThis.ATLAS_IMAGE_CODECS,E=globalThis.ATLAS_CLARUS_EXPORTS;
const root=path.resolve(__dirname,'../..'),out=process.env.REDUCTION_TEST_OUTPUT||'/tmp/atlas-colour-reduction';fs.mkdirSync(out,{recursive:true});
const target=process.env.REDUCTION_HTML||path.join(root,'browser-bundle/build-colour-reduction/atlas-clarus-browser-bundle/index.html');
const sha=b=>createHash('sha256').update(b).digest('hex');
function unzip(bytes){
 const file=path.join(out,'inspect-'+sha(bytes)+'.zip');fs.writeFileSync(file,bytes);
 const data=JSON.parse(execFileSync('python3',['-c','import sys,zipfile,json,base64; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(json.dumps({n:base64.b64encode(z.read(n)).decode() for n in z.namelist()}))',file],{maxBuffer:32*1024*1024}));
 return Object.fromEntries(Object.entries(data).map(([k,v])=>[k,new Uint8Array(Buffer.from(v,'base64'))]));
}
// A crisp motif with a small accent and a transparent/partly opaque background.
const width=360,height=280,rgba=new Uint8Array(width*height*4);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 let rgb=[30,42,58],alpha=0;
 if(x>35&&x<325&&y>35&&y<245){rgb=y<105?[224,126,57]:y<175?[51,92,122]:[218,205,168];alpha=255;}
 if(x>280&&x<305&&y>195&&y<225)rgb=[61,123,25];
 if(x===36||x===324)alpha=128;
 rgba.set([...rgb,alpha],(y*width+x)*4);
}
const fixture=path.join(out,'textile-motif.png');fs.writeFileSync(fixture,C.png(width,height,rgba));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
  const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  const done=async(prefix)=>{await page.waitForFunction(p=>{const s=document.getElementById('cr-status');return (s.textContent.startsWith(p)||s.dataset.error==='true')&&document.getElementById('cr-cancel').disabled;},prefix,{timeout:60000});assert((await page.locator('#cr-status').innerText()).startsWith(prefix),await page.locator('#cr-status').innerText());};
  async function save(selector,name){const [d]=await Promise.all([page.waitForEvent('download'),page.locator(selector).click()]);const file=path.join(out,name);await d.saveAs(file);return fs.readFileSync(file);}
  await page.goto(pathToFileURL(target).href+'#colour-reduction');await page.waitForFunction(()=>!document.getElementById('cr-file').disabled);
  await page.locator('#cr-file').setInputFiles(fixture);await done('Source ready');
  async function pixelAt(x,y,action='click'){
    const canvas=page.locator('#cr-before');await canvas.scrollIntoViewIfNeeded();const b=await canvas.boundingBox();
    const px=b.x+(x+.5)*b.width/width,py=b.y+(y+.5)*b.height/height;
    if(action==='hover')await page.mouse.move(px,py);else await page.mouse.click(px,py);
  }
  // Magnification is from source pixels, never from a CSS-scaled preview.
  assert(await page.locator('#cr-pixel-inspector').isHidden());
  await pixelAt(290,210,'hover');assert(await page.locator('#cr-loupe-hover').isVisible());
  assert((await page.locator('#cr-loupe-hover-value').innerText()).includes('X 290 · Y 210 · #3D7B19'));
  await page.mouse.move(0,0);assert(await page.locator('#cr-loupe-hover').isHidden());
  await pixelAt(0,0);assert(await page.locator('#cr-pixel-protect').isDisabled());
  const transparent=await page.locator('#cr-pixel-value').innerText();assert(transparent.includes('Transparent'));
  await page.locator('#cr-pixel-left').click();assert.equal(await page.locator('#cr-pixel-value').innerText(),transparent,'edge clamped');
  await page.locator('#cr-loupe-detail').click({position:{x:12,y:12}});assert.equal(await page.locator('#cr-pixel-value').innerText(),transparent,'padding not sampled');
  // Partially transparent values are reported from the same frozen decoded input.
  const partial=await page.evaluate(async bytes=>Array.from((await ATLAS_IMAGE_PROJECTS.decodeSource(Uint8Array.from(bytes))).rgba.slice((80*360+36)*4,(80*360+36)*4+4)),Array.from(fs.readFileSync(fixture)));
  await pixelAt(36,80);assert((await page.locator('#cr-pixel-value').innerText()).includes('Input RGB '+partial.slice(0,3).join(' / ')));assert((await page.locator('#cr-pixel-value').innerText()).includes('Alpha 128/255'));
  await page.setViewportSize({width:390,height:844});await pixelAt(290,210);
  assert.equal(await page.locator('#cr-lock-hex').inputValue(),'#3D7B19');
  assert((await page.locator('#cr-pixel-reference').innerText()).includes('H130_L045_C055'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'magnifier mobile overflow');
  const grid=page.locator('#cr-loupe-detail');await grid.scrollIntoViewIfNeeded();const gb=await grid.boundingBox();
  await grid.click({position:{x:6.5*gb.width/11,y:5.5*gb.height/11}});
  const gridSelection=await page.locator('#cr-pixel-value').innerText();
  assert(gridSelection.startsWith('X 291 · Y 210'),'Grid selection '+gridSelection+'; bounds '+JSON.stringify(gb));
  await page.locator('#cr-loupe-detail').press('ArrowLeft');await page.locator('#cr-loupe-detail').press('Shift+ArrowUp');
  assert((await page.locator('#cr-pixel-value').innerText()).startsWith('X 290 · Y 200'));
  await page.locator('#cr-pixel-right').click();assert((await page.locator('#cr-pixel-value').innerText()).startsWith('X 291 · Y 200'));
  await page.screenshot({path:path.join(out,'magnifier-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1100});
  await page.locator('#cr-k').fill('2');await page.locator('#cr-k').blur();await page.locator('#cr-pixel-protect').click();
  assert((await page.locator('#cr-locks').innerText()).includes('H130_L045_C055'));
  await page.locator('#cr-run').click();await done('Reduced preview ready');
  const files=unzip(new Uint8Array(await save('#cr-zip','reduced-2.zip'))),report=JSON.parse(Buffer.from(files['reduction.json'])),manifest=JSON.parse(Buffer.from(files['reduction-package-manifest.json']));
  assert.equal(report.requested_colours,2);assert(report.used_rgb_colours<=2);assert(report.protected_ids.includes(4966));assert.equal(report.source.file_sha256,sha(fs.readFileSync(fixture)));
  assert.deepEqual(Buffer.from(files['original.png']),fs.readFileSync(fixture));
  for(const [name,digest]of Object.entries(manifest.files))assert.equal(sha(files[name]),digest,name);
  // Independent reconstruction from retained frozen input and u16 palette indices.
  const input=files['input-rgba.bin'],index=files['output-palette-index.u16le'],rebuilt=input.slice(),view=new DataView(index.buffer,index.byteOffset,index.byteLength);
  for(let p=0;p<width*height;p++){const j=view.getUint16(p*2,true);if(input[p*4+3]){assert(j<report.palette.length);rebuilt.set(report.palette[j].rgb,p*4);}else assert.equal(j,65535);}
  assert.equal(sha(rebuilt),report.output_rgba_sha256);assert.equal(sha(input),report.source.input_rgba_sha256);
  fs.writeFileSync(path.join(out,'expected-rgba.bin'),rebuilt);fs.writeFileSync(path.join(out,'reduced.png'),files['reduced.png']);
  for(const [format,name]of [['gpl','palette.gpl'],['ase','palette.ase'],['css','palette.css'],['tokens','palette.tokens.json']]){await page.locator('#cr-format').selectOption(format);assert.deepEqual(await save('#cr-palette',name),Buffer.from(files[name]));}
  assert.deepEqual(E.readAse(files['palette.ase']).map(c=>c.rgb),report.palette.map(c=>c.rgb));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'desktop overflow');
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  if(process.env.REDUCTION_EMIT_SCREENSHOT==='1')console.log('REDUCTION_SCREENSHOT_BASE64='+Buffer.from(await page.screenshot({type:'jpeg',quality:60,fullPage:true})).toString('base64'));
  for(const viewport of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(out,'viewport-'+viewport.width+'.png'),fullPage:true});}
  await page.setViewportSize({width:1440,height:1100});
  // Actual touch events select pixels without preventing normal page scrolling.
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),tp=await touch.newPage();
  await tp.goto(pathToFileURL(target).href+'#colour-reduction');await tp.waitForFunction(()=>!document.getElementById('cr-file').disabled);
  await tp.locator('#cr-file').setInputFiles(fixture);await tp.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Source ready'));
  const tc=tp.locator('#cr-before');await tc.scrollIntoViewIfNeeded();const tb=await tc.boundingBox();
  await tp.touchscreen.tap(tb.x+290.5*tb.width/width,tb.y+210.5*tb.height/height);
  assert((await tp.locator('#cr-pixel-value').innerText()).startsWith('X 290 · Y 210'));assert(await tp.locator('#cr-loupe-hover').isHidden());
  await tp.locator('#cr-pixel-protect').tap();assert((await tp.locator('#cr-locks').innerText()).includes('H130_L045_C055'));await touch.close();
  await page.locator('#cr-k').fill('256');await page.locator('#cr-k').blur();assert(await page.locator('#cr-zip').isDisabled());assert(await page.locator('#cr-after').isHidden());
  // Use 256 distinct actual master RGBs; none lost to the transparency sentinel.
  const dataText=fs.readFileSync(path.join(path.dirname(target),'assets/atlas-data.js'),'utf8');
  const vm=require('node:vm'),scope={window:{}};vm.runInNewContext(dataText,scope);
  const doc=Object.values(scope.window).find(v=>v&&v.colors);assert(doc);
  const seen=new Set(),palette=doc.colors.filter(c=>{const key=c.rgb.join();if(seen.has(key))return false;seen.add(key);return true;}).slice(0,256);
  const full=Uint8Array.from([...palette.flatMap(c=>[...c.rgb,255]),10,20,30,0]);
  await page.locator('#cr-file').setInputFiles({name:'256.png',mimeType:'image/png',buffer:Buffer.from(C.png(257,1,full))});await done('Source ready');
  assert(await page.locator('#cr-pixel-inspector').isHidden(),'selection cleared for new source');
  await page.locator('#cr-run').click();await done('Reduced preview ready');
  const pack=unzip(new Uint8Array(await save('#cr-zip','reduced-256.zip'))),large=JSON.parse(Buffer.from(pack['reduction.json']));
  assert.equal(large.used_rgb_colours,256);assert.equal(E.readAse(pack['palette.ase']).length,256);
  for(let i=1;i<=4;i++){const d=JSON.parse(Buffer.from(pack['palette-part-'+i+'.clarus.json']));assert.equal(E.parseClarus(d,doc.colors,large.master_sha256).colorIds.length,64);}
  const iv=new DataView(pack['output-palette-index.u16le'].buffer);assert.equal(iv.getUint16(256*2,true),65535);
  const used=new Set(Array.from({length:256},(_,i)=>iv.getUint16(i*2,true)));assert.equal(used.size,256);assert(used.has(255));
  // Invalid upload and cancellation preserve the source and leave no stale export.
  await page.locator('#cr-file').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('bad')});await page.waitForFunction(()=>document.getElementById('cr-status').dataset.error==='true');assert((await page.locator('#cr-source').innerText()).includes('256.png'));
  await page.evaluate(()=>{document.getElementById('cr-run').click();document.getElementById('cr-cancel').click();});assert(await page.locator('#cr-zip').isDisabled());
  // Existing project bridge is read-only and carries complete history in export.
  await page.goto(pathToFileURL(target).href+'#image-projects');await page.waitForFunction(()=>!document.getElementById('ip-image').disabled);
  await page.locator('#ip-image').setInputFiles(fixture);await page.waitForFunction(()=>document.getElementById('ip-status').textContent.startsWith('Original image retained'));
  await page.locator('#ip-mode').selectOption('area');await page.locator('#ip-note').fill('Test preparation');await page.locator('#ip-recolour').click();await page.waitForFunction(()=>document.getElementById('ip-status').textContent.startsWith('Image change recorded'));
  const before=await page.evaluate(()=>window.ATLAS_IMAGE_PROJECTS_UI.readCurrent());
  await page.evaluate(()=>location.hash='#colour-reduction');await page.locator('#cr-current').click();await done('Source ready');await page.locator('#cr-run').click();await done('Reduced preview ready');
  const derived=unzip(new Uint8Array(await save('#cr-zip','from-project.zip')));
  assert.deepEqual(JSON.parse(Buffer.from(derived['source-image-project.clarus.json'])),before);assert.deepEqual(await page.evaluate(()=>window.ATLAS_IMAGE_PROJECTS_UI.readCurrent()),before);
  // Imported project verification failure must keep the previous reduction source.
  const bad=structuredClone(before);bad.original.file_sha256='0'.repeat(64);
  await page.locator('#cr-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.waitForFunction(()=>document.getElementById('cr-status').dataset.error==='true');assert((await page.locator('#cr-source').innerText()).includes('verified current'));
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  const evidence={status:'PASS',browser:await browser.version(),input_loupe:{original_rgba:true,hover:true,pixel_grid:true,keyboard:true,touch_emulation:true,edge_padding:true,transparent_rejected:true,partial_alpha:true,source_reset:true},protected_accent:true,alpha_preserved:true,per_pixel_reconstruction:true,source_project_unchanged:true,exports:['PNG','GPL','ASE','CSS','Tokens','Clarus JSON chunks'],full_256_colour_case:true,stale_export_disabled:true,cancel:true,viewports:[1440,390,844],offline_requests:0,physical_devices:'NOT_TESTED',textile_print:'NOT_TESTED'};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
