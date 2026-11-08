# ATLAS Clarus · Digital HLC / wide-gamut preview 0.1.8

A colour such as `H295_L040_C100` can now retain its own **digital HLC address**
even though it is absent from the fixed 13,283-row master. Enter an HLC address
or RGB values with a declared sRGB, Display-P3 or ProPhoto RGB colour space.
The original source, computed Lab, unclipped RGB representations, gamut status
and the separate existing RGB-only master comparison are retained in a digital
palette. The DE/EN workspace includes two full digital RGB libraries, a hue/lightness
browser, complete library JSON exports and RGB coverage of each existing library.

| Full GamutMap source selection, snapshot 18 October 2026 | Addresses | Existing master rows | Additional digital addresses |
| --- | ---: | ---: | ---: |
| Display-P3 | 15,430 | 12,132 | 3,298 |
| ProPhoto RGB | 22,248 | 13,283 | 8,965 |

Both contain `H295_L040_C100` and `H290_L040_C095`. Previously installed views
were intersections with the fixed master. `build_libraries.py` exposes the full
single-filter captures already retained in the repository, verifying their hashes
and independent combined-filter/master intersections first. No live site recapture
or old-list mutation is involved.

Source selection and strict computed gamut are separate: the source P3/master
intersection has 12,132 members, whereas our mathematical P3 test covers 12,009
master rows. The source's exact ICC bytes, CMM and threshold are unverified.
A star marks source-selected entries outside our computed gamut. They stay in
the complete source library with their raw computed values and explicit flags.
Of the full source lists, 14,865 P3 addresses pass the strict computed P3 test
(565 outside); 21,918 ProPhoto addresses pass its test (330 outside). These
counts are diagnostics of that finite source grid, not total colours in a space.

## Use

Open `ATLAS_Clarus_Digitale_Farberweiterung_0.1.8.html` directly in a browser.
It is a self-contained offline tool; no installation, network or profile download
is needed. Alternatively extract the complete 0.1.8 ZIP, open `START_HERE.html`
and choose **Digitale HLC-Farben / Digital HLC colours**. Browser Edition and
Startup Colour Kit also link to this separate workspace.

1. Choose the P3 or ProPhoto library, hue and lightness, and click a colour. Or
   enter an HLC address / RGB values with their colour space and number scale.
2. Calculate; inspect source preview, gamut status and the old master comparison.
3. Add colours to the digital palette. Save JSON to preserve the full source and
   reopen it here. CSS exports numbered variables with labelled clipped sRGB
   fallbacks and in-gamut Display-P3 overrides for suitable displays.
4. Choose an existing library to inspect its sRGB/P3/Rec.2020/ProPhoto coverage.

**Complete RGB library · JSON** downloads all addresses, identities, computed RGB
and gamut flags for the selected library. The full ZIP also contains ready-made
`digital/libraries/display-p3.json` and `prophoto-rgb.json`.

The standalone file contains existing reference data and source-declared library
lists, but **no ICC profile payloads**. The full personal test ZIP inherits the
0.1.7 profiles and their existing redistribution restrictions.

## Identity and boundaries

- The original master, row IDs, stored RGB/Lab, spectra, existing library lists,
  native image workflow, RGB-only selection and existing ICC engine are unchanged.
- An exact HLC address found in the master resolves directly to that master row.
  Other HLC addresses receive a separate `digital-hlc-d50-2deg:v1:` identity.
  They have **no new atlas_row_id, no measured spectrum, no ARBE values and no
  established production-library membership**. Calculability is not proof of
  physical realizability or print approval.
- HLC input is explicitly D50 / 2°, H=0–360, L=0–100, C=0–200, up to six decimal
  places. Chromatic H000 normalizes to H360, matching the master's red page;
  achromatic C000 normalizes hue to zero.
- Declared RGB sources retain their unrounded normalized floating-point values
  and colour-space identity. Their HLC display address is rounded to six decimals;
  a separate source-based digital ID avoids confusing rounded labels with unique
  exact identities. RGB-derived addresses never become master references merely
  because their label rounds to an existing address.
- Native 8-bit sRGB uses the documented integer squared-RGB comparison against
  all 13,283 stored RGB rows, ties to lower row ID. Other sources show only an
  explicitly labelled **derived sRGB8 proxy comparison**, clipped when necessary.
  It does not replace the digital source or establish a new P3 matching standard.
- The digital JSON uses its own schema. It is not accepted as a conventional
  master-only Clarus palette; no unsafe handoff into production acceptance is
  introduced. Import recomputes colourimetry, identity, comparison and membership,
  rejecting incompatible or altered records. It never trusts a claimed row ID.
- No new image-wide P3 matching, spectral reconstruction, ICC conversion of digital
  additions, ordinary ASE/GPL/XTG digital-colour export or public deployment is
  included. Those require explicit downstream support for the new identities.

## Colourimetry

Lab D50 / 2° → XYZ D50 → Bradford D65 for sRGB, Display-P3 and Rec.2020;
ProPhoto remains D50. Matrices and transfer functions follow the published W3C
CSS Color 4 sample code. Rec.2020 here uses the CSS SDR BT.1886 transfer definition.
Gamut membership tests **unclipped linear channels** in [0,1] with 1e-7 numerical
tolerance. Raw out-of-range values stay in JSON; display previews clamp channels.
This is a simple clipped preview, not a perceptual proof or a calibrated display
measurement. A P3 preview requires browser support and the `color-gamut: p3`
capability report; otherwise a labelled sRGB preview is shown.

For the pinned master, independently calculated coverage is sRGB 10,636;
Display-P3 12,009; Rec.2020 13,108; ProPhoto 13,283. Existing library lists are
not recalculated or expanded by this diagnostic.

The user's screenshot for H290_L040_C095 reports sRGB 0/82/245, Display-P3
17/80/236 and ProPhoto 89/70/225. Our specified W3C chain yields clipped sRGB
0/81/245, P3 19/80/236 and ProPhoto 89/70/226 (8-bit rounded). This confirms
outside-sRGB / inside-P3 under our calculation, but does not reproduce the
source's undisclosed conversion chain byte-for-byte.

Sources:
- https://www.w3.org/TR/2026/CRD-css-color-4-20261103/#color-conversion-code
- https://registry.color.org/rgb-registry/displayp3
- https://registry.color.org/rgb-registry/srgb
- Existing `process-libraries/CATALOG_README.md` for library-list provenance.

## Build and verify

```bash
python3 previews/digital-hlc/package.py --base /path/to/ATLAS_Clarus_Logo_Markenpalette_0.1.7_DE_EN.zip --output-dir /new/output
node previews/digital-hlc/test-core.cjs /new/output/atlas-clarus-browser-bundle /test-output
python3 previews/digital-hlc/test-oracle.py /new/output/atlas-clarus-browser-bundle /test-output
NODE_PATH=/path/to/node_modules node previews/digital-hlc/test-dom.cjs /new/output/atlas-clarus-browser-bundle /test-output /new/output/ATLAS_Clarus_Digitale_Farberweiterung_0.1.8.html
ATLAS_TEST_CHROMIUM=/usr/bin/chromium node previews/digital-hlc/test-ui.cjs /new/output/atlas-clarus-browser-bundle /test-output /new/output/ATLAS_Clarus_Digitale_Farberweiterung_0.1.8.html
```

Base ZIP SHA-256: `a8ba76271fc8d52b867030a57facd6e332712cd3e2732338deabb2324aef3cf2`.
Master SHA-256: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.
The builder rejects another baseline, preserves inherited files except the three
entry pages/checksum list, verifies every inherited byte, and emits a deterministic
ZIP, checksums and a build report. The test output documents actual checks run.

New source follows the repository software licence. Reference-data attribution
and licences remain in `LICENSING.md`, `THIRD_PARTY_NOTICES.md` and the inherited
package notices; no rights are assigned to third-party ICC profiles.
