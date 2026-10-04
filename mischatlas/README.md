# ATLAS Clarus Mixing Atlas — WordPress 0.1.4

Offline spectral mixing atlas with local palette import, HLC comparison, B/A PNG export and experimental light-dependent recipe search.

13,283 unchanged master references; the original database contains 12,714 HLC model hits and 569 open fields. These counts describe the original search, not the new light-dependent search. All are computational candidates, not measured mixture matches. Model parts are not calibrated drops or grams.

## Light-dependent mixing

The new section uses all 38 illuminants from the PKL Image Explorer. D50, D65, FL11 and LED-B3 are selected initially. Choose a reference in the existing atlas, select the required lights and search either for the lowest D50 error or the lowest maximum CIEDE2000 error across selected lights. The comparison table evaluates existing and new recipes under all 38 lights. Display swatches remain D65/sRGB.

Use the provided 31-sample Golden Heavy Body subset or import a compatible spectral palette through the existing importer. Names identify a common series but do not establish measured compatibility. Search uses Kubelka–Munk S=1, seed 42, a bounded candidate pool and integer refinement, at most four components and 100 model parts. No global optimum is claimed. JSON export records the fixed reference, source metadata, search conditions, selected lights, samples, recipe and all light evaluations.

## Build and install

Run `python3 mischatlas/build.py`. It verifies the split original archive by SHA-256 and ZIP CRC, extracts it, applies patches 0.1.1–0.1.4 and builds `mischatlas/dist/atlas-clarus-mischatlas-0.1.4.zip`. Patch 0.1.4 verifies the exact 0.1.3 HTML checksum and preserves the original reference/recipe payload byte-for-byte. New source is in `light-mixing/`; no new full copy of the 39 MB atlas is stored.

Update the WordPress plugin with the ZIP and retain `[atlas_clarus_mischatlas]`. The main-branch workflow publishes `atlas-mixing-v0.1.4`, containing plugin ZIP, standalone HTML and SHA256SUMS.txt. Existing releases remain available.

## Validation and limitations

D50/D65 integration cross-checked against Explorer reference Lab values, maximum error below 3e-13. The complete document was tested with a lightweight DOM and actual Node workers for startup, selected-light search, D50 search, 38-light table, cancellation, reference changes, original importer, imported palette, persistent JSON export and immutable original data. CI additionally performs PHP lint and a real Chromium browser smoke test, including the JSON download. Earlier live 0.1.3 acceptance remains documented in LIVE_TEST_2026-10-02.md; it is not acceptance of this new feature.

Recipe accuracy requires material-specific calibration, repeatable preparation, dosing, drying, physical spectral measurements and corrections. Printing-ink/textile suitability and production approval are not established. See RELEASE_NOTES_0.1.4.md and SOURCES-AND-LICENSES.txt. Previous source-specific attribution and licensing remain in force; there is no blanket licence for material data. Backes stated CC BY-SA without a confirmed version. The added code is GPL-2.0-or-later; data retains source-specific terms.
