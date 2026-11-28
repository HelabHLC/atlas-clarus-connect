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
