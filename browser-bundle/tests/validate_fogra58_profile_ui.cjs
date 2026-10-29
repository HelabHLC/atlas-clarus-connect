'use strict';
// DOM regressions exercise guards even when a caller bypasses a disabled button.
const assert = require('node:assert/strict'), fs = require('node:fs');
const {webcrypto} = require('node:crypto'), {JSDOM} = require('jsdom');
const dir = process.env.TEXTILE_BUNDLE_DIR;
const dom = new JSDOM(fs.readFileSync(dir+'/index.html','utf8'), {url:'https://offline.test/#print',runScripts:'outside-only'});
const w = dom.window, d = w.document, $ = s => d.querySelector(s);
Object.defineProperty(w.crypto,'subtle',{value:webcrypto.subtle}); w.TextEncoder=TextEncoder;
for (const name of ['print-handoff.js','print-ui.js']) w.eval(fs.readFileSync(dir+'/assets/'+name,'utf8'));
const master = require('../../hover-library/data/colors.json'), downloads=[], invalidations=[];
let picked = master.colors.find(c=>c.id===4665), palette=[picked], workers=0;
w.Worker = function(){ workers++; throw Error('No worker expected in guard tests'); };
w.ATLAS_CLARUS_PREVIEW_UI = {init:()=>({invalidate:id=>invalidations.push(id)})};
const workspace = w.ATLAS_CLARUS_PRINT_UI.init({colors:master.colors,master:master.master_sha256,
 getSelected:()=>picked,getPalette:()=>palette,getPaletteName:()=> 'Guard regression',download:(name,value)=>downloads.push({name,value})});
const selector = id=>`[data-print-path="${id}"] `, textile=selector('TEXTILE_RGB');
const run = id=>$(selector(id)+'[data-profiled-reference]');
let cases=0;
const check = (ok,message)=>{assert(ok,message);cases++;};
async function settled(){const end=Date.now()+10000;while($('#print-import').disabled){assert(Date.now()<end,'UI timed out');await new Promise(r=>setTimeout(r,10));}}
async function attach(id,bytes,name='TextileRGB_FOGRA58.icc'){
 const el=$(selector(id)+'[data-profile-file]');
 const files=bytes===null?[]:[{name,size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}];
 Object.defineProperty(el,'files',{configurable:true,value:files});el.dispatchEvent(new w.Event('change'));await settled();
}
function input(key,value){const el=$(textile+`[data-setting="${key}"]`);el.value=value;el.dispatchEvent(new w.Event('input'));}
async function importData(data){const s=JSON.stringify(data),el=$('#print-import-file');Object.defineProperty(el,'files',{configurable:true,value:[{size:s.length,text:async()=>s}]});await el.onchange({target:el});}
function synthetic(space){const b=Buffer.alloc(160);b.writeUInt32BE(160);b[8]=4;b.write('prtr',12);b.write(space,16);b.write('Lab ',20);b.write('acsp',36);b.writeUInt32BE(1,128);b.write('cprt',132);b.writeUInt32BE(144,136);b.writeUInt32BE(16,140);b.write('text',144);return b;}
(async()=>{
 if(process.argv.includes('--reproduce')) {
  assert.equal(run('TEXTILE_RGB').disabled,false);await run('TEXTILE_RGB').onclick();
  const message=$('#print-message').textContent;assert.match(message,/Cannot read properties of null.*data_base64/);
  assert.equal(workers,0);assert.equal(downloads.length,0);
  console.log(JSON.stringify({status:'REPRODUCED',environment:'JSDOM',action:'init with selection -> renderReferences -> lock(false) -> click FOGRA58 reference',message,workers,downloads:downloads.length}));return;
 }
 for(let repeat=0;repeat<3;repeat++){
  workspace.open('selected');
  for(const id of ['4C','ECG','TEXTILE_RGB']){
   check(run(id).disabled,`${id} must stay disabled without profile after selection`);
   await run(id).onclick();check(!/null|undefined|data_base64/i.test($('#print-message').textContent),'No technical null errors');
  }
  check(/TextileRGB_FOGRA58\.icc/.test($('#print-message').textContent),'Missing profile tells user exact filename');
  await $('#print-export').onclick();await $('#print-report').onclick();
  check(run('TEXTILE_RGB').disabled,'Export/report unlock must preserve path gate');
 }
 check(workers===0,'Missing-profile handler never starts worker');
 const raw=fs.readFileSync(process.env.TEXTILE_PROFILE);
 const badHash=Buffer.from(raw);badHash[badHash.length-1]^=1;
 for(const [name,bytes] of [['empty.icc',Buffer.alloc(0)],['document.icc',Buffer.from('not an ICC')],['truncated.icc',raw.subarray(0,150)],['wrong-space.icc',synthetic('CMYK')],['TextileRGB_FOGRA58.icc',synthetic('RGB ')],['tampered.icc',badHash],['oversized.icc',Buffer.alloc(16*1024*1024+1)]]){
  await attach('TEXTILE_RGB',bytes,name);
  check(/rejected:/.test($('#print-message').textContent),name+' rejected');
  check(/TextileRGB_FOGRA58\.icc/.test($('#print-message').textContent),'Rejection tells user needed filename');
  await $('#print-export').onclick();check(run('TEXTILE_RGB').disabled,'Rejected profile cannot be unlocked by handoff export');
  await run('TEXTILE_RGB').onclick();check(workers===0,'Invalid file never starts worker');
 }
 await attach('TEXTILE_RGB',raw);check(run('TEXTILE_RGB').disabled,'Profile alone is insufficient');
 const complete={printing_condition:'FOGRA58 regression',substrate:'Synthetic; not measured',rendering_intent:'Relative colorimetric',black_point_compensation:'false'};
 for(const [key,value]of Object.entries(complete))input(key,value);
 check(!run('TEXTILE_RGB').disabled,'Complete validated path enabled');
 for(const key of Object.keys(complete)){
  input(key,'');check(run('TEXTILE_RGB').disabled,'Missing '+key+' blocks');
  await run('TEXTILE_RGB').onclick();check(workers===0,'Missing settings stopped at handler');
  await $('#print-export').onclick();check(run('TEXTILE_RGB').disabled,'Unlock respects missing '+key);
  input(key,complete[key]);
 }
 for(const intent of w.ATLAS_CLARUS_PRINT.INTENTS)for(const bpc of ['true','false']){
  input('rendering_intent',intent);input('black_point_compensation',bpc);check(!run('TEXTILE_RGB').disabled,'Valid intent/BPC combination');
 }
 for(const [key,value]of Object.entries(complete))input(key,value);
 await attach('TEXTILE_RGB',null);check(!run('TEXTILE_RGB').disabled,'Cancelled picker preserves valid profile');
 await attach('4C',synthetic('CMYK'),'synthetic-cmyk.icc');check(!run('TEXTILE_RGB').disabled,'Another profile upload does not alter textile readiness');
 check(run('4C').disabled && run('ECG').disabled,'Other incomplete paths remain blocked');
 palette=[picked,master.colors[0]];workspace.open('palette');check(run('TEXTILE_RGB').disabled,'Two references block single-reference export');
 await run('TEXTILE_RGB').onclick();check(workers===0,'Multi-reference call stopped before worker');
 workspace.open('selected');check(!run('TEXTILE_RGB').disabled,'Return to one reference restores readiness');
 await $('#print-export').onclick();const saved=JSON.parse(downloads.at(-1).value);
 await attach('TEXTILE_RGB',Buffer.from('bad replacement'));check(run('TEXTILE_RGB').disabled,'Invalid replacement clears prior valid profile');
 await importData(saved);check(!run('TEXTILE_RGB').disabled,'Valid handoff restores profile/settings');
 const forged=JSON.parse(JSON.stringify(saved));forged.production_paths[2].profile.sha256='0'.repeat(64);
 await importData(forged);check(/Import blocked/.test($('#print-message').textContent),'Tampered import rejected');
 check(!run('TEXTILE_RGB').disabled,'Rejected import retains previous validated state');
 const legacy=await w.ATLAS_CLARUS_PRINT.create({entries:[picked],colors:master.colors,paths:{'4C':w.ATLAS_CLARUS_PRINT.emptySettings(),ECG:w.ATLAS_CLARUS_PRINT.emptySettings()}});
 const count=invalidations.filter(x=>x==='TEXTILE_RGB').length;
 await importData(legacy);check(run('TEXTILE_RGB').disabled,'Legacy import clears textile profile');
 check(invalidations.filter(x=>x==='TEXTILE_RGB').length>count,'Legacy import invalidates old textile preview');
 await attach('TEXTILE_RGB',raw);for(const [key,value]of Object.entries(complete))input(key,value);
 $(textile+'[data-profile-clear]').click();workspace.open('selected');await $('#print-report').onclick();
 check(run('TEXTILE_RGB').disabled,'Clear, select and report cannot resurrect profile');
 check(workers===0,'All guard failures precede worker creation');
 console.log(JSON.stringify({status:'PASS',assertions:cases,worker_starts:workers,invalid_file_cases:7}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>w.close());
