# Customer logo to coordinated brand palette — 0.1.7 preview

Adds a direct logo workflow to the shared Browser Edition / Startup Colour Kit
workspace, and makes the smallest eligible source difference the first new
common-reference suggestion. The original RGB-only assignment is retained.

## Customer workflow

1. Open **Load logo and find brand colours** from Browser Edition, Startup
   Colour Kit, or the multi-application entry in `START_HERE.html`.
2. Load PNG, JPEG or WebP and request 1–12 colour suggestions (initially six).
3. Review the actual source-pixel swatches. Rename colours, remove a background,
   and add small accents by clicking the original canvas or entering X/Y.
4. Explicitly use the reviewed starting palette. Existing application profiles
   and tolerances remain; previous calculations/shared choices are invalidated.
5. Define the production applications and three tolerances, calculate, review
   common references and any colour collisions, and confirm each shared colour.
6. Save the full project and comparison card. Reopening recalculates and
   requires renewed confirmation as in 0.1.6.

Staging a replacement logo blocks calculation/export of the previous palette
until the new suggestions are used or discarded. Failed image inputs leave
the established source dossier intact. SVG/PDF logos must be exported as PNG
for this preview. It does not recolour vectors or infer semantic logo objects.

## Image analysis and provenance

`logo-core.js` is a deterministic, DOM-independent analyser used in a dedicated
worker. It samples a regular grid of original-resolution browser-decoded sRGB
pixels, using a stride derived from a nominal million-pixel target. Fully
opaque pixels only are accepted. No white/black background is invented for
partially transparent pixels, and invisible RGB does not enter the palette.

RGB values are grouped into 5-bit-per-channel histogram bins. Weighted
farthest-point initialization and up to 24 weighted RGB k-means iterations
group those bins into the requested count. Each cluster uses an actual pixel
from its most frequent bin, with deterministic distance/key tie-breaks.
Internal centroids are not exported as source colours. A uniform image yields
one suggestion even if six were requested. Similar colours can occupy the
same bin; grid sampling can miss small details. Manual review and pixel
addition are part of the workflow, especially for gradients and JPEG edges.

Limits are 32 MiB per original, 24 megapixels and 12 accepted colours. The
browser's ICC interpretation is not independently verified. The original
file, including embedded ICC and other metadata, is preserved byte-for-byte.
Every accepted image colour uses the existing source-assignment format with
its actual RGB, coordinate, image hash, origin metadata and unchanged nearest
RGB ATLAS reference. `project.json` in the nested source dossier additionally
stores `logo_selection`: analysis method/settings and the explicitly accepted
pixel list. Its values/coordinates/image identity must match the source
records on multi-project import. An external editor changing source records
must update or remove stale `logo_selection` metadata; it is not silently
accepted as a matching audit.

## Common-reference selection

The shared multi-profile admissibility tests are unchanged: documented-library
membership where selected, each profile's output tolerance, the largest
pairwise output difference, and the source-to-reference tolerance. Targets
remain stored ATLAS sRGB values converted to Lab D50, not HLC target Lab.

New suggestions are sorted by unrounded source CIEDE2000 difference and then
lower ATLAS row ID. An eligible old reference no longer jumps ahead of a
closer candidate. A restored explicit choice may be preselected again after
successful recalculation; it remains labelled as a previous decision and
still needs confirmation. The record includes suggested and chosen IDs,
whether the choice has the minimum distance, and whether it is the first
suggestion under the deterministic tie-break. Equal-distance alternatives
are correctly recorded as also having the minimum distance.

The UI and HTML report show when multiple source colours would share a
reference, or when distinct references have identical stored sRGB. Confirmed
collisions are recorded in `comparison.json`. They never trigger a silent
replacement or forced uniqueness that increases the source difference.
Original source rows remain separate even when the common Clarus reference
set contains a shared address once.

## Build and tests

Input: the immutable 0.1.6 ZIP, SHA-256
`3d9ef82b539280e2a4a5ed836648edfae43c55b0d4ec675c1e72d0b359ea0cb6`.

```bash
python3 previews/logo-brand-palette/package.py --base /path/to/0.1.6.zip --output-dir /new/output
python3 previews/logo-brand-palette/generate-fixtures.py /test-fixtures
node previews/logo-brand-palette/test-core.cjs /runtime /test-output/core
node previews/logo-brand-palette/test-ui.cjs /runtime /test-output/ui /test-fixtures
node previews/multi-application/test-core.cjs /runtime /test-output/multi-core
node previews/multi-application/test-ui.cjs /runtime /test-output/multi-ui
```

UI tests require Playwright; `ATLAS_TEST_CHROMIUM` may select a local Chromium.
Fixtures are synthetic software tests, not customer assets or production
proofs. Native Browser script injection targets only its final closing body
tag; embedded export templates are preserved.

Validation passed:
- Six known opaque colours recovered; every suggested RGB verified against
  its original pixel; repeatable extraction, alpha exclusion, no invented
  colours, invalid size/count/format checks and audit mismatch rejection.
- A synthetic Lab case where an eligible old reference loses to a closer
  candidate; exact tie order, equal-distance alternative and separate original
  assignment; duplicate-address and same-sRGB collision detection.
- Browser/Startup direct entry without an existing palette, remove/add pixel,
  explicit source review, original PNG/embedded ICC preservation, and full
  six-colour/four-CMYK-profile calculation with 24 per-application outputs.
- Collision visibility in UI, HTML and JSON; byte-identical project/source/
  decisions/palettes across DE/EN switching; reopen invalidation; pending
  replacement guards; invalid inputs retain existing source; JPEG/WebP loading.
- Replacing a logo retains application profiles/tolerances, clears decisions;
  desktop and 390px logo/report layout, zero browser errors.
- Previous multi-profile core and UI suites, including the independent native
  LittleCMS oracle, four-profile comparison, existing dossier import and
  Browser image/embedded-ICC handoff.

The package builder checks inherited bytes, every file checksum and ZIP CRC.
Master/reference libraries, embedded profile payloads, initial RGB mapping,
the existing print worker and LittleCMS binary are unchanged. Real material
samples and production-provider approval remain outside this software test.
No public deployment is included.

Release package: `ATLAS_Clarus_Logo_Markenpalette_0.1.7_DE_EN.zip`,
137,310,457 bytes, SHA-256
`a8ba76271fc8d52b867030a57facd6e332712cd3e2732338deabb2324aef3cf2`.
All 444 file checksums, ZIP CRC and source/runtime/ZIP equality passed;
428 inherited files remain byte-identical.
