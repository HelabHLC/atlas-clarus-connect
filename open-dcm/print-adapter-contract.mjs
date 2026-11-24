/**
 * ATLAS Clarus — Open DCM / Print Adapter preparation contract v0.1.0
 * This module constructs an offline data handoff only. No ICC conversion,
 * printer driver command, print proof, or press approval is performed.
 *
 * Compatible input: open-dcm/reference-record.mjs, status not-calculated.
 */
export const PRINT_ADAPTER_FORMAT = 'ATLAS_CLARUS_OPEN_DCM_PRINT_ADAPTER';
export const PRINT_ADAPTER_VERSION = '0.1.0';
export const PRINT_ADAPTER_PATHS = Object.freeze(['4C', 'ECG']);
const HLC_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;
const SHA_PATTERN = /^[a-f0-9]{64}$/;
const RGB_SPACES = new Set(['sRGB', 'Display-P3', 'ProPhoto RGB']);

function ensure(test, message) { if (!test) throw new TypeError(message); }
function rgb8(values) {
  return Array.isArray(values) && values.length === 3 &&
    values.every(v => Number.isInteger(v) && v >= 0 && v <= 255);
}
function requiredLabel(value, field, limit = 160) {
  ensure(typeof value === 'string' && value.trim().length > 0 && value.length <= limit,
    `${field} must be a non-empty short string`);
  return value.trim();
}
function cleanOptionalLabel(value, field, limit = 160) {
  return value == null ? null : requiredLabel(value, field, limit);
}
function immutable(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}

/**
 * Construct a preparation-only record from an existing uncalculated colour record.
 * Every requested output path takes the SAME source identity, in parallel.
 * The caller MUST validate master row-to-HLC agreement independently against
 * its own trusted master; this builder cannot establish that correspondence.
 */
export function createPrintAdapterPreparation({
  colourRecord,
  masterSha256,
  atlasRowId,
  jobName = 'ATLAS Clarus colour handoff',
  paths = ['4C'],
  contextByPath = {}
}) {
  ensure(colourRecord?.schemaVersion === '0.1.0' &&
    colourRecord.reference?.system === 'ATLAS Clarus' &&
    HLC_PATTERN.test(colourRecord.reference?.hlcAddress ?? ''),
    'A valid ATLAS Clarus colour record v0.1.0 is required');
  ensure(colourRecord.output?.status === 'not-calculated' &&
    colourRecord.evidence?.iccCalculated === false &&
    colourRecord.evidence?.physicalProofMeasured === false,
    'Only an uncalculated and unmeasured colour record may be prepared');
  ensure(rgb8(colourRecord.source?.rgb8) && RGB_SPACES.has(colourRecord.source?.space),
    'Valid source RGB8 and colour space required');
  ensure(colourRecord.source.profile === null ||
    (typeof colourRecord.source.profile === 'string' && colourRecord.source.profile.length <= 160),
    'Source profile identifier must be a short string or null');
  ensure(typeof masterSha256 === 'string' && SHA_PATTERN.test(masterSha256),
    'Master SHA-256 must be 64 lowercase hexadecimal characters');
  ensure(Number.isInteger(atlasRowId) && atlasRowId >= 0 && atlasRowId <= 13282,
    'Zero-based row ID must be in the current 13,283-row master range');
  ensure(Array.isArray(paths) && paths.length > 0 && paths.length <= 2 &&
    paths.every(p => PRINT_ADAPTER_PATHS.includes(p)) && new Set(paths).size === paths.length,
    'Use unique output paths 4C and/or ECG');
  ensure(contextByPath && typeof contextByPath === 'object' && !Array.isArray(contextByPath),
    'contextByPath must be an object');
  ensure(Object.keys(contextByPath).every(k => paths.includes(k)),
    'Do not provide context for an unrequested output path');

  const reference = immutable({
    system: 'ATLAS Clarus',
    atlas_row_id: atlasRowId,
    hlc: colourRecord.reference.hlcAddress,
    master_sha256: masterSha256,
    rgb8: [...colourRecord.source.rgb8],
    colour_space: colourRecord.source.space,
    source_profile_id: colourRecord.source.profile,
    identity_status: 'DECLARED_REQUIRES_MASTER_LOOKUP'
  });
  const production_paths = paths.map(path_id => {
    const ctx = contextByPath[path_id] ?? {};
    ensure(ctx && typeof ctx === 'object' && !Array.isArray(ctx), `Invalid ${path_id} context`);
    ensure(Object.keys(ctx).every(k => ['printing_condition', 'substrate'].includes(k)),
      'Only printing_condition and substrate are accepted in a preparation context');
    return {
      path_id,
      source_atlas_row_id: atlasRowId,
      input_from_path: null,
      expected_device_space: path_id === '4C' ? 'CMYK' : '7CLR',
      output_profile_sha256: null,
      rendering_intent: null,
      black_point_compensation: null,
      printing_condition: cleanOptionalLabel(ctx.printing_condition, 'printing condition'),
      substrate: cleanOptionalLabel(ctx.substrate, 'substrate'),
      calculation_status: 'NOT_CALCULATED',
      device_values: null,
      predicted_lab: null,
      delta_e00: null,
      measurement_status: 'NOT_MEASURED',
      production_approval: 'NOT_GRANTED'
    };
  });
  return immutable({
    format: PRINT_ADAPTER_FORMAT,
    version: PRINT_ADAPTER_VERSION,
    job_name: requiredLabel(jobName, 'job name'),
    status: 'PREPARATION_ONLY',
    source: reference,
    topology: 'PARALLEL_FROM_SAME_FROZEN_REFERENCE',
    production_paths
  });
}
