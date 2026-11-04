# Guided print preparation · Startup Colour Kit 0.1.2 preview

The Startup workflow now asks for the print product, substrate and printer's
instruction before exposing technical profiles. The complete library catalog
and manual output controls remain available in a collapsed advanced section.

## Selection behavior

| Input | Behavior |
| --- | --- |
| Paper flyer, brochure or poster + known offset process + coated paper | Provisional PSO Coated v3 suggestion; explicit selection and printer confirmation required |
| Same products + known offset process + wood-free uncoated paper | Provisional PSO Uncoated v3 / FOGRA52 suggestion |
| Digital, unknown process, packaging, film, textile or other substrate | Ask for the actual printer instruction; no generic output-profile guess |
| Exact catalog profile filename/description or supported PSO name | Match the printer name supplied by the user; preserve distinct 300% variants |
| FOGRA number alone, ambiguous name, working RGB or beta profile | Request the exact supported output filename or ICC file |
| Printer ICC file | Detect supported CMYK/7CLR/final FOGRA58 path and use existing strict profile validation |

The UI calls a printer name or file a **user-supplied printer instruction**;
it does not claim independent verification. FOGRA58 remains an exchange-space
profile. Seven-channel files require an explicit channel order unless their
bytes match the pinned FOGRA55 profile; filename alone no longer supplies it.

Profile suggestions are grounded in the ICC Registry definitions for
[PSOcoated_v3](https://registry.color.org/profile-registry/PSOcoated_v3) and
[PSOuncoated_v3_FOGRA52](https://registry.color.org/profile-registry/PSOuncoated_v3_FOGRA52).
Actual material and print-condition suitability must be agreed with the printer.

## State and compatibility

- Optional `print_guide` v1 metadata extends the existing dossier schema.
  Old dossiers without it still open. A provisional selection remains labeled
  in the exported HTML card, and guide/profile hashes must agree on pack/unpack.
- Changing guide answers clears the previous profile and calculation. Opening
  any dossier still discards the old calculation and requires recomputation.
- Printer inquiry text is copied locally and never sent by the application.
- Source sRGB, reference mapping, all 13,283 master rows and the ICC engine
  remain unchanged. The Browser Edition runtime and ICC payloads are unchanged.
- This is a local preview package, not a production deployment or measured proof.

## Build

The packager requires the exact previously delivered 0.1.1 ICC package
(`a947420b125a9ecfeefbb09e03592561062db5cd784b1ee0222d92801aed0ca1`).

```sh
python3 previews/startup-print-guide/package.py --base /path/to/ATLAS_Clarus_Browser_Startup_ICC_Testpaket_0.1.1.zip --output-dir /new/output-directory
node previews/startup-print-guide/test-guide.cjs
node previews/startup-colour-kit/test-core.cjs /path/to/built/atlas-clarus-browser-bundle /path/to/test/core /path/to/PSOcoated_v3.icc
ATLAS_TEST_CHROMIUM=/path/to/headless_shell node previews/startup-print-guide/test-ui.cjs /path/to/built/atlas-clarus-browser-bundle /path/to/test/ui /path/to/PSOcoated_v3.icc
ATLAS_TEST_CHROMIUM=/path/to/headless_shell node previews/library-icc-profiles/test-ui.cjs /path/to/built/atlas-clarus-browser-bundle
```

## Validation · 2026-11-04

Passed conditional selection and ambiguous/unsupported-input tests; actual
LittleCMS source/reference roundtrips with all four intents and both BPC
options; dossier export/reopen, malformed ICC rejection, mismatched guide/profile
rejection and old dossier import. Playwright exercised the full `file://` guide
flow in Chromium 1181, 390px mobile width, and the existing Startup/Browser
catalog integration, with no page errors. Desktop/mobile screenshots were
visually inspected. No physical print measurement was performed.

The package preserves 407 inherited files byte-for-byte. Only Startup HTML,
app/core scripts, CSS and the package checksum index change; guide code and
documentation are added. Archive CRC and every checksum are verified separately.

Output: `ATLAS_Clarus_Browser_Startup_Druckfuehrung_0.1.2.zip` (136,862,701 bytes).
SHA-256: `2bc3ae8108ba34b9713cb8edc0ff4a62fc5f85cc3c848bcbd5c3ac6623c73c2c`.
