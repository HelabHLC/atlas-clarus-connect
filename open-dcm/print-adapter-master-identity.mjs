/**
 * Source identity cross-check against the loaded ATLAS browser master projection.
 * This checks row/HLC/RGB consistency. It does NOT independently hash the
 * original private master PKL, and does not authenticate untrusted data.
 */
export const FROZEN_ATLAS_MASTER_SHA256='8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4';

export function crosscheckPrintIdentity(preparation, masterDocument) {
  const src=preparation?.source;
  if(!src||!masterDocument||masterDocument.master_sha256!==FROZEN_ATLAS_MASTER_SHA256 ||
    src.master_sha256!==FROZEN_ATLAS_MASTER_SHA256 ||
    !Array.isArray(masterDocument.colors) || masterDocument.colors.length!==13283 ||
    !Number.isInteger(src.atlas_row_id) || src.atlas_row_id<0 || src.atlas_row_id>=13283) {
    throw new TypeError('Master metadata and full 13,283-row projection required');
  }
  const row=masterDocument.colors[src.atlas_row_id];
  if(!row || row.id!==src.atlas_row_id || row.ref!==src.hlc ||
    !Array.isArray(row.rgb) || row.rgb.length!==3 ||
    !Array.isArray(src.rgb8) || src.rgb8.length!==3 ||
    row.rgb.some((v,i)=>!Number.isInteger(v)||v!==src.rgb8[i])) {
    throw new TypeError('HLC row or original RGB disagrees with the loaded ATLAS master projection');
  }
  return Object.freeze({
    status:'MASTER_ROW_RGB_CROSSCHECK_PASS',
    master_sha256:FROZEN_ATLAS_MASTER_SHA256,
    atlas_row_id:src.atlas_row_id,hlc:src.hlc,
    note:'Projection row consistency only; not an independent cryptographic master audit'
  });
}
