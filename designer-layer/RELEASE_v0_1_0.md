# ATLAS Clarus Designer Layer v0.1.0

**Status:** RELEASED  
**Release date:** 2026-09-20  
**Scope:** Public GitHub Designer Layer

## Release decision

The project owner approved the release after completion of the reproducible full R build and the 267-category coverage audit.

## Verified release facts

- 13,283 of 13,283 Atlas references were calculated.
- All records bind one-to-one to the frozen PKL master by `atlas_row_id` and HLC reference.
- Source master SHA-256: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.
- All 13,283 saved ISCC-NBS assignments were reproduced from their stored Munsell HVC values.
- 262 of the 267 revised ISCC-NBS categories are represented by at least one Atlas reference.
- Categories 67, 124, 157, 231 and 246 are valid but not sampled by the Atlas reference grid; no names were forced.
- GitHub Actions full build and audit run `35503770964` completed successfully.

## Release boundary

The Designer Layer is descriptive metadata. It does not replace or modify PKL identity, Lab, RGB, HEX, HLC address, 4C/ECG preview behaviour or A′ v0.4 logic. Automated reproducible audit has passed; this release does not claim external certification or independent human colour-science review.
