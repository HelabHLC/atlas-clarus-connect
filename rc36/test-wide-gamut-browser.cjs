'use strict';
// A separate ephemeral copy uses GENERATED fixture pins; the real candidate remains unchanged.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{pathToFileURL}=require('node:url');
const {chromium}=require('../browser-bundle/tests/node_modules/playwright');
const source='candidate',fixture='fixture-candidate',dir='fixture-inputs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const original=fs.readFileSync(source+'/index.html','utf8');
const moduleText=fs.readFileSync(source+'/assets/rc36-wide-gamut-integration.js','utf8');
const pins=JSON.parse(moduleText.match(/const pins=(\{[^\n]+\});/)[1].replace(/'/g,'"'));
const master_sha256='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
const wavelength_nm=Array.from({length:36},(_,i)=>380+i*10),anchors_nm=[460,520,570,610];
const records=[],rows=[],synthetic=[];
const addr=i=>'H'+String(Math.floor(i/10000)).padStart(3,'0')+'_L'+String(Math.floor(i/100)%100).padStart(3,'0')+'_C'+String(i%100).padStart(3,'0');
for(let j=0;j<20115;j++){
 const hlc=addr(j),v=.1+j*.00003,reflectance=Array(36).fill(v),anchors=Array(4).fill(v);
 let area=0,moment=0;for(let k=0;k<35;k++){area+=5*(reflectance[k]+reflectance[k+1]);moment+=5*(wavelength_nm[k]*reflectance[k]+wavelength_nm[k+1]*reflectance[k+1]);}
 const lambda_v2_nm=380+area,lambda_ee_nm=moment/area,sid4=anchors.map(x=>x.toFixed(4)).join('_'),address6=sid4+'|'+lambda_v2_nm.toFixed(4)+'|'+lambda_ee_nm.toFixed(4);
 const row={hlc,anchors,lambda_v2_nm,lambda_ee_nm,sid4,address6,libraries:j<13283?['srgb']:j<16520?['display-p3']:['prophoto-rgb']};
 if(j<13283){records.push({atlas_row_id:j,reference:hlc,wavelength_nm,reflectance});rows.push({...row,kind:'ORIGINAL_MASTER_REFERENCE',atlas_row_id:j,spectrum_row:j,lab_d50_stored:[50,0,0]});}
 else synthetic.push({...row,kind:'SYNTHETIC_REFERENCE_RESEARCH',reflectance,lab_d50_target:[50,0,0],physical_measurement:false,print_approval:false});
}
fs.mkdirSync(dir);
const docs={'master_original.json':{master_sha256,records},'master_address_index.json':{master_sha256,wavelength_nm,anchors_nm,rows},'synthetic_reference_library.json':{master_sha256,wavelength_nm,anchors_nm,rows:synthetic}};
fs.cpSync(source,fixture,{recursive:true});
let patched=original,patchedModule=moduleText;
const inputs=[];
for(const [n,obj] of Object.entries(docs)){const b=Buffer.from(JSON.stringify(obj)),h=hash(b),p=path.resolve(dir,n);fs.writeFileSync(p,b);inputs.push(p);assert.ok(patched.includes(pins[n]));patched=patched.replaceAll(pins[n],h);patchedModule=patchedModule.replaceAll(pins[n],h);}
fs.writeFileSync(fixture+'/index.html',patched);fs.writeFileSync(fixture+'/assets/rc36-wide-gamut-integration.js',patchedModule);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({acceptDownloads:true});const errors=[],requests=[];
  await context.route(/^https?:/,r=>{requests.push(r.request().url());return r.abort()});
  const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
  async function open(d){await page.goto(pathToFileURL(path.resolve(d,'index.html')).href+'#picker');await page.locator('#rc36-file-space').waitFor();await page.locator('#rc36-wide-gamut summary').click();return page.locator('#rc36-wide-gamut');}
  const status=()=>page.locator('#rc36-wide-gamut [role=status]');
  let panel=await open(source);
  const links=await panel.locator('a').evaluateAll(a=>a.map(x=>({href:x.href,target:x.target,rel:x.rel})));assert.equal(links.length,2);assert.ok(links.every(x=>x.target==='_blank'&&x.rel.includes('noopener')));
  await panel.getByRole('button',{name:'Bibliothek prüfen und laden'}).click();await status().filter({hasText:'Select all three'}).waitFor();
  await panel.getByLabel('Private Referenzdateien').setInputFiles(inputs);
  await panel.getByRole('button',{name:'Bibliothek prüfen und laden'}).click();await status().filter({hasText:'SHA-256 mismatch'}).waitFor();
  assert.ok(await panel.getByRole('button',{name:'Suchen',exact:true}).isDisabled());
  panel=await open(fixture);
  await panel.getByLabel('Private Referenzdateien').setInputFiles(inputs);
  await panel.getByRole('button',{name:'Bibliothek prüfen und laden'}).click();await status().filter({hasText:'20115 Referenzen'}).waitFor({timeout:60000});
  const query=panel.locator('input[type=search]');
  const search=async q=>{await query.fill(q);await panel.getByRole('button',{name:'Suchen',exact:true}).click()};
  const get=()=>panel.locator('pre').innerText().then(JSON.parse);
  await search(rows[0].hlc);assert.equal((await get()).reference.atlas_row_id,0);
  await search(synthetic[0].hlc);const d=await get();assert.equal(d.reference.atlas_row_id,null);assert.equal(d.reference.kind,'SYNTHETIC_REFERENCE_RESEARCH');
  assert.equal(d.evidence.productionApproval,false);assert.equal(d.output.status,'not-calculated');
  await search(synthetic[0].address6);assert.deepEqual(await get(),d);
  await search(rows[0].sid4);assert.ok(await panel.locator('button').filter({hasText:/H\d{3}_L\d{3}_C\d{3} ·/}).count()>1);
  await search(synthetic[0].hlc);
  async function download(name){const [f]=await Promise.all([page.waitForEvent('download'),panel.getByRole('button',{name,exact:true}).click()]);return fs.readFileSync(await f.path(),'utf8')}
  assert.deepEqual(JSON.parse(await download('Open DCM JSON')),d);
  const csv=await download('Spektrum CSV');assert.equal(csv.trim().split('\n').length,37);assert.match(csv,/^wavelength_nm,reference\n380,/);
  const [popup]=await Promise.all([page.waitForEvent('popup'),panel.getByRole('button',{name:'Open DCM Karte (Test)'}).click()]);
  assert.deepEqual(JSON.parse(await popup.locator('pre').innerText()),d);await popup.close();
  await panel.getByRole('button',{name:'Bibliothek entfernen'}).click();assert.ok(await panel.getByRole('button',{name:'Suchen',exact:true}).isDisabled());assert.ok(await panel.getByRole('button',{name:'Open DCM JSON',exact:true}).isDisabled());
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.equal(hash(fs.readFileSync(source+'/index.html')),hash(Buffer.from(original)));
  const report={status:'PASS',browser:browser.version(),fixture:'GENERATED TEST DATA; NOT ATLAS REFERENCE DATA',reference_count:20115,original_candidate_rejects_wrong_pins:true,local_file_import:true,hlc_and_full_key_search:true,sid4_multiple_matches:true,open_dcm_json:true,open_dcm_popup:true,spectrum_csv:true,clear:true,network_requests:requests.length,page_errors:errors.length,real_private_data_browser_test:'NOT_RUN',icc_numeric_gate:'PENDING'};
  fs.writeFileSync('evidence/rc36-3-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
