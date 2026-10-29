# FOGRA58 profile correction — 29 October 2026

**Status: isolated correction validated, including 24 actual Chromium downloads and independent file readback. Correction branch published with explicit user approval. No release, deployment, master change or physical textile approval.**

Validated runtime commit: `b4ca3ddf737461631427d5669bd0d0492466fad3`. [Isolated browser workflow](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/40803992017): PASS. [Repository validation](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/40803991910): all 9 jobs PASS. Later changes to this report contain evidence only; application code is unchanged.

## Baseline and reproduction

The current relevant development line is `fix/rc34.8-small-installer-20261028`, commit `1b5f00de1d4a94e4085510d602cc793a6880c522`. `main` does not yet contain the Textile workflow. The referenced RC34.7 branch, this RC34.8 source and the released RC34.8 asset have the same Git blob for `textile/print-ui.js`: `c7f8d2404bd5fe7070705e88633cbe41fca4a746`.

The unchanged RC34.8 application reproduces the following in JSDOM and in native Chromium 151.0.7922.34 over HTTP, through normal selection and button interaction:

> Profile-bound reference blocked: Cannot read properties of null (reading 'data_base64')

The normal application event path is:

1. `init()` / copying a reference calls `renderReferences()`.
2. `renderPath()` has disabled calculation for the missing profile, but `renderReferences()` calls `lock(false)`.
3. `lock(false)` indiscriminately enables all print buttons and only restores the clear/export/report gates. The calculation button is enabled without an ICC profile.
4. `createProfiledReference()` checks the reference count but not the profile, then calls `profileBytes(null)`.
5. Reading `profile.data_base64` throws; the catch exposes the technical message. No worker or export starts.

This is an executable DOM and native-browser reproduction in the current code, not proof of the exact assets loaded in the historical public browser session. That session's served-file hashes and browser state were not available here.

## Correction

- Every unlock reapplies the readiness rules for **all three paths**.
- The calculation entry point independently checks profile, exactly one reference, workflow, substrate, rendering intent and BPC before using profile data.
- The missing-profile message names **the official final `TextileRGB_FOGRA58.icc`** and explains that beta/other RGB profiles are not accepted. Rejected files include the loading guidance.
- Exact profile bytes and hash are rechecked before starting the ICC worker; settings/reference are held for the entire async calculation.
- Repeated calls during calculation cannot create duplicate exports. Profile clearing is also guarded while busy.
- Importing a legacy handoff without a textile path invalidates the previous textile preview, its result values and its save controls. Previously it cleared the profile but could retain the preview result.

No numerical engine or export format was changed. The correction deliberately retains the existing browser-download implementation until an actual failure of that implementation is demonstrated.

## Evidence and limits

| Check | Result |
| --- | --- |
| Unchanged RC34.8 DOM reproduction | Exact null/data_base64 message reproduced |
| Profile/UI regression suite | 89 assertions PASS; zero worker starts for blocked cases |
| Invalid file cases | Empty, non-ICC, truncated, wrong space, unrelated RGB with plausible name, tampered hash, oversized: rejected |
| Settings and repetition | All four intents × BPC on/off; missing settings; repeated select/export/report; replacement/clear; path isolation; legacy/tampered import |
| Real WASM through DOM UI + native canvas | PASS; repeated reference exports and busy guard; stale-setting and legacy-import invalidation |
| Independent native LittleCMS comparison | 64 vectors; maximum RGB16 difference 0; maximum preview RGB8 difference 0 |
| Exact reported reference | H125_L075_C080, atlas_row_id 4665, original master sRGB 118 / 205 / 39 |
| Relative colorimetric, BPC off | **RGB16 25943 / 64883 / 4455** |
| Generated reference JSON/PDF readback | pypdf strict read; identity/settings match; exact ICC bytes embedded as ICCBased RGB, `/N 3`; painted values match JSON |
| Generated PNG/metadata readback | Pillow verify/decode; 1032×680 comparison montage; independent native pixel/hash calculation matches |
| PDF visual review | Poppler render inspected; labels, values and profile/master hashes readable |
| Existing handoff/card regressions | PASS |
| Actual browser save/download | **PASS: 12 HTTP + 12 file downloads in native Chromium** |
| GitHub workflow | **PASS**, run 40803992017, Chromium 151.0.7922.34 / Ubuntu |
| Production/physical textile QC | **NOT_PROVIDED / NOT_MEASURED** |

Profile SHA-256: `fad691cc0f25e3d6a91942599755b7f9cf906b91f9e4f4834c3364e6c50a972d`.

Declared unchanged master SHA-256: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.

The PNG is an annotated before/after display montage, enlarged with the existing canvas interpolation. The metadata's source/PKL/output RGBA hashes describe the underlying small pixel arrays, **not the PNG file bytes or its enlarged display pixels**. The readback test reconstructs those arrays independently and checks sample locations in the PNG. The reference-card test uses row 4665; the image test separately uses four synthetic source pixels and checks their recorded master assignments.

## Native browser downloads: completed after explicit approval

The local execution host could not start Chrome (`socket() failed: Operation not permitted`), and the cloud browser disallowed local file URLs. These were test-environment restrictions before application execution. The initial automatic approval reviewer also blocked publication of a new public GitHub branch. The user subsequently explicitly approved this isolated branch and its browser tests. The connected GitHub service published the exact local tree and started the prepared workflow; no restriction was bypassed.

The successful run used real Chromium download events, waited for completion, and saved every file to disk without replacing download functions, workers or canvas. A separate Python process reopened the files with pypdf and Pillow and compared values/hashes against native LittleCMS. There were zero page errors.

| Delivery mode | Reference JSON/PDF pairs | Image PNG/metadata pairs | Saved files | Readback |
| --- | --- | --- | --- | --- |
| HTTP, local server in CI | 3 | 3 | 12 | PASS |
| Offline `file:` URL in CI | 3 | 3 | 12 | PASS |

Both modes covered initial/repeated reference export, changed rendering intent/BPC, image export after profile reload, rejection of three invalid file payloads through real file inputs, stale-result invalidation and legacy import. Every saved PDF/PNG was byte-identical across HTTP/file for its corresponding case; JSON contents were identical apart from timestamps. The downloaded artifact was independently retrieved and its GitHub SHA-256 verified: `a513e4cbe2f7b3fe27b79effffa72bc62f7a48a371e4b765ad1d798678d6ea56`.

| Settings | Reference RGB16 | Image round-trip sRGB |
| --- | --- | --- |
| Relative colorimetric, BPC off | 25943 / 64883 / 4455 | 117 / 205 / 37 |
| Perceptual, BPC on | 27457 / 64282 / 7771 | 123 / 207 / 58 |

Both use the same frozen reference (row 4665, original sRGB 118 / 205 / 39) and the same pinned final ICC hash. These are separately calculated representations; the ATLAS identity remains unchanged. The native-browser image fixture is a 32×32 image filled with that reference. The earlier DOM image fixture is a separate four-pixel test.

The exact candidate ZIP is byte-identical between local builds and GitHub CI: `e7ff1c64d2bc531d180f622618f806e6c5556a175034bf3493cb825dabc924da`. Returned PDFs were rendered with Poppler and inspected; the missing-profile desktop/mobile controls were inspected from CI screenshots.

**Scope:** the tested candidate reliably saves and reopens all four requested artifact types in Chromium on Ubuntu, over HTTP and file delivery. No export-code fault was demonstrated. The historical public-session download issue remains unexplained; this test does not retroactively identify its cause or certify the production host, browser permissions or other browser families. The live site has not been changed.

## Review package

`ATLAS_Clarus_FOGRA58_Profile_Fix_Preview.zip` is a complete **offline review candidate**, not a WordPress installer. Its builder starts from the exact RC34.8 archive (SHA-256 `ceac038f92a9c6f29e4a2421013f7c95a2db2266214b4fc6f6c6e5be06562273`). It permits changes only to embedded/asset/documented `print-ui.js`, version/manifest and checksums. **266 other base files remain byte-identical**, including master data, CorelDRAW features, ICC engines and export modules. `deployment_allowed` is false and the prior release authorization is removed from the candidate manifest. No standalone ICC is included in the application; the requested evidence PDF embeds the supplied official profile.

The accompanying patch applies to the stated base commit. The correction branch is `fix/fogra58-profile-validation-20261029`; the tested application remains separate from release branches. Test-only dependencies include pinned `@napi-rs/canvas` to make the existing DOM/WASM integration test reproducible outside this environment.

## Reproduce locally (repository root)

Use Node 24, Python 3, native LittleCMS 2, and optionally Poppler for rendering. Obtain the RC34.8 archive and official Fogra profile from the URLs in `.github/workflows/fogra58-profile-regression.yml`; verify the above SHA-256 values first.

```bash
npm ci --prefix browser-bundle/tests --ignore-scripts
python -m pip install Pillow pypdf
python -m zipfile -e /path/rc34.8-base.zip /tmp/fogra58-baseline
TEXTILE_BUNDLE_DIR=/tmp/fogra58-baseline/atlas-clarus-browser-bundle node browser-bundle/tests/validate_fogra58_profile_ui.cjs --reproduce
python browser-bundle/build_fogra58_profile_fix.py --base /path/rc34.8-base.zip --output-dir /tmp/fogra58-fixed
export TEXTILE_BUNDLE_DIR=/tmp/fogra58-fixed/atlas-clarus-browser-bundle
export TEXTILE_PROFILE=/path/TextileRGB_FOGRA58.icc
node browser-bundle/tests/validate_fogra58_profile_ui.cjs
node browser-bundle/tests/validate_textile_conversion.cjs
node browser-bundle/tests/validate_textile_conversion_ui.cjs
python browser-bundle/tests/verify_fogra58_generated_artifacts.py
node browser-bundle/tests/validate_textile_ui.cjs
node browser-bundle/tests/validate_textile_handoff.cjs
node browser-bundle/tests/validate_print_handoff.js
node browser-bundle/tests/validate_profiled_reference_card.js
```

Then, in an environment which permits a real browser:

```bash
browser-bundle/tests/node_modules/.bin/playwright install chromium
FOGRA58_EVIDENCE_DIR=tmp/fogra58-http node browser-bundle/tests/validate_fogra58_browser.cjs
python browser-bundle/tests/verify_fogra58_downloads.py tmp/fogra58-http --render
FOGRA58_TRANSPORT=file FOGRA58_EVIDENCE_DIR=tmp/fogra58-file node browser-bundle/tests/validate_fogra58_browser.cjs
python browser-bundle/tests/verify_fogra58_downloads.py tmp/fogra58-file --render
```

`CHROMIUM_EXECUTABLE` can identify an installed Chromium-family binary. The isolated GitHub workflow has only `contents: read`, builds review artifacts, and contains no release, merge, WordPress or deployment operation.
