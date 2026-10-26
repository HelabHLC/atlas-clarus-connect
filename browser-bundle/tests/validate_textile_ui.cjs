'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{webcrypto}=require('node:crypto'),{JSDOM}=require('jsdom');
const html=fs.readFileSync((process.env.TEXTILE_BUNDLE_DIR || 'browser-bundle/build-textile-preview/atlas-clarus-browser-bundle')+'/index.html','utf8');
const dom=new JSDOM(html,{url:'https://local.test/#print',runScripts:'outside-only'}),w=dom.window,d=w.document,$=s=>d.querySelector(s);
Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
for(const n of ['print-handoff.js','print-ui.js'])w.eval(fs.readFileSync('browser-bundle/textile/'+n,'utf8'));
const master=require('../../hover-library/data/colors.json'),downloads=[];
const context={colors:master.colors,master:master.master_sha256,getSelected:()=>master.colors[4966],getPalette:()=>[master.colors[4966],master.colors[10519]],getPaletteName:()=> 'Textile UI test',download:(name,value,type)=>downloads.push({name,value,type})};
w.ATLAS_CLARUS_PRINT_UI.init(context);
const wait=async()=>{const end=Date.now()+12000;while($('#print-import').disabled){if(Date.now()>end)throw Error('UI timeout');await new Promise(r=>setTimeout(r,10))}};
const input=(s,value)=>{const el=$(s);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}))};
async function attach(s,file){const el=$(s);Object.defineProperty(el,'files',{configurable:true,value:[file]});el.dispatchEvent(new w.Event('change',{bubbles:true}));await wait()}
(async()=>{
 assert.equal(d.querySelectorAll('[data-print-path]').length,3);assert.equal($('#print-export').disabled,false);
 const raw=fs.readFileSync(process.env.TEXTILE_PROFILE),array=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
 await attach('[data-print-path="TEXTILE_RGB"] [data-profile-file]',{name:'TextileRGB_FOGRA58.icc',size:raw.length,arrayBuffer:async()=>array});
 assert.match($('[data-print-path="TEXTILE_RGB"] [data-profile-summary]').textContent,/fad691cc/);
 input('[data-print-path="TEXTILE_RGB"] [data-setting="substrate"]','Cotton test');input('[data-print-path="TEXTILE_RGB"] [data-setting="printing_condition"]','Agreed workflow test');
 input('[data-print-path="TEXTILE_RGB"] [data-setting="rendering_intent"]','Relative colorimetric');input('[data-print-path="TEXTILE_RGB"] [data-setting="black_point_compensation"]','false');
 await $('#print-export').onclick();const saved=JSON.parse(downloads.at(-1).value);assert.equal(saved.version,'0.2.0');assert.equal(saved.production_paths[2].substrate,'Cotton test');
 await $('#print-report').onclick();assert.match(downloads.at(-1).value,/FOGRA58 RGB exchange space/);
 const file=data=>{const t=JSON.stringify(data);return {name:'job.json',size:t.length,text:async()=>t}};
 await attach('#print-import-file',file(saved));assert.equal($('[data-print-path="TEXTILE_RGB"] [data-setting="substrate"]').value,'Cotton test');
 const bad=JSON.parse(JSON.stringify(saved));bad.production_paths[2].profile.sha256='0'.repeat(64);await attach('#print-import-file',file(bad));assert.match($('#print-message').textContent,/Import blocked/);assert.equal($('[data-print-path="TEXTILE_RGB"] [data-setting="substrate"]').value,'Cotton test');
 const legacy=await w.ATLAS_CLARUS_PRINT.create({entries:[master.colors[4966]],colors:master.colors,paths:{'4C':w.ATLAS_CLARUS_PRINT.emptySettings(),ECG:w.ATLAS_CLARUS_PRINT.emptySettings()}});
 await attach('#print-import-file',file(legacy));assert.equal($('[data-print-path="TEXTILE_RGB"] [data-setting="substrate"]').value,'');assert.match($('[data-print-path="TEXTILE_RGB"] [data-profile-summary]').textContent,/No output profile/);
 await $('#print-export').onclick();assert.equal(JSON.parse(downloads.at(-1).value).production_paths[2].profile,null);
 console.log('PASS: actual candidate Print UI, attach official ICC, export JSON/report, restore, tamper rejection with atomic retention, legacy import clears textile state');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;dom.window.close()});
