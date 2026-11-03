# RC34.11 Display P3 counter-test

Scope: exact PR #108 head `21281d9bb53e32e7cdf04d85161b8263523b7412`,
rebuilt from the SHA-256-pinned RC34.10 archive. Test-only changes; no master,
matching, runtime, installer or public deployment changes.

## Independent oracle

`generate-p3-fixtures.py` calls native LittleCMS directly through ctypes, with
relative colorimetric intent, no black point compensation and `NOOPTIMIZE`.
It builds synthetic ICC v4 matrix/TRC profiles (sRGB and Display P3), fixes
profile timestamps, omits the optional profile ID, and fingerprints all bytes.
Display P3 uses D65, P3 primaries and the sRGB transfer curve, following the
[ICC Display P3 registry](https://registry.color.org/rgb-registry/displayp3).
These are reproducible test profiles, not Apple-supplied production profiles.
The native API is documented in [LittleCMS](https://github.com/mm2/Little-CMS).

The oracle reopens the actual saved PNG, extracts its embedded ICC and native
16-bit or 8-bit codes, then computes expected sRGB8 and D50 Lab. It does not use
ATLAS or browser conversion code. 32x32 solid opaque PNGs avoid interpolation,
alpha handling and lossy compression. Only iCCP colour metadata is written.

- The in-gamut pair targets sRGB `(61, 123, 25)`. P3 codes are independently
  derived through LittleCMS; 16-bit storage avoids a misleading RGB8 match.
  The decoded PCS pair must differ by less than 0.01 Delta E76.
- The additional 8-bit pair records ordinary source quantization.
- Display P3 `(1, 0.5, 0)` is outside sRGB. Its sRGB comparison is explicitly
  a **clipped comparator**, not another encoding of the same original colour.
  Its D50 Lab difference from the P3 source is recorded, not hidden.
- Identical P3 numeric codes with an sRGB profile, and without a profile, are
  controls. The untagged oracle assumes sRGB only for this test; ATLAS continues
  to record `NONE_BY_ATLAS`.

## Browser regression

`p3-browser-regression.cjs` uploads every fixture through the actual Image
Picker, clicks its centre, records a source through Hover, and reads the saved
assignment. Per-channel tolerance is at most 1 RGB8 code value. It records the
signed difference, expected/actual ATLAS address and independently recomputes
the full-master RGB nearest reference (squared distance, lower-row-ID tie).
The 16-bit pair must have identical captured RGB and reference; a profile
control must change the output by at least 10 code values in one channel.
This rejects an implementation which only recognises metadata but ignores P3.

File and profile hashes, ICC description/size/space, and processing statements
are checked individually. `NOT_OBSERVABLE` remains unchanged: numerical
agreement establishes the observed input/output result for this browser build,
not knowledge of its internal CMM/intent or universal browser independence.

Actual downloaded Clarus JSON and QuarkXPress ZIP are each imported into a
fresh context; JSON and ZIP must re-export byte-for-byte identically. Reload
must preserve source records. Archive entries and source-file hashes are
examined independently. RC34.11 palette exports **do not contain original
image or ICC bytes**, so those original files cannot be restored from them.
Unchanged disk inputs and retained hashes must not be described as archival
preservation. This test does not extend the separate full-image project format.

## Reproduce

Requirements: Python 3.12, system liblcms2, Node 24, Playwright 1.54.1, browser.
The complete read-only workflow is `.github/workflows/rc3411-display-p3.yml`.
It builds the original candidate, repeats fixture generation byte-for-byte,
runs the existing 37 metadata groups and all 13,283 reference export checks,
then runs Chromium, Firefox and WebKit separately. It never deploys anything.

```sh
python releases/rc34.11/package.py --base /path/to/pinned-rc3410.zip --output-dir candidate
python releases/rc34.11/generate-p3-fixtures.py p3-fixtures
NODE_PATH=/path/to/playwright/node_modules BROWSER_ENGINE=chromium \
  node releases/rc34.11/p3-browser-regression.cjs \
  candidate/atlas-clarus-browser-bundle p3-fixtures evidence/p3
```

`BROWSER_ENGINE` accepts `chromium`, `firefox`, `webkit`;
`BROWSER_EXECUTABLE` optionally selects a matching installed executable.
Chromium does not use Playwright's forced-sRGB display flag. The evidence records
browser version, user agent, default canvas attributes and reported screen gamut.
Headless WebKit is not a physical Safari/iPhone test. RGB8 roundoff can change
the nearest ATLAS address at a decision boundary; expected and observed winners
are both retained. No screenshots or physical print acceptance are claimed.

## Results

Native LittleCMS 2.14 local fixture validation (3 November 2026): in-gamut
16-bit pair Delta E76 = 0.0016775901; out-of-gamut versus clipped comparator
Delta E76 = 30.423607547. Expected RGB8 is `(61,123,25)` for both in-gamut
pairs, `(255,118,0)` for the out-of-gamut/clipped pair, and `(77,122,43)` for
the two profile controls. Actual browser results are recorded by the workflow
in `p3-browser-results.json`; no browser pass is inferred from the oracle.
