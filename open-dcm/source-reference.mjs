import '../browser-bundle/src/rgb-source-space.js';
import { createColourRecord } from './reference-record.mjs';

const sourceSpaces = new Map([
  ['srgb', 'sRGB'],
  ['display_p3', 'Display-P3'],
  ['prophoto_rgb', 'ProPhoto RGB']
]);

export function createSourceReference({
  hlcAddress, sourceRgb, space, confirmed = false, iccProfile = null
}) {
  const sourceDecision = globalThis.ATLAS_RGB_SOURCE_SPACE.decision(space, confirmed, iccProfile);
  const sourceSpace = sourceSpaces.get(sourceDecision.source_space);
  if (!sourceSpace) {
    throw new RangeError('Reference record cannot represent ' + sourceDecision.source_space);
  }
  const record = createColourRecord({ hlcAddress, sourceRgb, sourceSpace });
  return { record, sourceDecision };
}
