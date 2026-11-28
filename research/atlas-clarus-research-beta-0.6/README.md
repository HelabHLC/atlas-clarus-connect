# ATLAS Clarus Research Beta 0.6.0-beta.2 – Bring Your Own Spectra

**Public test application: Colour Advisory + Spectral Lab · DE/EN · Offline**

[Download the standalone `index.html`](https://github.com/HelabHLC/atlas-clarus-connect/raw/refs/heads/main/research/atlas-clarus-research-beta-0.6/index.html), save it, and open it locally in Edge, Chrome or Firefox. No installation or server is required.

## Data sources & local import

The **Sources & import** tab inside the application provides direct links to official CIE CSV files and the freieFarbe and Fogra publisher download pages. These are ordinary external user-clicked links, **not automatic network requests**. Reference datasets are not included in this beta. Source file contents are loaded locally from your computer and are not sent to a service.

- **Observer:** CIE 1931 2° official four-column CSV imports directly (1 nm original; app selects 380–730 nm in 10 nm steps).
- **Illuminants:** download official CIE D50, D55, D65, D75 or A and choose the correct name under the single-SPD uploader. Official CIE `CIE_illum_LEDs.csv` is detected and LED-B2/B3 are selected from the published channel columns.
- **Reflectance:** user-owned 36-row CSV (`wavelength_nm,reference,variant_1`) or a selected reference from user-downloaded original HLC CxF/CGATS or FOGRA51 spectral CGATS. Extract original ZIP archives before selecting them. The program can save just the selected 36-row curve as CSV.
- **Range:** reference factors must be within 0..1 in this restricted solver. Some fluorescence-related FOGRA measurements exceed 1; they are rejected, not clipped.

Detailed links: [SOURCE_LINKS.md](SOURCE_LINKS.md) · Accepted formats: [CSV_FORMAT.md](CSV_FORMAT.md).

## Research scope

Colour Advisory compares imported candidate reflectance curves by RMSE and, when observer/SPDs are provided, by per-illuminant and priority-weighted ΔE00. Spectral Lab performs a constrained 36-point *mathematical fit* to a supplied Lab(D50) target and reference curve. Outputs are JSON/CSV. These are **experimental models**, not uniquely inferred material spectra, device/ink recipes, certified proofs or print approvals. No ICC workflow, HLC master database or entire Fogra characterisation dataset is included.

## Privacy, rights and tests

The application uses no remote scripts, automated network requests, analytics, cookies or data uploads. Clicking source links opens third-party publishers, who operate their own websites and privacy policies. Imported data may be subject to original licensing and redistribution conditions. Review [PRIVACY.md](PRIVACY.md) and sources' legal notices.

This folder is **new, stand-alone source code**, not a copy of the private Spectral Lab Git history or its embedded reference tables. It is part of the publicly licensed ATLAS Clarus Connect project; its code follows the repository-level GNU GPL v2 terms. Data supplied by users do not become relicensed.

Testing: [VALIDATION.md](VALIDATION.md). The standalone beta has been exercised with DE/EN, synthetic 36D inputs, official-formatted source files, spectral optimisation and downloads. Further browser/platform acceptance and scientific evaluation are ongoing.
