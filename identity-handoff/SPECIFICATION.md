# ATLAS Clarus Identity Handoff Specification v0.1.0

**Status:** REVIEW CANDIDATE  
**Transport:** HTTPS URL query parameters  
**Direction:** Hover Library → Colour Identity Wheel

## 1. Purpose

The handoff transfers an already selected ATLAS identity between tools without rematching or silently changing it.

## 2. Required parameters

| Parameter | Type | Requirement |
| --- | --- | --- |
| `atlas_row_id` | base-10 integer | Zero-based; range `0..13282` for the active master |
| `hlc` | string | Exact canonical HLC designation stored at that row |
| `master_sha256` | lowercase hexadecimal | Exact 64-character digest of the declared master |
| `source` | string | Sender identifier; current value `hover-library` |

Active master SHA-256:

```text
8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4
```

## 3. Sender behaviour

The sender shall:

1. obtain the identity from its validated master data;
2. preserve the zero-based `atlas_row_id`;
3. obtain `hlc` from the same row;
4. attach the digest of that exact master;
5. URL-encode all parameter values;
6. avoid inserting display-row numbers in `atlas_row_id`.

The current Hover Library implementation uses `URL` and `URLSearchParams`.

## 4. Receiver verification order

The receiver shall perform these checks before selecting a colour:

1. all required parameters are present exactly once;
2. `master_sha256` is syntactically valid and matches the loaded master;
3. `atlas_row_id` is an integer within the loaded master range;
4. the row exists;
5. the row's canonical HLC designation exactly equals `hlc`;
6. the receiver may recognise `source`, but shall not weaken verification for a recognised sender.

Only after every mandatory check passes may the receiver select the identity and display:

```text
IDENTITY_HANDOFF = VERIFIED
```

## 5. Failure behaviour

On any failed mandatory check, the receiver shall:

- not select a colour from the supplied identity;
- not rematch by HLC, RGB, Lab, HEX or proximity;
- display `IDENTITY_HANDOFF = REJECTED` or an equivalent explicit failure;
- identify the failed check without exposing sensitive system information.

Missing input may be treated as normal manual Wheel use, but it shall not produce a verified-handoff status.

## 6. Security and robustness

- Parse parameters as data, never executable markup or code.
- Render supplied strings using text-safe DOM operations.
- Reject duplicate critical parameters to avoid parser disagreement.
- Apply practical URL-length and field-length limits.
- Do not treat the query string as evidence that the sender itself is trusted.
- A verified handoff proves internal agreement with the receiver's declared master; it is not cryptographic sender authentication.

## 7. Conformance result

A receiver conformance record should include:

- protocol version;
- received parameter values;
- receiver master SHA-256;
- result for each mandatory check;
- final status;
- receiver version;
- verification timestamp.

## 8. Physical-colour boundary

`IDENTITY_HANDOFF = VERIFIED` confirms identity consistency only. It does not confirm display accuracy, appearance under an illuminant, production feasibility or measured physical agreement.

