# ATLAS Clarus Connect v0.1 prototype

This package demonstrates a verifiable handoff for the frozen ATLAS reference `H125_L075_C080`.

## Frozen identity

- PKL reference: `H125_L075_C080`
- Internal `source_atlas_row_id`: `4665` (zero-based master row position)
- Display row: `4666`
- Master RGB: `118 / 205 / 39`
- Master HEX: `#76CD27`
- Master rows: `13,283`
- Master SHA-256: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`

## Files

- `ATLAS_Clarus_Connect_H125_L075_C080.ase` — Adobe Swatch Exchange RGB palette.
- `ATLAS_Clarus_Connect_H125_L075_C080.clarus.json` — frozen identity and export evidence.
- `ATLAS_Clarus_Connect_H125_L075_C080.tokens.json` — Figma/design-token handoff source.
- `VERIFICATION_REPORT.json` — deterministic build and ASE readback checks.
- `build_connect_v0_1.py` — reproducible package generator and ASE verifier.
- `SHA256SUMS.txt` — package-file checksums.

## Claim boundary

The ASE file has passed structural readback and exact RGB-u8 reconstruction. Import,
persistence and round-trip behavior in Adobe, Affinity and Figma have not yet been
tested. The correct status is `NOT_ROUNDTRIP_TESTED`; this package does not claim a
native integration or measured colour approval.
