export type HandoffIndexEntry = { id: number; sample: string };

export type HandoffValidation =
  | { ok: true; item: HandoffIndexEntry; requestedId: number; source: string }
  | { ok: false; message: string; requestedId?: number; source: string };

export function validateIdentityHandoff(
  params: URLSearchParams,
  data: HandoffIndexEntry[],
  masterSha256: string,
): HandoffValidation {
  for (const key of ["atlas_row_id", "hlc", "master_sha256", "source"]) {
    if (params.getAll(key).length > 1) {
      return { ok: false, source: "external", message: "IDENTITY_HANDOFF = BLOCKED_DUPLICATE_PARAMETER" };
    }
  }

  const source = params.get("source") || "external";
  if (!params.get("source")) {
    return { ok: false, source, message: "IDENTITY_HANDOFF = BLOCKED_MISSING_SOURCE" };
  }

  const suppliedHash = params.get("master_sha256") || "";

  if (!/^[0-9a-f]{64}$/.test(suppliedHash) || suppliedHash !== masterSha256) {
    return { ok: false, source, message: "IDENTITY_HANDOFF = BLOCKED_MASTER_MISMATCH" };
  }

  const rawId = params.get("atlas_row_id");
  if (rawId === null || !/^(0|[1-9][0-9]*)$/.test(rawId)) {
    return { ok: false, source, message: "IDENTITY_HANDOFF = BLOCKED_INVALID_ATLAS_ROW_ID" };
  }

  const requestedId = Number(rawId);
  if (!Number.isSafeInteger(requestedId)) {
    return { ok: false, source, message: "IDENTITY_HANDOFF = BLOCKED_INVALID_ATLAS_ROW_ID" };
  }

  const item = data.find((entry) => entry.id === requestedId);
  if (!item) {
    return { ok: false, source, requestedId, message: "IDENTITY_HANDOFF = BLOCKED_ID_NOT_FOUND" };
  }

  const suppliedHlc = params.get("hlc");
  if (!suppliedHlc) {
    return { ok: false, source, requestedId, message: "IDENTITY_HANDOFF = BLOCKED_MISSING_REFERENCE" };
  }
  if (suppliedHlc !== item.sample) {
    return { ok: false, source, requestedId, message: "IDENTITY_HANDOFF = BLOCKED_REFERENCE_MISMATCH" };
  }

  return { ok: true, item, requestedId, source };
}
