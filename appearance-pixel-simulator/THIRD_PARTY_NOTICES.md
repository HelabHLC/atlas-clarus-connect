# Third-Party Data Notices

## CIE colourimetric data

ATLAS Clarus Appearance Pixel Simulator v0.2.0 Phase 1 uses selected values on
the 380–730 nm, 10 nm ATLAS master grid derived from the following data sets
published by the International Commission on Illumination (CIE):

- CIE 2022, *CIE standard illuminant D50*, DOI
  `10.25039/CIE.DS.etgmuqt5`
- CIE 2022, *CIE standard illuminant D65*, DOI
  `10.25039/CIE.DS.hjfjmt59`
- CIE 2018, *CIE standard illuminant A — 1 nm*, DOI
  `10.25039/CIE.DS.8jsxjrsn`
- CIE 2019, *Colour-matching functions of CIE 1931 standard colorimetric
  observer*, DOI `10.25039/CIE.DS.xvudnb9b`

The original CIE CSV files are not included. The plugin asset contains only the
36 values required from each function for deterministic operation on the native
ATLAS grid, together with source filenames, SHA-256 digests and DOI references.

CIE is the source authority for these colourimetric data. Inclusion of derived
calculation values does not imply endorsement, certification or conformance
approval by CIE.
