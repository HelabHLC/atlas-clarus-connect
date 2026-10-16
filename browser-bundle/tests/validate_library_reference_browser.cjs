'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
require('../src/image-project-codecs.js');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const html=process.env.ATLAS_TEST_HTML||path.resolve(__dirname,'../build-library-reference-preview/atlas-clarus-browser-bundle/index.html');
 await page.goto(pathToFileURL(html).href+'#colour-reduction');await page.waitForFunction(()=>!document.getElementById('cr-file').disabled);
 const libraries=await page.locator('#cr-library option').evaluateAll(os=>os.map(o=>o.value));assert(libraries.length>1);
 await page.locator('#cr-library').selectOption(libraries.find(id=>id!=='core'));
 const rgba=Uint8Array.from([61,123,25,255,62,123,26,128,200,40,90,255,7,8,9,0]);
 await page.locator('#cr-file').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(ATLAS_IMAGE_CODECS.png(4,1,rgba))});
 await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Source ready'));
 await page.locator('#cr-k').fill('4');
 await page.locator('#cr-before').press('Enter');await page.locator('#cr-loupe-detail').press('Shift+ArrowLeft');
 await page.locator('#cr-region-start').click();await page.locator('#cr-loupe-detail').press('ArrowRight');await page.locator('#cr-region-end').click();
 await page.locator('#cr-lock-hex').fill('#C8285A');await page.locator('#cr-original-add').click();
 await page.locator('#cr-run').click();await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Reduced preview ready'));
 assert.match(await page.locator('#cr-result').innerText(),/library RGB colours/);
 const beforeCleanup=await page.locator('#cr-after').evaluate(c=>c.toDataURL());
 await page.locator('#cr-cleanup-min').fill('16');await page.locator('#cr-cleanup').click();
 assert.match(await page.locator('#cr-cleanup-status').innerText(),/small areas merged/);
 await page.locator('#cr-cleanup-reset').click();assert.equal(await page.locator('#cr-after').evaluate(c=>c.toDataURL()),beforeCleanup);
 assert(await page.locator('#cr-cleanup-reset').isDisabled());await page.locator('#cr-cleanup').click();
 const [d]=await Promise.all([page.waitForEvent('download'),page.locator('#cr-zip').click()]);await d.saveAs('/tmp/atlas-library-reference.zip');
 execFileSync('python3',['-c',String.raw`import zipfile,json,hashlib,io,struct
from PIL import Image
z=zipfile.ZipFile('/tmp/atlas-library-reference.zip');r=json.loads(z.read('reduction.json'));raw=z.read('input-rgba.bin');out=Image.open(io.BytesIO(z.read('reduced.png'))).convert('RGBA').tobytes()
assert r['reference_protection']['rectangles']==[[0,0,1,0]]
assert r['area_cleanup']['minimum_pixels']==16
allowed=set(r['library']['reference_ids']);palette=r['palette'];assert all(c['atlas_row_id'] in allowed for c in palette)
assert all(raw[i]==out[i] for i in range(3,len(raw),4));assert raw[12:]==out[12:]
indices=struct.unpack('<4H',z.read('output-palette-index.u16le'));rebuilt=bytearray(raw)
for p,j in enumerate(indices):
 if raw[p*4+3]:rebuilt[p*4:p*4+3]=bytes(palette[j]['rgb'])
assert rebuilt==out
bindings={tuple(b['source_rgb']):b for b in r['reference_protection']['source_bindings']}
mask=z.read('protected-pixel-mask.u8')
for p,b in enumerate(mask):
 if b and raw[p*4+3]:assert palette[indices[p]]['atlas_row_id']==bindings[tuple(raw[p*4:p*4+3])]['atlas_row_id']
for n,h in json.loads(z.read('reduction-package-manifest.json'))['files'].items():assert hashlib.sha256(z.read(n)).hexdigest()==h
assert b'not unchanged original RGBA' in z.read('README.txt')
print('PASS independent library PNG reconstruction, converted protection, alpha and manifest')`],{stdio:'inherit'});
 await page.locator('#cr-library').selectOption('core');assert(await page.locator('#cr-output').isHidden());
 await page.locator('#cr-protection-mode').selectOption('ORIGINAL_RGBA');assert(await page.locator('#cr-library').isHidden());
 for(const width of [390,768]){await page.setViewportSize({width,height:900});assert(await page.locator('#cr-run').isVisible());}
 assert.deepEqual(errors,[]);console.log('PASS library UI, worker, ZIP, mode/library invalidation, responsive controls');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
