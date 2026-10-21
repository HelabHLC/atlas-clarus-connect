'use strict';
const {chromium}=require('../browser-bundle/tests/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),data=JSON.parse(fs.readFileSync(path.join(root,'hover-library/data/colors.json')));
data.views=JSON.parse(fs.readFileSync(path.join(root,'hover-library/data/views.json'))).views;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://camera.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head></head><body><label>Image<input id="picker-file" type="file" accept="image/png,image/jpeg"></label><input id="json" type="file" accept="application/json"><select id="library-view"><option value="core">Core</option></select></body></html>'}));
 await page.goto('https://camera.test/');
 await page.evaluate(data=>{
  window.ATLAS_CLARUS_DATA=data;window.AndroidExport={};window.received=null;window.records=[];window.stopped=0;
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;window.scene=canvas;
  window.paint=colour=>{canvas.getContext('2d').fillStyle=colour;canvas.getContext('2d').fillRect(0,0,640,480);};paint('rgb(80,100,120)');
  let n=0;const animate=()=>{n++;canvas.getContext('2d').fillRect(0,0,1,1);requestAnimationFrame(animate);};animate();
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async request=>{
   if(window.rejectCamera)throw Error('Denied');
   const stream=canvas.captureStream(30);window.testStream=stream;const track=stream.getVideoTracks()[0];const stop=track.stop.bind(track);track.stop=()=>{window.stopped++;stop();};track.getCapabilities=()=>({torch:true});track.getSettings=()=>({torch:!!window.torchRequested});track.applyConstraints=async c=>{window.torchRequested=c.advanced[0].torch;};
   if(window.deferCamera)await new Promise(resolve=>window.resolveCamera=resolve);return stream;
  }},configurable:true});
  document.getElementById('picker-file').onchange=e=>{window.received=e.target.files[0];};
  document.addEventListener('atlas-camera-selection',e=>records.push(e.detail));
 },data);
 await page.addScriptTag({path:path.join(__dirname,'live-camera-core.js')});
 await page.addScriptTag({path:path.join(__dirname,'live-camera.js')});
 assert.equal(await page.locator('.atlas-live-button').count(),1);
 await page.locator('.atlas-live-button').click();
 await page.waitForFunction(()=>!document.querySelector('[data-lock]').disabled).catch(async error=>{console.error(await page.evaluate(()=>({readout:document.querySelector('output')?.textContent,video:{width:document.querySelector('video')?.videoWidth,ready:document.querySelector('video')?.readyState},stream:window.testStream?.getTracks().map(t=>({state:t.readyState,enabled:t.enabled}))})));throw error;});
 const liveText=await page.locator('output').innerText(),liveHex=liveText.match(/^#[0-9A-F]{6}/)[0];
 const observed=[1,3,5].map(i=>parseInt(liveHex.slice(i,i+2),16));
 observed.forEach((v,i)=>assert.ok(Math.abs(v-[80,100,120][i])<=3,'video decoding remains near the synthetic scene')); // Canvas capture can pass through YUV.
 const lib=Object.entries(data.views).find(([id,v])=>id!=='core'&&!v.hidden_from_new_selection&&v.ids.length>0)[0];
 await page.locator('[data-library]').selectOption(lib);
 await page.locator('[data-lock]').click();const fixed=await page.locator('output').innerText(),fixedHex=fixed.match(/^#[0-9A-F]{6}/)[0];
 await page.evaluate(()=>paint('rgb(200,30,40)'));
 await page.waitForTimeout(600);assert.equal(await page.locator('output').innerText(),fixed);
 await page.locator('[data-use]').click();await page.waitForFunction(()=>window.records.length===1);
 const saved=await page.evaluate(()=>({record:records[0],name:received.name,type:received.type,stopped,hidden:document.querySelector('.atlas-camera').hidden}));
 assert.equal(saved.record.source_hex,fixedHex);assert.equal(saved.record.library_id,lib);assert.equal(saved.type,'image/png');assert.equal(saved.hidden,true);assert.ok(saved.stopped>0);assert.ok(data.views[lib].ids.map(Number).includes(saved.record.atlas_row_id));
 // Decode the actual transferred PNG: locking must preserve the same scene, not the later live frame.
 const pixels=await page.evaluate(async()=>{const img=await createImageBitmap(received),c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);return [...c.getContext('2d').getImageData(320,240,1,1).data];});assert.deepEqual(pixels,[...saved.record.source_rgb,255]);
 await page.locator('.atlas-live-button').click();await page.waitForFunction(()=>!document.querySelector('[data-lock]').disabled);
 await page.locator('[data-lock]').click();await page.locator('[data-torch]').click();
 await page.waitForFunction(()=>window.torchRequested===true);assert.equal(await page.locator('[data-use]').isDisabled(),true);assert.equal(await page.locator('[data-torch]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-lock]').click();await page.locator('[data-use]').click();await page.waitForFunction(()=>records.length===2);assert.equal(await page.evaluate(()=>records[1].lamp_on),true);
 await page.evaluate(()=>window.rejectCamera=true);await page.locator('.atlas-live-button').click();await page.waitForFunction(()=>document.querySelector('output').textContent.includes('denied'));assert.equal(await page.locator('[data-lock]').isDisabled(),true);await page.locator('[data-close]').click();
 await page.evaluate(()=>{window.rejectCamera=false;window.deferCamera=true;});await page.locator('.atlas-live-button').click();await page.waitForFunction(()=>!!window.resolveCamera);await page.locator('[data-close]').click();await page.evaluate(()=>resolveCamera());await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>testStream.getTracks()[0].readyState),'ended');
 assert.deepEqual(errors,[]);console.log('PASS: live RGB, selected-library matching, fix while scene changes, exact PNG handoff, torch resets lock and records lighting, cancellation, denial, late stream cleanup');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
