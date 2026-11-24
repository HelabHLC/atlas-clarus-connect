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

## Experimental 4C calculation bridge — 24 November 2026

The **existing browser-bundle LittleCMS worker** already supports the `reference-separation` operation. The private Draft PR now connects this operation to the print preparation record through `open-dcm/print-adapter-icc-4c.mjs`:

- Requires a valid preparation-only record, a declared sRGB8/HLC identity and an uncalculated 4C path.
- Rejects pre-existing calculated/approved values on **either** 4C or ECG to protect the parallel-source invariant.
- Computes SHA-256 of actual user-loaded ICC bytes and requires the full hash and byte count to match the named catalogued CMYK output profile.
- Requires an explicitly declared printing condition, substrate, rendering intent and BPC. The printing condition must agree with catalog metadata.
- Invokes the real `reference-separation` operation through a newly created Worker and records the `SRGB_TO_DEVICE16` CMYK result with four unsigned 16-bit values, original ICC digest and engine.
- Keeps all derived Lab and ΔE00 entries **null**, ECG **NOT_CALCULATED**, measured proof **NOT_MEASURED** and production approval **NOT_GRANTED**. The HLC-to-row agreement remains `DECLARED_REQUIRES_MASTER_LOOKUP`.
- Optionally compares the forward separation to a second LittleCMS binding (Pillow/ImageCms, 8-bit). Mismatches fail closed. Such an agreement checks implementation interoperability, **not** independence of the colour algorithm and not a physical proof.
- Does not transmit device instructions, alter the Browser Edition, perform an ICC round trip for this calculation or generate a printable PDF/X file.

### Live regression evidence (GitHub Actions)

The actual lcms-wasm worker was exercised in headless Chromium using the **operating-system Ghostscript default CMYK test ICC** (187,484 bytes, SHA-256 `8472fa1493a024b800b67dee9424835ec0c41ab79490200ae8ec4a689fd1b9a9`). The profile was provided by the test runner and is **not committed, packaged or qualified for a production press**.

Three actual source RGB8 values produced:

| Source sRGB8 | LittleCMS WASM device16 (C,M,Y,K) | Pillow/ImageCms CMYK8 | 8-bit per-channel difference |
| --- | --- | --- | --- |
| 232,104,42 | 2586,49870,65535,222 | 10,194,255,1 | 0,0,0,0 |
| 0,55,157 | 65535,58616,7146,3978 | 255,228,28,15 | 0,0,0,0 |
| 128,128,128 | 34423,29618,29626,6301 | 134,115,115,25 | 0,0,0,0 |

8-bit comparison uses `round(device16 / 257)`. Pillow and the WebAssembly worker are different bindings/versions of LittleCMS; the agreement does not establish an algorithm-independent colour science reference.

**Reproduce:** `node --test open-dcm/reference-record.test.mjs open-dcm/print-adapter-contract.test.mjs open-dcm/print-adapter-icc-4c.test.mjs`; install Playwright, Pillow, Chromium and a local Ghostscript test CMYK ICC, then run `python open-dcm/tests/real_icc_4c.py`.

**Remaining release gates:** verify HLC row/source RGB against actual master; test with a locally supplied production-relevant ICC profile and independent reference; carry profile and substrate context into an actual RIP/printer-specific protocol; confirm channel order and constraints; measure physical proofs; obtain release approval. A Draft PR is not a deployed production feature.


## Original ECI PSO Coated v3 and independent CMM evidence (24 November 2026)

**PASS:** [GitHub Actions real PSO/Argyll run #45391807078](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/45391807078).

**Original data provenance:** PSOcoated_v3.icc obtained transiently from the original [ECI ZIP](https://eci.org/lib/exe/pso-coated_v3.zip); output profile has exact size **2,195,228 bytes** and SHA-256 **c30ad2c01e8f93135ec7682c535e0a81bc2d177c301e196376c5f5838b5c8e86**. Both checks are mandatory. The original profile is never packaged, redistributed or committed. Profile condition: **FOGRA51; ISO 12647-2:2013 printing substrate 1, premium-coated paper, sheet-fed/heatset web offset**. Rendering intent **Relative colorimetric**, BPC **false**.

**Master identity:** The browser loads the existing 13,283-row projection from hover-library/data/colors.json, with declared source master SHA-256 **8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4**. The new module print-adapter-master-identity.mjs checks exact row ID, HLC address and original RGB8, and rejects mismatches. This is a projection consistency check and does not re-hash the underlying private PKL.

| ATLAS row | HLC address | Master RGB8 | Actual LittleCMS device CMYK16 (C/M/Y/K) | CMYK8 after rounding |
| --- | --- | --- | --- | --- |
| 1737 | H050_L060_C080 | 236/101/33 | 113/46557/65486/61 | 0/181/255/0 |
| 10519 | H285_L025_C065 | 0/55/157 | 65535/54055/0/9 | 255/210/0/0 |
| 9536 | H255_L045_C040 | 15/114/172 | 57301/29289/2629/5291 | 223/114/10/21 |

**Comparator 1:** Pillow/ImageCms uses system LittleCMS (a separate software binding, not an independent CMM). Every one of the twelve 8-bit channel comparisons matched exactly.

**Comparator 2:** ArgyllCMS xicclu evaluates the destination ICC B2A1 table as a **separate colour-management implementation**. Its source PCS Lab(D50) comes from an independently coded, D50-adapted sRGB matrix. The **frozen** acceptance tolerance in argyll_independent_reference.py is at most **3/255 integer units per CMYK channel**. All twelve tested channel comparisons had deviation **0 after rounding**, so the independent-CMM gate **passed**. Raw unrounded Argyll channel outputs and independent Lab inputs are preserved in the GitHub job log.

**Reproduce:** Run open-dcm/tests/official_pso_coated_v3.py with Python, Pillow, Playwright/Chromium and ArgyllCMS xicclu. It downloads the official profile, strictly verifies SHA-256 and size, executes the real 4C worker and two comparisons, and deletes the transient ICC afterward. The CI workflow provisions dependencies.

**Limits:** These are three real source references, one original profile, and one intent/BPC setting. No physically measured print, printer/RIP connection, PDF/X qualification, ECG/7CLR calculation, material simulation, tolerance decision or customer production approval is claimed.

**Release boundary:** PR #127 stays DRAFT; main, IONOS, public Browser Edition, HLC master and Research Beta 0.6 stay unchanged.
