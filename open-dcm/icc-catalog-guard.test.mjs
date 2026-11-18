import test from "node:test";
import assert from "node:assert/strict";
import { requireCataloguedOutputProfile } from "./icc-catalog-guard.mjs";

const hash="a".repeat(64);
const catalog={schema:"ATLAS_LIBRARY_ICC_CATALOG_V1",profiles:{
  print:{device_class:"prtr",output_path:"4C",beta:false,sha256:hash,bytes:42,printing_condition:"Test"},
  rgb:{device_class:"mntr",output_path:null,beta:false,sha256:hash,bytes:42},
  beta:{device_class:"prtr",output_path:"4C",beta:true,sha256:hash,bytes:42}
}};
test("validates exact output ICC identity",()=>{
  const result=requireCataloguedOutputProfile(catalog,"print",hash,42);
  assert.equal(result.outputPath,"4C");
  assert.equal(result.profileId,"print");
});
test("rejects wrong bytes, RGB profiles, beta profiles and unknown IDs",()=>{
  assert.throws(()=>requireCataloguedOutputProfile(catalog,"print","b".repeat(64),42));
  assert.throws(()=>requireCataloguedOutputProfile(catalog,"print",hash,41));
  assert.throws(()=>requireCataloguedOutputProfile(catalog,"rgb",hash,42));
  assert.throws(()=>requireCataloguedOutputProfile(catalog,"beta",hash,42));
  assert.throws(()=>requireCataloguedOutputProfile(catalog,"missing",hash,42));
});
