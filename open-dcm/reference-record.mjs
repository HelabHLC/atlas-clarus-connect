/**
 * ATLAS Clarus Open DCM — reference record v0.1
 * Data contract only: no colour conversion, proofing or measurement is performed here.
 */
export const DCM_SCHEMA_VERSION = "0.1.0";

const validTriplet = (values, min, max) =>
  Array.isArray(values) && values.length === 3 &&
  values.every(v => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max);

export function createColourRecord({ hlcAddress, sourceRgb, sourceSpace = "sRGB", sourceProfile = null }) {
  if (typeof hlcAddress !== "string" || !/^H\d{3}_L\d{3}_C\d{3}$/.test(hlcAddress)) {
    throw new TypeError("Expected an HLC address such as H050_L060_C075");
  }
  if (!validTriplet(sourceRgb, 0, 255) || !sourceRgb.every(Number.isInteger)) {
    throw new TypeError("sourceRgb must contain three integer 8-bit channel values");
  }
  if (!["sRGB", "Display-P3", "ProPhoto RGB"].includes(sourceSpace)) {
    throw new TypeError("Unsupported source colour space");
  }
  return {
    schemaVersion: DCM_SCHEMA_VERSION,
    reference: { system: "ATLAS Clarus", hlcAddress },
    source: { space: sourceSpace, rgb8: [...sourceRgb], profile: sourceProfile },
    output: {
      iccProfile: null,
      renderingIntent: null,
      substrate: null,
      simulatedLab: null,
      deltaE00: null,
      status: "not-calculated"
    },
    evidence: { iccCalculated: false, physicalProofMeasured: false }
  };
}

export function attachIccResult(record, { profileId, renderingIntent, substrate, lab, deltaE00 }) {
  if (!profileId || !renderingIntent || !substrate ||
      !validTriplet(lab, -200, 200) || lab[0] > 100 || lab[0] < 0 ||
      typeof deltaE00 !== "number" || !Number.isFinite(deltaE00) || deltaE00 < 0) {
    throw new TypeError("Incomplete or invalid ICC result");
  }
  return {
    ...record,
    output: {
      iccProfile: profileId,
      renderingIntent,
      substrate,
      simulatedLab: [...lab],
      deltaE00,
      status: "icc-calculated"
    },
    evidence: { ...record.evidence, iccCalculated: true, physicalProofMeasured: false }
  };
}
