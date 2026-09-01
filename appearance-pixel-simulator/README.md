# ATLAS Clarus Appearance Pixel Simulator

**v0.1.1 — MASTER BOUND**

A WordPress plugin for exploring pixel-addressable appearance variants while
keeping the ATLAS Clarus colour reference identity frozen and separately
verifiable.

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
- `VALIDATION.md` — verification record and limitations

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

Release ZIP SHA-256:

`b7cf036252f63925a65f1ef2d2c9a2bfba7789f69f04b5464c045b13d1c18dc1`

## Current runtime limitation

The source and package passed exhaustive master-projection comparison,
JavaScript syntax checking and ZIP integrity testing. PHP linting and a live
WordPress/IONOS acceptance test were not available in the build environment.

## License

Plugin code: GPL-2.0-or-later. The active ATLAS Clarus master is a separately
controlled data source and is not included in this source tree.
