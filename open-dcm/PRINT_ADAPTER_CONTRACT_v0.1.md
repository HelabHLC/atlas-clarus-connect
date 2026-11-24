# ATLAS Clarus Open DCM — Print Adapter Handoff Contract v0.1.0

**DRAFT – preparation data contract only.** This version does **not** perform ICC conversion, drive a printer/RIP, generate CMYK/ECG values, measure a print, or grant production approval.

## Purpose

Link a preserved ATLAS Clarus HLC identity to future verified ICC colour conversion and then a printer-specific workflow. This is **different from** the public Research Beta 0.6 Data Adapter, which imports user-provided spectral/reference files for analysis.

The transport format is ordinary JSON, created by `createPrintAdapterPreparation()` in `print-adapter-contract.mjs`. No CIE, FOGRA, freieFarbe or ICC reference data is embedded in this module.

## Data path and release boundaries

1. **Input identity**: use `reference-record.mjs` v0.1.0 with an unchanged HLC address, original RGB8, source colour space/profile, zero-based master row ID and exact master SHA-256.
2. **Identity validation outside the builder**: a future receiving application **must verify** that the row number, HLC identity and RGB source agree with the exact loaded master before assigning a verified identity. This contract intentionally labels the identity `DECLARED_REQUIRES_MASTER_LOOKUP`.
3. **Prepare parallel paths**: request `4C`, `ECG`, or both. Each path references the **same frozen original reference**. Neither path may use the other path's result as input.
4. **Real ICC transformation – NOT IMPLEMENTED HERE**: a separate verified engine must check actual ICC output profile bytes/sha256, profile output space, intent/BPC, substrate, and produce its own separately auditable calculation receipt. No fabricated output or ΔE00 is permitted.
5. **Device handoff – NOT IMPLEMENTED HERE**: printer, RIP, device driver, settings and confirmed channel order need their own integration and tests.
6. **Measured proof and acceptance – NOT IMPLEMENTED HERE**: a physical measured result requires separate measurement context and explicit operator/customer acceptance. ICC prediction never equals a physical proof.

## JSON contract

| Field | Meaning / fixed pre-calculation value |
| --- | --- |
| `format` | `ATLAS_CLARUS_OPEN_DCM_PRINT_ADAPTER` |
| `version` | `0.1.0` |
| `status` | `PREPARATION_ONLY` |
| `source.system` | `ATLAS Clarus` |
| `source.hlc` | Canonical HLC label |
| `source.atlas_row_id` | Zero-based row 0…13282 |
| `source.master_sha256` | Exact declared master digest, 64 lowercase hex |
| `source.rgb8` | Original RGB8, **not** converted device values |
| `source.colour_space` / `source.source_profile_id` | Original input context |
| `source.identity_status` | `DECLARED_REQUIRES_MASTER_LOOKUP` |
| `topology` | `PARALLEL_FROM_SAME_FROZEN_REFERENCE` |
| `production_paths[].path_id` | `4C` or `ECG` |
| `production_paths[].expected_device_space` | `CMYK` or `7CLR` respectively |
| `production_paths[].input_from_path` | `null`, never chained between pathways |
| `production_paths[].printing_condition` / `.substrate` | Optional *declared* context |
| `production_paths[].output_profile_sha256` | `null` |
| `production_paths[].rendering_intent` / `.black_point_compensation` | `null` |
| `production_paths[].calculation_status` | `NOT_CALCULATED` |
| `production_paths[].device_values`, `.predicted_lab`, `.delta_e00` | `null` |
| `production_paths[].measurement_status` | `NOT_MEASURED` |
| `production_paths[].production_approval` | `NOT_GRANTED` |

The builder rejects malformed records, already-calculated or claimed-measured input, duplicate paths, undeclared paths and attempts to inject device/output profile data into a preparation context. This is a *safety invariant*, not a security or mathematical attestation of ICC processing.

### Compatibility and precedent

- Consumes existing `open-dcm/reference-record.mjs` v0.1.0, requiring `output.status = not-calculated` and both evidence flags `false`.
- Maintains the existing `browser-bundle/src/print-handoff.js` and its `ATLAS_CLARUS_PARALLEL_PRINT_HANDOFF` envelope **unchanged**; the new Open DCM contract is a distinct preparation layer.
- The current master SHA-256 baseline is `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4` for 13,283 references. The builder checks SHA syntax and row range but cannot validate a supplied digest against an absent master.
- Only 8-bit RGB source tuples are accepted in this 0.1 contract; higher-bit-depth workflows require their own version.
- Example record: `examples/print-adapter-row-10519.example.json` reuses established source HLC `H285_L025_C065` and master RGB [0,55,157] from the existing public print-handoff example; it contains **no conversion output**.

## Reproducible tests

```bash
node --test open-dcm/print-adapter-contract.test.mjs
```

Checks: safe status, 4C/ECG path separation, input immutability, malformed SHA/row, rejection of prior ICC/measurement claims, invalid path context and JSON roundtrip.

**Release status:** Open DCM PR #127 remains a **draft**. No new public Research Beta feature, ICC engine integration, printer driver or IONOS deployment is claimed. Further work requires source-master verification, real ICC computation with an independent reference, recipient-specific RIP handoff validation, and actual proof measurement/acceptance when requested.
