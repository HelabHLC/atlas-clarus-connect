# beta15i.6 — P3/ProPhoto × Multi-Gamut × Farbberatung integration contract (draft)

Status: interface audit only; no runtime integration, merge, or release claimed.

## Verified sources
- PR #121: `previews/digital-hlc/core.js` and README, separate digital colour identity and source-library selections.
- PR #125: `browser-bundle/src/multi-gamut-library.js` and `multi-gamut-ui.js`, master-row/ICC roundtrip engine.
- Both PRs are open and their branches diverge.

## Critical interface boundary
1. Digital HLC colours absent from the 13,283-row master use distinct digital identities; they **must not** be assigned invented `atlas_row_id` values.
2. `ATLAS_MULTI_GAMUT.create(master)` requires `master_sha256`, `entry_count===13283`, `colors.length===13283`; its `memberships(id)` accepts a master row ID only.
3. Digital library *source selection*, mathematically computed *in-gamut*, ICC *roundtrip tolerance*, and *physical production QC* are four independent fields. Never infer one from another.
4. Digital HLC core uses D50/2° Lab; P3/ProPhoto RGB representations are derived, not measured. Existing master values and spectral records are immutable.
5. PR #125 UI currently handles FOGRA58 verified CSV import and master-row queries; no digital-identity adapter or material/consultancy routing is present.

## Proposed adapter (not implemented)
Input: `{kind:'master', atlas_row_id, reference}` OR `{kind:'digital', digital_id, address, source_space}`, plus `material_id`, `application_id`.
Output: `{identity, source_memberships, computed_gamuts, icc_checks, production_evidence, alternatives, warnings}`.
- For master: use #125 engine with verified profile provenance.
- For digital: use #121 identity and computed representations; return ICC status `NOT_EVALUATED` until independently computed with a suitable ICC workflow; no fabricated row ID or spectrum.
- Material selection narrows applicable production evidence; it never silently removes source memberships.
- Farbberatung 0.1.7 integration requires inspection of actual callable exports and UI state before coding.

## Acceptance gates
- All 13,283 master identities unchanged; no reassignment of stored RGB/Lab/spectra.
- P3 15,430 and ProPhoto 22,248 source-address lists retain provenance and separate gamut flags; verify against pinned artifacts.
- Same master reference may appear in multiple library memberships.
- Out-of-master digital address survives export/import without being treated as master or production-approved.
- Missing material profile produces `NO_VERIFIED_PROFILE`, not a printability verdict.
- Run existing #121/#125 regressions and rendered browser tests; confirm no regressions in colour consultancy, material masks, ICC and Colour Card.
- Do not merge/deploy before all gates pass.
