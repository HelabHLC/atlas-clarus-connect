import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {deflateSync} from 'fflate';
const require=createRequire(new URL('../browser-bundle/tests/package.json',import.meta.url));
const {chromium}=require('playwright');
// Deterministic PNG containing a protected single-pixel island, decoded by the browser.
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return (c^0xffffffff)>>>0;}
function chunk(type,data){const b=Buffer.concat([Buffer.from(type),data]),n=Buffer.alloc(4),tail=Buffer.alloc(4);n.writeUInt32BE(data.length);tail.writeUInt32BE(crc(b));return Buffer.concat([n,b,tail]);}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(5,0);ihdr.writeUInt32BE(5,4);ihdr[8]=8;ihdr[9]=2;
const raw=Buffer.alloc(5*16);for(let y=0;y<5;y++)for(let x=0;x<5;x++)raw.fill(x===2&&y===2?226:240,y*16+1+x*3,y*16+4+x*3);
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',Buffer.from(deflateSync(raw))),chunk('IEND',Buffer.alloc(0))]);
const browser=await chromium.launch({headless:true});
try{const page=await browser.newPage({viewport:{width:1000,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('./dist/ATLAS_Paint_by_Numbers.html',import.meta.url).href);await page.locator('#image').setInputFiles({name:'accent.png',mimeType:'image/png',buffer:png});await page.locator('#generate').waitFor({state:'visible'});await page.waitForFunction(()=>!document.getElementById('generate').disabled);await page.locator('#limit').fill('2');await page.locator('#source').click({position:{x:2.5,y:2.5}});assert.match(await page.locator('#locks').innerText(),/H000_L090_C000/);await page.locator('#generate').click();await page.locator('#downloads button').first().waitFor();assert.equal(await page.locator('#downloads button').count(),4);assert.match(await page.locator('#status').innerText(),/2 Atlas-Referenzen, 2 Flächen/);const downloadPromise=page.waitForEvent('download');await page.locator('#downloads button').first().click();const download=await downloadPromise;const svg=await readFile(await download.path(),'utf8');assert.match(svg,/<svg/);assert.match(svg,/M2 2v1/);assert.deepEqual(errors,[]);await mkdir('dist/evidence',{recursive:true});await page.screenshot({path:'dist/evidence/direct-image.png',fullPage:true});console.log('PNG decode, clicked protection, generation and SVG download passed.');}finally{await browser.close();}
