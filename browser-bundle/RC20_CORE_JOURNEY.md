# RC20: a small, dependable Clarus user path

Status: **CORE_JOURNEY_TEST_CANDIDATE — browser acceptance pending**

Base: `106fad2c1ced71840e3a2a3b6903d8af3fa65bec` (merged RC19 correction, PR #27).

## Product promise

A user can observe an image colour, inspect its fixed atlas reference, collect
references in a named palette and restore those same references from a portable
Clarus JSON file. Wheel inspection is optional. Appearance, recipes and physical
qualification are outside this acceptance path.

The primary path is:

**Choose image → sample → Open in Hover → Add to palette → name →
Export Clarus JSON → import and compare.**

## Changes

- Restored palettes are rendered immediately on startup.
- A visible four-step introduction on the default Picker page.
- Clarus JSON is explicitly described as a portable backup. Browser storage alone
  is not a backup; moving the HTML file or clearing browser data may lose access.
- Storage exceptions produce a persistent, cross-view warning. In-memory colours
  remain available for export. An export-success message cannot erase that warning.
- Clarus import uses the same pure validator as its tests. It rejects unknown
  versions, wrong row base/master/freeze/QC status, non-integer IDs, numeric
  coercion, malformed or altered RGB triples, mismatched HLC/HEX, duplicates and
  empty/oversized files. The whole file validates before workspace mutation.
- The actual imported colour metadata are taken from the bundled master by ID;
  supplied Lab values and other annotations do not overwrite canonical values.
- Creating, duplicating or importing a 51st palette is blocked before mutation.
  Adding a 65th colour or an already present reference gives explicit feedback.
- Narrow navigation now uses a fully opaque background. Hash routing is deferred
  to the next animation frame and both document and views reserve the sticky
  72-pixel header offset, preventing routed headings from being obscured.

## Basis-23 B/A preview regression repair

- Restores the verified computational display values for all 13,283 recipes.
- Shows `Before — ATLAS Target` and `After — Computed Mix` without changing the PKL reference identity.
- Keeps the visible boundary `COMPUTATIONAL PREVIEW · NOT PHYSICALLY VERIFIED`.
- Treats a missing or invalid display reconstruction as fail-closed instead of inventing an After colour.

## Frozen contract

Master SHA-256:
`8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`

13,283 references; zero-based `atlas_row_id`; full-master integer squared sRGB
search, lower-ID tie-break; frozen A′ v0.4; `NOT_MEASURED` and no production approval.
No solver, spectral-descriptor, master-data or identity-selection changes.
RC19 archives remain historical artifacts; RC20 gets a distinct version and ZIP.

## Executed checks

- `node browser-bundle/tests/validate_basis23_preview.js`: PASS. All 13,283
  display reconstructions validate; row 1702 renders both B/A colours and the
  physical-validation boundary.
- `node browser-bundle/tests/validate_sampling.js`: PASS.
- `node browser-bundle/tests/validate_exports.js`: PASS. Real-master Clarus round
  trip, complete-file rejection vectors, 64/65 boundary and existing ASE readback.
- `node browser-bundle/tests/validate_palette_workspace.js`: PASS. Actual shipped
  handler execution with injected storage failure, in-memory preservation,
  persistent warning, recovery, and 49/50 workspace capacity.
- `node browser-bundle/tests/validate_layout.js`: PASS. Opaque narrow navigation,
  sticky-header scroll offsets and deferred route scrolling are present.
- `python identity-handoff/tests/validate_vectors.py`: PASS (1 valid, 8 invalid).
- Reproducible ZIP and checked-in distribution parity: PASS (two identical builds).
  RC20 ZIP SHA-256: `470660da40ea4ec5d598c599201cdb4f08ead7d3498a12d4e7b59f69d85c9185`.

The workspace test executes shipped function bodies with small storage/DOM
boundaries. It is not a real browser, visual, upload, download or accessibility test.

## Browser acceptance still required

The cloud browser refused local `file://` navigation under its URL security
policy. No alternate browser path was attempted. Consequently the following
checks are explicitly **NOT RUN**, and this candidate must not be called a stable
or visually accepted release on the strength of the code tests alone.

| Step | Desktop and smartphone expected result |
| --- | --- |
| Open extracted `index.html` offline | Picker loads without script/network errors; guide readable |
| Load a known PNG | Loupe and sample work; expected RGB and reference shown |
| Open in Hover | Same reference remains visible; return to Picker works |
| Optionally open Wheel and return | Same row ID and master; usable return navigation |
| Add and name palette | Correct swatch and name, visible confirmation |
| Export Clarus JSON | A nonempty downloadable file with correct reference tuple |
| Reload same file | Saved palette name, order and IDs retained where storage is available |
| Import exported file | Same ordered identities in a new palette |
| Import wrong-master / malformed file | Clear rejection; original palette unchanged |
| Deny storage / simulate quota | Persistent warning; export remains usable |
| 50 palettes / 64 colours | Clear limit message, no silent new entry or truncation |
| Keyboard and narrow viewport | Controls reachable, menu and drawer usable, no obscured warnings |

Perform desktop `file://` and a real smartphone test separately; a narrow desktop
viewport does not prove a mobile browser's file/download behaviour.

The WordPress canvas wrapper owns the separate **Zur Homepage** control. Its
floating overlay must be replaced by an in-flow navigation link in the matching
WordPress package; that wrapper change is not part of this standalone bundle.

## Next release decision

Record browser/version, platform, exact RC20 ZIP SHA-256 and results for the table
above. Only then decide whether to publish a release or package a WordPress update.
This change itself does not install or activate anything on the public website.
