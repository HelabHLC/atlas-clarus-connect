# ATLAS Clarus Appearance Pixel Simulator v0.4.1 — Validation

Result: **PASS — scoped 0.4.1 source/Node validation, with inherited 0.4.0 evidence and stated runtime limitations**
Release: **v0.4.1 — ATLAS CLARUS TONE SYSTEM v0.1**
Checked: **2026-10-06 (UTC)**
Audited repository HEAD: `9d336a8d7e78e3ec35541e1546a476a8c35f7230`

## Evidence provenance and scope

This document separates checks executed for 0.4.1 from historical 0.4.0 results.
It is not a blanket runtime, deployment or physical acceptance of 0.4.1.

- Historical report: [VALIDATION.md at `a5c3d0a10bd4fcbbd0723bc2e02096a9fe7a4b3a`](https://github.com/HelabHLC/atlas-clarus-connect/blob/a5c3d0a10bd4fcbbd0723bc2e02096a9fe7a4b3a/appearance-pixel-simulator/VALIDATION.md).
  Its bytes remained unchanged through the audited HEAD; SHA-256:
  `a2324216c5338c89e4bc3b279d317eac27e782f92ae33d55ecc4787dc2333dfb`.
- Pre-0.4.1 source baseline: `2f8b76dc706509801fb65b22ebd72844d8eb97d9`.
  This commit already added shared name search without updating the historical
  report. Name-search behavior is therefore checked explicitly below rather
  than attributed to the older 0.4.0 report.
- 0.4.1 change: [commit `48e8e315202fda5ed0a6a851a618dbaa55a2b480`](https://github.com/HelabHLC/atlas-clarus-connect/commit/48e8e315202fda5ed0a6a851a618dbaa55a2b480).
  Within this plugin it changes only README/readme version descriptions, PHP
  version markers and name-index pin, the compressed index, and the selected
  name/HLC display. No later simulator changes exist at the audited HEAD.

The historical source-binding, projection, spectral calculation, APF and
renderer boundary results below are carried forward for their unchanged source
scope. Their numerical values are historical results, not calculations rerun
on 2026-10-06. Historical package/ZIP results apply only to the historical
package, not to a rebuilt or deployed 0.4.1 ZIP.

## Checks executed for 0.4.1

Reproduce from the repository root with Python 3 and Node.js (git history required):

```bash
python appearance-pixel-simulator/build/validate_v041.py
```

Executed locally with Python 3.12 and Node.js 24.19.0. The validator executes
extracted, unchanged production JavaScript function bodies with DOM test
objects; it does not boot WordPress or a full graphical browser.

| Check | Result and evidence |
|---|---|
| Compressed index SHA-256 and PHP pin | PASS — `562a133e965766dc199d753391c9ec2db7bf091793b5358e6604ab22bc96e9db` |
| Shared index copy | PASS — simulator and root shared index are byte-identical |
| Name provenance | PASS — Designer Layer and Tone System digests match index metadata; Designer Layer pin `c7736a98bbaf6ddd8c50942ef11ab45200b43736f9e1ebf7480988b03a8293d2` |
| Full 13,283-row binding | PASS — IDs 0–13,282 and unique HLC references match both the pre-0.4.1 index and pinned independent Designer Layer; display names match Tone System records |
| Actual JavaScript index gates | PASS — valid index accepted; wrong schema, master hash, declared count, shortened records, duplicate ID and wrong HLC rejected |
| Tone/name display | PASS — actual `updateOutputs()` displays `name · HLC` for all 13,283 records, preserving the row-ID identity text; missing selected name falls back to HLC |
| Name search | PASS — actual `populateResults()` finds `ATLAS Deep Forest Green`, `ATLAS Neutral 50`, HLC `H125_L075_C080` and row ID `4665`; option names retain the bound HLC |
| Default selected display | PASS — `ATLAS Bright Sprout Green · H125_L075_C080`, source row ID 4665 |
| Version markers | PASS — README, stable tag, PHP header and version constant agree on 0.4.1 |
| Identity/calculation boundary | PASS — after reversing only the two-line display change, complete simulator JS equals the pre-0.4.1 source; PHP equals it after reversing version/hash changes |
| Unchanged tracked assets | PASS — master manifest, CIE engine, CSS, Three.js, projection generators/validators, APF schema/examples and renderer documentation equal the pre-0.4.1 source |
| Projection authority | PASS — manifest digest remains `561adb75debc920a5071e017e9de98abdbd517fb522d2bd4fa60aef2b85dc9ec`; master pin remains `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4` |
| JavaScript syntax | PASS — `node --check` |

The display/search tests use identity rows reconstructed from the pre-0.4.1
name index, cross-checked against the independently pinned Designer Layer. HEX
and numerical dependencies are test fixtures in the Node harness, not new PKL
measurements. Generated master index/numeric/illuminant/spectral binaries and
the original PKL are not present in this checkout. Their exhaustive comparison
was not rerun: the unchanged manifest pins and historical projection evidence
below are the basis for carrying those results forward.

The source-equality check covers HLC/row-ID selection, RGB/HEX/Lab access,
spectral integration, material/appearance computation, exports, APF status
mapping and the external-renderer connector. Names remain a display/search
layer; no name-derived identity or appearance calculation is introduced.

## Acceptance limits for 0.4.1

No PHP runtime was available, so no new PHP lint or execution is claimed.
No live WordPress/IONOS activation, graphical desktop/mobile inspection,
external MaterialX service execution, package rebuild/ZIP test, fresh PKL
projection comparison, physical sample or measured QC test was performed.
The inherited formal JSON Schema acceptance gate remains open. These limits
are not converted to PASS by the name-layer checks. Appearance stays simulated
or calculated under the existing contract; physical QC stays `NOT_MEASURED`.

## Historical 0.4.0 evidence — retained with original limitations

The following is the original report, with headings nested for clarity.
All PASS/IMPLEMENTED/NOT EXECUTED labels in this section are inherited historical
statements; they are not newly executed 0.4.1 tests.

### Original report: v0.4.0 — Validation

Result: **PASS with stated runtime limitation**  
Release: **v0.4.0 — MATERIALX RENDER SERVICE CONNECTOR**

### Interactive object library

| Check | Result |
|---|---:|
| Three.js delivery | LOCAL BUNDLE — no CDN |
| Built-in templates | 6 |
| Geometry status | BUILT_IN |
| Material status | SIMULATED |
| Preview/render status | SIMULATED |
| Physical QC | NOT_MEASURED |
| PNG preview export | IMPLEMENTED |

### Renderer connector checks

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

### APF Material Bridge checks

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

### Source binding

| Check | Result |
|---|---:|
| Active-master SHA-256 | `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4` |
| Projection-manifest SHA-256 | `561adb75debc920a5071e017e9de98abdbd517fb522d2bd4fa60aef2b85dc9ec` |
| Source shape | 13,283 rows × 114 columns — PASS |
| Row-ID basis | 0 through 13,282 — PASS |
| Default binding | row 4665 / `H125_L075_C080` / `#76CD27` / RGB 118,205,39 — PASS |

### Exhaustive projection comparison

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

### Code and package checks

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

### Runtime integrity behavior

Before enabling simulation and export, the browser verifies with Web Crypto:

1. the projection-manifest SHA-256 embedded by the plugin;
2. the source-master SHA-256 declared by the manifest;
3. the SHA-256 and byte size of the index, numeric, illuminant and spectral assets;
4. the CIE spectral-engine asset SHA-256 and 36-point wavelength grid;
5. the expected shapes and row-ID range.

Any mismatch blocks the simulator and export controls.

### Claim boundary

The reference identity, RGB, HEX, Lab, spectrum and illumext diagnostics originate
from the verified active-master projection. Material, gloss, texture, relief,
embellishment, viewing angle and rendered per-pixel appearance remain engineering
simulations. QC remains `NOT_MEASURED`; no measured BRDF/BSDF claim, physical proof
or certification is produced.

### Spectral phase-1 calculation

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

### Environment limitation

No PHP runtime or live WordPress/IONOS instance was available in the build
environment. Consequently, PHP linting and an end-to-end WordPress activation/UI
test were not executed here. Static checks and ZIP validation passed; installation
on a staging WordPress instance remains the recommended final acceptance test.

A dedicated external JSON Schema Draft 2020-12 validator was not installed in
the build environment. Schema structure, JSON syntax, required example fields
and all example cross-references were checked independently; formal CI schema
validation remains a follow-up acceptance gate.
