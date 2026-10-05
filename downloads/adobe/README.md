# ATLAS Clarus for Adobe — ASE download v1.0

Use ATLAS Clarus HLC reference names and RGB swatches in Illustrator, Photoshop and InDesign through Adobe Swatch Exchange (ASE).

## Download

- [Download the ZIP with full library, smaller hue libraries and instructions](https://github.com/HelabHLC/atlas-clarus-connect/raw/refs/heads/main/downloads/adobe/ATLAS_Clarus_Adobe_ASE_v1.0.zip)
- [Download the full 13,283-colour ASE directly](https://github.com/HelabHLC/atlas-clarus-connect/raw/refs/heads/main/downloads/adobe/ATLAS_Clarus_13283_RGB_v1.0.ase)
- [Checksums](SHA256SUMS.txt)

Start with one of the smaller `by-hue/` libraries rather than loading the entire atlas into every document. To export a small project palette, use the existing [Browser Bundle](https://arbe-lambda-star.com/atlas-clarus-browser-bundle/) and its ASE export.

## Import

Unzip the download, then open the Swatches panel in your Adobe application.

- **Illustrator:** Swatches panel menu → Open Swatch Library → Other Library; select an ASE file.
- **Photoshop:** Swatches panel menu → Import Swatches (or Load Swatches in older versions); select an ASE file.
- **InDesign:** Swatches panel menu → Load Swatches; select an ASE file.

Menu labels depend on application version and interface language. Adobe documents ASE exchange between these applications:

- https://helpx.adobe.com/illustrator/desktop/manage-colors/use-swatches/create-and-open-swatch-libraries.html
- https://helpx.adobe.com/uk/illustrator/desktop/manage-colors/use-swatches/share-swatches-between-applications.html

## What the download contains

- The full library: **13,283 named RGB swatches**.
- Separate libraries organised by HLC hue prefix.
- `REFERENCE_INDEX.json`: HLC names, row IDs, RGB, HEX and master hash.
- Manifest, checksums, instructions and licence notices.

Source: the published `hover-library/data/colors.json` projection of `atlas_master__active_master__v2_illumext.pkl`. No RGB conversion or new colour binding is performed. The exact 8-bit channels are encoded as normalised ASE RGB floats and verified after reading the export back.

Master SHA-256: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.

These are RGB library swatches, not printing-ink formulas or production spot-colour separations. ASE carries names and colour channels; it does not carry the spectral reference or the complete ATLAS identity metadata. Keep the sidecar for traceability. Adobe document profiles and colour management affect display and output.

**Validation:** binary structure and RGB/name round-trip verified; actual import in Adobe applications has not yet been tested. No physical measurement or production approval is claimed. This is a palette library, not an Adobe extension.

## Attribution and licences

HLC reference data: Copyright (c) freieFarbe e.V., zlib licence. Converted and indexed for ATLAS Clarus, then reorganised into ASE libraries; these are modified data products, not unchanged original freieFarbe distributions.

Original documentation: ATLAS Clarus contributors, CC BY 4.0. Build script: GPL-2.0-or-later. See the repository's `LICENSING.md` and bundled notices. Adobe application names are used solely to identify compatible file workflows; no Adobe affiliation is claimed.

Rebuild from the repository root: `python downloads/adobe/build_ase.py`.
