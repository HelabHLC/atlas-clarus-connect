/** Guard against mismatched or unverified ICC profile identities.
 * Catalog is metadata only; callers must hash the actual loaded ICC bytes.
 */
export function requireCataloguedOutputProfile(catalog, profileId, actualSha256, actualBytes) {
  if (catalog?.schema !== "ATLAS_LIBRARY_ICC_CATALOG_V1") {
    throw new TypeError("Unsupported ICC catalog");
  }
  const profile = catalog.profiles?.[profileId];
  if (!profile || profile.device_class !== "prtr" || !profile.output_path || profile.beta === true) {
    throw new TypeError("Not an approved output-profile catalog entry");
  }
  if (typeof actualSha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(actualSha256) ||
      actualSha256 !== profile.sha256 ||
      !Number.isSafeInteger(actualBytes) || actualBytes !== profile.bytes) {
    throw new TypeError("Loaded ICC bytes do not match catalog SHA-256 and size");
  }
  return Object.freeze({
    profileId,
    sha256: profile.sha256,
    bytes: profile.bytes,
    outputPath: profile.output_path,
    printingCondition: profile.printing_condition
  });
}
