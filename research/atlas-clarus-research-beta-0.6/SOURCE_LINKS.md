# Official data sources for the data-free ATLAS Clarus beta

These are **links to the rights holders**, not bundled data. The application only reads files manually selected by the user, locally on their own device. A source download or user import does not itself grant redistribution rights.

| Purpose | Official source | Direct CIE original CSV |
|---|---|---|
| CIE 1931 2° observer | https://cie.co.at/datatable/cie-1931-colour-matching-functions-2-degree-observer | https://files.cie.co.at/Publications-datasets/CIE_xyz_1931_2deg.csv |
| D50 | https://cie.co.at/datatable/cie-standard-illuminant-d50 | https://files.cie.co.at/Publications-datasets/CIE_std_illum_D50.csv |
| D55 | https://cie.co.at/datatable/relative-spectral-power-distributions-cie-illuminant-d55 | https://files.cie.co.at/Publications-datasets/CIE_illum_D55.csv |
| D65 | https://cie.co.at/datatable/cie-standard-illuminant-d65 | https://files.cie.co.at/Publications-datasets/CIE_std_illum_D65.csv |
| D75 | https://www.cie.co.at/datatable/relative-spectral-power-distributions-cie-illuminant-d75 | https://files.cie.co.at/Publications-datasets/CIE_illum_D75.csv |
| A | https://www.cie.co.at/datatable/cie-standard-illuminant-1-nm | https://files.cie.co.at/Publications-datasets/CIE_std_illum_A_1nm.csv |
| LED-B2/B3 | https://www.cie.co.at/datatable/relative-spectral-power-distributions-illuminants-representing-typical-led-lamps | https://files.cie.co.at/Publications-datasets/CIE_illum_LEDs.csv |

CIE source files and metadata describe individual licence and citation conditions. The app samples the published 1-nm observer and single-light sources at 380, 390, ..., 730 nm. The original CIE LED CSV uses nine channels; the app reads LED-B2/B3 from zero-based columns 2 and 3.

**freieFarbe HLC Colour Atlas XL:** https://freiefarbe.de/thema-farbe/software/ · [Publisher licence](https://freiefarbe.de/licence/). Download and extract the v1.2 HLC-XL archive, choose its `.cxf` or spectral `.txt`, then enter a precise HLC address. The imported curve is an *optimised reference spectrum*, not the raw measurement of the physical colour atlas. Check the source ZIP licence text as well as the publisher's online licence page before redistribution.

**Fogra FOGRA51 spectral CGATS:** https://fogra.org/en/downloads/work-tools/characterisation-data . Download F51-52.zip, extract `FOGRA51_Spectral.txt` and enter its `SAMPLE_ID`. The beta cannot import Lab-only FOGRA51/52 files, and will reject reflectance factors above 1 instead of silently changing them.

All publisher sites open only on user click, and the data are not uploaded to ATLAS Clarus. The files are not included in this public repository folder.
