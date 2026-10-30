# QuarkXPress XPress Tags export — RC34.9 preview

My Palettes and Colour Reduction can export a `.xtg` file for QuarkXPress.
The file defines named RGB process swatches and a coloured text list. Complete
reduction job ZIPs also include `palette.xtg`; original RGB entries keep their
names and values. The new button includes a link to the German/English import guide.

In QuarkXPress, import the file into a text box with **Interpret XPress Tags**
enabled and use **sRGB IEC61966-2.1** for RGB solid colours. Start with an empty
project to avoid name collisions. The file does not embed an ICC profile.
Keep Clarus JSON/the complete reduction job for provenance.

The format follows the official QuarkXPress 2026 XPress Tags guide:

- [Import/version header](https://www.quark.com/documentation/quarkxpress/2026/english/A%20Guide%20to%20XPress%20Tags%202026/)
- [RGB process-colour definitions](https://www.quark.com/documentation/quarkxpress/2026/english/A%20Guide%20to%20XPress%20Tags%202026/_4fbdefc9-7693-47ed-8a02-a99b02b941f7.html)
- [UTF-8 and text escapes](https://www.quark.com/documentation/quarkxpress/2026/english/A%20Guide%20to%20XPress%20Tags%202026/_3a3e18a3-bb3e-4f28-a660-39c6521b2f34.html)
- [Swatches and source setups](https://www.quark.com/documentation/quarkxpress/2026/english/A%20Guide%20to%20QuarkXPress%202026/_7_65678458149255E7_9.html)

The documented header example is `<v21.00>`; UTF-8 requires `<e9>` (not `<e8>`,
which means UTF-16). RGB channels are normalized to 0–1. This is no colour-space
conversion. Every file is read back before download. Export accepts 1–256 entries
and blocks invalid RGB values, duplicate/reserved names, and unsupported characters
in swatch names rather than silently renaming identities. All Atlas addresses and
current protected-original names fit the supported name syntax.

## Build

Use the published `ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.8-coreldraw-xml.zip`
as input. Its SHA-256 is pinned by the builder. No external data is fetched during
the build; the output directory must be new.

```sh
python releases/rc34.9/package.py --base /path/to/rc34.8.zip --output-dir /path/to/quark349
node releases/rc34.9/verify.cjs /path/to/quark349/atlas-clarus-browser-bundle
python releases/rc34.9/verify.py /path/to/rc34.8.zip /path/to/quark349
```

Only the export UI, offline HTML, manifest and documentation change. The existing
palette exporter, all master/reference data, numerical engines, textile modules
and WASM stay byte-identical. The standalone extension module attaches the XTG
functions to the existing export API and is included in the offline HTML.

For the DOM integration test, install `jsdom@26.1.0` and `@napi-rs/canvas@0.1.100`
in a temporary dependency directory, put its `node_modules` directory on
`NODE_PATH`, then run:

```sh
node releases/rc34.9/acceptance.cjs /path/to/quark349/atlas-clarus-browser-bundle
```

## Validation boundary

`verify.cjs` checks all 13,283 master references in batches, all 256 RGB8 channel
values, Quark's published red example, UTF-8/text escapes, invalid names and
channels, corrupted exports, and syntax of all inline scripts. `verify.py` uses
an independent parser for the sample, checks ZIP/checksum coverage and compares
all inherited files to RC34.8. The test palette includes H075_L060_C045,
H335_L050_C055, H125_L075_C080 and Original #010203.

The DOM harness tests actual UI handlers, empty palettes, CorelDRAW and ASE
regressions, mixed and reference-only reduction, ZIP inclusion and job reimport.
It uses a native canvas and a VM worker adapter. It is not a browser-rendering
test. A Chromium binary could not be downloaded in this environment.

**Native QuarkXPress import remains NOT_TESTED.** This candidate does not update
the live website or WordPress installer and has `deployment_allowed: false`.
The remaining acceptance step is opening `examples/ATLAS_Clarus_QuarkXPress_Test.xtg`
in QuarkXPress and comparing names/RGB values with `QUARKXPRESS_EXPECTED.json`.
No native acceptance, older-version compatibility or production proof is claimed.
