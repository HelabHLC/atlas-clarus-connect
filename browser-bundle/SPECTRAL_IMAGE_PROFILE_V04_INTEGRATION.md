# Spectral Image Profile v0.4 — integration gate

Status: **INTEGRATION IN PROGRESS — NOT RELEASED**  
Target: ATLAS Clarus Browser Edition; development branch `feature/spectral-image-profile-v04`.

## Authoritative browser baseline

- Browser master input: `hover-library/data/colors.json` (13,283 entries).
- Browser master source SHA-256: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.
- Browser `atlas_row_id`: zero-based, deterministic nearest RGB by integer squared Euclidean distance, ties resolved by lower row ID.
- `main` source builder is documented as RC28; **do not confuse it with the separately released RC34.11 public bundle**. Integration into RC34.11 requires its exact release source and separate acceptance.

## Candidate v0.4

- Candidate data identifier: `active_master_v2_illumext_20261115`.
- Candidate embedded-array SHA-256 (different representation; not interchangeable with browser source hash): `92dee3545023e3aac508bbf513388369c1204c3195c7538f8dee859432df9e9f`.
- Spectral grid: 380–730 nm inclusive, 10-nm increments, 36 samples per reference.
- Expected: 13,283 spectra; 13,283 unique HLC addresses; index and RGB equality to browser master.
- The candidate is a **modeled ATLAS reference-spectrum assignment from RGB**, **not** a physical spectrum measured from the pictured material. Metamerism prevents unique spectral reconstruction from RGB.

## Mandatory automated acceptance

1. Load browser `colors.json` and the exact candidate spectral dataset; reject missing or reordered rows, duplicate reference IDs, RGB mismatches and incorrect wavelength grids.
2. Assert exactly 13,283 equal `(index, HLC address, RGB)` tuples, zero mismatches. Record both source hashes separately.
3. Verify squared Euclidean nearest-RGB assignment and deterministic lower-index tie-break against both implementations, including duplicate RGB values and equidistant synthetic cases.
4. Preserve the original Browser Edition picker identity; spectra and ARBE values are **post-hoc descriptors**, never a new colour-identity rule.
5. Test image alpha/background policies explicitly. The candidate's exact-black exclusion is test-image-specific; black is a legitimate colour in general images. Fix the v0.4 reference-export assertion that assumes alpha-weight equals integer pixel count for partially transparent pixels.
6. Verify 36-point CSV and JSON export consistency, reference-weight totals, reproducible numeric output and source provenance.
7. Regression-test picker, Hover, palettes, Clarus JSON import/export, ICC workflows, offline single-file bundle, keyboard/mobile navigation and previously supported exports.
8. Test the integrated application in actual desktop/mobile browsers; do not treat JavaScript syntax checks as end-to-end acceptance.

## Integration policy

- Keep the existing browser master and its SHA-256 binding unchanged.
- Add spectral data as a separately versioned layer keyed by verified `atlas_row_id`.
- Do not publish or deploy from this branch before tests and review.
- The locally validated v0.4 standalone prototype is not yet integrated in this repository. Do not mark this gate PASS until the exact module source and its spectral payload are committed and tested.
