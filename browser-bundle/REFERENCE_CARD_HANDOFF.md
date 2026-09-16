# ATLAS Clarus reference-card handoff v0.1

Status: **experimental integration candidate**

This handoff creates a printable reference card directly from one selected ATLAS Clarus master row. It does not create a new colour identity.

## Contract

The generator accepts only an entry that matches the frozen 13,283-row master exactly:

- `atlas_row_id`
- ATLAS HLC address
- master RGB and HEX
- master CIELAB
- master SHA-256 `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`

The card evidence records:

- `freeze_status = FROZEN`
- `identity_change = NONE`
- `output_status = PRINTED_NOT_MEASURED`
- `measured_qc_status = NOT_MEASURED`
- `icc_transform = NOT_APPLIED`
- `device_values = null`
- `production_approval = NOT_PROVIDED`

Any change to those identity or boundary fields causes verified re-import to fail.

## Browser workflow

1. Select an ATLAS reference in Hover or Wheel.
2. Choose **Create reference card**.
3. The browser downloads the JSON evidence record and opens an A4 print view.
4. Choose **Print / Save PDF** in that view.
5. A receiving print provider may print the resulting PDF, but remains responsible for its output profile, conversion, substrate, process control and any later measurement.

The generated browser PDF is not asserted to be PDF/X. The patch is the stored 8-bit sRGB representation; it is not a spectral or measured physical reference.

## Identity boundary

Printing, saving as PDF, colour-managing downstream or measuring a later sample may append reproduction evidence. None of those actions may overwrite the PKL identity, master row or master hash.
