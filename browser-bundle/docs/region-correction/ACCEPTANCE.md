# RC33.8 offline acceptance - 16 October 2026

This candidate adds source-based post-reduction corrections. It does not deploy
WordPress or Android and is not a physical production approval.

## Executed checks

- `node browser-bundle/tests/validate_region_corrections.js`: source-nearest and
  designer-chosen reference modes, fixed palette budget, local explicit mask,
  immutable full-master assignment, alpha and hidden RGB, both cleanup scopes,
  deterministic output, overlapping and conflicting protection rejection.
- Existing library-reference, scoped-cleanup and inspector-controller tests pass.
- `validate_region_corrections_browser.cjs`: actual Chromium UI/worker/download,
  independent PNG reconstruction and manifest checks, cleanup, undo, widths
  390/768. Uses `ATLAS_TEST_HTML` and optional `ATLAS_TEST_BROWSER`.
- Architecture JPEG: actual Chromium 153.0.8010.0 under Linux; 14 desktop checks
  and two checks in a fresh touch-emulation browser, without disabling web security.
  Exercises original-to-output difference overlay, source-based suggestions,
  budget rejection preserving old output, correction and cleanup, independent
  saved variant, exact undo, explicit budget increase, chosen reference, overlap
  rejection, narrow layout and library invalidation. No page errors.

## Independently reconstructed photo exports

Source: Joel Salmi / Unsplash, 1200 x 1600 JPEG.
Photo: https://unsplash.com/photos/-FWBJPvp_WI
Original file SHA-256:
`5b0e20242b9efbbec0308d4597e97898373858763f62e010c1ce5ebd29dc8caf`
Frozen input RGBA SHA-256:
`46dc1c4bebf34826db4c37a2773ae3f7a57ab194fa5531d56b9d961fb5e4ddd3`

The unprotected 32-Solid-Coated-colour baseline is pixel-identical to RC33.7.2.
The 21 x 21 correction at inclusive X50-70 / Y600-620 reserves each source pixel's
nearest library reference; all 441 corrected pixels exactly match those references.
At X65/Y616, original RGB 46/128/44 previously reduced to 35/108/54. The corrected
output is 37/122/60 (H145_L045_C045), including after cleanup. The same 32-entry
palette is retained by cleanup; 90,874 other pixels change, zero corrected pixels do.

A separate deliberate single-reference fill at X30-100 / Y570-640 has exactly 5,041
mask positions assigned to row 5576. This mode intentionally flattens detail in the
rectangle; it is a designer choice, not automatic image restoration. Other
unlocked colours can change when the entire palette is recalculated.

Each of the three ZIP exports passes independent reconstruction from palette
indices, palette counts, library membership, exact source/mask/full-master checks,
unchanged alpha, source and output hashes and every package-manifest checksum.

The RGB-distance highlight is a numerical inspection aid, not perceptual Delta E.
Aesthetic acceptance still belongs to the designer. Actual iOS/Android devices,
Firefox and Safari are not covered by these Chromium checks.

Archive SHA-256 (tested offline candidate):
`041b43293cb6de936dd7e829e1a1c0f9423f3ce64bb9ba1daaeaa1d4591cc8f7`
