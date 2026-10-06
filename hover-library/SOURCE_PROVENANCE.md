# Hover Library source provenance — 0.2.6-beta2 candidate

Base: `60bf765e771c3e6493c88a02a046237c9ba69db9` (`main`, PR #64 integrated).
This patch extends the **standalone WordPress Hover Library receiver**. The
browser bundle already has its own integrated Picker → Hover → palette path.
Its RC28 files, package pins and Android payload are unchanged here. No external
Image Picker sender implementation is present in this repository; that sender
must opt into the optional field below. This is not a claim of live deployment
or completion of a sender update.

## Backward-compatible handoff

The existing query parameters remain required:

| Parameter | Contract |
| --- | --- |
| `source` | `pkl-image-picker` |
| `atlas_row_id` | Strict decimal zero-based integer; exists in the complete master |
| `hlc` | Exact reference for that row |
| `master_sha256` | `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4` |
| `return_url` | Same-origin HTTP(S) URL; no embedded credentials |
| `source_assignment` | **Optional** JSON string: one RC28 source-assignment `schema_version: "1.0"` record |

Use `URL.searchParams.set`, not string concatenation or double encoding. An
existing sender with no `source_assignment` continues to select the reference;
source RGB is shown as not recorded. Empty, malformed, duplicated or inconsistent
optional data blocks the entire incoming selection, without a silent downgrade,
rematch or palette write. Duplicate identity parameters are also rejected. The
decoded JSON has a 16,384-character limit.

Sender integration example (the `assignment` must be an actual RC28 sampling
record, not a record synthesized from the reference RGB):

```js
const target = new URL(hoverUrl);
target.searchParams.set('source', 'pkl-image-picker');
target.searchParams.set('atlas_row_id', String(assignment.atlas_row_id));
target.searchParams.set('hlc', assignment.reference);
target.searchParams.set('master_sha256', assignment.master_sha256);
target.searchParams.set('return_url', pickerUrl);
target.searchParams.set('source_assignment', JSON.stringify(assignment));
location.assign(target.href);
```

This deliberately uses the existing query-string transport. Image names and
sampling metadata therefore appear in the URL and may appear in history/server
logs; image bytes are not transferred. Send only the intended sampling record.
This patch does not add a second messaging/transport protocol.

The return link carries the checked, allowlisted record together with the
**original** row/HLC/master and `source=hover-library-return`, preserving existing
return-path query parameters and anchors. It removes any stale
`source_assignment` already present in `return_url`. Manual browsing changes the
selected reference but does not change this original-result return link. An
older picker may ignore the additional field; preservation by that receiver
requires its own support and is not claimed here. The Wheel identity handoff and
recipe PDFs retain their existing contracts.

## What is checked and retained

The optional record uses the fields in
[`browser-bundle/SOURCE_PROVENANCE.md`](../browser-bundle/SOURCE_PROVENANCE.md).
The receiver checks the whole record before selecting it:

- Exact master/row/HLC and reference RGB/HEX; strict numeric 8-bit source RGB and
  matching source HEX; `sRGB`, `BROWSER_DECODED_SRGB`, workflow 3.4.0.
- Integer squared RGB distance, `RGB_SQUARED_DISTANCE`, and **full-master** RGB
  winner with the smaller-row-ID tie rule. No Lab/ΔE reassignment.
- Sampling mode/size, centre, clipped inclusive bounds, count, standard
  deviations, alpha threshold 128, and per-channel Math.round policy.
- Image name, positive decoded dimensions, and a lowercase SHA-256 string or
  explicit `null` when a file hash was not captured.
- Exactly `signature_status: "NOT_SIGNED"`.

Only checked RC28 fields are reconstructed into the retained object. Unknown
top-level and nested fields are discarded, including extra signature/issuer/
authenticity claims. Rendered metadata uses text content. Selection from a card
or nearby-reference button has no source context, even when selecting the same
row that was originally handed over.

**Verification limit:** RGB assignment and record consistency are reproducible
against the supplied master reference data. Image name, claimed image hash and
sampling observations are retained as supplied metadata. Without the original
bytes and decoded pixels, the receiver cannot verify that the sample came from
that image, recompute its image hash, or reproduce the claimed mean/variance.
The master SHA is a dataset binding, not issuer authentication. No signature,
authenticity, anti-counterfeit or physical-colour guarantee is introduced.

## Local palette and backup

`atlasClarusLocalPaletteV2` stores one object containing:

```json
{
  "version": 2,
  "master_sha256": "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4",
  "workflow": "ATLAS Clarus v3.4.0",
  "colorIds": [],
  "sourceAssignments": []
}
```

Up to 24 unique reference IDs and 4,096 source records are supported. New
sources for an existing reference append; repeated identical normalized records
are idempotent. Removing a reference removes its associated sources; clearing
removes both. A full palette rejects the next new reference instead of silently
evicting an earlier one. Full source lists also reject without truncation.

V1 is read only if V2 is absent. Its valid IDs (including historical numeric
strings) migrate on the first edit, with an empty source list. V1 remains
byte-for-byte untouched. No source RGB is inferred from master RGB. A corrupt
or incompatible V2 is not silently replaced by V1 or overwritten: palette
editing is blocked and a message is shown. Old Hover versions only see V1 and
cannot round-trip V2 sources.

Every V2 reload checks all records against the full master. Failed writes keep
the current records in memory with a persistent `NOT SAVED` message. The JSON
download exports **Clarus palette 1.2**, readable by RC28, including all source
records. Empty palettes cannot be exported. Import management is outside this
minimal Hover patch. An observed change to stored V2 by another view blocks a
stale write and asks for backup/reload; this is not a general multi-tab merge or
transaction protocol.

## Validation — 7 October 2026

Locally executed:

```sh
node --check hover-library/assets/js/atlas-clarus.js
node --check hover-library/assets/js/source-provenance.js
node hover-library/tests/validate-source-provenance.js
node browser-bundle/tests/validate_source_assignments.js
node browser-bundle/tests/validate_exports.js
git diff --check
```

The Hover test uses `jsdom` from `browser-bundle/tests/package.json`; CI installs
it with `npm ci --prefix browser-bundle/tests --ignore-scripts`. The local run
used an existing installation of that same dependency through `NODE_PATH`.

| Check | Result |
| --- | --- |
| Actual RC28 record producer → Hover receiver → local palette → RC28 JSON parser | PASS |
| Two different source RGBs → row 4966; repeated-add deduplication | PASS |
| Pixel/edge-clipped area data; nullable file hash; unknown-claim removal | PASS |
| Master/row/reference/RGB/distance/sampling rejection; true winner and RGB collision tie | PASS |
| Malformed/duplicate/oversized handoff and off-origin return rejection | PASS |
| Legacy handoff and V1 migration; V2 reload; removal/clear; same-row manual selection | PASS (DOM) |
| Invalid handoff does not mutate storage or auto-select a reference | PASS (DOM) |
| Escaped metadata, corrupt-storage protection, quota recovery via JSON, stale-write detection | PASS (DOM) |
| Reference/source capacity rejection without mutation or silent eviction | PASS |
| Existing RC28 source validation and reference exports | PASS |

The Hover CI job additionally runs PHP syntax and the existing full data/recipe
validator. PHP is unavailable in this local environment; its execution must be
read from the PR CI result. Existing reference, recipe, naming, spectral and
RC28 bundle files are unchanged. The external sender/return implementation is
now available as the pinned [Picker adapter](external-picker/README.md), with
passing helper and generated-integration tests. Its staging installation and a
real browser round trip, including desktop/mobile visual acceptance, are still
**NOT TESTED**. The authenticated staging inspection did not replace any plugin.
