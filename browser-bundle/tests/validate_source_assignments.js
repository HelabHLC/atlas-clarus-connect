'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
require('../src/palette-export.js');
const E=globalThis.ATLAS_CLARUS_EXPORTS;
const data=JSON.parse(fs.readFileSync('hover-library/data/colors.json','utf8'));
const colors=data.colors,master=data.master_sha256,c=colors[4966];
const clone=v=>JSON.parse(JSON.stringify(v));
const image={name:'green.png',width:20,height:20,sha256:'a'.repeat(64)};
function record(rgb,point={ix:2,iy:3},ref=c){return E.createSourceAssignment({rgb,size:1,count:1,std:[0,0,0],bounds:[point.ix,point.iy,point.ix,point.iy]},point,image,ref,master)}
const first=record([61,123,25]),second=record([60,123,25],{ix:5,iy:6});
assert.equal(first.distance_squared,41);assert.equal(first.source_hex,'#3D7B19');
assert.equal(first.reference_hex,'#37791A');
const exported=E.clarus([c],master,'Two sources, one reference',[first,second]);
assert.equal(exported.version,'1.2');
assert.equal(exported.references.length,1);
const parsed=E.parseClarus(clone(exported),colors,master);
assert.deepEqual(parsed.colorIds,[4966]);assert.deepEqual(parsed.sourceAssignments,[first,second]);
assert.deepEqual(E.clarus([c],master,exported.palette_name,parsed.sourceAssignments),exported);
parsed.sourceAssignments[0].source_rgb[0]=0;
assert.equal(exported.source_assignments[0].source_rgb[0],61,'no mutable aliases');
for(const version of ['1.0','1.1']){
  const old={...clone(exported),version};delete old.source_assignments;
  assert.deepEqual(E.parseClarus(old,colors,master),{colorIds:[4966],sourceAssignments:[]});
  old.source_assignments=[];assert.throws(()=>E.parseClarus(old,colors,master));
}
const corrupt=fn=>{const x=clone(exported);fn(x);assert.throws(()=>E.parseClarus(x,colors,master))};
corrupt(x=>delete x.source_assignments);
corrupt(x=>x.workflow='another rule');
for(const v of [null,false,'61',-1,256,61.5])corrupt(x=>x.source_assignments[0].source_rgb[0]=v);
for(const key of ['reference','reference_hex','master_sha256','workflow','metric','tie_break','signature_status','source_representation','color_space'])corrupt(x=>x.source_assignments[0][key]='invalid');
corrupt(x=>x.source_assignments[0].source_hex='#000000');
corrupt(x=>x.source_assignments[0].distance_squared=42);
corrupt(x=>x.source_assignments[0].atlas_row_id='4966');
corrupt(x=>x.source_assignments[0].atlas_row_id=0);
corrupt(x=>x.source_assignments[0].reference_rgb[0]='55');
corrupt(x=>x.source_assignments[0].bits_per_channel=16);
corrupt(x=>x.source_assignments[0].image.sha256='not-a-hash');
corrupt(x=>x.source_assignments[0].image.width=0);
corrupt(x=>x.source_assignments[0].sampling.centre=[20,3]);
corrupt(x=>x.source_assignments[0].sampling.centre=['2',3]);
corrupt(x=>x.source_assignments[0].sampling.valid_pixel_count=2);
corrupt(x=>x.source_assignments[0].sampling.bounds=[0,0,19,19]);
corrupt(x=>x.source_assignments[0].sampling.mode='AREA_MEAN_RGB');
corrupt(x=>x.source_assignments[0].sampling.channel_std=[1,0,0]);
corrupt(x=>x.source_assignments[0].sampling.alpha_threshold=0);
corrupt(x=>x.source_assignments[0].sampling.rounding='floor');
corrupt(x=>x.source_assignments=Array(4097).fill(first));
// A valid reference with a self-consistent distance can still be the wrong winner.
const wrong=record([61,123,25],undefined,colors[0]);
assert.throws(()=>E.parseClarus(E.clarus([colors[0]],master,'Wrong winner',[wrong]),colors,master),/winner/);
// Equal RGB references: import must reject the larger row ID, not rematch it.
const groups=new Map();let collision;
for(const row of colors){const k=row.rgb.join(',');if(groups.has(k)){collision=[groups.get(k),row];break}groups.set(k,row)}
const [low,high]=collision;
assert.ok(low.id<high.id);
assert.throws(()=>E.parseClarus(E.clarus([high],master,'Wrong tie',[record(high.rgb,undefined,high)]),colors,master),/winner/);
assert.equal(E.parseClarus(E.clarus([low],master,'Right tie',[record(low.rgb,undefined,low)]),colors,master).sourceAssignments.length,1);
// Area mean at an image edge retains clipping, alpha policy and diagnostic std.
const area=E.createSourceAssignment({rgb:[61,123,25],size:5,count:8,std:[1,2,3],bounds:[0,0,2,2]}, {ix:0,iy:0},image,c,master);
assert.equal(E.parseClarus(E.clarus([c],master,'Area',[area]),colors,master).sourceAssignments[0].sampling.valid_pixel_count,8);
const noHash=clone(first);noHash.image.sha256=null;
assert.equal(E.validateSourceAssignments([noHash],colors,master,[c.id])[0].image.sha256,null);
assert.throws(()=>E.validateSourceAssignments([first],colors,master,[]));
console.log('PASS: source RGB, provenance round trips, legacy imports, full-master winner/tie validation and rejection vectors');
