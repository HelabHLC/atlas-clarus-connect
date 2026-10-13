# ArtCraft × ATLAS Clarus Interoperability Pilot 0.2.2 — Source Preview

This pre-release is a **source/integration preview for developers and private testers**.

It demonstrates a real colour-data round trip:

**ATLAS Clarus → Clarus JSON 1.2 → ArtCraft pilot → save/restart → Clarus JSON 1.2 export → ATLAS Clarus**

The integration preserves the recorded original source RGB separately from the fixed ATLAS reference identity.

## What is included

- the ArtCraft integration patch
- the isolated Windows-profile patch
- reproducible preparation/build scripts
- the pinned build manifest and checksums
- test instructions and validation notes

**No compiled ArtCraft executable is distributed in this pre-release.**

ArtCraft 0.41.0 uses its own fair-source license. That license permits copying, modifying, compiling and using ArtCraft for private personal purposes, but this project does not interpret it as permission to redistribute a modified ArtCraft binary publicly. Obtain any required permission from the ArtCraft maintainers before redistributing a compiled build.

## Tested integration behavior

The 0.2.2 candidate passed 66/66 frontend unit tests, TypeScript build, production frontend build, Rust/Tauri Windows x64 build and native startup in GitHub Actions.

A real Windows 10 user test additionally completed:

- Clarus JSON 1.2 import
- preservation across ArtCraft restart
- Clarus JSON 1.2 export
- re-import into ATLAS Clarus Browser Edition
- preservation of source RGB, ATLAS address, atlas_row_id, reference RGB, sampling coordinates, image provenance and the fixed master SHA binding
- no silent remapping

The fixed ATLAS master SHA-256 remains:

`8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`

## Private build/test workflow

1. Clone the exact ArtCraft 0.41.0 revision:
   `c3844acdadf630db0c17ec1d1512bcf6bbc1b4f9`
2. Use a fresh checkout.
3. Run `prepare.py` from this integration kit against that checkout.
4. On Windows x64 with the documented toolchain, run `build-windows.ps1`.
5. Start the isolated pilot and choose **Import ATLAS Clarus palette**.
6. Import a Clarus JSON 1.2 file containing `source_assignments`.
7. Inspect original colour and ATLAS reference separately.
8. Close and restart the pilot.
9. Choose **Export ATLAS Clarus palette**.
10. Import the resulting `.clarus.json` into the ATLAS Clarus Browser Edition and compare the recorded fields.

See `README.md` and `USER-README.txt` in the kit for details.

## Boundaries

This is an experimental interoperability pilot.

- `NOT_SIGNED`
- `NOT_MEASURED`
- `COMPUTATIONAL_ONLY` where computational results are involved
- no physical-colour, print, material or production approval
- no issuer-authentication or anti-counterfeit claim
- the ArtCraft pilot does not redefine the frozen ATLAS reference identity
- the export is a new JSON serialization of the saved source-backed records, not byte-for-byte recovery of the originally imported file

## Upstream

ArtCraft: https://github.com/storytold/artcraft

ATLAS Clarus Connect PR #78 contains the integration history and validation evidence.
