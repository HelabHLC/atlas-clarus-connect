import test from "node:test";
import assert from "node:assert/strict";
import {srgb8ToLabD65,deltaE00,compareRoundTripSrgb} from "./colour-metrics.mjs";
import {createColourRecord} from "./reference-record.mjs";
import {captureLittleCmsRoundTrip} from "./lcms-roundtrip-bridge.mjs";
test("D65 sRGB reference black and white",()=>{
 assert.ok(Math.abs(srgb8ToLabD65([0,0,0])[0])<1e-9);
 assert.ok(Math.abs(srgb8ToLabD65([255,255,255])[0]-100)<0.001);
});
test("CIEDE2000 Sharma published test pairs",()=>{
 const cases=[
 [[50,2.6772,-79.7751],[50,0,-82.7485],2.0425],
 [[50,3.1571,-77.2803],[50,0,-82.7485],2.8615],
 [[50,2.8361,-74.0200],[50,0,-82.7485],3.4412],
 [[50,-1.3802,-84.2814],[50,0,-82.7485],1.0000],
 [[50,-1.1848,-84.8006],[50,0,-82.7485],1.0000]
 ];
 for(const [a,b,expected] of cases)assert.ok(Math.abs(deltaE00(a,b)-expected)<0.00011);
});
test("roundtrip diagnostic does not claim ICC Lab or material simulation",()=>{
 const record=createColourRecord({hlcAddress:"H050_L060_C075",sourceRgb:[232,104,42]});
 const output=captureLittleCmsRoundTrip(record,{method:"SRGB_TO_DEVICE16_TO_SRGB",engine:"LittleCMS 2.16 / lcms-wasm 1.0.5",width:1,height:1,pixels:new Uint8Array([230,105,43,255]),forward_intent:"Relative colorimetric",forward_bpc:false,measured_qc:"NOT_MEASURED",paper_white_simulation:false},{profileId:"pso",profileSha256:"a".repeat(64),substrate:"coated",intent:"Relative colorimetric",bpc:false});
 const comparison=compareRoundTripSrgb(output);
 assert.ok(comparison.deltaE00SrgbRoundtrip>0);
 assert.equal(comparison.substrateLab,null);
 assert.equal(comparison.iccPcsLabD50,null);
});
