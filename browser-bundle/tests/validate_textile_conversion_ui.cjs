'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto'),{JSDOM}=require('jsdom');
const {createCanvas,loadImage}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dir=process.env.TEXTILE_BUNDLE_DIR||'browser-bundle/build-textile-conversion/atlas-clarus-browser-bundle',html=fs.readFileSync(dir+'/index.html','utf8'),workerCode=fs.readFileSync(dir+'/assets/lcms-worker.js','utf8');
const dom=new JSDOM(html,{url:'https://offline.test/#print',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,$=s=>d.querySelector(s),downloads=[],blobMap=new Map(),backing=new WeakMap();
Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
function canvas(el){let b=backing.get(el);if(!b){b=createCanvas(el.width||1,el.height||1);backing.set(el,b)}if(b.width!==el.width)b.width=el.width;if(b.height!==el.height)b.height=el.height;return b}
w.HTMLCanvasElement.prototype.getContext=function(){const ctx=canvas(this).getContext('2d');return new Proxy(ctx,{get:(t,k)=>k==='drawImage'?((img,...args)=>t.drawImage(img instanceof w.HTMLCanvasElement?canvas(img):img,...args)):typeof t[k]==='function'?t[k].bind(t):t[k],set:(t,k,v)=>(t[k]=v,true)})};
w.HTMLCanvasElement.prototype.toBlob=function(cb){canvas(this).encode('png').then(b=>cb(new w.Blob([b],{type:'image/png'})))};
w.URL.createObjectURL=b=>{const id='blob:'+blobMap.size;blobMap.set(id,b);return id};w.URL.revokeObjectURL=()=>{};
w.HTMLAnchorElement.prototype.click=function(){downloads.push({name:this.download,blob:blobMap.get(this.href)})};
class LocalWorker{
 constructor(url){this.dead=false;this.ready=new Promise((resolve,reject)=>{const reader=new w.FileReader();reader.onload=()=>{try{const worker=this;this.env=vm.createContext({Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,Float32Array,Float64Array,ArrayBuffer,DataView,WebAssembly,console,TextDecoder,TextEncoder,atob,btoa,setTimeout,clearTimeout,performance,crypto:webcrypto,fetch:()=>{throw Error('Offline only')},postMessage(data){if(!worker.dead)queueMicrotask(()=>{if(!worker.dead)worker.onmessage?.({data})})}});vm.runInContext(String(reader.result),this.env);resolve()}catch(e){reject(e)}};reader.onerror=reject;reader.readAsText(blobMap.get(url))})}
 postMessage(data){this.ready.then(()=>{const j={...data};for(const k of ['profile','pixels'])if(j[k])j[k]=new Uint8Array(j[k]);return this.env.onmessage({data:j})}).catch(e=>this.onerror?.({message:e.message}))}
 terminate(){this.dead=true}
}
w.Worker=LocalWorker;
for(const file of ['reference-card.js','profiled-reference-card.js','pkl-image-binding.js'])w.eval(fs.readFileSync('browser-bundle/src/'+file,'utf8'));
for(const file of ['print-handoff.js','print-preview-ui.js','textile-reference-card.js','print-ui.js'])w.eval(fs.readFileSync(dir+'/assets/'+file,'utf8'));
const master=require('../../hover-library/data/colors.json');const picker=d.createElement('canvas');picker.width=2;picker.height=2;const pc=picker.getContext('2d');['#37791A','#AB34CD','#123456','#FFCC00'].forEach((c,i)=>{pc.fillStyle=c;pc.fillRect(i%2,Math.floor(i/2),1,1)});
const context={colors:master.colors,master:master.master_sha256,getSelected:()=>master.colors[4966],getPalette:()=>[master.colors[4966]],getPaletteName:()=> 'Test',getPickerImage:()=>({canvas:picker,name:'Synthetic four-pixel test'}),download:(name,value,type)=>downloads.push({name,value,type})};
w.ATLAS_CLARUS_PRINT_UI.init(context);
const input=(s,v)=>{const el=$(s);el.value=v;el.dispatchEvent(new w.Event('input',{bubbles:true}))};
async function until(f){let end=Date.now()+30000;while(!f()){assert(Date.now()<end,'UI timeout: '+$('#print-message').textContent);await new Promise(r=>setTimeout(r,20))}}
const sel='[data-print-path="TEXTILE_RGB"] ',pv='[data-preview-path="TEXTILE_RGB"] ';
(async()=>{
 const b=fs.readFileSync(process.env.TEXTILE_PROFILE),el=$(sel+'[data-profile-file]');Object.defineProperty(el,'files',{value:[{name:'TextileRGB_FOGRA58.icc',size:b.length,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}]});el.dispatchEvent(new w.Event('change'));await until(()=>!$('#print-import').disabled);
 for(const [key,value]of Object.entries({printing_condition:'Test workflow',substrate:'Fabric not measured',rendering_intent:'Relative colorimetric',black_point_compensation:'false'}))input(sel+`[data-setting="${key}"]`,value);
 assert.equal($(sel+'[data-profiled-reference]').disabled,false);await $(sel+'[data-profiled-reference]').onclick();
 assert.match($('#print-message').textContent,/ICCBased FOGRA58 RGB/);assert.equal(downloads.length,2);const data=JSON.parse(downloads[0].value);assert.equal(data.production.conversion_status,'CALCULATED_ICC_TRANSFORM');assert.match(downloads[1].name,/fogra58-iccbased-rgb.pdf$/);assert.match($(sel+'[data-result-values]').textContent,/16-bit/);
 await $('#preview-use-picker').onclick();assert.equal($(pv+'[data-preview-run]').disabled,false);$(pv+'[data-preview-run]').click();await until(()=>!$(pv+'[data-preview-save]').disabled);
 $(pv+'[data-preview-metadata]').click();const meta=JSON.parse(downloads.at(-1).value);assert.equal(meta.path,'TEXTILE_RGB');assert.equal(meta.input_kind,'PKL_FULL_REFERENCE_IMAGE');assert.equal(meta.calculation.channels,3);assert.equal(meta.calculation.profile_role,'TEXTILE_RGB_EXCHANGE_SPACE');assert.equal(meta.production_approval,'NOT_PROVIDED');assert.equal(meta.calculation.measured_qc,'NOT_MEASURED');assert.match(meta.source.rgba_sha256,/^[a-f0-9]{64}$/);
 $(pv+'[data-preview-save]').click();await until(()=>downloads.some(x=>x.name.endsWith('Before_After.png')));
 const png=downloads.find(x=>x.name.endsWith('Before_After.png'));const bytes=await new Promise((resolve,reject)=>{const reader=new w.FileReader();reader.onload=()=>resolve(Buffer.from(reader.result));reader.onerror=reject;reader.readAsArrayBuffer(png.blob)});assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');const img=await loadImage(bytes);assert(img.width>=1000);fs.writeFileSync('tmp/textile-conversion/ui-before-after.png',bytes);fs.writeFileSync('tmp/textile-conversion/ui-preview.json',JSON.stringify(meta,null,2));
 input(sel+'[data-setting="rendering_intent"]','Perceptual');assert.equal($(pv+'[data-preview-save]').disabled,true);assert.match($(sel+'[data-result-values]').textContent,/Not calculated/);
 assert.equal(d.querySelector('[data-preview-path="4C"] [data-preview-save]').disabled,true);
 console.log('PASS: real WASM through candidate UI, reference JSON/PDF, PKL-first image roundtrip, real PNG B/A encode/decode and metadata, stale-result invalidation, path isolation (jsdom + real canvas; not native browser acceptance)');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;dom.window.close()});
