# RC36.3 release decision — 2026-11-28

Reviewed integrated candidate commit `78c0f358c26c6998b7a9bd516d8fba44d4c11d34`.

**Decision: internal technical integration accepted for further validation; public deployment NOT approved.** No release, installer distribution, merge or IONOS modification authorized by this evidence record. Keep the existing public runtime unchanged.

## Verified CI evidence
- [RC36.3 integrated BYOS browser gate](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/46166074127): completed successfully. Baseline and staging build, checksum verification, unchanged master asset, six regression tests, Chromium 151.0.7922.34.
- 20,115 generated fixture records, wrong pins rejected by original candidate; separate fixture copy with generated pins exercised local import, HLC and full-key search, SID4 multiple matches, Open DCM JSON/popup, spectrum CSV, clear. Zero HTTP(S) requests and zero page errors. Real private data browser test NOT_RUN. No private reference files shipped.
- [ICC numerical gate, PR #132](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/46160975443): failed. Relative intent: exact CMYK16 and returned Lab. Absolute intent: CMYK16 differences [+1,+2,0,+1]; returned Lab differences [-0.0027626752853393555,0,-0.00009119510650634766]. Existing limits: exact device values and <=0.0001 per Lab component. Do not silently relax. No physical proof or production approval.
- [Public BYOS inventory](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/46158646426): report workflow completed, scanner exit 2 (review required). Neither the workflow nor BYOS alone establishes redistribution clearance.

## Public release gates remaining
1. Resolve ICC inventory findings, audit actual distributable bytes and source/licence provenance, remove uncleared payloads. Validate retained source attribution. Private extension is local BYOS only; no public distribution of the extension until separately authorized and cleared.
2. Run integrated browser acceptance with actual three pinned local catalogue files; do not upload private data to public CI.
3. Resolve absolute-intent numeric discrepancy under controlled version/build/parameter comparison, or explicitly disable the unvalidated path and validate the reduced product scope. No waiver of existing test criteria.
4. Build a separately verified installer from cleared payloads; test actual IONOS staging, access control, isolated storage, exports, rollback, and unchanged production baseline. Shared spectral handoff, media recommendation and physical validation are not established by this pass.

Manifest deployment_allowed remains false. No data, public runtime, or main branch changed.

## Subsequent evidence — reduced candidate and owner-assisted local acceptance

- [Reduced release gate](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/46166727056), commit `2e5f80621f1d6fa6c272b1d2a03597d31880504a`: all jobs passed. Eight regression tests, exact relative-intent CMYK16 and returned Lab in the tested case, absolute intent blocked in new Open DCM path. 343 files and 164 gzip payloads scanned; zero ICC binary candidates detected and no opaque payloads left uninspected by that scanner. The scan does not establish legal clearance for all catalogue entries or derived data.
- 2026-11-28: owner-assisted local Windows/Chrome acceptance of RC36.3. Screenshot supplied by owner showed successful import of three selected JSON files and status "20115 Referenzen · 9 SID4-Kollisionsgruppen". Owner subsequently supplied the displayed Open DCM test-card JSON for one original master reference, one Display P3 synthetic test reference, and one ProPhoto-only synthetic test reference. All three showed the expected evidence classification, 36 wavelength and reflectance values, and full spectral key. Original row ID was retained; both synthetic entries had null row ID. All three showed ICC not calculated, physical proof not measured, and production approval false. This establishes user-assisted real-data import and three representative HLC-to-test-card handoffs, not automated all-record browser replay, independent spectral/physical validation, or actual ICC calculation for those three references. No screenshot, private reference data, or spectra are uploaded with this evidence note.
- Updated status: original-data import and representative card handoff accepted; reduced relative-only CI gate passed. Remaining public release gates are provenance/rights review of actual distributable payloads and verified isolated IONOS package/staging/rollback. The private extension remains local BYOS. Production manifest and runtime remain unchanged.
