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
| 0.3.3-test Navigationstest | After loading an image in Colour ID, tapping the native Colour ID button again kept the image visible. | User reported “Bild bleibt” on 2026-09-29. This confirms the repeated-button navigation guard on the phone; it does not verify image provenance in an exported trace. |
| 0.3.3-test Navigationstest | With airplane mode enabled, the app started and Colour ID opened. | User reported “öffnet offline” on 2026-09-29. This verifies the launch path; other offline workflows were not retested on this build. |
| 0.3.3-test Navigationstest | A Traceability JSON export from Colour ID was saved with airplane mode enabled. | User reported “Export saved ‘gespeichert’” on 2026-09-29. The exported file contents, chain and other export formats were not independently verified. |
| 0.4.0-beta.1 signed beta | Installed on the phone; with airplane mode enabled, Connect opened on its home screen, then Colour ID opened with 14 tabs. A loaded image remained visible after switching language. | User reported “installiert”, “Startseite öffnet offline”, “14 Tabs”, and “Bild bleibt” on 2026-09-29. Export, return navigation and update installation remain to be tested on this signed build. |
| Colour ID TRACE view | A trace ID was displayed. | User supplied `Trace-20260929-082746-7FE50349`; its exported JSON and chain were not independently checked. A later HTML trace `TRACE-20260929-083827-DEFED737` was a different START_REFERENCE selection. |

## Verified outside the device

| Target | Check | Result |
| --- | --- | --- |
| 0.3.2-test Nachweis APK | GitHub Actions Android build, 14-tab DE/EN asset checks, 13,283 identical master identities, language runtime, export adapter, provenance regression. | Passed on commit `0793e72a6cb130c04b8739977aabcc3b28b318db`, workflow run `36545018904`. APK SHA-256 `d558c33828669fdc26aef789bdf05501a96b2347a07e945f65877e4def281e64`. |
| 0.3.3-test Navigationstest APK | GitHub Actions Android build and shared bundle validation. | Passed on commit `4601cc3b15f38ea9bdf20f1589b177c68996ebf5`, Android run `36547502699`, validation run `36547502788`. APK SHA-256 `10d6f29ab13da9a5780945a1a15d685243521de99e76f1e08de35835c3952c33`. The limited phone results are recorded above. |
| 0.4.0-beta.1 signed beta APK | GitHub Actions signed build, signature, application ID and version check; artifact upload. | Passed on commit `33259b2c75671fd36f69f02940c785187cd83011`, signed run `36558925567`, validation run `36558847186`. APK SHA-256 `bbecb17374131b809966b2833a285e8069b5bd893e6255fb0ad9480863f72fe6`. This is CI evidence, separate from the phone observations. |
| Public WordPress Colour ID 0.2.2 | Load a synthetic 32×32 image, manually bind HEX, then select an image pixel. | `MANUAL_HEX` had `source_image: null` as intended; the later `IMAGE_PIXEL` retained filename, SHA-256, width, height, x and y. DE and EN each loaded 14 tabs with the patch. This is a browser test, not an Android device test. |
| Primary reference assignment | Compare Colour ID against Bundle PKL binder for 1,212 exact, collision and deterministic RGB samples. | Same `atlas_row_id` and RGB squared distance; all 13,283 rows matched for ID, HLC, RGB, HEX and Lab. This does not validate the user's individual exported trace. |

## Open before a wider Android test

- On the 0.3.3-test Navigationstest APK, the repeated Colour ID button tap kept the loaded image visible. Confirm image-pixel provenance separately in an exported trace if needed.
- On the signed 0.4.0-beta.1 APK, home launch offline and entry to the 14-tab Colour ID view are confirmed. Test return navigation, file import, each needed export, rotation and a narrow phone layout on this exact APK.
- Earlier debug prototypes use distinct package IDs and do not migrate private palettes. The signed beta fixes `com.atlasclarus.connect` with a long-lived keystore outside the repo. Future in-place updates from this signed beta still need a device test.
- The two workspaces maintain separate palette state. Switching native views
  reloads the selected document; loaded images are transient across that
  navigation. In-page DE/EN switching inside Colour ID now preserves its image.
  The native Colour ID item now ignores a repeated tap while already in Colour ID;
  the image-retention behavior was confirmed on the 0.3.3-test device build.
- The frozen reference rule is RGB-only nearest master with smaller
  `atlas_row_id` for ties. Lab/ΔE and ICC remain post-assignment analysis.

## Test artifact identifiers

- Current signed beta: `ATLAS Clarus Connect`, version `0.4.0-beta.1`, application ID `com.atlasclarus.connect`, versionCode `1`.
- Prior Android test label: `ATLAS Clarus Connect Navigationstest`, version `0.3.3-test`; application ID `com.atlasclarus.browseredition.test.bilingual.navguard`.
- Prior 0.3.2-test Nachweis ID: `com.atlasclarus.browseredition.test.bilingual.provenancefix`.
- Reproducible Browser Bundle RC27 ZIP SHA-256:
  `3142adf2088734d34c98a3b0f337aab35a728d769e4b15bae420431178a140c7`.
- Shared Atlas master SHA-256:
  `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.
