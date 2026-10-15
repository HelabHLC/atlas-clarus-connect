'use strict';
// Actual PNG decode -> loupe -> two protection paths -> downloaded evidence.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
require('../src/image-project-codecs.js');
const out='/tmp/atlas-decoded-boundary';fs.mkdirSync(out,{recursive:true});
const html=process.env.ATLAS_TEST_HTML||path.resolve(__dirname,'../build-decoded-boundary-preview/atlas-clarus-browser-bundle/index.html');
const source=Buffer.from(globalThis.ATLAS_IMAGE_CODECS.png(4,1,Uint8Array.from([
  61,123,25,128, 61,123,25,128, 61,123,25,255, 204,97,90,255
])));
fs.writeFileSync(path.join(out,'fixture.png'),source);
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(html).href+'#colour-reduction');
  await page.waitForFunction(()=>!document.getElementById('cr-file').disabled);
  assert.match(await page.locator('#cr-pixel-inspector').textContent(),/frozen, browser-decoded sRGB RGB\/RGBA8/);
  for(const mode of ['original','rectangle']){
   await page.locator('#cr-file').setInputFiles({name:'boundary.png',mimeType:'image/png',buffer:source});
   await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Source ready'));
   await page.locator('#cr-k').fill('4');
   await page.locator('#cr-before').press('Enter');
   await page.locator('#cr-loupe-detail').press('Shift+ArrowLeft');
   // Chromium's alpha round trip: stored G123 becomes G124 BEFORE reduction.
   const label=await page.locator('#cr-pixel-value').innerText();
   assert.match(label,/X 0 · Y 0/);assert.match(label,/Alpha 128\/255/);
   assert.match(label,/Input RGB 62 \/ 124 \/ 26/);
   if(mode==='original')await page.locator('#cr-pixel-original').click();
   else{await page.locator('#cr-region-start').click();await page.locator('#cr-region-end').click();}
   await page.locator('#cr-run').click();
   await page.waitForFunction(()=>document.getElementById('cr-status').textContent.startsWith('Reduced preview ready'));
   const [d]=await Promise.all([page.waitForEvent('download'),page.locator('#cr-zip').click()]);
   await d.saveAs(path.join(out,mode+'.zip'));
   execFileSync('python3',['-c',String.raw`import io,json,hashlib,zipfile,sys
from PIL import Image
from pathlib import Path
root=Path('/tmp/atlas-decoded-boundary');mode=sys.argv[1]
source=(root/'fixture.png').read_bytes();stored=Image.open(io.BytesIO(source)).convert('RGBA').tobytes()
assert stored[:8]==bytes([61,123,25,128]*2), 'fixture must contain stored G123'
z=zipfile.ZipFile(root/(mode+'.zip'));r=json.loads(z.read('reduction.json'))
assert z.read('original.png')==source, 'original bytes changed'
assert r['source']['file_sha256']==hashlib.sha256(source).hexdigest()
frozen=z.read('input-rgba.bin');output=Image.open(io.BytesIO(z.read('reduced.png'))).convert('RGBA').tobytes()
assert frozen[:8]==bytes([62,124,26,128]*2), 'browser decode must demonstrate G123 -> G124'
assert frozen[8:12]==stored[8:12], 'opaque control must remain unchanged'
assert r['source']['input_rgba_sha256']==hashlib.sha256(frozen).hexdigest()
assert r['source']['file_sha256']!=r['source']['input_rgba_sha256']
assert output[:4]==frozen[:4], 'protected G124 RGBA changed'
if mode=='original': assert output[4:8]==frozen[4:8], 'global matching pixel changed'
else: assert list(z.read('protected-pixel-mask.u8'))==[1,0,0,0]
assert output[1]==124 and output[3]==128
assert output[3::4]==frozen[3::4]
assert hashlib.sha256(output).hexdigest()==r['output_rgba_sha256']
for name,digest in json.loads(z.read('reduction-package-manifest.json'))['files'].items():
 assert hashlib.sha256(z.read(name)).hexdigest()==digest, name
print('PASS',mode,': stored G123 -> frozen/loupe G124 -> protected output G124; original bytes and separate hashes verified')`,mode],{stdio:'inherit'});
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({status:'PASS',browser:browser.version(),stored_green:123,frozen_green:124,protected_output_green:124,modes:['original','rectangle']},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
