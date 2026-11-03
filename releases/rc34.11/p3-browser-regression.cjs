'use strict';
// Real Picker interactions; the oracle never calls ATLAS matching/conversion code.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const crypto=require('node:crypto'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
const {chromium,firefox,webkit}=require('playwright');
const [bundle,fixtures,out]=process.argv.slice(2).map(p=>path.resolve(p));
fs.mkdirSync(out,{recursive:true});
const oracle=JSON.parse(fs.readFileSync(path.join(fixtures,'oracle-p3.json')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const dataBytes=fs.readFileSync(path.join(bundle,'assets/atlas-data.js'));
const sandbox={};sandbox.window=sandbox;vm.runInNewContext(dataBytes.toString(),sandbox);
const master=sandbox.ATLAS_CLARUS_DATA;
assert.equal(master.colors.length,13283);
const nearest=rgb=>master.colors.reduce((a,c)=>{
  const d=c.rgb.reduce((s,v,i)=>s+(v-rgb[i])**2,0);
  return !a||d<a.distance_squared||(d===a.distance_squared&&c.id<a.id)?
    {id:c.id,reference:c.ref,rgb:[...c.rgb],distance_squared:d}:a;
},null);
const key='atlasClarusPalettesV3',engine=process.env.BROWSER_ENGINE||'chromium';
const executable=process.env.BROWSER_EXECUTABLE||process.env.CHROMIUM_EXECUTABLE;
const result={status:'RUNNING',engine,playwright:require('playwright/package.json').version,
  bundle_version:JSON.parse(fs.readFileSync(path.join(bundle,'BUNDLE_MANIFEST.json'))).version,
  bundle_index_sha256:hash(fs.readFileSync(path.join(bundle,'index.html'))),
  master_sha256:master.master_sha256,master_data_file_sha256:hash(dataBytes),master_rows:master.colors.length,
  oracle_sha256:hash(fs.readFileSync(path.join(fixtures,'oracle-p3.json'))),lcms_version:oracle.lcms_version,
  tolerance:oracle.rgb8_tolerance_per_channel,rows:[],accuracy_failures:[]};
(async()=>{
  const browser=await ({chromium,firefox,webkit}[engine]).launch({headless:true,
    ...(engine==='chromium'?{args:['--no-sandbox'],ignoreDefaultArgs:['--force-color-profile=srgb']}:{}),
    ...(executable?{executablePath:executable}:{})});
  result.browser=browser.version();
  const errors=[];
  async function fresh(){
    const ctx=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
    const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(bundle,'index.html')).href);
    await page.waitForFunction(()=>typeof window.ATLAS_CLARUS_EXPORTS?.quarkPackage==='function');
    return page;
  }
  async function download(page,kind,name){
    const ready=page.waitForEvent('download');await page.locator(`[data-palette-export="${kind}"]`).click();
    const file=await ready;assert.equal(await file.failure(),null);
    await file.saveAs(path.join(out,name));return fs.readFileSync(path.join(out,name));
  }
  try{
    const page=await fresh();
    result.environment=await page.evaluate(()=>({user_agent:navigator.userAgent,
      device_pixel_ratio:devicePixelRatio,screen_gamut_p3:matchMedia('(color-gamut: p3)').matches,
      default_canvas_attributes:document.createElement('canvas').getContext('2d').getContextAttributes?.()}));
    const records=[];
    for(const [name,expected] of Object.entries(oracle.fixtures)){
      const file=path.join(fixtures,name);assert.equal(hash(fs.readFileSync(file)),expected.file_sha256);
      await page.evaluate(()=>{location.hash='picker'});
      await page.locator('#picker-file').setInputFiles(file);
      await page.waitForFunction(n=>document.querySelector('#picker-result').textContent.includes('Image ready.')&&
        document.querySelector('#picker-result').textContent.includes(n),name);
      const canvas=page.locator('#picker-canvas');await canvas.scrollIntoViewIfNeeded();
      const box=await canvas.boundingBox();await canvas.click({position:{x:box.width/2,y:box.height/2}});
      await page.locator('[data-picker-hover]').click();
      await page.locator('#selection [data-add-palette]').click();await page.locator('#palette-close').click();
      const r=await page.evaluate(({key,name})=>{
        const state=JSON.parse(localStorage.getItem(key));
        return state.palettes.find(p=>p.id===state.activeId).sourceAssignments.find(r=>r.image.name===name);
      },{key,name});
      assert.ok(r,name+' source assignment');
      const delta=r.source_rgb.map((v,i)=>v-expected.expected_srgb8[i]);
      const winner=nearest(r.source_rgb),expectedWinner=nearest(expected.expected_srgb8);
      const row={file:name,encoded_rgb:expected.encoded_rgb,bits:expected.bits,
        expected_srgb8:expected.expected_srgb8,browser_srgb8:r.source_rgb,delta,
        within_lcms_tolerance:delta.every(v=>Math.abs(v)<=oracle.rgb8_tolerance_per_channel),
        diagnostic_highbyte_then_icc:expected.diagnostic_highbyte_then_icc,
        diagnostic_round8_then_icc:expected.diagnostic_round8_then_icc,
        expected_reference:expectedWinner.reference,actual_reference:r.reference,
        actual_atlas_row_id:r.atlas_row_id,actual_distance_squared:r.distance_squared,
        metadata:r.image.colour_origin};
      result.rows.push(row);
      if(!row.within_lcms_tolerance)result.accuracy_failures.push(name+' exceeds +/-1 RGB8 vs LittleCMS');
      assert.equal(r.reference,winner.reference);assert.equal(r.atlas_row_id,winner.id);
      assert.equal(r.distance_squared,winner.distance_squared);
      const meta=r.image.colour_origin;
      assert.equal(r.image.sha256,expected.file_sha256);assert.equal(meta.file_sha256,expected.file_sha256);
      assert.equal(meta.icc.sha256,expected.icc_sha256);assert.equal(meta.icc.bytes,expected.icc_bytes);
      assert.equal(meta.icc.status,expected.profile?'EMBEDDED_ICC':'NO_EMBEDDED_ICC');
      if(expected.profile){assert.equal(meta.icc.colour_space,'RGB');
        assert.equal(meta.icc.name,expected.profile==='srgb'?'ATLAS test sRGB':'ATLAS test Display P3');}
      assert.equal(meta.processing.browser_transform,'NOT_OBSERVABLE');
      assert.equal(meta.processing.source_profile_assumption,'NONE_BY_ATLAS');
      assert.equal(r.source_representation,'BROWSER_DECODED_SRGB');
      records.push(r);
    }
    const row=n=>result.rows.find(r=>r.file===n);
    result.in_gamut_pair_rgb_equal=JSON.stringify(row('in-srgb16.png').browser_srgb8)===JSON.stringify(row('in-p3-16.png').browser_srgb8);
    result.in_gamut_pair_reference_equal=row('in-srgb16.png').actual_reference===row('in-p3-16.png').actual_reference;
    if(!result.in_gamut_pair_rgb_equal)result.accuracy_failures.push('16-bit same-target pair captures different RGB8');
    const changed=row('in-p3-16.png').browser_srgb8.map((v,i)=>v-row('control-p3-codes-srgb16.png').browser_srgb8[i]);
    result.profile_changes_pixels=Math.max(...changed.map(Math.abs))>=10;
    if(!result.profile_changes_pixels)result.accuracy_failures.push('P3 profile does not measurably change pixels');
    assert.deepEqual(row('control-p3-codes-srgb16.png').browser_srgb8,row('control-p3-codes-untagged16.png').browser_srgb8);
    result.profile_transform_control_delta=changed;
    await page.locator('#palette-toggle').click();
    const exported=await download(page,'clarus','p3.clarus.json');
    const zip=await download(page,'quark-package','p3.quarkxpress.zip');
    const doc=JSON.parse(exported);assert.deepEqual(doc.source_assignments,records);
    // Exercise both JSON and whole ZIP imports in separate browser contexts.
    for(const [format,bytes] of [['json',exported],['zip',zip]]){
      const imported=await fresh();
      await imported.locator('#palette-import-file').setInputFiles({name:'p3.'+format,
        mimeType:format==='json'?'application/json':'application/zip',buffer:bytes});
      await imported.waitForFunction(()=>document.querySelector('#export-status').textContent.includes('8 source records'));
      await imported.locator('#palette-toggle').click();
      assert.deepEqual(await download(imported,'clarus',format+'-reimport.clarus.json'),exported);
      assert.deepEqual(await download(imported,'quark-package',format+'-reimport.quarkxpress.zip'),zip);
      await imported.reload();await imported.locator('#palette-toggle').click();
      assert.deepEqual(await download(imported,'clarus',format+'-reload.clarus.json'),exported);
    }
    // Read actual archive entries via the already shipped ZIP reader.
    // The deterministic ZIP is stored (method 0); inspect the standard directory,
    // independently of ATLAS' importer, including the exact bytes of every entry.
    const entries=[];let pos=0;
    while(zip.readUInt32LE(pos)===0x04034b50){
      assert.equal(zip.readUInt16LE(pos+8),0,'stored ZIP expected');
      const size=zip.readUInt32LE(pos+18),nl=zip.readUInt16LE(pos+26),el=zip.readUInt16LE(pos+28);
      const name=zip.subarray(pos+30,pos+30+nl).toString();
      const start=pos+30+nl+el,bytes=zip.subarray(start,start+size);
      entries.push({name,size,sha256:hash(bytes)});pos=start+size;
    }
    assert.ok(entries.length>=3);result.zip_inspection={entries};
    for(const [name,e] of Object.entries(oracle.fixtures)){
      assert.ok(!entries.some(entry=>entry.sha256===e.file_sha256),name+' is absent from palette ZIP');
      assert.ok(!zip.includes(fs.readFileSync(path.join(fixtures,name))),name+' raw image bytes absent');
      assert.equal(hash(fs.readFileSync(path.join(fixtures,name))),e.file_sha256,'disk original unchanged');
    }
    assert.ok(entries.every(e=>!(/\.(png|icc|jpe?g|webp)$/i.test(e.name))));
    assert.equal(hash(fs.readFileSync(path.join(bundle,'assets/atlas-data.js'))),result.master_data_file_sha256);
    assert.deepEqual(errors,[]);
    Object.assign(result,{status:result.accuracy_failures.length?'COLOUR_ACCURACY_FAIL':'PASS',
      metadata_matching_and_roundtrip_status:'PASS',source_records:records.length,json_and_zip_roundtrip_byte_identical:true,
      reload_preserves_source_records:true,original_input_files_unchanged:true,
      original_image_and_icc_bytes_in_palette_exports:false,
      original_files_recoverable_from_palette_exports:false,master_unchanged:true,
      browser_internal_transform:'NOT_OBSERVABLE',physical_print_proof:false,page_errors:errors});
    console.log(JSON.stringify(result,null,2));
    if(result.accuracy_failures.length)process.exitCode=1; // report every sample/export, retain strict acceptance
  }catch(e){result.status='FAIL';result.failure=e.stack;throw e;}
  finally{fs.writeFileSync(path.join(out,'p3-browser-results.json'),JSON.stringify(result,null,2)+'\n');await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
