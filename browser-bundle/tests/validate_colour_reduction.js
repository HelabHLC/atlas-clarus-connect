'use strict';
const assert=require('node:assert/strict');
require('../src/pkl-image-binding.js');require('../src/colour-reduction.js');require('../src/palette-export.js');
const R=globalThis.ATLAS_COLOUR_REDUCTION,E=globalThis.ATLAS_CLARUS_EXPORTS,master='8'.repeat(64);
const colors=[{id:9,ref:'R',rgb:[255,0,0]},{id:3,ref:'K',rgb:[0,0,0]},{id:7,ref:'W',rgb:[255,255,255]},{id:12,ref:'G',rgb:[0,255,0]}].map(c=>({...c,hex:'#'+c.rgb.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()}));
const rgba=Uint8Array.from([254,0,0,255, 255,0,0,127, 0,255,0,255, 200,190,180,0, 0,0,0,255, 255,255,255,255]);
const before=rgba.slice(),args={rgba,width:6,height:1,colors,master,k:2,lockedIds:[12]};
const a=R.reduce(args),b=R.reduce(args);
assert.deepEqual(a,b,'deterministic run');assert.deepEqual(rgba,before,'input untouched');
assert.equal(a.report.selected_references,2);assert(a.report.palette.some(p=>p.atlas_row_id===12&&p.protected&&p.pixel_count>0));
assert.equal(a.report.visible_pixels,5);assert.equal(a.report.transparent_pixels,1);assert.equal(a.report.partial_alpha_pixels,1);
assert.equal(a.indices[3],65535);assert.equal(a.assignments[3],65535);
for(let p=0;p<6;p++){
 assert.equal(a.pixels[p*4+3],rgba[p*4+3],'alpha preserved');
 if(!rgba[p*4+3])assert.deepEqual(a.pixels.slice(p*4,p*4+4),rgba.slice(p*4,p*4+4),'hidden RGB preserved');
 else {const c=a.report.palette[a.indices[p]];assert.deepEqual([...a.pixels.slice(p*4,p*4+3)],c.rgb);}
}
assert.deepEqual([...R.assignmentBytes(Uint16Array.from([0,255,256,65535]))],[0,0,255,0,0,1,255,255]);
assert.throws(()=>R.reduce({...args,k:0}),/1–256/);assert.throws(()=>R.reduce({...args,k:257}),/1–256/);
assert.throws(()=>R.reduce({...args,k:1,lockedIds:[3,12]}),/exceeds/);
assert.throws(()=>R.reduce({...args,lockedIds:[888]}),/outside/);
assert.throws(()=>R.reduce({...args,rgba:new Uint8Array(24)}),/no visible/);
const tie=R.reduce({rgba:Uint8Array.from([1,0,0,255]),width:1,height:1,colors:[{id:9,ref:'B',rgb:[2,0,0]},{id:3,ref:'A',rgb:[0,0,0]}],master,k:1});
assert.equal(tie.assignments[0],3,'full-master tie is lower row ID');
// 256 colours plus transparency: palette index 255 is a real colour, never a sentinel.
const many=Array.from({length:256},(_,i)=>({id:i,ref:'C'+i,rgb:[i,(i*17)%256,(i*37)%256],hex:'#'+[i,(i*17)%256,(i*37)%256].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()}));
const pixels=Uint8Array.from([...many.flatMap(c=>[...c.rgb,255]),77,88,99,0]);
const full=R.reduce({rgba:pixels,width:257,height:1,colors:many,master,k:256});
assert.equal(full.report.used_rgb_colours,256);assert.equal(full.indices[255],255);assert.equal(full.indices[256],65535);assert.deepEqual(full.pixels,pixels);
assert.equal(E.gpl(many,master).split('\n').filter(l=>/^\s*\d+\s+\d+\s+\d+\s/.test(l)).length,256);
assert.deepEqual(E.readAse(E.ase(many)),many.map(c=>({ref:c.ref,rgb:c.rgb})));
const colliding=[...colors,{id:14,ref:'G-COLLISION',rgb:[0,255,0]}];
const collision=R.reduce({...args,colors:colliding,k:3,lockedIds:[12,14]});
assert.equal(collision.assignments[2],12);assert(collision.report.palette.some(p=>p.atlas_row_id===14&&p.pixel_count===0));
console.log('PASS: deterministic RGB mapping, protected rare colour, alpha/hidden RGB, limits, collision IDs, all 256 indices, GPL/ASE roundtrip');
