# Android beta.15 — verified release state and focused tests

Audit date: **3 November 2026**. Application ID: `com.atlasclarus.connect`.
Version: `0.4.0-beta.15`, code `15`. This is the regular app, not `.dev`.

## Verified build and Play state

| Check | Evidence / result |
| --- | --- |
| beta.14 source | `b9adff1261d57fff6abc36baac19e6e26b00c8d7` |
| Signed beta.15 source | `e6417fd9a822789fce8347419de908e149ec8f16` |
| Subsequent application-equivalent head | `d128c81c497aa19fa62d145944d926c715d09c4b`; only two ordinary-CI artifact labels changed |
| beta.14 signed APK/AAB | [Run 39758722153](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/39758722153), successful |
| beta.15 signed APK/AAB | [Run 39762489747](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/39762489747), 22 October, 12:21 CEST, successful |
| Android PR tests | [Run 40082783985](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/40082783985), 24 October, successful |
| Play upload | Code 15 uploaded 22 October, 12:31 CEST; downloaded original AAB has the identical SHA-256 shown below |
| Existing internal release | Available to internal testers, full internal rollout, since 22 October, 12:35 CEST |
| Current upload certificate | Exported DER certificate matches the reserved `98:6C:...:D6:3C` fingerprint in [SIGNING.md](SIGNING.md) |
| Public production | Not active; production access/setup remains separate from internal testing |

The Play observations were collected in a maintainer-authorized console audit.
They are dated account observations, not publicly accessible GitHub Actions
results. The underlying exports, certificate, binaries and verification outputs
are retained in the audit evidence archive. Do not publish account exports,
private keys or personal account details with this documentation.

No new beta.15 signing run or upload is required. Code 15 is already used.
The open draft status of [PR #103](https://github.com/HelabHLC/atlas-clarus-connect/pull/103)
does not imply that the signed build or internal release is missing. No merge,
new build, signing, Play upload, rollout or installation was performed by the
audit. Device Catalog terms were accepted only after explicit user confirmation.

## Package identity and effective requirements

| Preserved original | SHA-256 |
| --- | --- |
| beta14.aab | `fcb14b9d4ea61dead0c7bc57cef50d0826e62f238b388e354c1cdf16820aff11` |
| beta15.aab | `6b722c8216f07bb1ecb6e073d197a499031e7b73947182e58431aacf75eb4565` |
| beta14.apk | `ddf50f6d8aebfa1b4a957dde4c48fc3e56150ba91c45ca867f6a0c9cd47c2ead` |
| beta15.apk | `70b1cf1cad79cea12f4310034811f53f00c7035cbfe52e6202b5064cebcb3683` |

Both AABs passed `bundletool 1.18.3 validate`. Their final base manifests and
the existing release APKs were inspected. beta.15 explicitly makes all four
camera features optional: `camera`, `camera.any`, `camera.autofocus`,
`camera.flash` (all prefixed `android.hardware.`, all `required="false"`).
The beta.14 APK's implied rear-camera requirement is absent from beta.15.
AAPT2 did not separately report an autofocus or flash requirement in beta.14;
do not claim an independently measured device gain for those features.

API 26 minimum, target/compile SDK 36, AGP 8.13.2, Gradle 8.13 and Java 17
remain unchanged. `android.hardware.faketouch` remains an implied requirement.
There are no native `.so` libraries or native ABI restrictions. Both packages
have one base module and support small/normal/large/xlarge screen sizes.
Of 328 AAB entries, only the manifest, `ANDROID_CANDIDATE.json` and three
signature entries differ. DEX code and all remaining assets are byte-identical.
The RC34.4 ZIP pin remains
`0163cfd86adf51219bdc1eaf051ba0f656fca03a1fb8ae5ae8478ebcefbe976e`.

APK v2 signatures verified without reported errors/warnings. JAR verification
of each AAB returned success but reported self-signed/untrusted-chain and
no-timestamp warnings, unsigned POSIX attributes and JarFile/JarInputStream
ordering differences. All 325 payload entries verified through JarFile. The
subsequent exact-byte Play match independently confirms acceptance of beta.15.
Upload-key identity is distinct from the Play app-signing identity; see
[SIGNING.md](SIGNING.md) before considering a sideload-to-Play update.

## Device coverage: established facts and remaining limit

| Observation on 3 November | Models |
| --- | ---: |
| beta.14 support, version comparison | 17,759 |
| beta.15 support, same comparison | 18,199 |
| Net difference | **440** |
| Current supported-device export A | 18,199 |
| Same catalog filtered by exact `android.hardware.camera`, export B | 17,759 |
| A minus B, joined by `{Brand, Device}` | **440** |
| B minus A | 0 |
| Manually or rule-excluded models | 0 |

Both CSVs have unique, nonempty model keys. The difference contains 281 Tablet,
67 Desktop, 63 Phone, 27 Android Automotive, 1 TV and 1 Google Play Games on PC
entry, using Google's original categories. These categories do not establish
practical acceptance of each device class. `AG_Neovo / MeetBoard_4` was also
checked individually: internal-test support and its shown Android 13 variant
were supported.

The matching counts and unchanged requirements strongly support the camera
correction's effect. **B is a current feature-filtered general catalog, not a
direct beta.14 model export.** The general catalog can aggregate active bundles;
the inspected filters offered no version-code filter. The assignment of this
440-model cohort to the version gain is a supported inference, not a direct
historical model/variant set comparison.

The original list of 437 models reported lost on 22 October is unavailable.
The three-model difference is not explained by the evidence. Neither count
equality nor today's 440-model cohort proves that every original model/variant
was restored. Exact historical recovery requires that original keyed list and
the affected variants. Practical camera and update/data-retention tests remain
open. This historical evidence gap alone does not require a replacement build.

## Reproduce the existing evidence without creating an app

Use the preserved originals from the audit archive. Verify their hashes first.
The audit uses Google's `bundletool-all-1.18.3.jar`, SHA-256
`a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`.

```sh
java -jar bundletool-all-1.18.3.jar validate --bundle=beta15.aab
java -jar bundletool-all-1.18.3.jar dump manifest --bundle=beta15.aab --module=base
jarsigner -verify -verbose -certs beta15.aab
keytool -printcert -jarfile beta15.aab
aapt2 dump badging beta15.apk
```

The audit archive also supplies `scripts/recheck.py` and
`scripts/compare_play_catalog.py`. The latter checks the two original CSV hashes,
key uniqueness and subset relation, then emits the 440-model list as JSON. It
can compare a separately authenticated historical CSV via `--historical`.
It never authenticates a purported historical source merely from its row count.

| Preserved console evidence | SHA-256 |
| --- | --- |
| Supported models CSV A | `5a7d0d49758242c5bc9914a4b8267e51107d52f13af9c256f52eeb854038a554` |
| Camera-filtered CSV B | `bc81bf6130dadf5cf87724bbb1c15ed4cd1aca6817cd1ea36dcef7712081b4eb` |
| Public upload certificate DER | `986ca730efc54a20cfc88af4fb61018dfe7658f3165c5b6fb55eb9c59ccad63c` |

## Focused software checks

The historical Actions results above remain distinct from any new local run.
Source regressions can be run without Gradle, signing secrets or an installation:

```sh
python3 android-test-app/test_release_identity.py
node android-test-app/test-live-camera-core.cjs
node browser-bundle/tests/validate_picker_touch.cjs
node android-test-app/test-export-adapter.js
node android-test-app/test-live-camera-state.cjs
node android-test-app/test-live-camera-browser.cjs
```

The last two commands require the existing test package dependencies; the last
also requires Chromium. Their camera stream is synthetic, not a real camera or
Android WebView. Native `CameraInputTest` additionally needs Android SDK/Gradle.
Do not run assemble, bundle, signing or Play dispatch tasks for documentation.
### Local execution on 3 November 2026

Executed after preparing the documentation edits, against unchanged application
sources from `d128c81c497aa19fa62d145944d926c715d09c4b`, with Python 3.12.14,
Node 24.22.1 and dependencies from the existing npm lockfile (`npm ci
--ignore-scripts`). No new tests or application code were added.

| Check | New local result |
| --- | --- |
| `test_release_identity.py` | PASS, 12 tests, including all four optional camera declarations, private FileProvider, source hashes, version/payload pins and manual signing boundary |
| `test-live-camera-core.cjs` | PASS, all 94 real library definitions; membership, nearest RGB, deterministic ties, area averaging and invalid-data rejection |
| `validate_picker_touch.cjs` | PASS, drag/release, persistent loupe, secondary touch, cancellation, pen and mouse |
| `test-export-adapter.js` | PASS, detached export retains the original Blob and releases it on revoke |
| `test-live-camera-state.cjs` | PASS, synthetic fixed-frame handoff, torch invalidates fix, denied permission and late-stream cleanup |
| `test-live-camera-browser.cjs` | NOT RERUN: the official Playwright Chromium installation returned an incomplete ZIP (`End of central directory record signature not found`). The existing successful Actions run remains historical evidence, not a new local result |
| Native `CameraInputTest` | NOT RERUN: Android SDK/Gradle are unavailable locally; existing successful Actions evidence remains separate |
| Documentation diff | Whitespace and relative-link checks passed; application, manifest, build files, workflows and reference data unchanged |

The documentation-only commit uses `[skip ci]` to avoid triggering the ordinary
PR job, which would assemble debug and disposable-key release APK/AAB files.
This does not waive required CI for a later application change or merge. The
reserved-key workflow remains manual and was not dispatched.

## Focused physical-device plan — not executed

First record the actual test device, Android/WebView versions, installed app
version and installation source (Play or direct APK). No real device is connected
to this audit environment. Do not infer those facts from old beta.3 observations.
Installation, update, permission changes or changes to existing local work require
separate explicit approval for the named device and steps. Preserve existing
installations; never uninstall or clear data to bypass a signing mismatch.

| Case | Concrete procedure after device approval | Pass criterion | Status |
| --- | --- | --- | --- |
| D1: ordinary image use without camera | On an approved camera-less test device or device with no usable camera, import a supplied test PNG, select a pixel and export/reopen a test project | Image/reference work remains usable; unavailable camera is handled without losing the image | NOT TESTED |
| D2: camera and denial | On an approved camera-capable device, try denied access and then allowed access; test rear/front switching and cancel | Clear denial, ordinary image import still works, no microphone access, cancel preserves prior work | NOT TESTED |
| D3: fixed frame and torch | Fix one scene, move to a visibly different scene, accept; compare saved PNG and companion record. Toggle torch if available | Accepted image and RGB belong to the fixed scene; torch changes invalidate the fix; unsupported torch stays disabled | NOT TESTED |
| D4: lifecycle | During camera use rotate, background/return and cancel; repeat an import | Camera is released when appropriate; no stale stream or substituted image; retry works | NOT TESTED |
| D5: Play update and stored work | Only on a separately approved test installation with matching signing lineage: export and record test palette/project, apply the offered Play update and compare retained values/exports | Version 15 confirmed; original RGB, reference IDs, palette/project contents and export round-trip remain intact | NOT TESTED |

For each case record date, device/variant, Android/WebView version, app version,
installation source, actual steps, result and evidence filenames/hashes. Missing
hardware capability is `NOT APPLICABLE` for that case, not a successful test of
that capability. A failure stops wider rollout consideration; it does not
authorize a repair build or a change in Play.

Public production access remains separate: the audited console requested app
setup and a closed test with at least 12 opted-in testers for 14 continuous days;
it showed zero closed-test testers. Internal beta.15 availability does not
satisfy or bypass that requirement. No public release is authorized by this plan.
