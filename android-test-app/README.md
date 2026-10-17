# ATLAS Clarus Android test app

## Current preparation: 0.4.0-beta.10 / versionCode 10

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
