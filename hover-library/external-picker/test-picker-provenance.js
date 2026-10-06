'use strict';
// Real master + RC28 parser; no claim to replace browser/WordPress acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto,createHash}=require('node:crypto');
require('../assets/js/source-provenance.js');
require('./picker-provenance.js');
require('../../browser-bundle/src/palette-export.js');
const P=globalThis.ATLAS_CLARUS_HOVER_PROVENANCE,S=globalThis.ATLAS_CLARUS_PICKER_PROVENANCE;
const E=globalThis.ATLAS_CLARUS_EXPORTS;
const colors=JSON.parse(fs.readFileSync('hover-library/data/colors.json')).colors,row=colors[4966];
const image={name:'two-greens.png',width:200,height:100,sha256:'a'.repeat(64)};
const clone=x=>JSON.parse(JSON.stringify(x));
const a=S.capture([61,123,25,255],20,30,image,row,colors);
const b=S.capture([60,123,25,255],120,30,image,row,colors);
assert.equal(a.distance_squared,41);assert.equal(b.distance_squared,30);
assert.deepEqual(a,E.createSourceAssignment({rgb:[61,123,25],size:1,count:1,std:[0,0,0],bounds:[20,30,20,30]},
  {ix:20,iy:30},image,row,P.MASTER));
for(const rgba of [[61,123,25,127],[61,123,25,0],[61,123,25],[61,123,25,256],[61.1,123,25,255]]){
  assert.throws(()=>S.capture(rgba,20,30,image,row,colors));
}
assert.equal(S.capture([61,123,25,128],20,30,image,row,colors).signature_status,'NOT_SIGNED');
assert.throws(()=>S.capture([61,123,25,255],200,30,image,row,colors));
assert.throws(()=>S.capture([61,123,25,255],20,30,image,colors[0],colors));
const saved={schema:'atlas-clarus-image-picker-handoff-v2',atlas_row_id:row.id,reference:row.ref,
  master_sha256:P.MASTER,x:20,y:30,source_assignment:a};
const handoff=new URL('https://atlas.test/staging/hover/');
Object.entries({source:'pkl-image-picker',atlas_row_id:row.id,hlc:row.ref,master_sha256:P.MASTER,
  return_url:'https://atlas.test/staging/?page_id=5393',source_assignment:JSON.stringify(a)})
  .forEach(([k,v])=>handoff.searchParams.set(k,v));
const back=P.returnLink(P.readHandoff(handoff,colors));
assert.deepEqual(S.checkReturn(back.searchParams,saved,colors),a);
assert.deepEqual(S.verifyRestored(a,[61,123,25,255],image,colors),a);
for(const change of [s=>s.x++,s=>s.master_sha256='bad',s=>s.atlas_row_id='4966',s=>s.reference='bad',
  s=>s.source_assignment=b,s=>s.source_assignment.signature_status='SIGNED']){
  const bad=clone(saved);change(bad);assert.throws(()=>S.checkReturn(back.searchParams,bad,colors));
}
for(const key of ['source','atlas_row_id','hlc','master_sha256','source_assignment']){
  const p=new URLSearchParams(back.searchParams);p.append(key,p.get(key));assert.throws(()=>S.checkReturn(p,saved,colors));
  p.delete(key);assert.throws(()=>S.checkReturn(p,saved,colors));
}
for(const value of ['{','null',' '.repeat(16385),JSON.stringify(b)]){
  const p=new URLSearchParams(back.searchParams);p.set('source_assignment',value);assert.throws(()=>S.checkReturn(p,saved,colors));
}
for(const change of [im=>im.sha256='b'.repeat(64),im=>im.width++,im=>im.name='other.png']){
  const bad=clone(image);change(bad);assert.throws(()=>S.verifyRestored(a,[61,123,25,255],bad,colors));
}
assert.throws(()=>S.verifyRestored(a,[60,123,25,255],image,colors));
assert.throws(()=>S.verifyRestored(a,[61,123,25,127],image,colors));
const noHash=S.capture([61,123,25,255],20,30,{...image,sha256:null},row,colors);
assert.equal(S.verifyRestored(noHash,[61,123,25,255],image,colors).image.sha256,null);
const legacy={...saved,schema:'atlas-clarus-image-picker-handoff-v1'};delete legacy.source_assignment;
assert.throws(()=>S.checkReturn(back.searchParams,legacy,colors));
const old=new URLSearchParams(back.searchParams);old.delete('source_assignment');
assert.equal(S.checkReturn(old,legacy,colors),null);
let palette=P.add(P.empty(),row,a);palette=P.add(palette,row,b);
assert.deepEqual(E.parseClarus(P.clarus(palette,colors),colors,P.MASTER),{colorIds:[4966],sourceAssignments:[a,b]});
(async()=>{
  const context={crypto:webcrypto};vm.createContext(context);
  vm.runInContext(fs.readFileSync('hover-library/external-picker/picker-provenance.js','utf8'),context);
  const bytes=Buffer.from('local original file bytes');
  assert.equal(await context.ATLAS_CLARUS_PICKER_PROVENANCE.hashFile({arrayBuffer:async()=>bytes}),
    createHash('sha256').update(bytes).digest('hex'));
  context.crypto=null;
  assert.equal(await context.ATLAS_CLARUS_PICKER_PROVENANCE.hashFile({arrayBuffer:async()=>bytes}),null);
  console.log('PASS: picker capture, RC28 round trip, two sources/one reference, tamper rejection, legacy return, optional file hash');
})().catch(e=>{console.error(e);process.exitCode=1;});
