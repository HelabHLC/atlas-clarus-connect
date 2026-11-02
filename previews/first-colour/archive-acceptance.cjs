'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const [candidate,fixtures,evidence]=process.argv.slice(2).map(p=>path.resolve(p));fs.mkdirSync(evidence,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 const errors=[],requests=[],passes=[],oracle=JSON.parse(fs.readFileSync(path.join(fixtures,'oracle.json'))),samples=[];
 async function fresh(viewport={width:1400,height:1100}){
  const ctx=await browser.newContext({viewport,acceptDownloads:true}),p=await ctx.newPage();p.setDefaultTimeout(20000);
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await p.goto(pathToFileURL(path.join(candidate,'index.html')).href);await p.waitForFunction(()=>!!window.ATLAS_FIRST_COLOUR_ARCHIVE);return p;
 }
 async function load(p,name){await p.locator('#picker-file').setInputFiles(path.join(fixtures,name));await p.waitForFunction(()=>document.querySelector('#fc-status').textContent.includes('Wähle jetzt'));await p.locator('#picker-canvas').focus();await p.keyboard.press('Enter');}
 async function download(p,id,name){const wait=p.waitForEvent('download');await p.locator(id).click();const d=await wait;assert.equal(await d.failure(),null);const file=path.join(evidence,name);await d.saveAs(file);return fs.readFileSync(file);}
 async function open(p,bytes,name='saved.zip',ok=true){await p.locator('#fc-import').setInputFiles({name,mimeType:name.endsWith('.zip')?'application/zip':'application/json',buffer:bytes});await p.waitForFunction(success=>document.querySelector('#fc-status').textContent.startsWith(success?'Herkunftspaket geöffnet.':'Datei konnte nicht geöffnet'),ok);}
 async function mutate(p,bytes,kind){return Buffer.from(await p.evaluate(async({bytes,kind})=>{
  const H=ClarusHandoff,files=ATLAS_IMAGE_CODECS.unzip(new Uint8Array(bytes)),m=JSON.parse(new TextDecoder().decode(files['manifest.json']));
  const encode=x=>H.utf8(JSON.stringify(x,null,2));
  const hash=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(kind==='original')files[m.original.path][files[m.original.path].length-1]^=1;
  if(kind==='json')files['colour.clarus.json'][0]=32;
  if(kind==='readme')files['read-me.txt'][0]^=1;
  if(kind==='missing')delete files[m.original.path];
  if(kind==='extra')files['extra.txt']=H.utf8('unlisted');
  if(kind==='path'){files['../image.png']=files[m.original.path];delete files[m.original.path];}
  if(kind==='manifest-hash')m.files[m.original.path].sha256='0'.repeat(64);
  if(kind==='master')m.master_sha256='0'.repeat(64);
  if(kind==='false-transform')m.policy.browser_transform='VERIFIED';
  if(kind==='unknown-field')m.unknown='unexpected';
  if(kind==='wrong-source'){
   const data=JSON.parse(new TextDecoder().decode(files['colour.clarus.json']));
   for(const r of data.source_assignments){r.image.sha256='0'.repeat(64);if(r.image.colour_origin)r.image.colour_origin.file_sha256=r.image.sha256;}
   files['colour.clarus.json']=encode(data);m.files['colour.clarus.json']={bytes:files['colour.clarus.json'].length,sha256:await hash(files['colour.clarus.json'])};
  }
  if(kind==='bad-rgb'){
   const data=JSON.parse(new TextDecoder().decode(files['colour.clarus.json']));data.source_assignments[0].source_rgb[0]^=1;
   files['colour.clarus.json']=encode(data);m.files['colour.clarus.json']={bytes:files['colour.clarus.json'].length,sha256:await hash(files['colour.clarus.json'])};
  }
  files['manifest.json']=encode(m);const out=H.zipStored(files);
  if(kind==='crc')out[80]^=1;
  if(kind==='truncated')return Array.from(out.subarray(0,out.length-1));
  if(kind==='compressed'){new DataView(out.buffer).setUint16(8,8,true);}
  if(kind==='duplicate'){
   // Duplicate local and central filenames while keeping valid payload CRCs.
   const d=H.zipStored({'same-a':H.utf8('a'),'same-b':H.utf8('b'),'same-c':H.utf8('c'),'same-d':H.utf8('d')});
   for(let i=0;i<d.length-6;i++)if(new TextDecoder().decode(d.subarray(i,i+6))==='same-b')d[i+5]=97;
   return Array.from(d);
  }
  return Array.from(out);
 },{bytes:Array.from(bytes),kind}));}
 try{
  const p=await fresh();assert.equal(await p.locator('#fc-zip-download').isDisabled(),true);
  let sampleZip,sampleJson;
  for(const name of Object.keys(oracle)){
   await load(p,name);
   const json=await download(p,'#fc-download',name+'.clarus.json'),zip=await download(p,'#fc-zip-download',name+'.zip');
   const f=await p.evaluate(bytes=>Object.fromEntries(Object.entries(ATLAS_IMAGE_CODECS.unzip(new Uint8Array(bytes))).map(([k,v])=>[k,Array.from(v)])),Array.from(zip));
   const m=JSON.parse(Buffer.from(f['manifest.json']));
   assert.deepEqual(Buffer.from(f[m.original.path]),fs.readFileSync(path.join(fixtures,name)));
   assert.deepEqual(Buffer.from(f['colour.clarus.json']),json);
   for(const [n,check]of Object.entries(m.files)){assert.equal(sha(Buffer.from(f[n])),check.sha256);assert.equal(f[n].length,check.bytes);}
   const doc=JSON.parse(json);assert.equal(doc.source_assignments[0].image.sha256,oracle[name].file_sha256);
   assert.equal(doc.source_assignments[0].image.colour_origin.icc.sha256,oracle[name].icc_sha256);
   assert.equal(m.policy.browser_transform,'NOT_OBSERVABLE');
   const q=await fresh();await open(q,zip);
   assert.deepEqual(await download(q,'#fc-download',name+'.restored.json'),json);
   assert.deepEqual(await download(q,'#fc-zip-download',name+'.restored.zip'),zip);
   assert.equal(await q.locator('#fc-stage-slot').isVisible(),false);
   await q.context().close();samples.push({name,original_sha256:sha(Buffer.from(f[m.original.path])),icc_sha256:oracle[name].icc_sha256,zip_sha256:sha(zip)});
   if(name==='profiled.png'){sampleZip=zip;sampleJson=json;}
  }
  passes.push('8 PNG/JPEG/WebP/GIF fixtures: original bytes and embedded ICC bytes retained, independent Pillow ICC oracle, actual JSON/ZIP downloads and fresh-context byte-identical re-export');
  await open(p,sampleZip);
  for(const kind of ['original','json','readme','missing','extra','path','manifest-hash','master','false-transform','unknown-field','wrong-source','bad-rgb','crc','truncated','compressed','duplicate']){
   const q=await fresh();await open(q,sampleZip);
   await open(q,await mutate(q,sampleZip,kind),'bad.zip',false);
   assert.deepEqual(await download(q,'#fc-zip-download','after-'+kind+'.zip'),sampleZip);
   assert.deepEqual(await download(q,'#fc-download','after-'+kind+'.json'),sampleJson);
   await q.context().close();
  }
  passes.push('16 corrupt/unsafe archives rejected atomically; valid original and JSON remain unchanged');
  await p.locator('#fc-import').setInputFiles({name:'plain.json',mimeType:'application/json',buffer:sampleJson});
  await p.waitForFunction(()=>document.querySelector('#fc-status').textContent.startsWith('Gesicherte Farbe geöffnet.'));
  assert.equal(await p.locator('#fc-zip-download').isDisabled(),true);
  assert.deepEqual(await download(p,'#fc-download','json-still-usable.json'),sampleJson);
  passes.push('standalone JSON remains usable and never inherits an unrelated previous original');
  await open(p,sampleZip);
  const edge=await p.evaluate(async()=>{
   const A=ATLAS_FIRST_COLOUR_ARCHIVE,ctx={colors:ATLAS_CLARUS_DATA.colors,master:ATLAS_CLARUS_DATA.master_sha256},results=[];
   for(const [name,op]of [['oversized ZIP',()=>A.unpack(new Uint8Array(A.MAX_ZIP+1),ctx)]]){
    try{await op();throw Error('Unexpected acceptance');}catch(e){if(e.message==='Unexpected acceptance')throw e;results.push(name+': '+e.message);}
   }
   return results;
  });
  // Proper original-size case with a valid document (validation is deliberately first).
  const limits=await p.evaluate(async doc=>{
   const A=ATLAS_FIRST_COLOUR_ARCHIVE,ctx={colors:ATLAS_CLARUS_DATA.colors,master:ATLAS_CLARUS_DATA.master_sha256};
   try{await A.pack(doc,{name:'large.png',bytes:new Uint8Array(A.MAX_SOURCE+1)},ctx);return 'ACCEPTED';}catch(e){return e.message;}
  },JSON.parse(sampleJson));assert.match(limits,/32 MiB/);assert.match(edge[0],/49 MiB/);
  passes.push('bounded ZIP and original-file sizes');
  // Multiple samples from one original are preserved; a missing second original is not invented.
  const multi=await p.evaluate(async({json,zip})=>{
   const A=ATLAS_FIRST_COLOUR_ARCHIVE,ctx={colors:ATLAS_CLARUS_DATA.colors,master:ATLAS_CLARUS_DATA.master_sha256},opened=await A.unpack(new Uint8Array(zip),ctx),data=JSON.parse(json);
   data.source_assignments.push(structuredClone(data.source_assignments[0]));
   const packed=await A.pack(data,opened.original,ctx),again=await A.unpack(packed,ctx);
   data.source_assignments[1].image.sha256='1'.repeat(64);data.source_assignments[1].image.colour_origin.file_sha256='1'.repeat(64);
   let rejected=false;try{await A.pack(data,opened.original,ctx);}catch(e){rejected=/Originaldatei/.test(e.message);}
   return {count:again.data.source_assignments.length,rejected};
  },{json:sampleJson.toString(),zip:Array.from(sampleZip)});assert.deepEqual(multi,{count:2,rejected:true});
  passes.push('all same-file sources retained; mixed or missing originals explicitly rejected');
  // Delay a real async operation; changing selection must cancel the stale download.
  await load(p,'profiled.png');let downloads=0;p.on('download',()=>downloads++);
  await p.evaluate(()=>{window.realPack=ATLAS_FIRST_COLOUR_ARCHIVE.pack;ATLAS_FIRST_COLOUR_ARCHIVE.pack=async(...args)=>{await new Promise(r=>window.releasePack=r);return window.realPack(...args);};});
  await p.locator('#fc-zip-download').click();await p.waitForFunction(()=>!!window.releasePack);
  await load(p,'untagged.jpg');await p.evaluate(()=>{ATLAS_FIRST_COLOUR_ARCHIVE.pack=window.realPack;window.releasePack();});
  await p.waitForFunction(()=>!document.querySelector('#fc-zip-note').textContent.includes('wird geprüft'));assert.equal(downloads,0);
  passes.push('selection change during async export cancels stale ZIP without marking new colour as saved');
  // A late import cannot overwrite a newer image selection.
  await p.evaluate(()=>{window.realUnpack=ATLAS_FIRST_COLOUR_ARCHIVE.unpack;ATLAS_FIRST_COLOUR_ARCHIVE.unpack=async(...args)=>{await new Promise(r=>window.releaseUnpack=r);const result=await window.realUnpack(...args);window.unpackFinished=true;return result;};});
  await p.locator('#fc-import').setInputFiles({name:'delayed.zip',mimeType:'application/zip',buffer:sampleZip});await p.waitForFunction(()=>!!window.releaseUnpack);
  await load(p,'uninspected.gif');await p.evaluate(async()=>{ATLAS_FIRST_COLOUR_ARCHIVE.unpack=window.realUnpack;window.releaseUnpack();return;});
  await p.waitForFunction(()=>window.unpackFinished);assert.match(await p.locator('#fc-image-name').innerText(),/uninspected.gif/);
  passes.push('overlapping import cannot overwrite a newer image selection');
  await p.evaluate(()=>{window.realPack=ATLAS_FIRST_COLOUR_ARCHIVE.pack;ATLAS_FIRST_COLOUR_ARCHIVE.pack=async()=>{throw Error('simulated read/hash failure');};});
  await p.locator('#fc-zip-download').click();await p.waitForFunction(()=>document.querySelector('#fc-save-status').textContent.includes('simulated read/hash failure'));
  assert.equal(await p.locator('#fc-download').isEnabled(),true);assert.equal(await p.locator('#fc-zip-download').isEnabled(),true);
  await p.evaluate(()=>{ATLAS_FIRST_COLOUR_ARCHIVE.pack=window.realPack;});
  await p.locator('#picker-file').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken')});await p.waitForFunction(()=>document.querySelector('#fc-status').textContent.includes('konnte nicht geöffnet'));
  assert.equal(await p.locator('#fc-zip-download').isDisabled(),true);passes.push('read/hash failure recovers controls; invalid image cannot export a stale original');
  const phone=await fresh({width:390,height:844});await open(phone,sampleZip);await download(phone,'#fc-zip-download','mobile.zip');
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await phone.screenshot({path:path.join(evidence,'origin-mobile.png'),fullPage:true});
  await open(p,sampleZip);await p.screenshot({path:path.join(evidence,'origin-desktop.png'),fullPage:true});passes.push('mobile layout and real ZIP download');
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);passes.push('no page errors or HTTP requests during local workflow');
  const result={status:'PASS',browser:browser.version(),checks:passes.length,passes,samples,server_deployed:false,physical_device_testing:'NOT_TESTED'};
  fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
