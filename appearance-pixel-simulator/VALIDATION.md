# ATLAS Clarus Appearance Pixel Simulator v0.4.0 — Validation

Result: **PASS with stated runtime limitation**  
Release: **v0.4.0 — MATERIALX RENDER SERVICE CONNECTOR**

## Interactive object library

| Check | Result |
|---|---:|
| Three.js delivery | LOCAL BUNDLE — no CDN |
| Built-in templates | 6 |
| Geometry status | BUILT_IN |
| Material status | SIMULATED |
| Preview/render status | SIMULATED |
| Physical QC | NOT_MEASURED |
| PNG preview export | IMPLEMENTED |

## Renderer connector checks

| Check | Result |
|---|---:|
| Manufacturer-neutral request/response contract | IMPLEMENTED |
| Mock evidence class | `MOCK_SIMULATION` |
| Mock base colour | Bound verified-master display proxy |
| Mock disclosure | `GENERIC MOCK PREVIEW` visible in output |
| Mock gloss | ILLUSTRATIVE |
| Mock material decoding | NOT EXECUTED |
| External bearer token exposure to browser | BLOCKED — server-side only |
| External material byte/digest comparison | IMPLEMENTED |
| External maximum input/output size | 10 MiB |
| Accepted result status | CALCULATED / SIMULATED only |
| Result SHA-256 calculated by connector | IMPLEMENTED |
| Physical QC promotion | BLOCKED |

## APF Material Bridge checks

| Check | Result |
|---|---:|
| JavaScript syntax (`node --check`) | PASS |
| Local material SHA-256 calculation | IMPLEMENTED — browser runtime required |
| Material upload during binding | NOT PERFORMED |
| Generated selector resolution | SOURCE_DECLARED |
| Generated identity binding | REFERENCE_BOUND |
| Generated material origin | UNKNOWN |
| Generated render status | NOT EXECUTED |
| Generated physical QC | NOT_MEASURED |
| Imported bridge semantic checks | IMPLEMENTED |
| Material decoder / selector resolution | NOT EXECUTED |
| PHP syntax runtime | NOT EXECUTED — PHP unavailable in build environment |

Imported records are checked for required layers, SHA-256 form, reference
integrity, active ATLAS identity binding and forbidden evidence promotions.
A material-decoder round-trip is outside this release. AxF is retained only as
an optional external-adapter declaration.

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
- CIE source archive integrity: PASS
- D50/D65/A and CIE 1931 2° source-file SHA-256 checks: PASS
- 216 native-grid CIE values compared to supplied 1 nm sources: PASS
- CIE engine runtime SHA-256 binding: PASS
- RGB illuminant multipliers removed for D50/D65/A: PASS
- ALS LED/STR controls disabled pending authoritative SPDs: PASS
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
4. the CIE spectral-engine asset SHA-256 and 36-point wavelength grid;
5. the expected shapes and row-ID range.

Any mismatch blocks the simulator and export controls.

## Claim boundary

The reference identity, RGB, HEX, Lab, spectrum and illumext diagnostics originate
from the verified active-master projection. Material, gloss, texture, relief,
embellishment, viewing angle and rendered per-pixel appearance remain engineering
simulations. QC remains `NOT_MEASURED`; no measured BRDF/BSDF claim, physical proof
or certification is produced.

## Spectral phase-1 calculation

The calculation uses 36 wavelengths from 380 through 730 nm at 10 nm spacing:

`master reflectance × illuminant SPD × CIE 1931 2° CMF → XYZ`

Each illuminant is normalized to `Y=100` for a perfect diffuser over the same
range. XYZ is Bradford-adapted from the calculated illuminant white to the
calculated D65 white, then encoded as display sRGB. The display result is a
calculated screen representation, not a measured appearance.

Default row 4665 (`H125_L075_C080`) produced:

| Illuminant | Calculated XYZ | Adapted display sRGB u8 |
|---|---|---|
| D50 | 32.043309 / 48.283041 / 7.860941 | 119 / 206 / 42 |
| D65 | 30.861643 / 48.684648 / 9.637359 | 125 / 206 / 38 |
| A | 36.327018 / 45.825433 / 4.146702 | 94 / 205 / 45 |

The ATLAS master ends at 730 nm. These results must therefore be described as
native-master-grid 380–730 nm calculations, not full 360–830 nm integrations.

## Environment limitation

No PHP runtime or live WordPress/IONOS instance was available in the build
environment. Consequently, PHP linting and an end-to-end WordPress activation/UI
test were not executed here. Static checks and ZIP validation passed; installation
on a staging WordPress instance remains the recommended final acceptance test.

A dedicated external JSON Schema Draft 2020-12 validator was not installed in
the build environment. Schema structure, JSON syntax, required example fields
and all example cross-references were checked independently; formal CI schema
validation remains a follow-up acceptance gate.
