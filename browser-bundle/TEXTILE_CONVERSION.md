# FOGRA58 conversion preview — 0.2

Extends the existing Print workspace with actual local LittleCMS 2.16 transforms:
- Fixed master sRGB → FOGRA58 RGB16 reference JSON.
- ICCBased RGB reference PDF with the exact FOGRA58 profile embedded.
- Source image → fixed PKL reference → FOGRA58 RGB16 → sRGB comparison.
- B/A PNG and JSON with source / PKL / preview hashes, intent and BPC.

Load the official final profile locally, choose workflow/fabric/intent/BPC, then
use Create FOGRA58 RGB reference data + ICCBased PDF (one selected reference).
For images use Load preview image or Use Image Picker image, then Create FOGRA58
preview. Save B/A PNG and preview details JSON together. Same 1200px preview
limit and white compositing as the existing 4C/ECG preview; not original-size
production artwork. Original image stays unchanged. The baseline is the fixed
PKL-mapped image, explicitly not the untouched source photo.

The shared print-handoff JSON/report remains the preparation request. Computed
reference JSON/PDF and image PNG/JSON are separate result artifacts, as in the
existing CMYK/ECG paths. Profile/settings/image changes invalidate image results.
No profile relabelling of original RGB, no reference reassignment after ICC conversion,
no new beta/final library membership, no automatic palette decision, no physical proof.

FOGRA58 is an RGB exchange space. Calculated ICC results do not validate D65/10°
physical textile matching or actual printer/ink/fabric output. Return to sRGB is
relative colorimetric with BPC off and no paper-white simulation. No Happy Hack
is introduced. Do not interpret a small/zero round-trip difference as gamut proof.
PDF uses ICCBased RGB, not DeviceRGB with a profile merely named in the text,
and makes no PDF/X certification claim. Actual fabric workflow remains to be tested.

Build from repository root:
python3 browser-bundle/build_textile_conversion.py --output-dir browser-bundle/build-textile-conversion

The previous handoff-only preview is superseded for user testing. Its README
explains provenance and compatibility; this document defines the added conversion
capabilities. Legacy production builders and the ATLAS master are unchanged.

## Tests

With TEXTILE_PROFILE pointing to your local final ICC:
```
TEXTILE_PROFILE=/path/TextileRGB_FOGRA58.icc node browser-bundle/tests/validate_textile_conversion.cjs
TEXTILE_PROFILE=/path/TextileRGB_FOGRA58.icc node browser-bundle/tests/validate_textile_conversion_ui.cjs
TEXTILE_BUNDLE_DIR=browser-bundle/build-textile-conversion/atlas-clarus-browser-bundle node browser-bundle/tests/validate_textile_bundle.cjs
```
The numeric oracle uses native LittleCMS (Python ctypes) independently of WASM.
The UI test executes the actual candidate modules and WASM via a Worker adapter,
jsdom and a real raster canvas. It exercises actual JSON/PDF and B/A PNG outputs,
including PNG decode and stale-result invalidation. This is not native browser or
physical-device acceptance. The existing Chromium installer failed to supply a
valid browser archive; visual browser/device review remains open. PDF output was
rendered with Poppler and visually inspected; ICCBased/N3/profile bytes/values
were checked with an independent PDF parser. A PDF sample is generated privately
for testing; the downloadable app does not contain the Fogra ICC file.

Validation result: 56 real-profile native/WASM combinations matched exactly in
RGB16 and sRGB preview (native LittleCMS 2.14 vs WASM 2.16), covering all four
intents with BPC on/off and seven frozen master references. Alpha was preserved,
profile tampering and source mismatch were rejected, and no network was used.
The existing 16 native/WASM CMYK/ECG roundtrip vectors and reference-card tests
also pass. These are software results, not physical textile validation.
