'use strict';
// Real crop bridge experiment. Does not alter the application, schema or master.
// Usage: node validate_highres_crop.cjs PREPARED_DIRECTORY ORIGINAL_JPEG
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash,webcrypto}=require('node:crypto'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
if(!global.crypto)Object.defineProperty(global,'crypto',{value:webcrypto});
global.ClarusHandoff=require('../vendor/clarus-handoff/clarus-handoff.js');
for(const f of ['palette-export','colour-handoff','colour-projects','image-project-codecs','image-projects'])require('../src/'+f+'.js');
const H=global.ClarusHandoff,A=global.ATLAS_COLOUR_HANDOFF,P=global.ATLAS_COLOUR_PROJECTS,C=global.ATLAS_IMAGE_CODECS,I=global.ATLAS_IMAGE_PROJECTS;
const data=require('../../hover-library/data/colors.json'),sha=b=>createHash('sha256').update(b).digest('hex');
const clone=x=>JSON.parse(JSON.stringify(x));
const out=path.resolve(process.argv[2]),jpeg=path.resolve(process.argv[3]);
const read=n=>fs.readFileSync(path.join(out,n));
const write=(n,b)=>fs.writeFileSync(path.join(out,n),b);
const json=(n,d)=>write(n,JSON.stringify(d,null,2)+'\n');
const target=path.resolve(process.env.IMAGE_PROJECTS_HTML||path.join(__dirname,'../build/atlas-clarus-browser-bundle/index.html'));

(async()=>{
 const ctx=await A.createContext(data.colors,data.master_sha256);
 const meta=JSON.parse(read('crop-preparation.json')),expected=JSON.parse(read('crop-expected.json'));
 const expectedRgba=read('crop.rgba'),png=read('crop.png');
 assert.equal(sha(png),meta.crop.file_sha256);assert.equal(sha(expectedRgba),meta.crop.rgba_sha256);
 assert.equal(sha(read('crop-expected.json')),meta.crop.expected_map_file_sha256);
 assert.equal(sha(fs.readFileSync(jpeg)),meta.source.file_sha256);
 assert.equal(meta.atlas.master_sha256,A.MASTER);
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const errors=[];
 try {
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:960}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(target).href+'#image-projects');
  await page.waitForFunction(()=>!document.getElementById('ip-image').disabled);
  const done=async p=>{await page.waitForFunction(()=>!document.getElementById('ip-image').disabled);assert((await page.locator('#ip-status').innerText()).startsWith(p),await page.locator('#ip-status').innerText());};
  const save=async(button,name)=>{const[d]=await Promise.all([page.waitForEvent('download'),page.locator(button).click()]);await d.saveAs(path.join(out,name));await page.waitForFunction(()=>!document.getElementById('ip-image').disabled);return read(name);};
  await page.locator('#ip-name').fill('Ruisdael crop: original (1000,1000), 256 x 256');
  await page.locator('#ip-image').setInputFiles(path.join(out,'crop.png'));await done('Original image retained');
  const initial=JSON.parse(await save('#ip-json','crop-initial.clarus.json'));
  const state=await I.verify(initial,ctx);
  assert.equal(initial.original.width,256);assert.equal(initial.original.height,256);
  assert.equal(initial.original.file_sha256,sha(png));
  assert.equal(initial.original.rgba_sha256,sha(expectedRgba));
  assert.deepEqual(Buffer.from(state.original),expectedRgba);assert.deepEqual(Buffer.from(state.source),png);
  // Recompute every crop pixel's reference against the unchanged 13,283-row master.
  for(let i=0;i<256*256;i++){
   const r=I.reference(Array.from(expectedRgba.subarray(i*4,i*4+3)),ctx);
   assert.equal(r.atlas_row_id,expected.source_atlas_row_id[i]);
   assert.equal(r.distance_squared,expected.distance_squared[i]);
  }
  const anchor=100*256+100,sourceRgb=Array.from(expectedRgba.subarray(anchor*4,anchor*4+3));
  for(const[id,v]of [['ip-x',100],['ip-y',100],['ip-width',1],['ip-height',1]])await page.locator('#'+id).fill(String(v));
  await page.locator('#ip-height').blur();await page.locator('#ip-mode').selectOption('exact');
  await page.locator('#ip-match').fill(I.hex(sourceRgb));await page.locator('#ip-replacement').fill('#112233');
  await page.locator('#ip-note').fill('Crop local (100,100) = source (1100,1100). See separate crop-origin manifest.');
  await page.locator('#ip-recolour').click();await done('Image change recorded');
  await page.locator('#ip-match').fill('#112233');await page.locator('#ip-note').fill('Make the recoloured pixel transparent; preserve hidden RGB.');
  await page.locator('#ip-transparent').click();await done('Image change recorded');
  await page.locator('#ip-undo').click();await done('Image change recorded');
  await page.locator('#ip-redo').click();await done('Image change recorded');
  const edited=JSON.parse(await save('#ip-json','crop-edited.clarus.json'));
  const zip=await save('#ip-zip','crop-image-project.zip');
  assert.equal(edited.history.length,4);
  for(const e of edited.history){assert.equal(e.changed_pixels,1);assert.deepEqual(e.affected_runs,[anchor,1]);}
  const finalState=await I.verify(edited,ctx);
  const expectedFinal=Buffer.from(expectedRgba);expectedFinal.set([17,34,51,0],anchor*4);
  assert.deepEqual(Buffer.from(finalState.frame),expectedFinal);assert.deepEqual(edited.original,initial.original);
  assert.deepEqual(await I.importZip(new Uint8Array(zip),ctx),edited);
  await page.screenshot({path:path.join(out,'crop-browser.png'),fullPage:true});
  // The REAL 26,983,792-pixel original is rejected by the UI and the crop stays intact.
  await page.locator('#ip-image').setInputFiles(jpeg);
  await page.waitForFunction(()=>document.getElementById('ip-status').dataset.error==='true');
  const rejection=await page.locator('#ip-status').innerText();assert(rejection.includes('4,194,304'));
  assert.deepEqual(JSON.parse(await save('#ip-json','after-rejected-original.json')),edited);
  // Separate browser session imports the actual package and returns a newer JSON.
  const other=await browser.newContext({acceptDownloads:true}),peer=await other.newPage();
  peer.on('pageerror',e=>errors.push(e.message));await peer.goto(pathToFileURL(target).href+'#image-projects');
  await peer.waitForFunction(()=>!document.getElementById('ip-import').disabled);
  await peer.locator('#ip-import').setInputFiles(path.join(out,'crop-image-project.zip'));
  await peer.waitForFunction(()=>!document.getElementById('ip-import').disabled);
  assert((await peer.locator('#ip-status').innerText()).startsWith('Image project opened'));
  await peer.locator('#ip-undo').click();await peer.waitForFunction(()=>!document.getElementById('ip-import').disabled);
  const[returned]=await Promise.all([peer.waitForEvent('download'),peer.locator('#ip-json').click()]);
  await returned.saveAs(path.join(out,'crop-returned.clarus.json'));
  const newer=JSON.parse(read('crop-returned.clarus.json'));await I.verify(newer,ctx);assert.equal(I.relation(edited,newer),'NEWER');
  await page.locator('#ip-import').setInputFiles(path.join(out,'crop-returned.clarus.json'));await done('Image project opened');
  const rejected=[];
  for(const[name,mutate]of [
   ['root_parent_field',p=>p.parent_image={sha256:meta.source.file_sha256}],
   ['original_offset_field',p=>p.original.crop_offset=[1000,1000]],
   ['operation_global_coordinates',p=>p.history[0].operation.original_xy=[1100,1100]],
   ['wrong_atlas_reference',p=>p.history[0].operation.source_reference.atlas_row_id=0]]){
   const bad=clone(edited);mutate(bad);delete bad.document_sha256;bad.document_sha256=await ctx.sha(H.utf8(P.canon(bad)));
   await assert.rejects(()=>I.verify(bad,ctx));rejected.push(name);
  }
  const files=await I.exportFiles(edited,ctx);
  await assert.rejects(()=>I.importZip(H.zipStored({...files,'crop-origin.json':H.utf8('{}')}),ctx));rejected.push('extra_zip_sidecar');
  // Importer boundary: internally consistent frozen RGBA is not decoded from file.
  const forged=clone(initial),changed=Buffer.from(expectedRgba);changed[anchor*4]^=1;
  forged.original.rgba_base64=changed.toString('base64');forged.original.rgba_sha256=sha(changed);
  delete forged.document_sha256;forged.document_sha256=await ctx.sha(H.utf8(P.canon(forged)));
  await I.verify(forged,ctx); // expected current limitation, not an origin validation pass
  assert.notEqual(forged.original.rgba_sha256,meta.crop.rgba_sha256);
  // Minimal seam proof: two half-crops, one 2-pixel edit spanning their boundary.
  const halves=[];
  for(let t=0;t<2;t++){
   const rgba=new Uint8Array(128*256*4);
   for(let y=0;y<256;y++)rgba.set(expectedRgba.subarray((y*256+t*128)*4,(y*256+t*128+128)*4),y*128*4);
   // Node-only core test; do not persist this create() fixture as a browser-decoded artifact.
   let p=await I.create({name:'Seam fixture '+t,filename:'tile.png',bytes:C.png(128,256,rgba),width:128,height:256,rgba},ctx);
   p=await I.edit(p,{kind:'RECOLOUR',rect:[t===0?127:0,100,1,1],match:null,replacement:[17,34,51],note:'Split original-coordinate seam selection.'},ctx);
   const frame=(await I.verify(await I.importZip(H.zipStored(await I.exportFiles(p,ctx)),ctx),ctx)).frame;
   halves.push(frame);
  }
  const combined=Buffer.alloc(expectedRgba.length);
  for(let t=0;t<2;t++)for(let y=0;y<256;y++)combined.set(halves[t].subarray(y*128*4,(y+1)*128*4),(y*256+t*128)*4);
  const whole=await I.edit(initial,{kind:'RECOLOUR',rect:[127,100,2,1],match:null,replacement:[17,34,51],note:'Whole-crop seam comparison.'},ctx);
  assert.deepEqual(combined,Buffer.from((await I.verify(whole,ctx)).frame));
  assert.throws(()=>I.dimensions(6116,4412));
  const maxPng=C.png(2048,2048,new Uint8Array(2048*2048*4));assert(maxPng.length>I.MAX_SOURCE);
  const safePng=C.png(1024,1024,new Uint8Array(1024*1024*4));assert(safePng.length<I.MAX_SOURCE);
  const sample={local_xy:[100,100],original_xy:[1100,1100],original_rgb:sourceRgb,original_alpha:255,
                atlas_reference:I.reference(sourceRgb,ctx),edited_rgb:[17,34,51],edited_alpha:0,
                edited_atlas_reference:I.reference([17,34,51],ctx)};
  const binding={project_id:edited.project_id,project_document_sha256:edited.document_sha256,
                 project_file_sha256:sha(read('crop-edited.clarus.json')),project_original_file_sha256:edited.original.file_sha256,
                 project_original_rgba_sha256:edited.original.rgba_sha256,project_current_rgba_sha256:sha(finalState.frame)};
  const origin={...meta,status:'VERIFIED_CROP_EXPERIMENT',binding,samples:[sample]};
  json('crop-origin.json',origin);
  const report={status:'PASS_WITH_DOCUMENTED_IMPORTER_BOUNDARY',tested_base_commit:'4a42f74aba2cdc0408e52b91b4dc57e798830491',
   browser:await browser.version(),node:process.version,full_original_open_as_project:'REJECTED_AS_EXPECTED',
   full_original_rejection:rejection,working_crop_kept:true,full_source_file_and_rgb_checked:true,
   full_original_atlas_mapping_rerun:false,crop_browser_rgba_matches_archived_rgb:true,
   crop_pixels_verified:65536,crop_atlas_assignments_recomputed:65536,
   recolour_transparency_undo_redo:true,zip_separate_session_and_returned_json:true,
   schema_rejected:rejected,
   recomputed_frozen_pixel_forgery_accepted_by_existing_importer:true,
   forged_pixels_fail_external_origin_check:true,
   two_half_crop_seam_equivalence:true,full_30_tile_workflow:'NOT_TESTED',
   uncompressed_png_bytes:{side2048:maxPng.length,side1024:safePng.length},
   hashes:{source_file:meta.source.file_sha256,source_canonical_rgb:meta.source.canonical_rgb_sha256,
           crop_file:sha(png),crop_rgba:sha(expectedRgba),reference_csv:meta.atlas.reference_csv_sha256},
   sample,reference_data_modified:false,live_ionos:'NOT_TESTED',physical_colour_or_authorship:'NOT_TESTED'};
  assert.deepEqual(errors,[]);json('highres-crop-report.json',report);
  const artifactNames=['crop.png','crop.rgba','crop-expected.json','crop-preparation.json','crop-origin.json',
    'crop-initial.clarus.json','crop-edited.clarus.json','crop-returned.clarus.json','crop-image-project.zip','highres-crop-report.json','crop-browser.png'];
  json('SHA256.json',Object.fromEntries(artifactNames.map(n=>[n,sha(read(n))])));
  console.log(JSON.stringify(report));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
