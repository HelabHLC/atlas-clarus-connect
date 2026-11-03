# RC34.11 — Colour origin display

The Image Picker previously retained browser-decoded sRGB and an ATLAS reference,
but did not inspect the original image's embedded profile. This preview adds a
five-stage **Colour origin / Farbherkunft** panel in Picker, Hover/Wheel and each
recorded palette source: original file, browser processing, sampled Source Colour,
ATLAS reference and the boundary to the separate Print job.

The first implementation reads PNG iCCP/sRGB/cICP, JPEG APP2 ICC sequences and
WebP ICCP. It records an embedded profile's description, byte count, colour-space
signature and SHA-256 after checking its v2/v4 header and tag bounds. PNG sRGB
declarations, absent ICC, invalid metadata and uninspected metadata are separate
states. PNG cICP takes precedence and stays explicitly uninterpreted. EXIF colour
space, PNG gamma/chromaticities, GIF metadata and unknown formats are not inferred.
No profile is assigned and no pixel or reference is recalculated by this module.

`image.colour_origin` is an optional extension of each source record. Its recorded
file digest must equal the parent image digest. Legacy records remain unchanged
and display “Not inspected”. New records survive local storage, Clarus JSON and
the combined QuarkXPress ZIP. The import checks metadata consistency, not the
original image or the truth of its profile assignment. Original image/profile
bytes are not added to palette exports. Keep the original image or full project.

The actual browser transform/fallback remains `NOT_OBSERVABLE`. Profile presence
does not establish colour accuracy. Native pre-decoder pixels are not captured.
Output profiles belong to the separate Print job; this panel never takes an
unrelated current output profile and presents it as historical source evidence.
Production approval and native RIP acceptance are outside this change.

## Build and test

Base: published RC34.10, commit `6ae5e0ca16302e135562485c4a94ec341f3ce3ba`.
Archive SHA-256: `82a284f37fa149e4a376798efff9ebdc710bf1bd664f73ed19a981970ee1bd90`.
The builder applies narrowly checked patches to those exact bytes. It retains
271 inherited files byte-for-byte, including master, ICC/WASM and reduction code.
The historical RC28–RC31 source builders and their pinned outputs are unchanged.

```sh
python releases/rc34.11/package.py --base /path/to/rc3410.zip --output-dir /path/to/candidate
python releases/rc34.11/generate-fixtures.py /path/to/fixtures
node releases/rc34.11/test-metadata.cjs /path/to/fixtures /path/to/candidate/atlas-clarus-browser-bundle
node releases/rc34.11/browser-acceptance.cjs /path/to/candidate/atlas-clarus-browser-bundle /path/to/baseline/atlas-clarus-browser-bundle /path/to/fixtures /path/to/evidence
```

Fixtures require Pillow with LittleCMS. Browser tests require Playwright and
Chromium (`CHROMIUM_EXECUTABLE` may select an existing installation).
The inspector limits metadata inspection to 64 MiB files and inflated ICC data
to 16 MiB. Unavailable browser decompression produces an explicit uninspected
status. Newer ICC formats are not silently accepted as v2/v4.

The development ZIP is a preview, not a WordPress installer. Extract it and open
`atlas-clarus-browser-bundle/index.html`. No public activation or release is
performed by its workflow. See `guide.html` for German/English instructions.

## Format references

- [ICC: embedding profiles](https://archive.color.org/files/technotes/ICC-Technote-ProfileEmbedding.pdf)
- [W3C PNG 3: colour metadata and precedence](https://www.w3.org/TR/png/)
- [WebP container: ICCP](https://developers.google.com/speed/webp/docs/riff_container#color_profile)

## Validation (1 November 2026)

- Node 24.22.1: 37 metadata, malformed-input, size-limit and round-trip groups.
  Pillow independently extracted profile bytes/fingerprints from eight real
  images. Out-of-order split JPEG profiles, incomplete/duplicate segments,
  invalid CRC/tag metadata, conflicting PNG declarations, cICP precedence,
  missing decompression, oversize inflation and forged records were exercised.
- Chromium 139.0.7258.5 / Playwright 1.54.1: baseline comparison for all eight
  images, unchanged sampled RGB/reference/sampling data, JSON and complete ZIP
  download/import/re-export, reload, legacy records, invalid import without
  mutation, overlapping loads and desktop/mobile panel checks.
- Existing QuarkXPress export tests: all 13,283 master references, all RGB8
  channel values, 17 invalid palettes and 8 corrupted exports.
- Existing Source ZIP browser regression: two sources sharing one reference,
  maximum 4,096 records, missing/partial source coverage, asynchronous snapshot,
  standalone JSON/XTG equivalence and byte-identical fresh-context ZIP re-export.

Browser screenshots are internal QA only. No physical phone, Safari, native
QuarkXPress or measured print acceptance is claimed.

## Display P3 regression (3 November 2026)

See [DISPLAY_P3_REGRESSION.md](DISPLAY_P3_REGRESSION.md) for independently
generated sRGB/P3 pairs, browser measurements, export preservation and known
colour-accuracy limits. Profile recognition alone is not a transformation test.
