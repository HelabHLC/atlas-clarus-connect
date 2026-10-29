# FOGRA58 profile correction — 29 October 2026

**Status: isolated correction; local regression and generated-file checks PASS. Actual native-browser downloads NOT VERIFIED. No publication, deployment, master change or physical textile approval.**

## Baseline and reproduction

The current relevant development line is `fix/rc34.8-small-installer-20261028`, commit `1b5f00de1d4a94e4085510d602cc793a6880c522`. `main` does not yet contain the Textile workflow. The referenced RC34.7 branch, this RC34.8 source and the released RC34.8 asset have the same Git blob for `textile/print-ui.js`: `c7f8d2404bd5fe7070705e88633cbe41fca4a746`.

The unchanged RC34.8 application, executed in JSDOM, reproduces:

> Profile-bound reference blocked: Cannot read properties of null (reading 'data_base64')

The normal application event path is:

1. `init()` / copying a reference calls `renderReferences()`.
2. `renderPath()` has disabled calculation for the missing profile, but `renderReferences()` calls `lock(false)`.
3. `lock(false)` indiscriminately enables all print buttons and only restores the clear/export/report gates. The calculation button is enabled without an ICC profile.
4. `createProfiledReference()` checks the reference count but not the profile, then calls `profileBytes(null)`.
5. Reading `profile.data_base64` throws; the catch exposes the technical message. No worker or export starts.

This is an executable reproduction in the current code, not proof of the exact assets loaded in the historical public browser session. That session's served-file hashes and browser state were not available here.

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
| Actual browser save/download | **NOT VERIFIED** |
| GitHub workflow | Prepared but **NOT RUN** |
| Production/physical textile QC | **NOT_PROVIDED / NOT_MEASURED** |

Profile SHA-256: `fad691cc0f25e3d6a91942599755b7f9cf906b91f9e4f4834c3364e6c50a972d`.

Declared unchanged master SHA-256: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.

The PNG is an annotated before/after display montage, enlarged with the existing canvas interpolation. The metadata's source/PKL/output RGBA hashes describe the underlying small pixel arrays, **not the PNG file bytes or its enlarged display pixels**. The readback test reconstructs those arrays independently and checks sample locations in the PNG. The reference-card test uses row 4665; the image test separately uses four synthetic source pixels and checks their recorded master assignments.

## Why actual browser downloads remain open

- Starting native Chrome in this execution host fails before page load: `socket() failed: Operation not permitted`. This is a host restriction, not an application download result.
- The connected Browser extension was unavailable in this conversation. The dedicated cloud browser explicitly disallowed opening local file URLs. That restriction was not bypassed.
- The automatic approval reviewer rejected pushing the isolated branch to the **public** GitHub repository, interpreting the user's no-publication instruction as covering branch publication too. No remote branch or CI run was created. Explicit permission for this public branch is needed before that route is used.

The provided actual-browser suite listens to real download events, checks download completion, saves every JSON/PDF/PNG to disk, and then runs a separate Python reader. It covers HTTP and `file:` delivery, repeated exports, settings changes, profile removal/reload, and legacy import. It has been syntax checked but not executed successfully here. It must not be reported as passed.

Consequently, no general download defect is established. The old public-session download issue remains unexplained. Passing local serialization, PDF/PNG decoding and native colour checks narrows the investigation but does not settle browser permissions, multiple-download policies or the production host.

## Review package

`ATLAS_Clarus_FOGRA58_Profile_Fix_Preview.zip` is a complete **offline review candidate**, not a WordPress installer. Its builder starts from the exact RC34.8 archive (SHA-256 `ceac038f92a9c6f29e4a2421013f7c95a2db2266214b4fc6f6c6e5be06562273`). It permits changes only to embedded/asset/documented `print-ui.js`, version/manifest and checksums. **266 other base files remain byte-identical**, including master data, CorelDRAW features, ICC engines and export modules. `deployment_allowed` is false and the prior release authorization is removed from the candidate manifest. No standalone ICC is included in the application; the requested evidence PDF embeds the supplied official profile.

The accompanying patch applies to the stated base commit. Test-only dependencies include pinned `@napi-rs/canvas` to make the existing DOM/WASM integration test reproducible outside this environment.

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
