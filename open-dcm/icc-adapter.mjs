import { attachIccResult } from "./reference-record.mjs";

/**
 * Adapter boundary for ICC-Farbberatung 0.1.8-beta1.
 * transform MUST be the existing verified ICC engine's actual conversion function.
 * This module does not implement or simulate colour management.
 */
export async function calculateWithIcc(record, transform) {
  if (typeof transform !== "function") throw new TypeError("Verified ICC transform function required");
  if (record?.output?.status !== "not-calculated") throw new TypeError("Expected uncalculated record");
  const result = await transform({
    sourceRgb: [...record.source.rgb8],
    sourceSpace: record.source.space,
    sourceProfile: record.source.profile,
    hlcAddress: record.reference.hlcAddress
  });
  if (!result || result.verifiedIccTransform !== true) {
    throw new TypeError("ICC engine must explicitly confirm a real transform");
  }
  return attachIccResult(record, {
    profileId: result.profileId,
    renderingIntent: result.renderingIntent,
    substrate: result.substrate,
    lab: result.lab,
    deltaE00: result.deltaE00
  });
}
