import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
const dir=process.argv[2];
const ctx=vm.createContext({TextEncoder, console});
for(const f of ['rc36-file-space.js','palette-export.js'])vm.runInContext(readFileSync(join(dir,'assets',f),'utf8'),ctx);
const E=ctx.ATLAS_CLARUS_EXPORTS,P=ctx.ATLAS_RC36_SOURCE;
const master='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';
const c={id:1,ref:'H050_L060_C075',rgb:[232,104,42],hex:'#E8682A',lab:[60,48,57]};
const colors=[c,{id:2,ref:'H050_L060_C080',rgb:[240,100,36],hex:'#F06424',lab:[60,51,61]}];
const sample={rgb:c.rgb,size:1,bounds:[0,0,0,0],count:1,std:[0,0,0]},point={ix:0,iy:0},image={name:'fixture.png',width:1,height:1,sha256:null};
const normalize=x=>JSON.parse(JSON.stringify(x));
const make=choice=>E.createSourceAssignment(sample,point,image,c,master,P.build(choice,image));
test('same HLC, different file-space declarations survive real candidate export/import',()=>{
 const records=['assumed','display_p3','prophoto_rgb'].map(make);
 const data=normalize(E.clarus([c],master,'test',records));
 const restored=normalize(E.parseClarus(data,colors,master));
 assert.deepEqual(restored.colorIds,[1]);
 assert.deepEqual(restored.sourceAssignments,normalize(records));
 assert.deepEqual(restored.sourceAssignments.map(r=>r.file_space_decision.source_space_status),['ASSUMED_SRGB_UNVERIFIED','USER_CONFIRMED','USER_CONFIRMED']);
 for(const r of restored.sourceAssignments){assert.deepEqual(r.source_rgb,c.rgb);assert.equal(r.color_space,'sRGB');assert.equal(r.source_representation,'BROWSER_DECODED_SRGB');assert.equal(r.file_space_decision.native_rgb,'NOT_CAPTURED');assert.equal(r.reference,c.ref)}
});
test('legacy palette without file-space decision remains compatible',()=>{
 const legacy=E.createSourceAssignment(sample,point,image,c,master);
 assert.deepEqual(normalize(E.parseClarus(normalize(E.clarus([c],master,'legacy',[legacy])),colors,master).sourceAssignments),normalize([legacy]));
});
test('tampering with source space or hash fails closed',()=>{
 for(const field of ['sample_space','source_space','source_icc_sha256','native_rgb','user_confirmed']){
  const data=normalize(E.clarus([c],master,'invalid',[make('display_p3')]));
  data.source_assignments[0].file_space_decision[field]='forged';
  assert.throws(()=>E.parseClarus(data,colors,master),/Invalid file-space decision/);
 }
 assert.throws(()=>P.build('rec2020',image),/Unsupported/);
});
test('ICC digest retained but gamut conflict not inferred from header',()=>{
 const h='a'.repeat(64),d=P.build('display_p3',{colour_origin:{icc:{sha256:h}}});
 assert.equal(d.source_icc_sha256,h);assert.equal(d.icc_space_conflict,'NOT_EVALUATED');
});
