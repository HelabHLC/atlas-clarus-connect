# ICC-Farbberatung 0.1.8-beta1 — integration contract

Status: **development draft**, not a published or deployed release.

## Scope
- Preserve ICC-Farbberatung 0.1.7 as a separate rollback baseline.
- Introduce `open-dcm/reference-record.mjs` for provenance-aware records.
- Only attach an ICC result after a real profile transformation in the existing engine.
- Record source colour space, source profile, destination ICC profile, rendering intent and substrate.
- Do not claim a measured proof from an ICC simulation.
- No fabricated Lab, RGB, or ΔE00 output.

## Acceptance before beta1 release
1. Locate and inspect the actual 0.1.7 implementation and ICC API.
2. Connect its real conversion output to the DCM record; verify against known fixtures.
3. Validate profile identity, rendering intent, reference Lab and substrate metadata.
4. Execute automated tests and verify the browser integration.
5. Verify that 0.1.7 is still recoverable.

## Later: 0.1.8-beta2
Add the left/right Colour Reference Card with a labelled substrate-aware preview.
