# ATLAS Clarus Appearance Pixel Simulator v0.1.2 — Validation

Result: **PASS with stated runtime limitation**  
Release: **v0.1.2 — APF ENVELOPE**

## Source binding

| Check | Result |
|---|---:|
| Active-master SHA-256 | `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4` |
| Projection-manifest SHA-256 | `561adb75debc920a5071e017e9de98abdbd517fb522d2bd4fa60aef2b85dc9ec` |
| Source shape | 13,283 rows × 114 columns — PASS |
| Row-ID basis | 0 through 13,282 — PASS |
| Default binding | row 4665 / `H125_L075_C080` / `#76CD27` / RGB 118,205,39 — PASS |

## Exhaustive projection comparison

The independent validator reloaded the active PKL master and compared the complete
browser projection against it, not merely a sample.

| Projection | Values compared | Result |
|---|---:|---:|
| Identity index | 13,283 rows | PASS |
| Numeric master fields | 438,339 float64 values | PASS |
| Illuminant/illumext fields | 345,358 float64 values | PASS |
| Spectral reflectance | 478,188 float32 values | PASS |

All four projected asset sizes and SHA-256 digests match the signed values in the
projection manifest. Spectral values span 0.0 to 0.9718000293 on the 380–730 nm,
10 nm grid.

## Code and package checks

- JavaScript syntax (`node --check`): PASS
- APF schema and example JSON parsing: PASS
- APF required-field and cross-reference checks: PASS
- APF export source contains SHA-256 binding for pixel JSON and PNG: PASS
- Five-stage APF workflow status mapping: PASS
- PHP delimiter balance: PASS
- WordPress registration, enqueueing, settings sanitation and output escaping
  constructs: present
- ZIP integrity (`unzip -t`): PASS
- Install structure: one top-level
  `atlas-clarus-appearance-pixel-simulator/` directory — PASS

## Runtime integrity behavior

Before enabling simulation and export, the browser verifies with Web Crypto:

1. the projection-manifest SHA-256 embedded by the plugin;
2. the source-master SHA-256 declared by the manifest;
3. the SHA-256 and byte size of the index, numeric, illuminant and spectral assets;
4. the expected shapes and row-ID range.

Any mismatch blocks the simulator and export controls.

## Claim boundary

The reference identity, RGB, HEX, Lab, spectrum and illumext diagnostics originate
from the verified active-master projection. Material, gloss, texture, relief,
embellishment, viewing angle and rendered per-pixel appearance remain engineering
simulations. QC remains `NOT_MEASURED`; no measured BRDF/BSDF claim, physical proof
or certification is produced.

## Environment limitation

No PHP runtime or live WordPress/IONOS instance was available in the build
environment. Consequently, PHP linting and an end-to-end WordPress activation/UI
test were not executed here. Static checks and ZIP validation passed; installation
on a staging WordPress instance remains the recommended final acceptance test.

A dedicated external JSON Schema Draft 2020-12 validator was not installed in
the build environment. Schema structure, JSON syntax, required example fields
and all example cross-references were checked independently; formal CI schema
validation remains a follow-up acceptance gate.
