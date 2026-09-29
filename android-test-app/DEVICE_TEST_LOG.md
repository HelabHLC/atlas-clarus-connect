# ATLAS Clarus Connect — Android device test baseline

Date: 2026-09-29. This log separates the user's phone observations from
automated checks and website checks. It is the baseline for the next Android
stabilization phase; no Play Store release or production signing is implied.

## Confirmed on a physical Android device

| Build / context | Observation | Evidence and limit |
| --- | --- | --- |
| Earlier offline Browser Bundle test | Airplane-mode use worked. | User reported “Flugmodus ok”. This predates the integrated bilingual Colour ID build. |
| Earlier Android export test | A first file export failed with “failed to fetch”; the subsequent export-adapter build saved a file. | User reported “hat gespeichert”. Do not treat this as a complete survey of all export formats. |
| Connect bilingual test, then 0.3.1-test Bildfix | DE/EN switch worked; the original build lost a loaded image; Bildfix kept the image after switching. | User reported “Sprachwechsel ok”, then “Bild geladen Sprache geändert Bild weg”, then “ok bild bleibt nach wechsel”. The Bildfix package is `com.atlasclarus.browseredition.test.bilingual.imagefix`. |
| 0.3.1-test Bildfix | A tap on the loaded image still displayed a reference after switching language. | User answered “ja” to the specific question. The selected row and source image hash were not supplied from that build. |
| 0.3.1-test Bildfix | Traceability JSON could be saved through Android. | User reported “gespeichert”. This does not verify Trace JSON import, HTML export, ASE, GPL, PDF, or other formats. |
| Colour ID TRACE view | A trace ID was displayed. | User supplied `Trace-20260929-082746-7FE50349`; its exported JSON and chain were not independently checked. A later HTML trace `TRACE-20260929-083827-DEFED737` was a different START_REFERENCE selection. |

## Verified outside the device

| Target | Check | Result |
| --- | --- | --- |
| 0.3.2-test Nachweis APK | GitHub Actions Android build, 14-tab DE/EN asset checks, 13,283 identical master identities, language runtime, export adapter, provenance regression. | Passed on commit `0793e72a6cb130c04b8739977aabcc3b28b318db`, workflow run `36545018904`. APK SHA-256 `d558c33828669fdc26aef789bdf05501a96b2347a07e945f65877e4def281e64`. |
| Public WordPress Colour ID 0.2.2 | Load a synthetic 32×32 image, manually bind HEX, then select an image pixel. | `MANUAL_HEX` had `source_image: null` as intended; the later `IMAGE_PIXEL` retained filename, SHA-256, width, height, x and y. DE and EN each loaded 14 tabs with the patch. This is a browser test, not an Android device test. |
| Primary reference assignment | Compare Colour ID against Bundle PKL binder for 1,212 exact, collision and deterministic RGB samples. | Same `atlas_row_id` and RGB squared distance; all 13,283 rows matched for ID, HLC, RGB, HEX and Lab. This does not validate the user's individual exported trace. |

## Open before a wider Android test

- Install and check the 0.3.2-test Nachweis APK on a phone. Its provenance fix
  has not yet been confirmed on the device.
- Check direct launch to Bundle home, Bundle↔Colour ID navigation, all 14 tabs,
  file import, each needed export, rotation and a narrow phone layout on this
  exact APK. Do not infer these from older test builds.
- The CI debug key and package ID varied between prototypes. They therefore
  install as separate apps and do not migrate private palettes. Choose one
  application ID and a managed signing process before issuing an updateable beta.
- The two workspaces maintain separate palette state. Switching native views
  reloads the selected document; loaded images are transient across that
  navigation. In-page DE/EN switching inside Colour ID now preserves its image.
  The source now ignores a repeated tap on the native Colour ID item while
  already in Colour ID; this navigation guard awaits device verification.
- The frozen reference rule is RGB-only nearest master with smaller
  `atlas_row_id` for ties. Lab/ΔE and ICC remain post-assignment analysis.

## Test artifact identifiers

- Current Android test label: `ATLAS Clarus Connect Nachweis`.
- Version: `0.3.2-test`; application ID:
  `com.atlasclarus.browseredition.test.bilingual.provenancefix`.
- Reproducible Browser Bundle RC27 ZIP SHA-256:
  `3142adf2088734d34c98a3b0f337aab35a728d769e4b15bae420431178a140c7`.
- Shared Atlas master SHA-256:
  `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.
