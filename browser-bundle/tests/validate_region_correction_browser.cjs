'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
require('../src/image-project-codecs.js');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const html=process.env.ATLAS_TEST_HTML||path.resolve(__dirname,'../build-library-reference-preview/atlas-clarus-browser-bundle/index.html');
 await page.goto(pathToFileURL(html).href+'#colour-reduction');await page.waitForFunction(()=>!document.getElementById('cr-file').disabled);
 assert.equal(await page.locator('#cr-k').inputValue(),'32');
 const rgba=new Uint8Array(16*8*4);for(let p=0;p<128;p++)rgba.set([p*17%256,p*37%256,p*61%256,p===127?0:p===126?128:255],p*4);
 const source=Buffer.from(ATLAS_IMAGE_CODECS.png(16,8,rgba));fs.writeFileSync('/tmp/atlas-correction-source.png',source);
 await page.locator('#cr-file').setInputFiles({name:'motif.png',mimeType:'image/png',buffer:source});
 await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Source ready'));
 const ready=()=>page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Reduced preview ready'));
 const select=async(x0,y0,x1,y1)=>{
   await page.locator('#cr-after').evaluate((c,r)=>{for(const [x,y]of [[r[0],r[1]],[r[2],r[3]]]){const b=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent('pointerup',{isPrimary:true,button:0,clientX:b.left+(x+.5)*b.width/c.width,clientY:b.top+(y+.5)*b.height/c.height}));}},[x0,y0,x1,y1]);
 };
 const zip=async(name)=>{const [d]=await Promise.all([page.waitForEvent('download'),page.locator('#cr-zip').click()]);await d.saveAs('/tmp/atlas-correction-'+name+'.zip');};
 await page.locator('#cr-run').click();await ready();await zip('baseline');
 await select(0,0,2,1);assert.match(await page.locator('#cr-edit-pixel').innerText(),/Independent full-master assignment/);
 await page.locator('#cr-error-show').check();assert(await page.locator('#cr-error-map').isVisible());
 await page.locator('#cr-edit-apply').click();await ready();assert.match(await page.locator('#cr-edit-status').innerText(),/region pixels changed/);await zip('library');
 await page.locator('#cr-cleanup').click();await zip('library-cleanup');
 await page.locator('#cr-protection-mode').selectOption('ORIGINAL_RGBA');await page.locator('#cr-run').click();await ready();
 await select(0,0,2,1);await page.locator('#cr-edit-apply').click();await ready();await zip('original');
 const [png]=await Promise.all([page.waitForEvent('download'),page.locator('#cr-png').click()]);await png.saveAs('/tmp/atlas-correction-direct.png');
 // 127 distinct visible originals cannot fit in 32 slots. Keep the last successful result and masks.
 await select(0,0,15,7);await page.locator('#cr-edit-apply').click();await page.waitForFunction(()=>document.getElementById('cr-edit-status').textContent.startsWith('Correction conflict:'));
 assert(await page.locator('#cr-zip').isEnabled());await zip('conflict-retained');
 for(const width of [390,768]){await page.setViewportSize({width,height:900});assert(await page.locator('#cr-edit-apply').isVisible());}
 await page.screenshot({path:'/tmp/atlas-region-correction-mobile.png',fullPage:true});
 execFileSync('python3',[path.resolve(__dirname,'verify_region_correction_exports.py')],{stdio:'inherit'});
 assert.deepEqual(errors,[]);console.log('PASS result selection, inspection, correction modes, conflict rollback, RGB map and actual downloads');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
