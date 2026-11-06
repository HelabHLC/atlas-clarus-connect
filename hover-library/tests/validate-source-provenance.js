'use strict';
// Exercise the shipped receiver with real master data and RC28-produced records.
// jsdom is not a live WordPress, image-decoder or visual acceptance test.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const {JSDOM}=createRequire(path.resolve('browser-bundle/tests/package.json'))('jsdom');
const zlib=require('node:zlib');
require('../assets/js/source-provenance.js');
require('../../browser-bundle/src/palette-export.js');
const P=globalThis.ATLAS_CLARUS_HOVER_PROVENANCE,E=globalThis.ATLAS_CLARUS_EXPORTS;
const doc=JSON.parse(fs.readFileSync('hover-library/data/colors.json','utf8'));
const views=JSON.parse(fs.readFileSync('hover-library/data/views.json','utf8'));
const names=JSON.parse(zlib.gunzipSync(fs.readFileSync('hover-library/data/atlas-name-search-index-v1.json.gz')));
const colors=doc.colors,c=colors[4966],clone=v=>JSON.parse(JSON.stringify(v));
const image={name:'two-greens.png',width:20,height:20,sha256:'a'.repeat(64)};
function record(rgb=[61,123,25],ref=c){
  return E.createSourceAssignment({rgb,size:1,count:1,std:[0,0,0],bounds:[2,3,2,3]},
    {ix:2,iy:3},image,ref,P.MASTER);
}
const first=record(),second=record([60,123,25]);
function link(r=first){
  const url=new URL('https://atlas.test/hover/');
  Object.entries({source:'pkl-image-picker',atlas_row_id:c.id,hlc:c.ref,master_sha256:P.MASTER,
    return_url:'https://atlas.test/picker/?mode=sample#picker'}).forEach(([k,v])=>url.searchParams.set(k,v));
  if(r!==null)url.searchParams.set('source_assignment',JSON.stringify(r));
  return url;
}
function storage(values={}){const map=new Map(Object.entries(values));return {
  getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v)};}
assert.deepEqual(P.validateSources([first,second],colors,[c.id]),[first,second]);
assert.equal(P.readHandoff(link(),colors).sourceAssignment.distance_squared,41);
assert.equal(P.readHandoff(link(null),colors).sourceAssignment,null);
assert.equal(P.readHandoff(new URL('https://atlas.test/hover/'),colors),null);
const extras=clone(first);extras.authentic=true;extras.signature='not-verified';
extras.image.owner='not-verified';extras.sampling.device='not-verified';
assert.deepEqual(P.readHandoff(link(extras),colors).sourceAssignment,first,'only checked fields survive');
const noHash=clone(first);noHash.image.sha256=null;
assert.equal(P.readHandoff(link(noHash),colors).sourceAssignment.image.sha256,null);
const area=E.createSourceAssignment({rgb:first.source_rgb,size:5,count:8,std:[1,2,3],bounds:[0,0,2,2]},
  {ix:0,iy:0},image,c,P.MASTER);
assert.deepEqual(P.readHandoff(link(area),colors).sourceAssignment,area);
const rejectRecord=change=>{const r=clone(first);change(r);assert.throws(()=>P.readHandoff(link(r),colors));};
for(const value of [null,false,'61',-1,256,61.5])rejectRecord(r=>r.source_rgb[0]=value);
for(const key of ['schema_version','source_hex','color_space','source_representation','reference',
  'reference_hex','master_sha256','workflow','metric','tie_break','signature_status'])rejectRecord(r=>r[key]='invalid');
rejectRecord(r=>r.reference_rgb[0]='55');rejectRecord(r=>r.atlas_row_id='4966');
rejectRecord(r=>r.atlas_row_id=0);rejectRecord(r=>r.distance_squared++);rejectRecord(r=>r.bits_per_channel=16);
rejectRecord(r=>r.image.sha256='bad');rejectRecord(r=>r.image.width=0);rejectRecord(r=>delete r.image.sha256);
rejectRecord(r=>r.sampling.centre=[20,3]);rejectRecord(r=>r.sampling.centre=['2',3]);
rejectRecord(r=>r.sampling.bounds=[0,0,19,19]);rejectRecord(r=>r.sampling.mode='AREA_MEAN_RGB');
rejectRecord(r=>r.sampling.valid_pixel_count=2);rejectRecord(r=>r.sampling.channel_std=[1,0,0]);
rejectRecord(r=>r.sampling.alpha_threshold=0);rejectRecord(r=>r.sampling.rounding='floor');
for(const key of ['source','atlas_row_id','hlc','master_sha256','return_url','source_assignment']){
  const url=link();url.searchParams.append(key,url.searchParams.get(key));assert.throws(()=>P.readHandoff(url,colors));
}
for(const [key,value] of [['atlas_row_id','4966x'],['atlas_row_id','9007199254740992'],['hlc','H000_L095_C000'],
  ['master_sha256','0'.repeat(64)],['source','other'],['source_assignment',''],['source_assignment','null'],
  ['source_assignment','{'],['source_assignment',' '.repeat(16385)],['return_url','https://evil.test/'],
  ['return_url','javascript:alert(1)'],['return_url','https://user:pass@atlas.test/']]){
  const url=link();url.searchParams.set(key,value);assert.throws(()=>P.readHandoff(url,colors));
}
// Recompute full-master winner and tie, not just a self-consistent distance.
assert.throws(()=>P.validateSources([record(first.source_rgb,colors[0])],colors,[0]),/winner/);
const groups=new Map();let collision;
for(const row of colors){const k=row.rgb.join(',');if(groups.has(k)){collision=[groups.get(k),row];break;}groups.set(k,row);}
const [low,high]=collision;
assert.equal(P.validateSources([record(low.rgb,low)],colors,[low.id]).length,1);
assert.throws(()=>P.validateSources([record(high.rgb,high)],colors,[high.id]),/winner/);
assert.throws(()=>P.validateSources(Array(4097).fill(first),colors,[c.id]));
let palette=P.add(P.empty(),c,first);palette=P.add(palette,c,second);palette=P.add(palette,c,first);
assert.deepEqual(palette.colorIds,[4966]);assert.equal(palette.sourceAssignments.length,2);
assert.deepEqual(E.parseClarus(P.clarus(palette,colors),colors,P.MASTER),{colorIds:[4966],sourceAssignments:[first,second]});
const legacy='[4966,"0",false,null,{},"4966"]';
const oldStore=storage({[P.LEGACY_KEY]:legacy});
assert.deepEqual(P.loadPalette(oldStore,colors).colorIds,[4966,0]);
assert.deepEqual(P.loadPalette(oldStore,colors).sourceAssignments,[]);
assert.equal(oldStore.getItem(P.LEGACY_KEY),legacy);assert.equal(oldStore.getItem(P.KEY),null);
for(const change of [p=>p.master_sha256='bad',p=>p.workflow='bad',p=>p.colorIds=[4966,4966],
  p=>p.colorIds=['4966'],p=>p.colorIds=[],p=>p.sourceAssignments[1].distance_squared++]){
  const bad=clone(palette);change(bad);assert.throws(()=>P.loadPalette(storage({[P.KEY]:JSON.stringify(bad)}),colors));
}
const back=P.returnLink(P.readHandoff(link(),colors));
assert.equal(back.hash,'#picker');assert.equal(back.searchParams.get('mode'),'sample');
assert.deepEqual(JSON.parse(back.searchParams.get('source_assignment')),first);
assert.equal(back.searchParams.get('atlas_row_id'),'4966');
const legacyBack=link(null);legacyBack.searchParams.set('return_url','https://atlas.test/picker/?source_assignment=stale');
assert.equal(P.returnLink(P.readHandoff(legacyBack,colors)).searchParams.has('source_assignment'),false);

async function waitFor(check){const end=Date.now()+5000;while(!check()){
  if(Date.now()>end)throw Error('Timed out');await new Promise(r=>setImmediate(r));}}
async function setup(url=link(),stored={},failStorage=false){
  const html='<section class="atlas-clarus-library" data-colors-url="/colors" data-views-url="/views" data-name-index-url="/names" data-default-view="core" data-per-page="24" data-wheel-url="https://wheel.test/" data-basis23-url="/basis23/" data-basis23-version="ATLAS_COMBINED_BASIS23_v0_8"></section>';
  const dom=new JSDOM(html,{url:url.href,runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,$=s=>w.document.querySelector(s),downloads=[],blobs=new Map(),errors=[];
  w.console.error=(...args)=>errors.push(args.map(String).join(' '));
  w.DecompressionStream=class{};w.Response=class{async text(){return JSON.stringify(names);}};
  w.fetch=async target=>{
    if(target==='/names')return {ok:true,body:{pipeThrough:()=>null}};
    const data=target==='/colors'?doc:target==='/views'?views:
      JSON.parse(fs.readFileSync('hover-library/data/basis23-recipes/'+String(target).split('/').pop(),'utf8'));
    return {ok:true,json:async()=>clone(data)};
  };
  w.URL.createObjectURL=blob=>{const u='blob:local-'+blobs.size;blobs.set(u,blob);return u;};
  w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){downloads.push(blobs.get(this.href));};
  for(const [key,value] of Object.entries(stored))w.localStorage.setItem(key,value);
  if(failStorage)w.Storage.prototype.setItem=()=>{throw Error('quota');};
  for(const file of ['source-provenance.js','atlas-clarus.js'])w.eval(fs.readFileSync('hover-library/assets/js/'+file,'utf8'));
  await waitFor(()=>$('.atlas-clarus-grid')||$('.atlas-clarus-error'));
  assert.equal($('.atlas-clarus-error'),null,errors.join('\n'));
  const state=()=>JSON.parse(w.localStorage.getItem(P.KEY));
  async function exportJson(){
    $('.acl-export-palette').click();const blob=downloads.at(-1);assert.ok(blob);
    return JSON.parse(await new Promise((resolve,reject)=>{const r=new w.FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsText(blob);}));
  }
  return {w,$,dom,state,exportJson,errors};
}

(async()=>{
  const a=await setup();assert.match(a.$('.acl-source-assignment').textContent,/#3D7B19.*#37791A.*NOT_SIGNED/);
  assert.equal(a.state(),null,'handoff alone does not mutate storage');
  a.$('.acl-add-palette').click();a.$('.acl-add-palette').click();
  assert.equal(a.state().sourceAssignments.length,1);
  assert.deepEqual(a.state().sourceAssignments,[first]);
  const saved=a.w.localStorage.getItem(P.KEY);a.dom.window.close();
  const b=await setup(link(second),{[P.KEY]:saved});b.$('.acl-add-palette').click();
  assert.deepEqual(b.state().colorIds,[4966]);assert.deepEqual(b.state().sourceAssignments,[first,second]);
  assert.match(b.$('.atlas-clarus-palette').textContent,/2 source records/);
  const exported=await b.exportJson();
  assert.deepEqual(E.parseClarus(exported,colors,P.MASTER),{colorIds:[4966],sourceAssignments:[first,second]});
  const both=b.w.localStorage.getItem(P.KEY);
  // Clearing and clicking the SAME reference manually must not restore stale source context.
  b.$('.acl-clear-palette').click();b.$('.atlas-clarus-card[data-atlas-id="4966"]').click();
  assert.equal(b.$('.acl-source-assignment'),null);b.$('.acl-add-palette').click();
  assert.deepEqual(b.state().sourceAssignments,[]);
  b.$('.atlas-clarus-palette button').click();assert.deepEqual(b.state().colorIds,[]);b.dom.window.close();
  const reload=await setup(new URL('https://atlas.test/hover/'),{[P.KEY]:both});
  assert.deepEqual(await reload.exportJson(),exported);
  reload.$('.atlas-clarus-palette button').click();assert.deepEqual(reload.state().sourceAssignments,[]);reload.dom.window.close();
  const old=await setup(link(null),{[P.LEGACY_KEY]:legacy});old.$('.acl-add-palette').click();
  assert.deepEqual(old.state().sourceAssignments,[]);assert.equal(old.w.localStorage.getItem(P.LEGACY_KEY),legacy);
  assert.match(old.$('.atlas-clarus-handoff-notice').textContent,/source RGB not recorded/);old.dom.window.close();
  // No partial fallback to identity-only selection when optional provenance is invalid.
  const bad=clone(first);bad.distance_squared++;
  const blocked=await setup(link(bad),{[P.KEY]:both});
  assert.match(blocked.$('.atlas-clarus-handoff-notice').textContent,/blocked/);
  assert.equal(blocked.$('.acl-add-palette'),null);assert.equal(blocked.w.localStorage.getItem(P.KEY),both);blocked.dom.window.close();
  // Unknown claims and markup are neither preserved as claims nor executed as HTML.
  const hostile=clone(extras);hostile.image.name='<img src=x onerror="alert(1)">.png';
  const escaped=await setup(link(hostile));escaped.$('.acl-add-palette').click();
  assert.equal(escaped.$('.acl-source-assignment img'),null);assert.equal(escaped.$('.atlas-clarus-palette img'),null);
  assert.equal(escaped.state().sourceAssignments[0].authentic,undefined);escaped.dom.window.close();
  const broken=await setup(link(),{[P.KEY]:'{broken',[P.LEGACY_KEY]:legacy});
  assert.equal(broken.$('.acl-add-palette').disabled,true);assert.equal(broken.$('.acl-clear-palette').disabled,true);
  assert.equal(broken.w.localStorage.getItem(P.KEY),'{broken');assert.match(broken.$('.acl-palette-status').textContent,/not been overwritten/);broken.dom.window.close();
  // A failed write retains source data in memory and offers an RC28-readable backup.
  const quota=await setup(link(),{},true);quota.$('.acl-add-palette').click();
  assert.match(quota.$('.acl-palette-status').textContent,/NOT SAVED/);assert.equal(quota.state(),null);
  assert.deepEqual((await quota.exportJson()).source_assignments,[first]);quota.dom.window.close();
  // Do not silently overwrite a newer stored palette from another view.
  const concurrent=await setup(link(),{[P.KEY]:saved});concurrent.w.localStorage.setItem(P.KEY,both);
  concurrent.$('.acl-add-palette').click();assert.equal(concurrent.w.localStorage.getItem(P.KEY),both);
  assert.match(concurrent.$('.acl-palette-status').textContent,/another view/);concurrent.dom.window.close();
  const full={...P.empty(),colorIds:colors.slice(0,24).map(r=>r.id)};
  const limited=await setup(link(),{[P.KEY]:JSON.stringify(full)});limited.$('.acl-add-palette').click();
  assert.deepEqual(limited.state(),full);assert.match(limited.$('.atlas-clarus-copy-status').textContent,/Palette full/);limited.dom.window.close();
  const sourceFull={...P.empty(),colorIds:[4966],sourceAssignments:Array.from({length:4096},(_,i)=>{
    const r=clone(first);r.image.name='sample-'+i+'.png';return r;})};
  const before=JSON.stringify(sourceFull);assert.throws(()=>P.add(sourceFull,c,second),/limit/);assert.equal(JSON.stringify(sourceFull),before);
  console.log('PASS: RC28 handoff/return, full-master winner/ties, rejection and allowlist, two sources/one row, legacy migration, reload, removal, manual selection, JSON backup, storage errors/conflicts and limits');
})().catch(err=>{console.error(err);process.exitCode=1;});
