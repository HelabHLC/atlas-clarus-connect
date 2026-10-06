// Execute shipped picker/palette handlers. Canvas decoding is stubbed here;
// this does not establish real browser image decoding or visual acceptance.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {webcrypto,createHash}=require('node:crypto');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('browser-bundle/src/index.html','utf8');
const source=JSON.parse(fs.readFileSync('hover-library/data/colors.json','utf8'));
source.views=JSON.parse(fs.readFileSync('hover-library/data/views.json','utf8')).views;
const key='atlasClarusPalettesV3',legacyKey='atlasClarusPalettesV2';
const clone=x=>JSON.parse(JSON.stringify(x));
async function waitFor(check){const end=Date.now()+5000;while(!check()){if(Date.now()>end)throw Error('Timed out');await new Promise(r=>setImmediate(r))}}
function setup(storage={}){
  const dom=new JSDOM(html,{url:'https://offline.test/#picker',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,$=s=>w.document.querySelector(s),downloads=[],blobs=new Map();
  w.TextEncoder=TextEncoder;w.scrollTo=()=>{};
  Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});
  let pixels=new Uint8ClampedArray([61,123,25,255,60,123,25,255]);
  const ctx=new Proxy({}, {get(t,k){if(k==='createRadialGradient')return ()=>({addColorStop(){}});if(k==='createImageData')return (a,b)=>({data:new Uint8ClampedArray(a*b*4)});if(k==='getImageData')return ()=>({data:new Uint8ClampedArray(pixels)});return t[k]||(()=>{})}});
  w.HTMLCanvasElement.prototype.getContext=()=>ctx;
  w.HTMLCanvasElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,width:this.width,height:this.height}};
  w.Image=class{constructor(){this.naturalWidth=2;this.naturalHeight=1}set src(v){this._src=v;queueMicrotask(()=>this.onload())}get src(){return this._src}};
  w.URL.createObjectURL=blob=>{const u=`blob:local-${blobs.size}`;blobs.set(u,blob);return u};w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){downloads.push({name:this.download,blob:blobs.get(this.href)})};
  for(const [k,v] of Object.entries(storage))w.localStorage.setItem(k,v);
  w.ATLAS_CLARUS_DATA=clone(source);
  for(const name of ['palette-export.js','image-sampling.js','app.js'])w.eval(fs.readFileSync(`browser-bundle/src/${name}`,'utf8'));
  const state=()=>JSON.parse(w.localStorage.getItem(key));
  async function importJson(data){const el=$('#palette-import-file');Object.defineProperty(el,'files',{configurable:true,value:[{name:'test.clarus.json',text:async()=>JSON.stringify(data)}]});await el.onchange({target:el})}
  async function exportJson(){const n=downloads.length;$('[data-palette-export="clarus"]').click();assert.equal(downloads.length,n+1);const b=downloads.at(-1).blob;return JSON.parse(await new Promise((resolve,reject)=>{const r=new w.FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsText(b)}))}
  async function loadImage(){const bytes=Buffer.from('synthetic image bytes for source hash test');const file={name:'two-greens.png',type:'image/png',arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};const el=$('#picker-file');Object.defineProperty(el,'files',{configurable:true,value:[file]});el.onchange({target:el});await waitFor(()=>$('#picker-result').textContent.includes('Image ready.'));return createHash('sha256').update(bytes).digest('hex')}
  function pick(fraction){w.location.hash='picker';const cv=$('#picker-canvas');cv.onclick({clientX:cv.width*fraction,clientY:cv.height/2});$('#picker-result [data-picker-hover]').click();$('#selection [data-add-palette]').click()}
  return {dom,w,$,state,importJson,exportJson,loadImage,pick};
}
(async()=>{
  const a=setup();const {$,w}=a;const digest=await a.loadImage();
  a.pick(.25);a.pick(.75);
  let state=a.state(),p=state.palettes[0];
  assert.deepEqual(p.colorIds,[4966]);assert.equal(p.sourceAssignments.length,2);
  assert.deepEqual(p.sourceAssignments.map(x=>x.source_rgb),[[61,123,25],[60,123,25]]);
  assert.deepEqual(p.sourceAssignments.map(x=>x.sampling.centre),[[0,0],[1,0]]);
  assert.ok(p.sourceAssignments.every(x=>x.image.sha256===digest));
  assert.match($('#drawer-palette-list').textContent,/2 recorded source assignments/);
  // Repeated click is idempotent, but a different source sharing the row survives.
  $('#selection [data-add-palette]').click();assert.equal(a.state().palettes[0].sourceAssignments.length,2);
  const original=await a.exportJson();assert.equal(original.source_assignments.length,2);
  // Duplication retains independently owned source records.
  $('#palette-duplicate').click();state=a.state();assert.equal(state.palettes.length,2);
  assert.deepEqual(state.palettes[1].sourceAssignments,state.palettes[0].sourceAssignments);
  $('#drawer-palette-list [data-remove]').click();state=a.state();
  assert.equal(state.palettes[1].sourceAssignments.length,0);assert.equal(state.palettes[0].sourceAssignments.length,2);
  await a.importJson(original);const roundtrip=await a.exportJson();assert.deepEqual(roundtrip,original);
  // Validate the full JSON before mutating an existing workspace.
  const before=w.localStorage.getItem(key),bad=clone(original);bad.source_assignments[1].distance_squared++;
  await a.importJson(bad);assert.match($('#export-status').textContent,/Import blocked/);assert.equal(w.localStorage.getItem(key),before);
  // Manual selection of the SAME row must not attach stale picker provenance.
  $('#palette-new').click();$('#search').value='H130_L045_C055';$('#search').oninput();$('#colour-grid button').click();$('#selection [data-add-palette]').click();
  const manual=await a.exportJson();assert.deepEqual(manual.source_assignments,[]);
  // Legacy JSON imports have unknown original RGB, never synthesized from master RGB.
  const old=clone(original);old.version='1.1';delete old.source_assignments;
  await a.importJson(old);assert.deepEqual((await a.exportJson()).source_assignments,[]);
  // Reload restores the new data and preserves all provenance fields.
  await a.importJson(original);const reloadStorage=w.localStorage.getItem(key);a.dom.window.close();
  const b=setup({[key]:reloadStorage});assert.deepEqual(await b.exportJson(),original);b.dom.window.close();
  // Upgrade copies legacy references but does not touch the old storage key.
  const v2=JSON.stringify({version:2,activeId:'old',palettes:[{id:'old',name:'Old palette',colorIds:[4966]}]});
  const c=setup({[legacyKey]:v2});assert.equal(c.$('#palette-name').value,'Old palette');
  c.$('#palette-rename').click();assert.equal(c.w.localStorage.getItem(legacyKey),v2);
  assert.deepEqual(c.state().palettes[0].sourceAssignments,[]);c.dom.window.close();
  console.log('PASS: shipped Picker → Hover → palette, two sources/one row, file hash, idempotency, duplicate/remove, export/import, reload and V2 migration');
})().catch(e=>{console.error(e);process.exitCode=1});
