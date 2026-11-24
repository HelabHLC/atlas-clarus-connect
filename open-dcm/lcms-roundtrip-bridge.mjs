/**
 * Bridge for the existing ATLAS_PREVIEW_CALCULATE LittleCMS worker result.
 * Its actual output is a returned sRGB pixel buffer, NOT Lab or Delta E00.
 * No invented Lab values or substrate simulation are added.
 */
export function captureLittleCmsRoundTrip(record, workerResult, {
  profileId, profileSha256, substrate, intent, bpc
}) {
  if (record?.output?.status !== "not-calculated") throw new TypeError("Expected uncalculated DCM record");
  if (!workerResult || workerResult.method !== "SRGB_TO_DEVICE16_TO_SRGB" ||
      !String(workerResult.engine).startsWith("LittleCMS") ||
      workerResult.width !== 1 || workerResult.height !== 1 ||
      workerResult.pixels?.length !== 4 ||
      workerResult.forward_intent !== intent || workerResult.forward_bpc !== bpc ||
      workerResult.measured_qc !== "NOT_MEASURED" ||
      workerResult.paper_white_simulation !== false) {
    throw new TypeError("Unexpected LittleCMS worker result");
  }
  if (typeof profileId !== "string" || !profileId.trim() ||
      !/^[a-f0-9]{64}$/.test(profileSha256) ||
      typeof substrate !== "string" || !substrate.trim()) {
    throw new TypeError("Verified profile identity and substrate label required");
  }
  const rgb = Array.from(workerResult.pixels.slice(0,3));
  if (!rgb.every(v => Number.isInteger(v) && v >= 0 && v <= 255)) {
    throw new TypeError("Invalid returned RGB");
  }
  return {
    ...record,
    output: {
      ...record.output,
      iccProfile: profileId,
      renderingIntent: intent,
      substrate,
      returnedRgb8: rgb,
      profileSha256,
      blackPointCompensation: bpc,
      engine: workerResult.engine,
      method: workerResult.method,
      paperWhiteSimulation: false,
      status: "icc-roundtrip-rgb-calculated"
    },
    evidence: { ...record.evidence, iccCalculated: true, physicalProofMeasured: false }
  };
}
