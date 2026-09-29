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
| 0.4.0-beta.1 signed beta | Installed on the phone; with airplane mode enabled, Connect opened on its home screen, then Colour ID opened with 14 tabs. A loaded image remained visible after switching language. | User reported “installiert”, “Startseite öffnet offline”, “14 Tabs”, and “Bild bleibt” on 2026-09-29. A Traceability JSON was also saved with airplane mode enabled (“gespeichert”); the file content and chain were not inspected. Returning from Colour ID to Connect kept the start screen visible (“Startseite bleibt”). Android offered and installed the in-place update to 0.4.0-beta.2; post-update launch succeeded in airplane mode, while retention of private app data remains untested. |
| Colour ID TRACE view | A trace ID was displayed. | User supplied `Trace-20260929-082746-7FE50349`; its exported JSON and chain were not independently checked. A later HTML trace `TRACE-20260929-083827-DEFED737` was a different START_REFERENCE selection. |
| 0.4.0-beta.3 Clarus JSON round trip | Exported `Update-Test` as Clarus JSON through Android; imported the saved file into a new palette. | User reported “Datei gespeichert”, then “Imported 1 verified identities” and `Update-Test (1)` with `H005_L075_C035` on 2026-09-29. This verifies the app accepted one reference in a file round trip on the phone; the original and imported palettes may share the same display name. The file bytes were not independently inspected. |
| 0.4.0-beta.3 palette retention | Android App Info showed version `0.4.0-beta.3`; in that app, `Update-Test (1)` contained `H005_L075_C035` (`#F69FB5`, row 37). | The user corrected an earlier wrong-version observation, then explicitly checked the installed version and reported the palette name, count and reference on 2026-09-29. This confirms these local palette values were visible after the in-place update; it does not inspect private storage bytes or every palette field. |
| 0.4.0-beta.2 local-data baseline | In Bundle → My Palettes, the user created “Update-Test” and added one colour; the selector displayed “Update-Test 1”. | User reported “Update-Test 0”, then answered “ja” when asked to verify “Update-Test 1” on 2026-09-29. Confirm the exact palette and colour count after installing beta 3; no backup/import was used for this check. |

## Verified outside the device

| Target | Check | Result |
| --- | --- | --- |
| 0.3.2-test Nachweis APK | GitHub Actions Android build, 14-tab DE/EN asset checks, 13,283 identical master identities, language runtime, export adapter, provenance regression. | Passed on commit `0793e72a6cb130c04b8739977aabcc3b28b318db`, workflow run `36545018904`. APK SHA-256 `d558c33828669fdc26aef789bdf05501a96b2347a07e945f65877e4def281e64`. |
| 0.3.3-test Navigationstest APK | GitHub Actions Android build and shared bundle validation. | Passed on commit `4601cc3b15f38ea9bdf20f1589b177c68996ebf5`, Android run `36547502699`, validation run `36547502788`. APK SHA-256 `10d6f29ab13da9a5780945a1a15d685243521de99e76f1e08de35835c3952c33`. The limited phone results are recorded above. |
| 0.4.0-beta.1 signed beta APK | GitHub Actions signed build, signature, application ID and version check; artifact upload. | Passed on commit `33259b2c75671fd36f69f02940c785187cd83011`, signed run `36558925567`, validation run `36558847186`. APK SHA-256 `bbecb17374131b809966b2833a285e8069b5bd893e6255fb0ad9480863f72fe6`. This is CI evidence, separate from the phone observations. |
| 0.4.0-beta.2 signed update-test APK | GitHub Actions signed build, signature, same application ID and increased version check; artifact upload. | Passed on commit `781071bdfeacbf4f950ba0ac518af8027d4acb62`, signed run `36561015235`, validation run `36560086154`. APK SHA-256 `c9659cac5f2150f2456eb7f4e3b654ea859db571c46fc4aaef14dd802b318e05`. The phone displayed “Update” while Beta 1 remained installed, and the user reported “aktualisiert” after confirming it on 2026-09-29. After the update, the user saw version 0.4.0-beta.2 and the Connect start screen with airplane mode enabled. Retention of private app data was not tested. |
| 0.4.0-beta.3 signed palette-retention update-test APK | GitHub Actions signed build, signature, same application ID and increased version check; artifact upload. | Passed on commit `c2aa675addd08f2cdd90641b693bf3d732976a63`, signed run `36569409247`, validation run `36569240490`. APK SHA-256 `f5298666f7953aa544b08be2f47dc3e27d8a51897e8eb9fefdf49e2997865e00`. The signed artifact passed CI. After correcting an earlier wrong-version observation, the user verified `0.4.0-beta.3` in Android App Info and found `Update-Test (1)` with `H005_L075_C035` (`#F69FB5`, row 37) in that app. This is device evidence for the named palette and reference. |
| 0.4.0-beta.4 signed pixel-trace test APK | GitHub Actions signed build, reserved certificate, application ID and version checks; artifact uploaded. | Passed on commit `8d7ff901` in signed run `36589880266`. APK SHA-256 `9a9c6f9c1b95ff8aded984ad1d343dd3d48158bef9249c23ff7957cb46f18727`. This is build evidence; installation and image-pixel trace verification on the phone are not established here. |
| Public WordPress Colour ID 0.2.2 | Load a synthetic 32×32 image, manually bind HEX, then select an image pixel. | `MANUAL_HEX` had `source_image: null` as intended; the later `IMAGE_PIXEL` retained filename, SHA-256, width, height, x and y. DE and EN each loaded 14 tabs with the patch. This is a browser test, not an Android device test. |
| Primary reference assignment | Compare Colour ID against Bundle PKL binder for 1,212 exact, collision and deterministic RGB samples. | Same `atlas_row_id` and RGB squared distance; all 13,283 rows matched for ID, HLC, RGB, HEX and Lab. This does not validate the user's individual exported trace. |

## Open before a wider Android test

- On the 0.3.3-test Navigationstest APK, the repeated Colour ID button tap kept the loaded image visible. Confirm image-pixel provenance separately in an exported trace if needed.
- On the signed 0.4.0-beta.1 APK, home launch offline and entry to the 14-tab Colour ID view were confirmed. The beta.3 Bundle palette JSON round trip and retention are recorded above. Test the beta.4 image-pixel trace on the installed APK, plus remaining formats, rotation and a narrow phone layout before wider testing.
- Earlier debug prototypes use distinct package IDs and do not migrate private palettes. The signed beta fixes `com.atlasclarus.connect` with a long-lived keystore outside the repo. Android offered and installed the 0.4.0-beta.2 update over 0.4.0-beta.1. Post-update startup on the Connect home screen passed in airplane mode; after version confirmation in Android App Info, `Update-Test (1)` and its reference were visible in beta 3; wider local data retention is not established.
- The two workspaces maintain separate palette state. Switching native views
  reloads the selected document; loaded images are transient across that
  navigation. In-page DE/EN switching inside Colour ID now preserves its image.
  The native Colour ID item now ignores a repeated tap while already in Colour ID;
  the image-retention behavior was confirmed on the 0.3.3-test device build.
- The frozen reference rule is RGB-only nearest master with smaller
  `atlas_row_id` for ties. Lab/ΔE and ICC remain post-assignment analysis.

## Test artifact identifiers

- Latest signed build in CI: `ATLAS Clarus Connect`, version `0.4.0-beta.4`, application ID `com.atlasclarus.connect`, versionCode `4`. Device observations in this log establish beta.3; beta.4 installation is not established here.
- Prior Android test label: `ATLAS Clarus Connect Navigationstest`, version `0.3.3-test`; application ID `com.atlasclarus.browseredition.test.bilingual.navguard`.
- Prior 0.3.2-test Nachweis ID: `com.atlasclarus.browseredition.test.bilingual.provenancefix`.
- Reproducible Browser Bundle RC27 ZIP SHA-256:
  `3142adf2088734d34c98a3b0f337aab35a728d769e4b15bae420431178a140c7`.
- Shared Atlas master SHA-256:
  `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.
