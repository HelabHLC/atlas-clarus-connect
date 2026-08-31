import assert from "node:assert/strict";
import test from "node:test";
import { validateIdentityHandoff } from "../app/identity-handoff.ts";

const master = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4";
const data = [{ id: 4912, sample: "H130_L060_C030" }];

function params(overrides = {}) {
  return new URLSearchParams({
    atlas_row_id: "4912",
    hlc: "H130_L060_C030",
    master_sha256: master,
    source: "hover-library",
    ...overrides,
  });
}

test("verifies a complete matching handoff", () => {
  assert.equal(validateIdentityHandoff(params(), data, master).ok, true);
});

test("blocks a missing HLC reference", () => {
  const input = params();
  input.delete("hlc");
  assert.deepEqual(validateIdentityHandoff(input, data, master), {
    ok: false,
    source: "hover-library",
    requestedId: 4912,
    message: "IDENTITY_HANDOFF = BLOCKED_MISSING_REFERENCE",
  });
});

test("blocks an HLC mismatch", () => {
  assert.equal(validateIdentityHandoff(params({ hlc: "H135_L060_C030" }), data, master).ok, false);
});

test("blocks a master mismatch", () => {
  assert.equal(validateIdentityHandoff(params({ master_sha256: "0".repeat(64) }), data, master).ok, false);
});

test("blocks missing, negative, decimal and non-numeric row IDs", () => {
  for (const value of [null, "-1", "4912.0", "abc"]) {
    const input = params();
    if (value === null) input.delete("atlas_row_id"); else input.set("atlas_row_id", value);
    assert.equal(validateIdentityHandoff(input, data, master).ok, false);
  }
});

test("blocks duplicate critical parameters", () => {
  const input = params();
  input.append("hlc", "H130_L060_C030");
  assert.equal(
    validateIdentityHandoff(input, data, master).message,
    "IDENTITY_HANDOFF = BLOCKED_DUPLICATE_PARAMETER",
  );
});

test("blocks a missing source", () => {
  const input = params();
  input.delete("source");
  assert.equal(
    validateIdentityHandoff(input, data, master).message,
    "IDENTITY_HANDOFF = BLOCKED_MISSING_SOURCE",
  );
});
