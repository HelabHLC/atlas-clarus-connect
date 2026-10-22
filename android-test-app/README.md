# Device compatibility correction — beta.15

Version 0.4.0-beta.15 / versionCode 15 preserves beta.14 camera behaviour and
reference data. Google Play reported 437 previously supported device models
excluded after the beta.14 upload. CAMERA permission can imply required rear
camera and autofocus features; camera.any alone does not opt out of those filters.
The manifest now explicitly marks camera, camera.any, camera.autofocus and
camera.flash optional. Normal image/project workflows remain available without
camera hardware. The source manifest regression guards these declarations.

Beta.14 was reserved-key signed in Actions run 39758722153 and uploaded to Play
as an unpublished internal-test draft. Code 14 must not be reused. Beta.15 needs
a new reserved-key signing run and verification of Play device-catalog coverage;
restoration of all 437 models is not yet claimed. APK/AAB signing, Play rollout
and physical-device acceptance remain separate checks. No automatic Play upload.

Before distribution, test camera-less/unsupported camera behaviour, permission
denial/revocation, rear/front cameras, rotation, background/restore, torch and
fixed PNG/selection handoff. Export projects before updating; never uninstall to
bypass a certificate mismatch. Existing beta.14 notes below describe behaviour
and historical preparation status, not the beta.15 release status.

---

# Live camera development candidate — beta.14

Beta.14 adds an app-owned live camera view to the existing beta.13 photo input.
This candidate is local source, not a signed APK or a device-accepted release.
The pinned RC34.4 browser archive, master identities, app ID and storage remain
unchanged. Camera scripts are Android-only overlays applied after archive checks.

**Flow:** open Live camera beside an image input → aim at the centre crosshair →
read the observed HEX and nearest ATLAS reference → Fix → Use image + selection.
The camera keeps running while the sample is fixed. Fixing captures the same
frame used to calculate the sample; accepting imports that fixed PNG, not a later
scene. It is a video-frame snapshot at the negotiated stream resolution (ideally
1920 × 1080), not the full sensor-resolution photo from the system camera option.

The sample averages an 11 × 11 source-pixel square at the frame centre, updates
at most four times per second, and matches by nearest squared RGB with lower row
ID breaking ties. Source and reference RGB/HEX are displayed separately. The
library initially follows Colour Reduction's library or the Bundle library
selector; the live view offers all 78 visible libraries. Standalone Colour ID
starts with Core and loads the same pinned master/library data. No library is
silently substituted if its references are invalid. JSON/ZIP/ICC inputs do not
get live-camera buttons. PNG-compatible image inputs receive the fixed snapshot
through their existing change handler.

**Lamp:** a torch button appears but is disabled if the active camera/WebView
cannot report torch support. An enabled command is confirmed against the camera
track's reported settings. Switching the lamp releases a fixed sample because
the illumination has changed. The result records lamp state and camera-reported
white-balance/exposure settings when available. These are not measured illuminant
values. There is no control over the LED spectrum or a guaranteed D50/D65 light.
The LED illuminates a broad area; it cannot project the crosshair onto the wall.
The crosshair is displayed only in the camera view.

The result remains a **CAMERA_ESTIMATE**. Fixing does not freeze the hardware
white balance or exposure; it preserves the already sampled frame and values.
A selection card lets the user save the PNG and a companion JSON record with
coordinates, area size, observed RGB, reference ID, library, master hash, timestamp
and image SHA-256. Current tool-project formats do not embed this camera record;
save both files together to retain that evidence.

Android requests CAMERA permission only on camera use. The WebView grants only
video access to the exact local app origin, never microphone access. No network
or broad storage permission is introduced. Denial leaves existing image import
available. Closing, navigation or backgrounding stops the video tracks; late
permission/stream results are discarded. Camera switching and library changes
release any fixed sample. Torch support, focus, exposure, image orientation and
WebRTC availability still require actual-device acceptance.

**Validation:** the core test checks all 94 library definitions (78 visible and
16 historical), exact membership, tie handling and averaging. Synthetic UI tests
cover fixing while the scene changes, image/record handoff, lamp changes,
permission denial and late-stream cleanup. Prepared assets and all three HTML
entry points are checked against source hashes. Existing locale, provenance,
touch and export checks are retained. A real Chromium video/PNG test and Android
Robolectric permission/intent tests are configured for CI. Locally, the Chromium
download was incomplete; Android SDK/Gradle are unavailable. Neither those tests,
an APK build, nor physical camera/torch behaviour is claimed as verified.

Before distribution, test rear/front cameras, denied/revoked permission, back,
background/restore, rotation, lamp availability and light changes on a real
Android device. Verify that a moved scene after Fix cannot replace the accepted
sample, and that the saved PNG reproduces the companion record's centre RGB and
reference within the selected library. Check imports and existing project exports
in Image Picker, Colour ID, Colour Reduction and Softproof Preview.

---

The following beta.13 notes are historical. Beta.14 adds the CAMERA permission
and live camera functionality described above.

# Camera input development candidate — beta.13

This branch builds on the beta.12 touch-loupe fix and keeps its pinned RC34.4
browser payload and master references. The changed native app has versionCode
13 / versionName 0.4.0-beta.13. It has not been signed, distributed or accepted
on a physical device.

Opening a single-image input that accepts JPEG now offers **Take photo / Foto
aufnehmen** and **Choose image / Bild auswählen**. This shared native chooser
serves the existing image inputs in Image Picker, Colour ID, Colour Reduction
and Softproof Preview without separate camera code in each tool. Existing
in-tool limits and decoders still apply. Inputs for JSON, ZIP, ICC and other
non-image documents retain their document picker. PNG-only inputs do not offer
a JPEG camera capture.

The system camera activity takes a full-resolution JPEG and returns it to the
original WebView file callback. This is an app-launched system camera, not an
embedded live camera view. A non-exported FileProvider exposes only the private
camera cache, through temporary read/write grants. No CAMERA, storage or network
permission is added. Confirmed photos remain in app cache for asynchronous
WebView reads and are removed when the activity is destroyed; Android can also
evict cache files. Aborted/empty captures are removed immediately. A photo is
not automatically added to the public gallery. Process termination during
capture requires reopening the image import and taking the photo again.

Camera RGB is an image observation, not a physical colour measurement. Existing
reference, reduction and project workflows apply after import. This change does
not add cross-tool image synchronization.

Validation: release identity, touch regression, export adapter and diff checks
pass locally. Robolectric camera tests are added to Android CI; Android SDK and
Gradle are unavailable in the editing environment, so those tests and the APK
build still require CI. No physical-device camera test is claimed.

Device acceptance before distribution:

1. In each JPEG-compatible image tool, photograph a detailed subject; confirm
   the full-size image is loaded in that tool and existing processing works.
2. Cancel the source dialog, cancel the camera, and return with the Android back
   gesture; the previous image must remain and another import must work.
3. Choose an existing image; check JSON/ZIP/ICC imports still open documents.
4. Capture portrait and landscape images, switch front/back camera, rotate,
   and background/restore the app. Verify orientation and EXIF decoding.
5. Test missing camera handler, empty output, limited storage and a large JPEG;
   verify a clear failure and working retry without losing the previous image.
6. Save/reopen an image project and compare source bytes and reference identity.

---

The following baseline notes describe beta.12 and its predecessors; the camera
candidate and its outstanding acceptance checks above take precedence.

# Android test app

## Current preparation: 0.4.0-beta.11 / versionCode 11

Uses the exact RC34.4 payload deployed in the Browser Edition, SHA256
0163cfd86adf51219bdc1eaf051ba0f656fca03a1fb8ae5ae8478ebcefbe976e.
There are 78 new-work choices and 16 retained legacy definitions. Master, app ID,
origin, native Java, storage contracts and export bridge remain unchanged.
See BETA11_PREPARATION.md for scope, upgrade checks and release status.

## Previous preparation: 0.4.0-beta.10 / versionCode 10

This development candidate packages the exact RC34.1 Tool Exchange preview.
See [BETA10_PREPARATION.md](BETA10_PREPARATION.md) for scope, build pins, update
checks, export limits and outstanding physical-device acceptance. It retains
the existing application ID, native signing boundary and WebView origin/storage.
VTracer/SVG experiments and standalone Mixing Atlas recipe search are not embedded.

## Historical preparation notes

## Current preparation: 0.4.0-beta.7 / versionCode 7

This candidate brings the reviewed **RC32.1 Colour Reference Card** into the
existing Android app. Colour Handoff exports a ZIP containing a printable,
standalone HTML card, full `palette.clarus.json`, `reference-card.json` and a
checksum manifest. The two original greens remain separate sources and decisions
although they share ATLAS row 4966. Unknown provenance stays explicitly unknown.
There is no new app, storage migration, automatic WordPress activation or Play upload.

- Builder: `build_colour_reference_card_pilot.py`.
- Bundle version: `0.2.0-rc32.1-colour-reference-card`.
- ZIP SHA-256: `d61cc48bc38b9e3a71a54d93bf4147b9a3eaa1a94bab0d0a413a382a683eb616`.
- Unchanged source-binding correction: PR #70, commit
  `9b0f2c9799879da65f0f8f02b702595b1336ae24`.

See [BETA7_PREPARATION.md](BETA7_PREPARATION.md) for update acceptance and limits.
The earlier beta.6 now has a successful [reserved-key APK/AAB build](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38066171773)
at `3bb3f7ca67d9aeeec74f4d930688ebf745eb3b9d`. Its preparation note remains a
historical record, not the current signing status. A successful build alone
proves neither installation nor Play submission. Version code 6 is not reused.
The default RC28 builder, frozen WordPress downloads, public release tags and
ATLAS master are unchanged. Android does not load a moving website ZIP at runtime.

## Application and data identity

Release application ID stays `com.atlasclarus.connect`; debug adds `.dev` and is
**not an update of the existing app**. The reserved beta signing workflow stays
manual and retains its certificate checks. Private keys are never committed.
Earlier signed beta.4 used RC27; beta.5/RC28 was a separate source candidate.
Historic evidence is retained in [DEVICE_TEST_LOG.md](DEVICE_TEST_LOG.md).

The app packages the offline Bundle and separate Colour ID v5.3.3, with 14 tabs
and DE/EN switching. Colour ID is pinned to SHA-256
`580d4447193a736ad47a04a876a7437f757b98491836f6a3e8abaa9714769bff`.
All 13,283 identity/RGB/Lab rows are checked against the Bundle master:
`8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.
Primary assignment remains RGB-only. Spectral and ICC views are analysis,
not a change to reference identity or measured production approval.

The start screen is Connect `#home`. The native top bar switches to Colour ID;
re-selecting Colour ID does not reload its open document. Its in-page language
switch retains the loaded image. Bundle and Colour ID have separate local
workspaces; browser palettes are not automatically imported into the app.
The HTTPS asset origin and private WebView storage are unchanged, and the
native storage/export boundary is byte-identical to beta.6. A persistent-profile
beta.6 → beta.7 browser regression checks stored palettes, Colour Projects,
revisions and choices. A real in-place Android update remains a separate gate.

## Offline files and source verification

There is no INTERNET permission. Credits open the system browser. Image/JSON/ZIP
imports use Android's document picker; exports use Save Document. One export
is limited to 64 MB. Colour ID image traces retain original image bytes and
reject image sources over 24 MiB. Image Projects separately allows PNG/JPEG
up to 8 MiB, 4,194,304 pixels and 100 recorded editing events, with no autosave.
Export your project before closing, navigating to another native workbench,
or performing an update. Local storage is not a backup.

Image Projects re-decodes the embedded original in the current engine and
requires exact dimensions and every initial RGBA byte. A difference rejects
the import without silently replacing the current workspace. Legitimate
JPEG/EXIF/ICC/alpha decoding differences between browsers can also reject an
unchanged project: preserve the original file and use the creating environment;
do not weaken verification or overwrite frozen pixels. This establishes local
source/pixel consistency, not authorship or authenticity of external origin.

## Build and checks

Use JDK 17, Android SDK Platform 36 / Build Tools 36.0.0 and Gradle 8.13:

```sh
python3 android-test-app/test_release_identity.py
gradle -p android-test-app :app:assembleDebug
```

Asset preparation rebuilds and checks the exact candidate ZIP before adding the
Android export adapter and Colour ID. An optional `ATLAS_COLOUR_ID_SOURCE`
provides a local source HTML, still subject to its checksum and row validation.
`ANDROID_CANDIDATE.json` records build identity, not device acceptance.

Android PR CI checks version/pin/source contracts, debug and disposable-key
release APK/AAB contents, existing DE/EN/provenance/export tests and source-binding
regressions against Android-prepared HTML in desktop Chromium. It also tests
actual card exports through the Android JavaScript adapter, full JSON/ZIP
reopening across the update, and two complete A4 reference-card pages. The exact corrected
modules must appear both in packaged assets and the embedded index HTML.
Android's name-index `.json.gz` to `.json` expansion is explicitly verified.
Disposable-key release files are deleted and never uploaded. Only the separate
DEBUG artifact is available from ordinary CI; it cannot demonstrate update
compatibility with the installed release. Desktop Chromium is not Android WebView.

Reserved-key APK/AAB generation is manual via [SIGNING.md](SIGNING.md). The workflow
does not upload to Play. Matching Play-signing and sideload certificates must be
checked before selecting an update path; never uninstall the existing app just
to force a differently signed APK onto the device. Device tests, existing-track
Play submission, store/privacy/rights checks and production access remain distinct.
