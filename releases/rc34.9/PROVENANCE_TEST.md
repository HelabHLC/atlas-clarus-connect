# RC34.9: two source colours, one ATLAS reference

This regression runs against the **unchanged published bundle**, using its actual
Image Picker, download buttons and importers in separate Chromium contexts. It
does not change the master or publish/deploy anything.

```sh
npm install --no-save playwright@1.62.1
npx playwright install chromium
node releases/rc34.9/provenance-regression.cjs /path/to/atlas-clarus-browser-bundle /path/to/evidence
```

Alternatively set `CHROMIUM_EXECUTABLE` to an existing Chromium executable.
Validated on 2026-11-01 with Node 24.22.1, Playwright 1.62.1 and Chromium
138.0.7204.0. Native QuarkXPress: **NOT_TESTED**.

## Input and immutable baseline

- Release: `v0.2.0-rc34.9-quarkxpress` (published 2026-10-31).
- Commit: `ad158876aa3615bef74a671a3b191f0274ff9fd2`.
- [Published ZIP](https://github.com/HelabHLC/atlas-clarus-connect/releases/download/v0.2.0-rc34.9-quarkxpress/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.9-quarkxpress.zip).
- ZIP SHA-256: `5699974d6b5742786b92babc3315d32f3b1af0fd4d89b23cf7fbddc4d5cc2156`.
- Master identifier: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.
- All 274 entries in the published SHA256SUMS are checked before and after.

The fixture is a 2 × 1 opaque PNG, generated deterministically with the shipped
PNG codec. Pixel (0,0) is RGB 61/123/25 (`#3D7B19`); pixel (1,0) is RGB 60/123/25
(`#3C7B19`). Exhaustive integer squared RGB distance over all 13,283 rows gives
the same winner: row 4966 (zero based), `H130_L045_C055`, RGB 55/121/26,
`#37791A`. Distances squared are 41 and 30. No Lab/Delta E selection is used.

## What passes, and what each export contains

| Export | Original RGBs and shared reference recoverable? | Evidence |
| --- | --- | --- |
| My Palettes XTG alone | No | One reference swatch, its RGB, address and textual master hash; no two source records. |
| My Palettes Clarus JSON 1.2 with recorded samples | Yes | Two `source_assignments` retain source RGB/HEX, coordinates, source image hash, reference row/address/RGB and distances. Fresh-context import/export is byte-identical. |
| Reduction `palette-part-1.clarus.json` alone | No | `source_assignments: []`; fresh-context import/export retains one reference and zero source records. |
| Unprotected `reduction.json` alone | No for this fixture | Reference palette and aggregated reference mapping; `original_rgbs` and `source_bindings` are empty. Source hashes are not the source pixel bytes. |
| Complete reference-reduction job ZIP | Yes | Original PNG, input RGBA, per-pixel reference IDs, output indices, job state and reports survive fresh-context import and replay. |
| Protected-originals XTG alone | Only the original swatches | Both original RGBs/names remain, but their shared ATLAS address is absent. |
| Protected-originals `reduction.json` | Yes for these protected colours | Each `ORIGINAL_RGB` entry has exact RGB plus `source_atlas_row_id` and `source_atlas_reference`. Full job is still required to resume the image job. |

For the reference-reduction job, join pixel index to `input-rgba.bin` (4 bytes per
pixel), `input-atlas-row-id.u16le` (2 bytes per pixel) and
`output-palette-index.u16le` (2 bytes per pixel). The output index resolves into
`reduction.json.palette`. Both input reference IDs are 4966 and both output
indices are 0. In the protected case the output palette is sorted: source pixel 0
uses output index 1 and source pixel 1 uses index 0. The test follows these indices
rather than assuming palette order equals source order.

The protected entries have `atlas_row_id: null`: they are original RGB swatches,
not newly minted master references. Their `source_atlas_*` fields retain the
reference relationship without relabelling the originals.

## Test scope

The regression samples both actual PNG pixels through the UI, confirms one
palette reference plus two source records, downloads XTG/JSON, checks XTG with
both the application reader and an independent definition parser, and imports
the JSON into a clean context. It also rejects inconsistent source RGB, address
and master fields. Removing all source assignments is valid but restores zero
source records; absent provenance cannot be reconstructed from one reference.

It exports and imports full reduction jobs both with no source locks (full
library, budget 1) and with both exact originals protected (budget 2). It checks
original PNG bytes, frozen RGBA, reference IDs, output indices, complete decoded
job state, report and XTG after import/re-export. Each import is performed in a
new browser context, so old local storage cannot supply missing source records.

No runtime change is required to pass these cases. This addition is a regression
test and documentation only. No CI workflow or release trigger is changed.

## Native QuarkXPress boundary

The internal XTG reader is not QuarkXPress. Acceptance of XPress Tags, creation of
swatches, name conflicts, RGB values after native import, and native save/reopen
remain untested. XTG contains no embedded ICC profile. For a manual test, use an
empty QuarkXPress project, a text frame, File > Import with Interpret XPress Tags,
UTF-8, and an sRGB IEC61966-2.1 source setup for RGB solid colours. Check each
swatch against the example values. Keep JSON/job separately; no automatic
linking of the source records inside QuarkXPress has been demonstrated.

Exact RGB preservation here means the two synthetic 8-bit sRGB inputs. It does
not establish unchanged values through arbitrary ICC conversion or a physical
colour/print match. Hashes check consistency, not authorship or authenticity.
