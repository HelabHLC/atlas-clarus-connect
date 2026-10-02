# ATLAS Clarus Mixing Atlas — WordPress 0.1.2

Offline spectral mixing atlas with local palette import, HLC comparison and B/A PNG export.

13,283 unchanged master references; 12,714 model hits, 569 open fields. These are computational candidates, not measured mixture matches. Parts are not calibrated drops or grams.

## Build and install

Run `python3 mischatlas/build.py` from the repository checkout. It verifies both parts and the complete archive by SHA-256, checks ZIP CRC, and extracts the complete HTML/JavaScript source into `mischatlas/dist/atlas-clarus-mischatlas/`. The split archive preserves the exact previously verified 0.1.0 source package and avoids the connector request-size limit. The build applies patch-v011.py, then patch-v012-en.py with english-ui.json. Version 0.1.2 translates the interface, help, warnings, attribution and generated labels to English, and replaces hidden automatic downloads with persistent, visible Download links. Embedded reference data, existing recipes, spectra and numeric kernels remain unchanged. Imported user names are preserved.

Upload `mischatlas/dist/atlas-clarus-mischatlas-0.1.2.zip` through WordPress Plugins → Add New → Upload Plugin. Activate and insert `[atlas_clarus_mischatlas]` into a test page.

## Verification boundary

Package CRC, embedded reference count and JavaScript syntax were checked locally. PHP lint passed in CI. WordPress 0.1.2 is installed and active; page 5497 remains draft. Browser startup, page selection, synthetic palette import, selected-field calculation, B/A and cancellation passed. English startup, import and selected-field calculation passed. PNG and JSON preparation now produces visible download links. Actual download completion remains unverified in the cloud browser. See LIVE_TEST_2026-10-02.md. After installation test H005, H360 (158/168), synthetic JSON import, matching reference B/A, PNG download and cancellation of a search. User data stays in the browser.

## Source-specific licensing

See SOURCES-AND-LICENSES.txt. GPL applies only to the new PHP wrapper. Backes stated CC BY-SA in his 1 October 2026 reply without a version; no version is invented here. This does not settle source-specific rights for all included material data. No blanket licence applies to the archive.
