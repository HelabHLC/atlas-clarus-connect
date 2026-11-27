# ATLAS Clarus experimental cloth preview 0.1

An offline browser module for inspecting a motif on a moving cloth patch.
This is a development prototype, separate from the published Browser Edition.
It does not continue the abandoned Seamly2D application fork.

## Features

- One self-contained HTML; no runtime requests, CDN, tracking or server needed.
- Position-based cloth dynamics: fixed-step XPBD distance constraints, gravity,
  assumed wind pressure, configurable supports and a simple floor.
- Two-hop distance constraints provide an uncalibrated visual bending proxy.
- Three reference groups: selected silk specimens, cotton specimens and one denim
  specimen from the MIT Fabric Properties Dataset.
- Size, soft/reference/stiff variants, assumed stretch/shear compliance, wind,
  original/reference texture selection, lighting, pause and reset.
- WebGL renderer with Canvas-projection fallback for hardware without WebGL.
  Fallback uses a coarser mesh and smaller display texture; drape is mesh-dependent.
- Projects embed byte-preserved original/reference images, SHA-256 checksums,
  model settings, source metadata and the existing reference evidence.
- New image uploads remove the previous reference assignment and sidecars.
- Import validates checksums and parameter ranges before replacing a project.

## Material values and evidence

Source: Bouman, Xiao, Battaglia, Freeman, *Estimating the Material Properties
of Fabric from Video*, ICCV 2013.
https://people.csail.mit.edu/klbouman/pw/projects/materialproperties/dataset.html

The workbook supplies selected specimen observations, not population averages.
Arithmetic mean by specimen first, then equal-weight mean across specimens:

| Reference group | IDs | Measurements | Areal mass | Strip bending EI |
| --- | --- | --- | --- | --- |
| Silk | 3, 4 | 4 | 78.2287525853 g/m² | 0.00925 lbf·in² |
| Cotton | 5, 10 | 4 | 119.4056666209 g/m² | 0.01625 lbf·in² |
| Denim | 13 | 1 | 296.6752904052 g/m² | 0.025 lbf·in² |

`data/materials.json` retains the selected factual observations, source URL,
source archive/workbook hashes and derivation method. `scripts/derive_materials.py`
reproduces this from the research download without editing its workbook.

The web summary image differs from the workbook for specimen 4's weight;
we use the workbook. Silk does not establish satin construction. Observed ranges
are not confidence intervals. Mean values lose directional information.

No tensile curves are supplied in this source. Warp, weft and shear compliances
are freely chosen model assumptions (m/N); damping and wind are also assumptions.
Strip bending EI is not sheet bending rigidity. Strip width/test geometry are
not established; no direct material conversion is asserted. An inverse index
relative to the selected silk specimens determines a visual bending-compliance
proxy. All variants are uncalibrated. There is no accuracy percentage.

## Colour provenance

The user's reference package 0.2 supplies original/reference PNGs and mapping
sidecars. The build verifies package SHA-256 checksums. The integrity test checks
all 254,913 source-RGB assignments against the supplied 13,283-row projection,
all visible mapped pixels, alpha, and unchanged embedded image bytes.

The original PKL is **not** rehashed and identity is **not** reassigned here.
Existing master hashes remain declarations from the source evidence. No Lab/ΔE
or automatic palette choice is introduced. Lighting and texture interpolation
change displayed pixels; the rendered view is not an exact RGB proof. Project
checksums establish byte integrity, not authenticity of externally edited evidence.

`ATLAS-Mapping.csv` and `reference-projection.json` remain companion files in the
pilot ZIP; they are not duplicated in each saved browser project. A browser
project retains their checksums and evidence, not the complete mapping table.

## Build and checks

Input reference images are deliberately not newly published in this repository.
See `assets/README.md`. With the user's source package extracted:

```
python3 cloth-preview/scripts/build.py --reference-package /path/to/reference-package
node cloth-preview/tests/solver.test.cjs
node cloth-preview/tests/sha256.test.cjs
npm ci --prefix browser-bundle/tests --ignore-scripts
node cloth-preview/tests/project.test.cjs
python3 cloth-preview/tests/integrity.py
```

`integrity.py` needs NumPy and Pillow. Numerical and mock-DOM project tests run
without motif assets; the separate integrity test needs the user's actual package.

Open `cloth-preview/dist/index.html` in a current browser, including by double
clicking it from disk. SHA-256 has a tested fallback for local HTTP contexts.
Do not treat project save/load tests as real-browser file-picker acceptance.

## Verification boundary

- PASS: numerical mass sums, fixed anchors, finite motion, structural stretch
  bound, deterministic stepping, wind/gravity response, control sensitivity and
  representative extreme settings.
- PASS: project export/import and tamper rejection via mock DOM; new images clear
  reference data; lighting leaves original hashes unchanged.
- PASS: original source hashes, mapping rows, projection joins, mapped image
  pixels and alpha, embedded source/reference bytes, derived specimen means.
- PASS: Canvas fallback opened in Chrome; visual review, material/bending
  selection, texture selection, lighting and pause controls.
- NOT TESTED: WebGL rendering (unavailable in the QA browser), smartphone devices,
  browser file-picker/download roundtrip, physics against a real fabric or CLO.
- NOT IMPLEMENTED: self-collision, garment sewing, avatars, calibrated anisotropic
  bending/strain curves, permanent Browser Edition menu integration.

The initial cloth is a rectangular patch with an assumed full-surface motif,
not a sewing pattern, fabric-print approval or verified colour appearance.
The simulation is not a substitute for a fabric sample or garment fit test.

## Integration path

Keep this module separate until real-device and file roundtrip checks pass.
A later Browser Edition entry can pass an image and existing reference evidence;
missing reference assignments must stay missing. Do not publish this candidate
as RC34.5 or silently alter the current public bundle.
