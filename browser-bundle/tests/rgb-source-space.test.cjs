'use strict';
const assert=require('node:assert/strict');
const {decision,SPACES}=require('../src/rgb-source-space.js');
assert.equal(Object.keys(SPACES).length,4);
const fallback=decision(undefined,false);
assert.equal(fallback.source_space,'srgb');
assert.equal(fallback.source_space_status,'ASSUMED_SRGB_UNVERIFIED');
assert.equal(fallback.conversion_status,'NOT_PERFORMED');
for(const s of Object.keys(SPACES)){
  const d=decision(s,true);
  assert.equal(d.source_space,s);
  assert.equal(d.source_space_status,'USER_CONFIRMED');
}
assert.throws(()=>decision('display_p3',false),/confirmed/);
assert.throws(()=>decision('unknown',true),/Unsupported/);
const icc={space:'display_p3',sha256:'a'.repeat(64)};
assert.throws(()=>decision('srgb',false,icc),/conflict/);
assert.equal(decision('srgb',true,icc).icc_space_conflict,true);
assert.equal(decision('display_p3',true,icc).icc_space_conflict,false);
assert.throws(()=>decision('srgb',true,{space:'srgb',sha256:'wrong'}),/provenance/);
console.log('RGB source-space contract: tests passed');
