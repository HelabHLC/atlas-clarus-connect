/* Isolated contract tests; node browser-bundle/tests/beta15i6-integration-bridge.test.cjs */
'use strict';
const assert=require('node:assert/strict');
const bridge=require('../src/beta15i6-integration-bridge.js');
const digitalContext={resolve(source){
 const master=source.address==='H050_L060_C075';
 return {identity:{kind:master?'MASTER_REFERENCE':'DIGITAL_COLOUR',atlas_row_id:master?42:null},
 digital_id:master?'master:42':'digital-hlc-d50-2deg:v1:'+source.address,address:source.address,source,
 digital_library_membership:{status:'CHECKED_SOURCE_SNAPSHOT',libraries:[{id:'display-p3'}]},
 library_membership:{status:master?'CHECKED_MASTER_LISTS':'NOT_ESTABLISHED',libraries:[]},
 representations:{'display-p3':{in_gamut:true,preview_clipped:false},srgb:{in_gamut:false,preview_clipped:true}}};
}};
const calls=[];
const multiGamutStore={memberships(id,t){calls.push([id,t]);return [{profile_id:'test',checked:true,delta_e00:0.4,production_status:'NOT_MEASURED'}]}};
const api=bridge.create({digitalContext,multiGamutStore});
const master=api.assess({source:{kind:'HLC',address:'H050_L060_C075'},material_id:'ceramic',threshold:1});
assert.equal(master.identity.atlas_row_id,42);
assert.equal(master.icc_status,'ICC_ROUNDTRIP_AVAILABLE');
assert.equal(master.production_evidence.status,'NOT_VERIFIED_FOR_SELECTED_MATERIAL');
const digital=api.assess({source:{kind:'HLC',address:'H295_L040_C100'},material_id:'ceramic'});
assert.equal(digital.identity.atlas_row_id,null);
assert.equal(digital.icc_status,'NOT_EVALUATED');
assert.equal(digital.source_memberships.libraries[0].id,'display-p3');
assert.equal(calls.length,1);
assert.throws(()=>api.assess({source:{kind:'HLC',address:'H295_L040_C100'},material_id:''}),/material_id/);
assert.throws(()=>api.assess({source:{kind:'HLC',address:'H295_L040_C100'},material_id:'ceramic',threshold:-1}),/threshold/);
console.log('beta15i.6 isolated bridge contract tests passed');
