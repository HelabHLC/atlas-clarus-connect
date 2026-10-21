'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('./live-camera-core.js');
const core=globalThis.ATLAS_LIVE_CAMERA_CORE,root=path.join(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'hover-library/data/colors.json')));
data.views=JSON.parse(fs.readFileSync(path.join(root,'hover-library/data/views.json'))).views;
const binder=core.create(data);
assert.deepEqual(core.mean(new Uint8Array([0,10,20,255,100,110,120,255,255,255,255,0])),[50,60,70]);
assert.throws(()=>core.mean(new Uint8Array([1,2,3,0])));
assert.throws(()=>core.create({...data,master_sha256:'0'.repeat(64)}));
assert.throws(()=>binder.library('missing'));
assert.equal(core.canToggleTorch({torch:[false]}),false);
assert.equal(core.canToggleTorch({torch:[true]}),false);
assert.equal(core.canToggleTorch({torch:[true,false]}),true);
assert.equal(core.canToggleTorch({torch:true}),true);
assert.equal(core.canToggleTorch({}),false);
for(const id of Object.keys(data.views)){
 const lib=binder.library(id);
 for(const rgb of [[0,0,0],[255,255,255],[87,143,191]]){
  const expected=lib.rows.slice().sort((a,b)=>a.rgb.reduce((s,v,j)=>s+(v-rgb[j])**2,0)-b.rgb.reduce((s,v,j)=>s+(v-rgb[j])**2,0)||a.id-b.id)[0];
  const result=binder.match(rgb,lib);assert.equal(result.atlas_row_id,expected.id);assert.deepEqual(result.source_rgb,rgb);assert.deepEqual(result.reference_rgb,expected.rgb);assert.equal(result.library_id,id);
 }
}
// Deliberate equal-distance candidates must prefer the lower immutable ID.
const tie=binder.match([1,0,0],{id:'tie',name:'Tie',rows:[{id:9,ref:'B',rgb:[2,0,0]},{id:2,ref:'A',rgb:[0,0,0]}]});assert.equal(tie.atlas_row_id,2);
console.log('PASS: 94 real library memberships, nearest RGB, deterministic ties, area averaging, invalid master/library rejection');
