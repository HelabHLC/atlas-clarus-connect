'use strict';
const assert=require('node:assert/strict');
require('../src/pkl-image-binding.js');require('../src/colour-reduction.js');
const base=globalThis.ATLAS_COLOUR_REDUCTION;
require('../src/colour-reduction-original.js');
const R=globalThis.ATLAS_COLOUR_REDUCTION;
const colors=[{id:1,ref:'GREEN',rgb:[55,121,26]},{id:2,ref:'RED',rgb:[204,97,90]},{id:3,ref:'CREAM',rgb:[238,228,208]}],master='8'.repeat(64);
const rgba=Uint8Array.from([61,123,25,255,61,123,26,128,55,121,26,255,238,228,208,255,204,97,90,255,61,123,25,0]);
const args={rgba,width:6,height:1,colors,master,k:5},before=rgba.slice(),frozen=JSON.stringify(colors);
assert.deepEqual(R.reduce(args),base.reduce(args),'opt-in only; legacy exact');
const originals=[[61,123,25],[61,123,26],[55,121,26]];
const r=R.reduce({...args,originalRgbs:originals});
assert.deepEqual(r.pixels,rgba,'all three green nuances survive exactly, including alpha and hidden RGB');
assert.equal(r.report.used_rgb_colours,5);assert.equal(r.report.palette.length,5);
assert.equal(r.report.original_rgb_protection.reference_collisions.length,1);
assert.equal(r.report.original_rgb_protection.reference_collisions[0].atlas_row_id,1);
for(let i=0;i<3;i++){assert.equal(r.assignments[i],1);assert.equal(r.report.palette[r.indices[i]].kind,'ORIGINAL_RGB');assert.equal(r.report.palette[r.indices[i]].atlas_row_id,null);}
assert.equal(r.indices[5],65535);assert.equal(r.assignments[5],65535);
assert.deepEqual(R.reduce({...args,originalRgbs:originals}),r,'deterministic');
assert.deepEqual(rgba,before);assert.equal(JSON.stringify(colors),frozen);
assert.throws(()=>R.reduce({...args,k:3,originalRgbs:originals}),/exceed/,'must leave room for unprotected colours');
assert.throws(()=>R.reduce({...args,k:1,lockedIds:[1],originalRgbs:[[61,123,25]]}),/exceed/);
assert.throws(()=>R.reduce({...args,originalRgbs:[[1,2,3]]}),/occur/);
assert.throws(()=>R.reduce({...args,originalRgbs:[[256,0,0]]}),/Invalid/);
assert.throws(()=>R.reduce({...args,originalRgbs:null}),/Invalid/);
const all=R.reduce({...args,rgba:rgba.slice(0,12),width:3,k:3,originalRgbs:originals});assert.deepEqual(all.pixels,rgba.slice(0,12));assert.equal(all.report.selected_references,0);
// Original protects its pixels even if the same source reference maps elsewhere.
const distinct=R.reduce({...args,k:2,lockedIds:[2],originalRgbs:[[61,123,25]]});assert.deepEqual([...distinct.pixels.slice(0,4)],[61,123,25,255]);assert(distinct.report.palette.some(p=>p.atlas_row_id===2&&p.protected));
// All 256 mixed palette indices are usable; transparency uses65535 only.
const rgb256=Array.from({length:256},(_,i)=>[i,70,90]);const full=R.reduce({rgba:Uint8Array.from([...rgb256.flatMap(c=>[...c,255]),1,2,3,0]),width:257,height:1,colors,master,k:256,originalRgbs:rgb256});assert.equal(full.indices[255],255);assert.equal(full.indices[256],65535);assert.equal(full.report.used_rgb_colours,256);
console.log('PASS: source nuances, tiny detail, alpha, mixed indices, collision diagnostics, conflicts, no mutation, deterministic and legacy parity');
