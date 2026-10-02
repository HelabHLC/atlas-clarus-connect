# ATLAS Clarus Mischatlas — WordPress 0.1.0

Offline spectral mixing atlas with local palette import, HLC comparison and B/A PNG export.

13,283 unchanged master references; 12,714 model hits, 569 open fields. These are computational candidates, not measured mixture matches. Parts are not calibrated drops or grams.

## Build and install

Run `python3 mischatlas/build.py` from the repository checkout. It verifies both parts and the complete archive by SHA-256, checks ZIP CRC, and extracts the complete HTML/JavaScript source into `mischatlas/dist/atlas-clarus-mischatlas/`. The split archive preserves the exact previously verified package and avoids the connector request-size limit.

Upload `mischatlas/dist/atlas-clarus-mischatlas-0.1.0.zip` through WordPress Plugins → Add New → Upload Plugin. Activate and insert `[atlas_clarus_mischatlas]` into a test page.

## Verification boundary

Package CRC, embedded reference count and JavaScript syntax were checked locally. PHP and live WordPress execution are pending. After installation test H005, H360 (158/168), synthetic JSON import, matching reference B/A, PNG download and cancellation of a search. User data stays in the browser.

## Source-specific licensing

See SOURCES-AND-LICENSES.txt. GPL applies only to the new PHP wrapper. Backes stated CC BY-SA in his 1 October 2026 reply without a version; no version is invented here. This does not settle source-specific rights for all included material data. No blanket licence applies to the archive.
