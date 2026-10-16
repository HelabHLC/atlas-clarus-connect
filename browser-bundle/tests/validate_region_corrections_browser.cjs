'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os'),{pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
require('../src/image-project-codecs.js');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.ATLAS_TEST_BROWSER?{executablePath:process.env.ATLAS_TEST_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-correction-test-'));try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(process.env.ATLAS_TEST_HTML||path.resolve(__dirname,'../build-inspect-preview/atlas-clarus-browser-bundle/index.html')).href+'#colour-reduction');await page.waitForFunction(()=>!document.getElementById('cr-file').disabled);await page.locator('#cr-library').selectOption('solid_c');
 const rgba=Uint8Array.from(Array.from({length:16},(_,p)=>p%2?[220,50,60,255]:[46,128,44,255]).flat());await page.locator('#cr-file').setInputFiles({name:'motif.png',mimeType:'image/png',buffer:Buffer.from(ATLAS_IMAGE_CODECS.png(8,2,rgba))});await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Source ready'));await page.locator('#cr-k').fill('4');await page.locator('#cr-run').click();await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Reduced preview ready'));
 const pixels=()=>page.locator('#cr-after').evaluate(c=>c.toDataURL()),baseline=await pixels();await page.locator('#cr-difference-overlay').check();assert.equal(await pixels(),baseline);await page.locator('#cr-variant-save').click();await page.locator('#cr-variant-select').selectOption('current');
 for(const [n,v]of Object.entries({x0:0,y0:0,x1:1,y1:1}))await page.locator('#cr-correction-'+n).fill(String(v));await page.locator('#cr-correction-hex').fill('#0000FF');await page.locator('#cr-correction-match').click();await page.locator('#cr-correction-mode').selectOption('REFERENCE');await page.locator('#cr-correction-preview').click();assert(await page.locator('#cr-correction-apply').isEnabled());await page.locator('#cr-correction-apply').click();await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Reduced preview ready'));assert.equal(await page.locator('#cr-corrections button').count(),1);
 const corrected=await pixels();await page.locator('#cr-cleanup-scope').selectOption('MASK_ONLY');await page.locator('#cr-cleanup-min').fill('6');await page.locator('#cr-cleanup').click();assert.match(await page.locator('#cr-inspect-summary').innerText(),/4 protected pixels · 0 changed/);
 const[d]=await Promise.all([page.waitForEvent('download'),page.locator('#cr-zip').click()]);const zip=path.join(dir,'result.zip');await d.saveAs(zip);
 execFileSync('python3',['-c',String.raw`import zipfile,json,struct,hashlib,io,sys
from PIL import Image
z=zipfile.ZipFile(sys.argv[1]);r=json.loads(z.read('reduction.json'));raw=z.read('input-rgba.bin');out=Image.open(io.BytesIO(z.read('reduced.png'))).convert('RGBA').tobytes();idx=struct.unpack('<16H',z.read('output-palette-index.u16le'));mask=z.read('protected-pixel-mask.u8');c=r['reference_protection']['corrections'][0];assert c['mode']=='REFERENCE' and c['rectangle']==[0,0,1,1]
assert sum(mask)==4
for p,i in enumerate(idx):
 assert out[p*4+3]==raw[p*4+3]
 assert out[p*4:p*4+3]==bytes(r['palette'][i]['rgb'])
 if mask[p]:assert r['palette'][i]['atlas_row_id']==c['atlas_row_id']
for n,h in json.loads(z.read('reduction-package-manifest.json'))['files'].items():assert hashlib.sha256(z.read(n)).hexdigest()==h
print('PASS independent correction mask, palette reconstruction, protected row and package hashes')`,zip],{stdio:'inherit'});
 await page.locator('#cr-cleanup-reset').click();assert.equal(await pixels(),corrected);await page.locator('#cr-corrections button').click();await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Reduced preview ready'));assert.equal(await pixels(),baseline);
 for(const width of [390,768]){await page.setViewportSize({width,height:900});const d=await page.locator('#colour-reduction').evaluate(e=>e.scrollWidth-e.clientWidth);assert(d<=2);}
 assert.deepEqual(errors,[]);console.log('PASS browser correction, non-mutating RGB overlay, cleanup, undo and responsive controls');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exit(1);});
