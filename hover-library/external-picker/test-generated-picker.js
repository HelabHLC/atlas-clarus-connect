'use strict';
// Tests the generated upstream integration without navigating a real browser.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=process.argv[2];if(!dir)throw Error('Pass the prepared plugin directory');
require('../assets/js/source-provenance.js');require('./picker-provenance.js');
const P=globalThis.ATLAS_CLARUS_HOVER_PROVENANCE,S=globalThis.ATLAS_CLARUS_PICKER_PROVENANCE;
const colors=JSON.parse(fs.readFileSync('hover-library/data/colors.json')).colors;
assert.equal(fs.readFileSync(path.join(dir,'assets/source-provenance.js'),'utf8'),fs.readFileSync('hover-library/assets/js/source-provenance.js','utf8'));
let tx,stored,session=new Map();
const location={href:'https://atlas.test/staging/?page_id=5393',origin:'https://atlas.test'};
const context={URL,URLSearchParams,Uint8Array,Uint16Array,console,location,sessionStorage:{setItem:(k,v)=>session.set(k,v)},
  document:{addEventListener:()=>{}},indexedDB:{open:()=>{
    const request={result:{transaction:()=>({objectStore:()=>({transaction:tx={},put:blob=>{stored=blob;}})})}};
    setImmediate(()=>request.onsuccess());return request;
  }}};
context.window={ATLAS_CLARUS_HOVER_PROVENANCE:P,ATLAS_CLARUS_PICKER_PROVENANCE:S,
  ATLAS_CLARUS_IMAGE_PICKER_CONFIG:{dataBaseUrl:'/data/',workerUrl:'/worker',hoverUrl:'/staging/hover/'}};
vm.createContext(context);
let js=fs.readFileSync(path.join(dir,'assets/explorer.js'),'utf8');
const marker="document.addEventListener('DOMContentLoaded',";
assert.equal(js.split(marker).length,2);
vm.runInContext(js.replace(marker,'window.TestExplorer=Explorer;\n'+marker),context);
const proto=context.window.TestExplorer.prototype;
function instance(){
  return Object.assign(Object.create(proto),{sourceRow:4966,lastClick:{x:20,y:30},imageGeneration:1,
    sourceFile:{name:'two-greens.png'},sourceHashPromise:Promise.resolve('a'.repeat(64)),handoffBusy:false,
    meta:{reference:colors.map(c=>c.ref)},provenanceColors:colors,width:200,height:100,
    imageCtx:{getImageData:()=>({data:[61,123,25,255]})},magnifierZoom:{value:'12'},
    hoverButton:{disabled:false},setStatus(text){this.status=text;}});
}
async function until(check){for(let i=0;i<30&&!check();i++)await new Promise(r=>setImmediate(r));assert.ok(check());}
(async()=>{
  const a=instance(),before=location.href;const run=a.openHover();
  await until(()=>stored);assert.equal(location.href,before,'must wait for IndexedDB transaction commit');
  tx.oncomplete();await run;
  const sent=P.readHandoff(new URL(location.href),colors);
  assert.equal(sent.color.id,4966);assert.deepEqual(sent.sourceAssignment.source_rgb,[61,123,25]);
  assert.equal(sent.returnUrl.href,before);assert.equal(stored,a.sourceFile);
  assert.equal(JSON.parse(session.get('atlasClarusImagePickerHandoffV1')).schema,'atlas-clarus-image-picker-handoff-v2');
  // A changed selection while hashing must never be paired with the old image/context.
  location.href=before;session.clear();stored=null;tx=null;
  let resolveHash;const b=instance();b.sourceHashPromise=new Promise(r=>{resolveHash=r;});
  const racing=b.openHover();b.lastClick={x:120,y:30};resolveHash(null);await racing;
  assert.equal(stored,null);assert.equal(session.size,0);assert.equal(location.href,before);
  assert.match(b.status,/changed during handoff/);
  // A failed image transaction must not produce a handoff/session record.
  const c=instance(),failed=c.openHover();await until(()=>tx);tx.onabort();await failed;
  assert.equal(session.size,0);assert.equal(location.href,before);assert.match(c.status,/transaction aborted/);
  // Ignore a worker result for the image replaced during binding.
  const d=instance();d.bindingGeneration=0;d.busy=true;d.updateBindEnabled=()=>{};
  d.onWorker({type:'bound'});assert.equal(d.busy,false);assert.equal(d.idMap,undefined);
  console.log('PASS: generated picker original pixel, committed image before navigation, selection race, failed storage, stale worker');
})().catch(e=>{console.error(e);process.exitCode=1;});
