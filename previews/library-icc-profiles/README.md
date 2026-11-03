# Library ICC profiles — Browser Edition and Startup Colour Kit

The library picker resolves a frozen ATLAS library to a reviewed, named ICC profile and can attach supported output profiles directly to print preparation. It validates the exact file length and SHA-256 before use. Selecting a different output profile invalidates existing B/A results. Source RGB, master RGB and library membership remain unchanged.

The catalog covers all 94 existing views: 58 visible library views have named profile associations, 18 remain unresolved, two have no single ICC profile, and 16 remain hidden legacy views. There are 59 distinct checked profiles, including separate FOGRA55 and final FOGRA58 exchange profiles. The FOGRA51/52 common view offers two choices. FOGRA58 beta is retained only as a documented reference; it cannot enter the final TextileRGB output path. Working RGB profiles have no print-attachment action. SWOP2013C5's erroneous source link to C3 is explicitly blocked.

Associations are based on source profile names and documented variants, not proof that the original GamutMap calculation used byte-identical profiles. Original GamutMap profile binaries were not available for comparison. No measured production approval is claimed. The catalog includes exact source URLs, archive hashes, member names, profile descriptions, class, colour space, copyright and profile hashes.

## Build

Use the published RC34.11 ZIP pinned in `../startup-colour-kit/package.py`; do not regenerate it using an older mainline builder.

```bash
python previews/library-icc-profiles/download_profiles.py --output-dir /absolute/path/provider-downloads
python previews/library-icc-profiles/package.py --base /absolute/path/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.11-colour-origin.zip --output-dir /absolute/path/new-output --downloads /absolute/path/provider-downloads/download-results.json
```

Without `--downloads`, the app contains the metadata and exact-profile import UI only. With downloads, the personal test build includes 49 profile payloads, loaded individually on demand. Each can be saved as its unmodified original ICC file using the UI. Ten Adobe profiles are catalogued but supplied separately in Adobe's unchanged end-user archive; unpack and import their ICC files. Imported files are retained for the current session. Attached output profiles remain embedded in exported print jobs and Startup Colour Kit projects.

No profile binaries belong in the public repository. This work does not establish public redistribution permission. Original ICC copyright tags are unchanged; provider notices are retained in the personal package. Adobe bundling has separate terms and is deliberately outside this build.

## Reproducibility and verification

`catalog.json` is the reviewed runtime manifest; `build_catalog.py` reproduces it from inspected download records and the pinned baseline `assets/atlas-data.js`. `ZUORDNUNG.md` lists every view. The explicit profile bindings use the historical snapshot filter IDs, never IDs from the current GamutMap website. Unresolved variants are not silently replaced by newer profiles.

The overlay modifies only baseline `index.html` (embedded UI plus catalog bootstrap) and `assets/print-ui.js` (explicit attachment API). The ICC calculation engine, master data and membership data remain byte-identical to the baseline. The Startup Kit adds the same catalog and attachment workflow. The package writes SHA-256 sums for all files and a build manifest.
