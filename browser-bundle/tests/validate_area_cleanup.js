'use strict';
const assert=require('node:assert/strict');require('../src/colour-reduction-cleanup.js');const clean=ATLAS_COLOUR_REDUCTION_CLEANUP.cleanup;
const palette=[{rgb:[10,20,30],hex:'#0A141E',atlas_row_id:1,protected:false},{rgb:[200,100,0],hex:'#C86400',atlas_row_id:2,protected:false},{rgb:[90,80,70],hex:'#5A5046',atlas_row_id:3,protected:true}];
function fixture(mask=false){const indices=Uint16Array.from([0,0,0,0,1,0,0,2,65535]),rgba=Uint8Array.from([...indices].flatMap((i,p)=>i===65535?[7,8,9,0]:[...palette[i].rgb,p===4?128:255]));return {input:{width:3,height:3,rgba},result:{pixels:rgba.slice(),indices,assignments:Uint16Array.from([1,1,1,1,2,1,1,3,65535]),protectionMask:Uint8Array.from([0,0,0,0,mask?1:0,0,0,0,0]),report:{palette:structuredClone(palette),visible_pixels:8,errors:{source_to_output_mean:0,full_master_to_reduced_mean:0}}}};}
let {result,input}=fixture(),before=structuredClone(result),r=clean(result,input,2);
assert.equal(r.indices[4],0);assert.equal(r.indices[7],2,'protected reference unchanged');assert.equal(r.report.area_cleanup.changed_pixels,1);assert.deepEqual(r.pixels.slice(32),input.rgba.slice(32));assert.equal(r.pixels[19],128);
assert.deepEqual(result,before,'input result is immutable for exact reset');assert.deepEqual(r.report.palette.map(c=>c.rgb),palette.map(c=>c.rgb));assert.equal(r.report.palette.reduce((n,c)=>n+c.pixel_count,0),8);
assert.deepEqual(clean(result,input,2),r,'determinism');assert.deepEqual(clean(result,input,1).pixels,result.pixels,'threshold 1 is no-op');
({result,input}=fixture(true));assert.deepEqual(clean(result,input,2).pixels,result.pixels,'explicit area mask unchanged');
assert.throws(()=>clean(result,input,0),/minimum/);assert.throws(()=>clean(result,input,1.5),/minimum/);
console.log('PASS small-island merge, palette invariance, protected reference/mask, alpha, hidden RGB, deterministic non-cumulative cleanup, reset source and report counts');
