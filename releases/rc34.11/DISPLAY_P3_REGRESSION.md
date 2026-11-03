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
Strict colour acceptance also requires identical captured RGB for the 16-bit pair; a profile
control must change the output by at least 10 code values in one channel.
This rejects an implementation which only recognises metadata but ignores P3.
Colour failures are collected until all samples and exports have been examined;
they still produce a nonzero exit code. Metadata/round-trip status is separate.

File and profile hashes, ICC description/size/space, and processing statements
are checked individually. `NOT_OBSERVABLE` remains unchanged: numerical
agreement establishes the observed input/output result for this browser build,
not knowledge of its internal CMM/intent or universal browser independence.

Actual downloaded Clarus JSON and the JSON extracted from the downloaded
QuarkXPress ZIP are each imported into a fresh context; JSON and complete ZIP
must re-export byte-for-byte identically. RC34.11 does not support direct ZIP
import: rejection without state mutation is checked separately. Reload must
preserve source records. Archive entries and source-file hashes are
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
Playwright 1.54.1 disables Firefox colour management (mode 0) and selects
rendering intent 3 in its patched browser configuration. The regression sets
mode 2 (tagged images), ICC v4 enabled, and intent 1 (relative colorimetric)
explicitly. Those settings are recorded in the evidence; the initial mode-0
diagnostic is not presented as ordinary Firefox behaviour. See the pinned
[Playwright Firefox configuration](https://github.com/microsoft/playwright/blob/v1.54.1/browser_patches/firefox/preferences/playwright.cfg).
Headless WebKit is not a physical Safari/iPhone test. RGB8 roundoff can change
the nearest ATLAS address at a decision boundary; expected and observed winners
are both retained. No screenshots or physical print acceptance are claimed.

## Results — 3 November 2026

**Strict colour acceptance fails in Chromium and WebKit for the 16-bit P3
fixture. Firefox with the recorded ICC settings passes. Metadata, matching and
export preservation pass in all three engines.** These are measured outcomes;
the tolerance was not widened after observing failures.

[Complete GitHub Actions run](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/41687023622)
used test-code commit `b72cbb687c764febb8d18a5fc5a51ff5d4d4c54d` and the
byte-identical PR #108 preview archive
`402426727adeeb989933727703080eb798abc5b43ef7ded355d6dfed08ccf327`.
All engines used Playwright 1.54.1, LittleCMS 2.14 and Ubuntu 24.04.

| Fixture | LittleCMS sRGB8 | Chromium 139.0.7258.5 | Firefox 140.0.2 (ICC enabled) | WebKit 26.0 | ATLAS address in all three |
|---|---|---|---|---|---|
| `in-srgb16.png` | 61/123/25 | 61/123/25 | 61/123/25 | 61/123/25 | `H130_L045_C055` |
| `in-p3-16.png` | 61/123/25 | 60/123/23 | 61/123/25 | 60/123/23 | `H130_L045_C055` |
| `in-srgb8.png` | 61/123/25 | 61/123/25 | 61/123/25 | 61/123/25 | `H130_L045_C055` |
| `in-p3-8.png` | 61/123/25 | 61/123/25 | 61/123/25 | 61/123/25 | `H130_L045_C055` |
| `out-p3-16.png` | 255/118/0 | 255/119/0 | 255/119/0 | 255/119/0 | `H060_L065_C100` |
| `out-clipped-srgb16.png` | 255/118/0 | 255/118/0 | 255/118/0 | 255/118/0 | `H060_L065_C100` |
| `control-p3-codes-srgb16.png` | 77/122/43 | 76/122/42 | 77/122/43 | 76/122/42 | `H125_L045_C045` |
| `control-p3-codes-untagged16.png` | 77/122/43 | 76/122/42 | 77/122/43 | 76/122/42 | `H125_L045_C045` |

The 16-bit sRGB/P3 target pair differs by **Delta E76 = 0.0016775901** in
LittleCMS D50 PCS, solely within the profile/storage precision of these test
files. The supplementary 8-bit pair has Delta E76 = 0.2304405541, despite
rounding to the same expected sRGB8. Thus equal RGB8 does not prove identical
underlying colour coordinates.

For Chromium/WebKit, the 16-bit P3 error is `(-1, 0, -2)` against the direct
LittleCMS oracle. Their outputs numerically equal the separately calculated
hypothesis “discard the low byte of each source channel, then apply ICC”. This
is evidence consistent with early precision reduction, **not proof of an
internal browser algorithm**. Firefox gives the expected in-gamut result.
The out-of-gamut P3 test is one green code value above the direct oracle in all
three engines, within the predeclared ±1 tolerance.

The P3 outside-gamut sample and its clipped sRGB comparator differ by
**Delta E76 = 30.423607547** in D50 PCS. They are not the same source colour.
The fact that both receive `H060_L065_C100` demonstrates that equal ATLAS
addresses do not establish equal native source colours. No gamut compression
or physical output fidelity is inferred from this clipping test.

All three engines distinguish the P3-profiled in-gamut sample from identical
numeric codes tagged as sRGB. This establishes an observed profile-dependent
pixel transformation, beyond profile metadata recognition. It does not make
the internal CMM observable and does not establish accuracy for every image,
profile, OS, browser version, display or printing condition.

### Preservation and integrity

| Check | Result in all three engines |
|---|---|
| ICC description, RGB signature, byte count and SHA-256 | Exact agreement with saved profile bytes |
| Original file SHA-256 | Exact agreement with input PNG |
| ATLAS matching | Independently verified over all 13,283 rows for every captured RGB |
| Standalone JSON → new context → JSON/ZIP re-export | Both exports byte-identical |
| ZIP's extracted JSON → new context → JSON/ZIP re-export | Both exports byte-identical |
| Page reload after either supported import | Source records unchanged |
| Direct ZIP upload to JSON importer | Rejected; palette state unchanged |
| Original files on disk | Unchanged |
| Original image/ICC bytes in palette JSON/QuarkXPress ZIP | **Absent; cannot be recovered from those exports** |
| Master data | SHA-256 unchanged; 13,283 rows |
| Existing regressions | 37 metadata groups and full reference/export checks pass |
| Physical print proof | Not performed or claimed |

The source records preserve the **captured browser-decoded RGB**, including
its observed rounding; they do not reconstruct the native P3 pixel values.
The ZIP exports contain `palette.xtg`, `palette.clarus.json`, `README.txt` and
`package-manifest.json`. The independent evidence archives below additionally
contain the original *test fixtures*; that is not a feature of palette export.

### Durable evidence

The evidence is committed here so the results remain available after GitHub
Actions artifacts expire. Each archive contains all original PNG/ICC fixtures,
the independent oracle, real application downloads/re-exports, browser results,
the candidate build manifest and existing regression results.

- [Chromium evidence ZIP](evidence/display-p3-20261103/chromium.zip) · [readable results](evidence/display-p3-20261103/chromium.json)
- [Firefox evidence ZIP](evidence/display-p3-20261103/firefox.zip) · [readable results](evidence/display-p3-20261103/firefox.json)
- [WebKit evidence ZIP](evidence/display-p3-20261103/webkit.zip) · [readable results](evidence/display-p3-20261103/webkit.json)
- [Independent oracle](evidence/display-p3-20261103/oracle-p3.json) · [SHA-256 manifest and run provenance](evidence/display-p3-20261103/manifest.json)

PNG/ICC fixture bytes are identical across all three runners. The numerical
oracle values agree; environment patch-version metadata is recorded separately.
The master remains `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`;
its shipped `atlas-data.js` file remains
`35ab43e432259aa2607814e0393e068f2e14f0be8e1fac47af9a2576dcbe079e`.

No runtime correction is included in this test-only PR. The strict CI failure
is intentional evidence of the unresolved 16-bit acceptance gap; metadata and
round-trip success must not turn it into a colour-accuracy pass. The public
installation, frozen references and release workflows are untouched.
