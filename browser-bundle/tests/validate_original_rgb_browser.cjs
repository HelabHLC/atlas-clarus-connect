'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
require('../src/image-project-codecs.js');const C=globalThis.ATLAS_IMAGE_CODECS;
const out='/tmp/atlas-original-rgb';fs.mkdirSync(out,{recursive:true});
const html=process.env.REDUCTION_HTML||path.resolve(__dirname,'../build-original-preview/atlas-clarus-browser-bundle/index.html');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(html).href+'#colour-reduction');await page.waitForFunction(()=>!document.getElementById('cr-file').disabled);
 const pixels=Uint8Array.from([61,123,25,255,61,123,26,128,55,121,26,255,238,228,208,255,204,97,90,255,61,123,25,0]);
 await page.locator('#cr-file').setInputFiles({name:'nuances.png',mimeType:'image/png',buffer:Buffer.from(C.png(6,1,pixels))});
 await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Source ready'));
 await page.locator('#cr-k').fill('5');
 for(const hex of ['#3D7B19','#3D7B1A','#37791A']){await page.locator('#cr-lock-hex').fill(hex);await page.locator('#cr-original-add').click();}
 assert((await page.locator('#cr-original-warning').innerText()).includes('share one Atlas reference'));
 await page.locator('#cr-run').click();await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Reduced preview ready'));
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#cr-zip').click()]);await download.saveAs(path.join(out,'mixed.zip'));
 execFileSync('python3',['-c',String.raw`import zipfile,json,hashlib,struct,io
from PIL import Image
z=zipfile.ZipFile('/tmp/atlas-original-rgb/mixed.zip'); r=json.loads(z.read('reduction.json'));m=json.loads(z.read('reduction-package-manifest.json'))
assert r['schema']=='atlas-clarus-colour-reduction/1.1'
for n,h in m['files'].items(): assert hashlib.sha256(z.read(n)).hexdigest()==h
raw=z.read('input-rgba.bin'); idx=struct.unpack('<6H',z.read('output-palette-index.u16le')); rebuilt=bytearray(raw)
for p,j in enumerate(idx):
 if raw[p*4+3]: rebuilt[p*4:p*4+3]=bytes(r['palette'][j]['rgb'])
 else: assert j==65535
assert bytes(rebuilt[:12])==raw[:12]
assert Image.open(io.BytesIO(z.read('reduced.png'))).convert('RGBA').tobytes()==rebuilt
assert hashlib.sha256(rebuilt).hexdigest()==r['output_rgba_sha256']
assert len([p for p in r['palette'] if p.get('kind')=='ORIGINAL_RGB'])==3
for n in z.namelist():
 if n.endswith('.clarus.json'):
  doc=json.loads(z.read(n)); assert all(c['atlas_row_id'] is not None for c in doc['references'])
tokens=json.loads(z.read('palette.tokens.json'))
assert all('freeze_status' not in c['$extensions']['org.atlas-clarus'] for c in tokens['color'].values())
print('PASS: independent mixed PNG reconstruction, alpha, hash manifest, originals and reference-only Clarus chunks')`],{stdio:'inherit'});
 // Mixed standard palette downloads must match the full mixed palette.
 for(const format of ['gpl','ase','css','tokens']){await page.locator('#cr-format').selectOption(format);const [d]=await Promise.all([page.waitForEvent('download'),page.locator('#cr-palette').click()]);await d.saveAs(path.join(out,'palette.'+format));}
 await page.locator('#cr-k').fill('3');assert(await page.locator('#cr-output').isHidden());await page.locator('#cr-run').click();await page.waitForFunction(()=>document.getElementById('cr-status').dataset.error==='true');assert((await page.locator('#cr-status').innerText()).includes('exceed'));assert(await page.locator('#cr-output').isHidden());
 await page.locator('#cr-k').fill('5');await page.locator('#cr-run').click();await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Reduced preview ready'));
 await page.screenshot({path:path.join(out,'mixed-desktop.png'),fullPage:true});
 for(const width of [390,844]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 // Valid replacement source resets both types of protection.
 await page.locator('#cr-file').setInputFiles({name:'new.png',mimeType:'image/png',buffer:Buffer.from(C.png(6,1,pixels))});await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Source ready'));
 assert.equal(await page.locator('#cr-original-locks button').count(),0);assert.equal(await page.locator('#cr-locks button').count(),0);assert.equal(await page.locator('#cr-original-warning').innerText(),'');
 assert.deepEqual(errors,[]);console.log('PASS: original protection UI, mixed exports, limit failure, stale export removal, mobile widths and source reset');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
