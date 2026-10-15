'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
require('../src/image-project-codecs.js');const C=globalThis.ATLAS_IMAGE_CODECS;
const out='/tmp/atlas-rectangle';fs.mkdirSync(out,{recursive:true});
const html=process.env.ATLAS_TEST_HTML || path.resolve(__dirname,'../build-swatch-reference-preview/atlas-clarus-browser-bundle/index.html');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(html).href+'#colour-reduction');await page.waitForFunction(()=>!document.getElementById('cr-file').disabled);
 const rgba=Uint8Array.from(Array.from({length:16},(_,i)=>[61+(i%3),123,25+i,i===8?0:i===1?128:255]).flat());
 async function upload(){await page.locator('#cr-file').setInputFiles({name:'region.png',mimeType:'image/png',buffer:Buffer.from(C.png(8,2,rgba))});await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Source ready'));}
 await upload();await page.locator('#cr-k').fill('16');
 // Select first corner via keyboard and original-pixel loupe, no CSS coordinate assumptions.
 await page.locator('#cr-before').press('Enter');await page.locator('#cr-loupe-detail').press('Shift+ArrowLeft');await page.locator('#cr-loupe-detail').press('Shift+ArrowUp');
 assert((await page.locator('#cr-pixel-value').innerText()).startsWith('X 0 · Y 0'));
 await page.locator('#cr-region-start').click();await page.locator('#cr-loupe-detail').press('ArrowRight');await page.locator('#cr-loupe-detail').press('ArrowRight');await page.locator('#cr-loupe-detail').press('ArrowDown');
 await page.locator('#cr-region-end').click();assert((await page.locator('#cr-region-locks').innerText()).includes('X 0–2 / Y 0–1'));
 await page.locator('#cr-run').click();await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Reduced preview ready'));
 const details=await page.locator('.cr-source-reference').allTextContents();assert(details.length>0);for(const detail of details){assert.match(detail,/ATLAS assignment: H\d{3}_L\d{3}_C\d{3} · row \d+ · Reference RGB \d+ \/ \d+ \/ \d+ · #[0-9A-F]{6}/);}
 const [d]=await Promise.all([page.waitForEvent('download'),page.locator('#cr-zip').click()]);await d.saveAs(path.join(out,'region.zip'));
 execFileSync('python3',['-c',String.raw`import zipfile,json,hashlib,struct,io
from PIL import Image
z=zipfile.ZipFile('/tmp/atlas-rectangle/region.zip');r=json.loads(z.read('reduction.json'));m=json.loads(z.read('reduction-package-manifest.json'))
assert r['schema']=='atlas-clarus-colour-reduction/1.2'
assert r['rectangle_protection']['rectangles']==[[0,0,2,1]]
for n,h in m['files'].items():assert hashlib.sha256(z.read(n)).hexdigest()==h
raw=z.read('input-rgba.bin');mask=z.read('protected-pixel-mask.u8');out=Image.open(io.BytesIO(z.read('reduced.png'))).convert('RGBA').tobytes()
assert list(mask)==[1,1,1,0,0,0,0,0,1,1,1,0,0,0,0,0]
assert sum(mask)==6
for i,b in enumerate(mask):
 if b:assert raw[i*4:i*4+4]==out[i*4:i*4+4]
assert raw[12:15]!=out[12:15]
assert all(raw[i]==out[i] for i in range(3,len(raw),4))
idx=struct.unpack('<16H',z.read('output-palette-index.u16le'));rebuilt=bytearray(raw)
for p,j in enumerate(idx):
 if raw[p*4+3]:rebuilt[p*4:p*4+3]=bytes(r['palette'][j]['rgb'])
 else:assert j==65535
assert rebuilt==out
assert hashlib.sha256(out).hexdigest()==r['output_rgba_sha256']
assert b'protected-pixel-mask.u8' in z.read('README.txt')
print('PASS independent rectangle RGBA export, scope, mask, alpha, hidden RGB and complete palette reconstruction')`],{stdio:'inherit'});
 await page.screenshot({path:path.join(out,'rectangle-desktop.png'),fullPage:true});
 await page.locator('#cr-k').fill('2');assert(await page.locator('#cr-output').isHidden());await page.locator('#cr-run').click();await page.waitForFunction(()=>document.getElementById('cr-status').dataset.error==='true');assert((await page.locator('#cr-status').innerText()).includes('exceed'));assert(await page.locator('#cr-output').isHidden());
 await page.locator('#cr-region-locks button').click();assert.equal(await page.locator('#cr-region-locks button').count(),0);
 // Transparent pixels are valid rectangle corners; global source-RGB lock is disabled.
 await page.locator('#cr-loupe-detail').press('Shift+ArrowLeft');assert((await page.locator('#cr-pixel-value').innerText()).includes('Transparent'));assert(await page.locator('#cr-pixel-original').isDisabled());
 await page.locator('#cr-region-start').click();assert(await page.locator('#cr-region-end').isEnabled());await page.locator('#cr-region-cancel').click();assert(await page.locator('#cr-region-end').isDisabled());
 for(const width of [390,844]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.locator('#cr-region-start').click();await upload();assert(await page.locator('#cr-region-end').isDisabled());assert.equal(await page.locator('#cr-region-locks button').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS rectangle corner controls, transparency, cancel, removal, conflict, mobile widths and source reset');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
