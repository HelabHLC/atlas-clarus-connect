'use strict';
// Real UI package imports/exports, with native validators and browser decoders.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const X=require('../tools/image-project-exchange.cjs');
const root=path.resolve(process.env.SOURCE_BINDING_OUTPUT||'/tmp/atlas-source-binding');
const out=path.join(root,'tool-exchange');fs.mkdirSync(out,{recursive:true});
const html=path.resolve(__dirname,'../build-tool-exchange/atlas-clarus-browser-bundle/index.html');
const fixtures=JSON.parse(fs.readFileSync(path.join(root,'fixtures-sha256.json'))),engines=X.ENGINES;
const sha=b=>createHash('sha256').update(b).digest('hex');
const report={status:'RUNNING',platform:process.platform,playwright:require('playwright/package.json').version,html_sha256:sha(fs.readFileSync(html)),fixture_hashes:fixtures,engines:{},cases:[],physical_devices:{windows:'NOT_TESTED',macos_safari:'NOT_TESTED',iphone:'NOT_TESTED',ipad:'NOT_TESTED'}};
const sessions={},packets={};
async function idle(p){await p.waitForFunction(()=>!document.getElementById('xe-import').disabled);}
async function upload(p,bytes){await p.evaluate(()=>location.hash='exchange');await p.locator('#xe-import').setInputFiles({name:'exchange.zip',mimeType:'application/zip',buffer:bytes});await idle(p);return p.locator('#xe-status').innerText();}
async function save(p){const[d]=await Promise.all([p.waitForEvent('download'),p.locator('#xe-save').click()]);await idle(p);return fs.readFileSync(await d.path());}
async function snapshot(p){return p.evaluate(()=>Object.fromEntries(['xe-files','xe-summary','cp-project-info','cp-history-list','ip-summary','ip-history','ch-cards','cr-status'].map(id=>[id,document.getElementById(id)?.textContent])));}
async function payloads(p,bytes){return p.evaluate(async b=>{const H=ClarusHandoff,T=ATLAS_TOOL_EXCHANGE,D=ATLAS_CLARUS_DATA,ctx=await T.context({colors:D.colors,master:D.master_sha256,libraryViews:D.views});const q=await T.importZip(ATLAS_IMAGE_PROJECTS.unbase64(b,T.MAX_BYTES),ctx);return {documents:q.documents,payloads:Object.fromEntries(Object.entries(q.payloads).map(([id,b])=>[id,ATLAS_IMAGE_PROJECTS.base64(b)])),package_id:q.package_id};},bytes.toString('base64'));}
(async()=>{try{
 for(const e of engines){sessions[e]=await X.launch(e,html);const p=sessions[e].page;p.setDefaultTimeout(120000);await idle(p);report.engines[e]={version:sessions[e].version,firefox_icc_mode:e==='firefox'?2:null};packets[e]={};
  for(const name of Object.keys(fixtures)){
   const bytes=fs.readFileSync(path.join(root,name));assert.equal(sha(bytes),fixtures[name]);
   // Seed via native API, using this engine's actual decoder. UI owns subsequent exchange export/import.
   const seed=await p.evaluate(async({b,name,palette})=>{
    const T=ATLAS_TOOL_EXCHANGE,I=ATLAS_IMAGE_PROJECTS,H=ClarusHandoff,P=ATLAS_COLOUR_PROJECTS,D=ATLAS_CLARUS_DATA,J=ATLAS_REDUCTION_JOB;
    const ctx=await T.context({colors:D.colors,master:D.master_sha256,libraryViews:D.views}),enc=d=>H.utf8(JSON.stringify(d)+'\n');let pkg=T.create(ctx);
    const add=async(filename,bytes,parents=[])=>{const r=await T.add(pkg,{filename,bytes,parents},ctx);pkg=r.package;return r.id;};
    const id=await add('palette.json',H.utf8(palette));let r=await T.derive(pkg,id,'COLOUR_PROJECT',ctx);pkg=r.package;let cp=(await T.inspect(pkg.payloads[r.ids[0]],ctx)).data;
    const entry=P.latest(cp).entries[0].entry_id,c=P.palette(cp,entry).records[0];cp=await P.choose(cp,entry,c.decision_id,c.revision_id,'Cross-engine colour choice',ctx.native);cp=await P.edit(cp,entry,c.decision_id,'Edited green','#112233','Cross-engine colour edit',ctx.native);
    const cpId=await add('edited-colour-project.json',enc(cp),r.ids);r=await T.derive(pkg,cpId,'DECISIONS',ctx);pkg=r.package;
    function icc(space){const b=new Uint8Array(160),v=new DataView(b.buffer),put=(o,s)=>b.set(H.utf8(s),o);v.setUint32(0,160);b[8]=4;b[9]=0x30;put(12,'prtr');put(16,space);put(20,'Lab ');put(36,'acsp');v.setUint32(64,1);v.setUint32(128,1);put(132,'cprt');v.setUint32(136,144);v.setUint32(140,16);put(144,'text');put(152,'TEST');return b;}
    const Print=ATLAS_CLARUS_PRINT,p4=await Print.readProfile(icc('CMYK'),'synthetic-4C.icc','4C'),p7=await Print.readProfile(icc('7CLR'),'synthetic-ECG.icc','ECG');
    const print=await Print.create({entries:[D.colors[4966]],colors:D.colors,master:D.master_sha256,name:'Cross-engine profiles',paths:{'4C':{...Print.emptySettings(),profile:p4,substrate:'TEST PAPER',rendering_intent:'Relative colorimetric',black_point_compensation:false},ECG:{...Print.emptySettings(),profile:p7,substrate:'TEST ECG',rendering_intent:'Perceptual',black_point_compensation:true}}});
    await add('profiles.json',enc(print));
    const source=I.unbase64(b,I.MAX_SOURCE),decoded=await I.decodeSource(source);let image=await I.create({name,filename:name,bytes:source,...decoded,colourProject:cp},ctx.native);
    const at=(3*decoded.width+2)*4;image=await I.edit(image,{kind:'RECOLOUR',rect:[2,3,1,1],match:Array.from(decoded.rgba.slice(at,at+3)),replacement:[17,34,51],note:'Recorded pixel selection'},ctx.native);
    image=await I.edit(image,{kind:'UNDO',note:'Undo preserved'},ctx.native);image=await I.edit(image,{kind:'REDO',note:'Redo preserved'},ctx.native);
    const imageId=await add('image.json',enc(image),[cpId]);
    const settings={protectionMode:'ORIGINAL_RGBA',libraryId:'core',libraryName:D.views.core.name,libraryIds:D.views.core.ids.map(Number),k:4,lockedIds:[],originalRgbs:[],protectedRectangles:[[0,0,3,3]],regionCorrections:[]};
    const input={...decoded,name,sourceName:name,sourceBytes:source,sourceMime:name.endsWith('.png')?'image/png':'image/jpeg',project:image};
    const result=ATLAS_COLOUR_REDUCTION.reduce({...settings,...input,colors:D.colors,master:D.master_sha256});
    const job={schema:J.SCHEMA,master_sha256:D.master_sha256,input,settings,result,uncleaned:result,variants:[],view:{zoom:1,x:.5,y:.5,selected:null,region:null,active:'current',overlay:false,difference:false,threshold:40,cleanupMin:16,cleanupScope:'MASK_ONLY'}};
    await add('protected-job.zip',H.zipStored(await J.exportFiles(job,{},ctx.job)),[imageId]);
    return {zip:I.base64(await T.exportZip(pkg,ctx)),rgba:image.original.rgba_sha256,original:image.original.file_sha256};
   },{b:bytes.toString('base64'),name,palette:require('./fixtures/colour-kit-030-two-greens.json').bundle_origin.document_text});
   assert.equal(seed.original,sha(bytes));const zip=Buffer.from(seed.zip,'base64');assert.match(await upload(p,zip),/^Exchange opened/);
   const exported=await save(p);assert.deepEqual(await payloads(p,exported),await payloads(p,zip));packets[e][name]={bytes:exported,rgba:seed.rgba,expected:await payloads(p,exported)};
   fs.writeFileSync(path.join(out,e+'-'+name+'.zip'),exported);
  }
 }
 for(const from of engines)for(const to of engines)for(const name of Object.keys(fixtures)){
  const p=sessions[to].page,packet=packets[from][name],compatible=packet.rgba===packets[to][name].rgba;
  // Seed a valid saved workspace before every transfer; snapshots include native tool state.
  assert.match(await upload(p,packets[to]['opaque.png'].bytes),/^Exchange opened/);const base=packets[to]['opaque.png'].expected;
  for(const filename of ['edited-colour-project.json','image.json']){await p.locator('#xe-document').selectOption(base.documents.find(d=>d.filename===filename).id);await p.locator('#xe-native-open').click();await idle(p);assert.match(await p.locator('#xe-status').innerText(),/^Opened in/);}
  await p.evaluate(()=>location.hash='exchange');const before=await snapshot(p),retained=await save(p);
  const text=await upload(p,packet.bytes),accepted=text.startsWith('Exchange opened');
  const row={from,to,fixture:name,input_sha256:sha(packet.bytes),sender_rgba:packet.rgba,receiver_rgba:packets[to][name].rgba,expected:compatible?'ACCEPT':'REJECT',actual:accepted?'ACCEPT':'REJECT',message:text};report.cases.push(row);
  assert.equal(accepted,compatible,JSON.stringify(row));
  if(accepted){const returned=await save(p);assert.deepEqual(await payloads(p,returned),packet.expected);row.complete_payloads_exact=true;}
  else{assert.match(text,/Source\/pixel consistency could not be verified/);assert.deepEqual(await snapshot(p),before);assert.deepEqual(await payloads(p,await save(p)),await payloads(p,retained));row.workspace_preserved=true;}
 }
 report.status='PASS';
 }finally{for(const s of Object.values(sessions))await s.browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 const lines=['# RC34 automated Linux engine matrix','','This is Playwright WebKit, not Safari acceptance on Apple devices. Physical Windows, macOS Safari, iPhone and iPad: NOT_TESTED.','','| Fixture | '+engines.flatMap(a=>engines.map(b=>a+' → '+b)).join(' | ')+' |','|---|'+engines.flatMap(()=>engines.map(()=> '---')).join('|')+'|'];
 for(const name of Object.keys(fixtures))lines.push('| '+name+' | '+engines.flatMap(from=>engines.map(to=>report.cases.find(r=>r.from===from&&r.to===to&&r.fixture===name)?.actual||'NOT_RUN')).join(' | ')+' |');
 fs.writeFileSync(path.join(out,'MATRIX.md'),lines.join('\n')+'\n');}
 console.log(JSON.stringify({status:report.status,cases:report.cases.length,accepted:report.cases.filter(c=>c.actual==='ACCEPT').length,rejected:report.cases.filter(c=>c.actual==='REJECT').length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
