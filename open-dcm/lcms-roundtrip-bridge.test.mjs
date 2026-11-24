import test from "node:test";
import assert from "node:assert/strict";
import { createColourRecord } from "./reference-record.mjs";
import { captureLittleCmsRoundTrip } from "./lcms-roundtrip-bridge.mjs";

const record=()=>createColourRecord({hlcAddress:"H050_L060_C075",sourceRgb:[232,104,42]});
const result=()=>({method:"SRGB_TO_DEVICE16_TO_SRGB",engine:"LittleCMS 2.16 / lcms-wasm 1.0.5",width:1,height:1,pixels:new Uint8Array([230,105,43,255]),forward_intent:"Relative colorimetric",forward_bpc:false,measured_qc:"NOT_MEASURED",paper_white_simulation:false});
const options={profileId:"pso-coated",profileSha256:"a".repeat(64),substrate:"coated-paper",intent:"Relative colorimetric",bpc:false};
test("records actual returned RGB without fabricating Lab or Delta E",()=>{
 const r=captureLittleCmsRoundTrip(record(),result(),options);
 assert.deepEqual(r.output.returnedRgb8,[230,105,43]);
 assert.equal(r.output.simulatedLab,null);
 assert.equal(r.output.deltaE00,null);
 assert.equal(r.output.paperWhiteSimulation,false);
 assert.equal(r.evidence.physicalProofMeasured,false);
});
test("rejects unsupported worker output and intent mismatch",()=>{
 assert.throws(()=>captureLittleCmsRoundTrip(record(),{...result(),method:"FAKE"},options));
 assert.throws(()=>captureLittleCmsRoundTrip(record(),result(),{...options,intent:"Perceptual"}));
 assert.throws(()=>captureLittleCmsRoundTrip(record(),result(),{...options,profileSha256:"bad"}));
});
