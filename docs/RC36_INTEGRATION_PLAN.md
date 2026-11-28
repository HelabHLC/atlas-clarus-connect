# ATLAS Clarus RC36 — integration preparation
Date: 2026-11-28. Status: PREPARATION ONLY; no release or deployment approval.

## Baseline and isolation
The active IONOS configuration on 2026-11-28 selects RC34.11 Brand Palette 0.1.7 (WordPress adapter 0.1.24-beta2). Its recorded runtime installation date is 2026-11-05. The integration branch starts from `release/brand-palette-017-public`, the existing release source branch; exact archive-to-source parity still needs a manifest/build audit. Do not equate the adapter version with the runtime version. Do not switch production routes, alter main, or overwrite the master. Preserve the existing IONOS rollback target and existing export/import compatibility.

## Architecture
One user-facing application with a shared identity/provenance record; independently testable modules:
1. Image Picker, Hover, Wheel, palettes and brand analysis: preserve the deployed baseline.
2. Source space and Open DCM reference contract: retain source RGB, confirmed/assumed colour space, ICC metadata/hash, HLC identity and per-source history separately from production output.
3. Colour Advisory and Startup Colour Reference Card: profile-bound device values, target/returned Lab, Delta E00, intent, BPC, media and evidence; separate measured fields from predictions.
4. Multi-Gamut Designer: library membership independent from global address identity; sRGB, Display P3 and ProPhoto RGB kept distinct.
5. Spectral Lab: separate experimental workspace, user-provided data (BYOS); explicit source, illuminant and observer; no claim of unique spectral inversion.
6. Optional reference extensions and media selection: gated import interfaces only until data provenance, redistribution rights and reproducibility are verified. No private research assets, proprietary ICC binaries, measurement claims or synthetic spectra in this branch.

## Existing sources and dependencies
- #120 logo workflow and release/brand-palette-017-public baseline; audit runtime parity first.
- #122 separate deployed digital HLC preview; preserve digital address vs master distinction.
- #125 Multi-Gamut draft; test data and real ICC provenance still required.
- #127 reference record; #128 source-space decision; #130 combines the record and decision. Inspect exact diffs and tests before importing; do not merge stacked branches blindly. #130 observed head 074144fedab4fdda1f22148ef0b59f61be18d47d.
- #129 Research BYOS 0.6.0-beta.2 merged on main; integrate by reviewed module interface, not by an indiscriminate merge.
- integration/beta15i6-multi-gamut-colour-consultancy: verify actual integration CI and artifacts before inclusion. No success assumed.

## Incremental release gates
| Gate | Deliverable | Acceptance |
| --- | --- | --- |
| RC36.0 baseline | Manifest and source/build inventory | Compare deployed and reproducible archive SHA-256, runtime version, assets, master fingerprint and 13,283 identities; baseline functional regression and offline package. If exact reproduction fails, block release and identify differences. |
| RC36.1 identity | Picker → palette → Clarus JSON → reimport | Same HLC can have two distinct source records; assumed sRGB and confirmed P3 survive roundtrip, original pixels preserved; ICC mismatch and unsupported space fail closed. No master changes. |
| RC36.2 Open DCM | Shared identity to Colour Reference Card | Independent ICC check, absolute/relative separated, device values bound to profile, correct source/target/material, PNG/PDF/JSON consistency; no automatic physical approval. |
| RC36.3 multi-gamut | Library membership and digital address import | No clipping before membership checks; D50/D65 adaptation documented; master, source list, calculated gamut and output profile membership independent. |
| RC36.4 research | BYOS Spectral Lab and optional reference extension | Rights and version checks, offline/no-upload test; original vs synthetic evidence status; invalid spectra and duplicates rejected; no private data packaged. |
| RC36.5 media | Optional output profile recommendation | Filter compatible media first; rank by separately defined intent and Delta E00; include profile hash and no-print-proof status. Independent reproduction before promotion. |
| RC36 staging | Separate IONOS instance | Distinct URL, runtime path, WordPress shortcode/option namespace and rollback; desktop/mobile checks, exports, offline build, no public switch; explicit approval for deployment. |

## Next executable task
RC36.0: freeze the exact deployed release artifact, manifest and checksums; compare them with the branch build inputs. RC36.1 is the first functional integration after baseline parity: use #130 for a provenance-preserving picker/palette/JSON roundtrip. Test existing exports and migration from RC34.11. All gates are presently OPEN; this document is not a test result.

Evidence before claims.
