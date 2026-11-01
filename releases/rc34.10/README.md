# RC34.10: QuarkXPress XTG and source JSON in one ZIP

When two source colours share one ATLAS reference, exporting only XTG retains
one reference swatch and loses the individual source-to-reference records from
the handoff. **My Palettes → QuarkXPress ZIP · XTG + Source JSON** now downloads
the existing XTG and full Clarus palette JSON together. The ZIP also contains
file hashes and German/English extraction/import instructions.

The standalone XTG and JSON exports remain available. The combined export uses
the same validated data as those exports and snapshots the data before awaiting
hashes, so changing palettes while export is pending cannot change its contents.
Recorded sources are never merged merely because they share a reference.

## Package contents

- `palette.xtg`: the unchanged RC34.9 RGB swatch format.
- `palette.clarus.json`: Clarus palette 1.2, including every recorded source
  assignment, original RGB/HEX, source image hash, sampling coordinates and
  reference identity.
- `package-manifest.json`: SHA-256 file bindings, master identity, source count
  and a list of references with no recorded source.
- `README.txt`: what is preserved, how to reimport JSON, native QuarkXPress
  instructions and limitations.

The existing Clarus importer opens the extracted JSON. Direct ZIP import is not
added. Palettes with no source records export valid reference data and explicitly
state that no original colours were recorded. Partial coverage is counted too.
The package contains recorded samples, not the original image file or every
pixel. For Colour Reduction, use the existing complete job ZIP, which already
contains XTG, source image bytes, frozen RGBA and pixel assignments. Its isolated
palette JSON chunks are not substitutes for that job.

## Build and verify

Input is the exact public RC34.9 bundle, SHA-256
`5699974d6b5742786b92babc3315d32f3b1af0fd4d89b23cf7fbddc4d5cc2156`.
Its release commit is `ad158876aa3615bef74a671a3b191f0274ff9fd2`.

```sh
python releases/rc34.10/package.py --base /path/to/rc349-published.zip --output-dir /path/to/preview3410
node releases/rc34.9/verify.cjs /path/to/preview3410/atlas-clarus-browser-bundle
npm install --no-save playwright@1.62.1
npx playwright install chromium
node releases/rc34.10/browser-acceptance.cjs /path/to/preview3410/atlas-clarus-browser-bundle /path/to/evidence
```

Set `CHROMIUM_EXECUTABLE` to use an existing browser. The build only writes to a
new local output tree and makes no network requests. It checks the baseline hash,
an exact allowlist of changed files, and complete SHA256SUMS coverage. Master,
palette validation, reduction, ICC/textile code and WASM remain byte-identical.
The only runtime addition is `quarkxpress-package.js`, plus the palette button and
its handler in `app.js`/the self-contained `index.html`.

## Validation on 2026-11-01

Node 24.22.1, Playwright 1.62.1, Chromium 138.0.7204.0:

- Actual Image Picker sampling of a two-pixel PNG: RGB 61/123/25 (`#3D7B19`)
  and 60/123/25 (`#3C7B19`) both map to row 4966, `H130_L045_C055`, RGB
  55/121/26. The new button downloads both source records in the package.
- Downloaded XTG and JSON match the standalone exports byte for byte.
- Extracted JSON imported in a fresh browser context restores both sources and
  the shared reference. Re-export produces a byte-identical complete ZIP.
- Empty palette blocked; zero-source and partial-source palettes explicit.
- Inconsistent source RGB, address and master rejected. All 4,096 permitted
  source records retained; 4,097 records and 65 references rejected, matching
  existing palette limits.
- Mutating caller-owned records during asynchronous hashing does not change
  the pending export. No browser script errors. All 275 checksummed preview
  files pass before and after.
- Existing RC34.9 export verification passes all 13,283 master rows, all 256
  RGB8 channel values, 17 invalid palettes and 8 corrupt exports.
- Independent Python ZIP/CRC/SHA-256 inspection confirms the downloaded pair,
  unchanged source RGBs, and byte-identical inherited master/engine files.

`browser-acceptance.cjs` writes an internal UI screenshot for visual inspection;
exclude it from user deliverables unless requested.

## Release boundary

`package.py` builds the reproducible preview. `promote_release.py` accepts only
its tested SHA-256 and the published RC34.9 full WordPress installer, then emits
`0.2.0-rc34.10-quarkxpress-source-zip` and installer 0.1.19-beta1.
`build_small_installer.py` derives 0.1.19-beta1.1 with a fixed release URL.
Publication to GitHub and IONOS was explicitly requested on 2026-11-01.
The release workflow gates publication on archive, PHP installer, browser and
provenance checks. Installing the plugin preserves the active runtime until the
verified install ability is called with the expected current runtime hash.

Native QuarkXPress import is **NOT_TESTED**. XTG has no embedded ICC profile;
users must set sRGB IEC61966-2.1 for RGB solid colours. JSON is not automatically
attached inside QuarkXPress. Hashes establish file consistency, not authorship,
and these tests make no physical colour/print approval claim.
