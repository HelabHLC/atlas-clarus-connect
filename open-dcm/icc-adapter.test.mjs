import test from "node:test";
import assert from "node:assert/strict";
import { createColourRecord } from "./reference-record.mjs";
import { calculateWithIcc } from "./icc-adapter.mjs";

const source = () => createColourRecord({hlcAddress:"H050_L060_C075",sourceRgb:[232,104,42]});
test("rejects absent ICC engine", async () => {
  await assert.rejects(calculateWithIcc(source(), null), /function required/);
});
test("rejects unverified and incomplete engine results", async () => {
  await assert.rejects(calculateWithIcc(source(), async () => ({lab:[60,40,30]})), /confirm/);
  await assert.rejects(calculateWithIcc(source(), async () => ({verifiedIccTransform:true})), /Incomplete/);
});
test("accepts contract-shaped engine output without claiming physical proof", async () => {
  const original=source();
  const result=await calculateWithIcc(original, async input => {
    assert.deepEqual(input.sourceRgb,[232,104,42]);
    return {verifiedIccTransform:true,profileId:"fixture-only",renderingIntent:"relative-colorimetric",substrate:"fixture",lab:[60,40,30],deltaE00:1.2};
  });
  assert.equal(result.evidence.physicalProofMeasured,false);
  assert.equal(result.output.status,"icc-calculated");
  assert.equal(original.output.status,"not-calculated");
});
