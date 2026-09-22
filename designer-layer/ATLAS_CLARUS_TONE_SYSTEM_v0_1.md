# ATLAS Clarus Tone System v0.1

**Status:** Release candidate for review  
**Date:** 2026-09-21

The visible name combines one of 12 tone terms with one of 72 fixed chromatic families:

| Lightness | C5–10 | C15–30 | C35–55 | C60–110 |
|---|---|---|---|---|
| L75–95 | Mist | Pale | Light | Bright |
| L50–70 | Smoky | Soft | Clear | Vivid |
| L5–45 | Shadow | Muted | Deep | Intense |

The display pattern is `ATLAS {tone} {family}`. Example:

- `ATLAS Deep Forest Green`
- exact technical identity: `H150_L035_C035`

The 19 C0 references use the separate pattern `ATLAS Neutral {L}`. They do not receive a chromatic family name.

## Verified scope

- 13,283 total references
- 13,264 chromatic references
- 19 neutral references
- 72 chromatic families at H005 through H360
- 798 tone–family phrases present in the exported reference grid

## Identity boundary

This is a descriptive display and search layer. It does not modify PKL identity, HLC reference, `atlas_row_id`, RGB, HEX, Lab, spectra, 4C/ECG paths or A′ v0.4. Existing ISCC–NBS assignments remain available as metadata and are not used as the primary visible name.
