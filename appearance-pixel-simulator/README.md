# ATLAS Clarus Appearance Pixel Simulator

**v0.2.2 — APF–AxF BRIDGE + RENDERER CONNECTOR**

A WordPress plugin for exploring pixel-addressable appearance variants while
keeping the ATLAS Clarus colour reference identity frozen and separately
verifiable. APF provides the identity, status and evidence envelope above the
simulation and its exported assets.

Version 0.2.1 adds an APF–AxF Bridge workspace that hashes a local AxF asset,
binds it to the active ATLAS identity, imports and semantically validates bridge
JSON, displays evidence statuses and exports the record. It does not decode or
render AxF.

Version 0.2.2 adds a manufacturer-neutral JSON renderer contract, a deterministic
mock mode and an optional external server-side adapter. Mock output is always
labelled `MOCK_SIMULATION`; it tests transport and evidence binding but does not
decode AxF. External mode requires an authenticated WordPress user with upload
permission and keeps its bearer token server-side.

The base colour stimulus under CIE D50, D65 and A is now calculated spectrally
from the 36-value master reflectance and CIE 1931 2 degree colour-matching
functions. The former RGB light multipliers are no longer used for these modes.

## What is master-bound

- 13,283 identities from the active ATLAS Clarus Master v2 illumext
- source master: 13,283 rows × 114 columns
- 36 spectral reflectance values per identity (380–730 nm, 10 nm steps)
- 26 illuminant/illumext diagnostics per identity
- zero-based `source_atlas_row_id` from 0 through 13,282
- source-master and projection-asset SHA-256 verification

Active-master SHA-256:

`8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`

Default reference:

`source_atlas_row_id 4665` · `H125_L075_C080` · `#76CD27` · RGB `118 / 205 / 39`

## Evidence boundary

Reference identity, RGB, HEX, Lab, spectrum and illumext diagnostics originate
from the verified master projection. Material, gloss, texture, relief,
embellishment, viewing angle and rendered per-pixel appearance are deterministic
engineering simulations. QC remains `NOT_MEASURED`.

This project does not claim measured BRDF/BSDF data, a physical proof, measured
quality control or certification.

## Repository layout

- `atlas-clarus-appearance-pixel-simulator.php` — WordPress plugin and shortcode
- `assets/js/simulator.js` — browser simulator and runtime integrity checks
- `assets/css/simulator.css` — responsive interface
- `assets/master/master-manifest.json` — projection contract and digests
- `build/generate_master_projection.py` — deterministic projection generator
- `build/validate_master_projection.py` — exhaustive source/projection validator
- `build/generate_cie_spectral_engine.py` — native-grid CIE data builder
- `build/validate_spectral_engine.py` — source and calculation validator
- `assets/spectral/cie-spectral-engine-v0.2.0.json` — verified 36-point calculation data
- `VALIDATION.md` — verification record and limitations
- `schemas/apf-envelope-v0.1.schema.json` — APF Evidence Envelope schema
- `docs/APF_ARCHITECTURE_v0.1.md` — normative review draft
- `examples/apf-envelope-master-bound-example.json` — cross-format example

Generated projection payloads are not committed to GitHub. Build them from the
verified active master:

```bash
python3 build/generate_master_projection.py \
  /path/to/atlas_master__active_master__v2_illumext.pkl \
  assets/master
```

Then validate every projected value:

```bash
python3 build/validate_master_projection.py \
  /path/to/atlas_master__active_master__v2_illumext.pkl \
  assets/master
```

## WordPress installation

Use the prepared release ZIP in WordPress under **Plugins → Add New → Upload
Plugin**. After activation, place `[atlas_clarus_appearance_simulator]` on a page
or post.

The APF export downloads `atlas-clarus.apf.json`, its SHA-256-bound pixel JSON
and the corresponding PNG preview.

## Spectral calculation boundary

The calculation uses the common 380–730 nm range available in the ATLAS master
with 10 nm spacing. It is therefore a documented native-master-grid calculation,
not a full 360–830 nm integration. CIE source CSVs are not redistributed; only
the required 36 values per function are included with source names, DOIs and
SHA-256 digests. ALS LED/STR modes remain unavailable without authoritative SPDs.

## Current runtime limitation

The source and package passed exhaustive master-projection comparison,
JavaScript syntax checking and ZIP integrity testing. PHP linting and a live
WordPress/IONOS acceptance test were not available in the build environment.

## License

Plugin code: GPL-2.0-or-later. The active ATLAS Clarus master is a separately
controlled data source and is not included in this source tree.
