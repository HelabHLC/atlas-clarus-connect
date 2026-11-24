# CSV and original-file imports

All import operations are local to the browser. Use a decimal point and comma- or semicolon-separated CSV.

## Spectra (36 rows exactly)

```csv
wavelength_nm,reference,variant_1
380,0.20,0.21
390,0.21,0.22
```

Continue to 730 nm in 10-nm steps. The `reference` column must be second. Candidate columns are optional for Spectral Lab, required for multiple-variant Colour Advisory comparisons. Reflectance values must be in 0..1.

## Observer (four columns)

`wavelength_nm,xbar,ybar,zbar`. Headerless original CIE 1931, 2° CSV with 1-nm sampling is also accepted; the app selects exactly 380,390,...730 nm. Negative or non-finite values are rejected.

## Illuminants

Headered combined CSV: `wavelength_nm,D50,D55,D65,D75,A,LED-B2,LED-B3` (subset permitted). For single original two-column CIE SPDs, select the intended name before import. One file at a time; previously imported other lights remain available. The original `CIE_illum_LEDs.csv` with nine channels is recognized by filename and imports LED-B2 and LED-B3 together.

Lab/ΔE00 requires both an observer and compatible illuminant SPDs; Spectral Lab additionally requires D50. No standard data is synthesized or bundled.

## HLC / Fogra local reference extraction

On **Sources & import**, manually select the source file extracted from its original ZIP. Enter an exact reference, then click **Import selected reference**:

- HLC v1.2 CxF: `Hxxx_Lxxx_Cxxx`, for example `H290_L025_C045`.
- HLC v1.2 spectral CGATS text: the same address.
- Fogra `FOGRA51_Spectral.txt`: exact numeric `SAMPLE_ID`.

The beta extracts 36 spectral values; the sample can be exported as a simple 36-row reference CSV. ZIP files are not directly accepted, and there is no bulk import. Spectral factors over 1 (e.g., some fluorescence-related Fogra readings) are rejected, not clipped. CSV upload limit: 3 MB; original-file extractor limit: 20 MB.
