# ATLAS Clarus Mixing Atlas — WordPress 0.1.3

Offline spectral mixing atlas with local palette import, HLC comparison and B/A PNG export.

13,283 unchanged master references; 12,714 model hits, 569 open fields. These are computational candidates, not measured mixture matches. Parts are not calibrated drops or grams.

## Build and install

Run `python3 mischatlas/build.py` from the repository checkout. It verifies both parts and the complete archive by SHA-256, checks ZIP CRC, and extracts the complete HTML/JavaScript source into `mischatlas/dist/atlas-clarus-mischatlas/`. The split archive preserves the exact previously verified 0.1.0 source package and avoids the connector request-size limit. The build applies patch-v011.py, then patch-v012-en.py with english-ui.json. The Liste label is translated only as a standalone word, preserving addEventListener API names. Version 0.1.3 translates the interface, help, warnings, attribution and generated labels to English, and replaces hidden automatic downloads with persistent, visible Download links. Embedded reference data, existing recipes, spectra and numeric kernels remain unchanged. Imported user names are preserved.

Upload `mischatlas/dist/atlas-clarus-mischatlas-0.1.3.zip` through WordPress Plugins → Add New → Upload Plugin. Activate and insert `[atlas_clarus_mischatlas]` into a test page.

## Verification boundary

Package CRC, embedded reference count and JavaScript syntax were checked locally. PHP lint passed in CI. WordPress 0.1.3 is installed and active; page 5497 is the publication target. Browser startup, page selection, synthetic palette import, selected-field calculation, B/A and cancellation passed. English startup, import and selected-field calculation passed. PNG and JSON preparation now produces visible download links. The cloud browser could not verify actual file saving; Norbert Woiwod subsequently reported that import, calculation and PNG/JSON downloads all work. Manual acceptance is user-reported, not an independently inspected export audit. See LIVE_TEST_2026-10-02.md. After installation test H005, H360 (158/168), synthetic JSON import, matching reference B/A, PNG download and cancellation of a search. User data stays in the browser.

## Source-specific licensing

See SOURCES-AND-LICENSES.txt. GPL applies only to the new PHP wrapper. Backes stated CC BY-SA in his 1 October 2026 reply without a version; no version is invented here. This does not settle source-specific rights for all included material data. No blanket licence applies to the archive.

## Spot colours and public downloads

See RELEASE_NOTES_0.1.3.md for the English companion text. The atlas supports development of spot colours from fixed HLC targets; recipes need material compatibility, dosing calibration and physical measurement before production use.

The main-branch publication workflow builds a WordPress ZIP and standalone HTML and publishes them with SHA-256 checksums as release atlas-mixing-v0.1.3. Source-specific attribution remains in both distributions.

Version 0.1.3 fixes an empty-table regression in the English translation. Version 0.1.2 is superseded. Numeric data and calculations are unchanged.
