import test from "node:test";
import assert from "node:assert/strict";
import { createColourRecord, attachIccResult } from "./reference-record.mjs";

test("new records do not claim ICC or measured proof", () => {
  const r = createColourRecord({ hlcAddress: "H050_L060_C075", sourceRgb: [232,104,42] });
  assert.equal(r.output.status, "not-calculated");
  assert.equal(r.evidence.iccCalculated, false);
  assert.equal(r.evidence.physicalProofMeasured, false);
});
test("reject malformed inputs", () => {
  assert.throws(() => createColourRecord({ hlcAddress: "wrong", sourceRgb: [1,2,3] }));
  assert.throws(() => createColourRecord({ hlcAddress: "H050_L060_C075", sourceRgb: [256,2,3] }));
});
test("record calculated ICC result separately from physical proof", () => {
  const r = createColourRecord({ hlcAddress: "H050_L060_C075", sourceRgb: [232,104,42] });
  const result = attachIccResult(r, {
    profileId: "example-profile", renderingIntent: "relative-colorimetric",
    substrate: "example-coated-paper", lab: [60,40,30], deltaE00: 1.2
  });
  assert.equal(result.output.status, "icc-calculated");
  assert.equal(result.evidence.physicalProofMeasured, false);
  assert.equal(r.output.status, "not-calculated");
});
