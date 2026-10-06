# ATLAS Clarus Android test app

The current source is the **0.4.0-beta.5 / versionCode 5 development candidate**,
not a Play Store submission or a newly signed beta. It packages the reproducible Browser Bundle RC28 and the standalone
Colour ID v5.3.3 with its 14 analysis tabs as local Android assets in German
and English. The Bundle start page opens first at `#home`; the native top bar
labels it **ATLAS Clarus Connect** and switches to Colour ID in the last selected language.
Colour ID's language bar switches between Deutsch and English in place while
offline. The loaded image, pixel selection and workbench state remain available.
Picker → Hover → Wheel and all other bundle views retain the unchanged bundle
code and reference data.

The app has no INTERNET permission. External credit links open the system
browser. Image and JSON imports use Android's document picker. Generated ASE,
GPL, JSON, CSS, PDF and PNG exports are handed to Android's Save Document dialog;
the prototype limits a single export to 64 MB. Palettes use this app's private
WebView storage, so a browser's palettes are not automatically imported.

The Colour ID source is pinned to SHA-256
`580d4447193a736ad47a04a876a7437f757b98491836f6a3e8abaa9714769bff`
from the public WordPress plugin asset. At build time the source is checked
against this digest and all 13,283 rows are compared to the Bundle master for
`atlas_row_id`, HLC reference, RGB, HEX and Lab. The same master SHA
`8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`
is required. Colour ID remains a separate workbench with its own local state;
the top bar switches between the two interfaces rather than merging their
palette records. Its spectral and ICC views are preserved as analysis only.

The device log includes limited phone observations through `0.4.0-beta.3`.
The fixed release application ID remains `com.atlasclarus.connect`.
The recorded signed beta.4 / versionCode 4 APK and Play AAB used RC27;
RC28 requires the new `0.4.0-beta.5` / versionCode 5 identity. Never rebuild a
changed payload as beta.4. The beta.3 observations do not establish beta.5
device acceptance or palette migration.
The native Colour ID button does not reload an already open
Colour ID page, preserving its in-memory image. The Android export adapter reads generated Blobs directly so
the Save Document dialog works for detached download links. The language
switch stays in the same Colour ID document. After a manual RGB/HEX binding,
a later image-pixel selection restores the loaded image's file provenance;
manual selections themselves record no source image. None of these adapters
changes the pinned master or primary RGB assignment.

For an `IMAGE_PIXEL` selection, Traceability JSON now embeds the exact loaded
image bytes in `source_image.bytes_base64`, alongside its MIME type and size.
The exporter checks those bytes against `source_image.sha256` before saving.
This makes the selected coordinate and RGB independently verifiable from one
file. Images larger than 24 MiB are rejected with a clear message because the
Android export adapter caps a single file at 64 MB. Other selection origins
retain the existing JSON shape.

Earlier CI debug builds used different application IDs and signing keys. They
install alongside the new beta; each app has separate private palette storage.
The release build requires the long-lived key described in
[SIGNING.md](SIGNING.md). Earlier signed betas and their limited phone
observations are documented; beta.5 has not been signed with the reserved key
or distributed by this change. Confirmed
phone observations and remaining checks are recorded in
[DEVICE_TEST_LOG.md](DEVICE_TEST_LOG.md).

## Source and build

The asset preparation script rebuilds the bundle from repository source and
checks its ZIP against SHA-256
`79a7b9a3df20d0ba6e2620b1d16d39316cce5d2c8534b622d7260fe896da12d8`.
Only then does it add the Android export adapter to the HTML entry points.
The bilingual presentation layer translates visible interface strings and
human-readable HTML reports; canonical identifiers, numeric data, evidence
JSON, and matching logic remain unchanged. The build checks that the German
and English assets have identical 13,283-row reference data.
Colour ID is fetched at build time from the public asset URL above; a local
file may be supplied through `ATLAS_COLOUR_ID_SOURCE` for an offline build,
subject to the same digest and row validation. Runtime use needs no network.

`test_release_identity.py` checks the reviewed version/code/RC28 tuple and
both Android workflows, including rejection of versionCode 4, the RC27 pin,
and stale beta.4 names. It runs in regular validation, Android CI and before
the manual signed workflow accesses signing secrets. `prepare_bundle.py`
still rejects any change to the pinned bundle bytes. A future bundle or
Android payload update requires review and a new Android version/code once
the current identity has been used for a signed candidate.

Android CI builds the debug APK and release APK/AAB with a disposable CI key.
It checks APK version identities, signatures and every packaged asset against
the prepared RC28/Colour ID payload. Android expands
`assets/name-search-index-v030.json.gz` into `.json` during packaging; this one
representation change is checked against the exact decompressed source bytes,
with no missing/extra files allowed. The disposable release files are deleted;
only the debug APK is uploaded. These checks do not establish real-device
acceptance. The reserved-key signed workflow remains manual and does not
upload anything to Play. Merging this PR can publish the moving browser ZIP
through `publish-browser-bundle.yml`; that is separate from Android signing
and live WordPress activation.

The matching WordPress plugin can be rebuilt from the archived v0.1.0 ZIP and
the same pinned source with `build_wordpress_plugin.py --base-zip ...
--source-html ... --output ...`. Its shortcode accepts `lang="de"` or
`lang="en"`; `auto` selects English only when the WordPress locale starts
with `en`. A page URL with `?lang=de` or `?lang=en` takes precedence so its
embedded picker and full-screen link use the same language. The in-frame
language switch remains available in either case.

Use JDK 17, Android SDK Platform 36, Build Tools 36.0.0 and Gradle 8.13:

```sh
gradle -p android-test-app :app:assembleDebug
```

The GitHub Actions workflow produces an APK artifact from a runner with the
Android SDK already provisioned. It does not install SDK packages or accept
SDK agreements. Install the resulting debug APK only on a test device you
control. This build is not signed with a release key.

## Test checklist

1. Launch offline; the Bundle start page should appear, not either picker.
2. Select Image Picker from the Bundle navigation and sample a local PNG.
3. Switch to Colour ID; change Deutsch ↔ English, check all 14 tabs, import a PNG, and compare the
   HLC and `atlas_row_id` to the shared Bundle reference.
4. Export from both interfaces and save through Android's document picker.
5. Rotate the device and repeat on a narrow phone screen.

Known limits: beta.5 device installation, update/palette retention, RC28 image
decoding and smartphone visual acceptance are **NOT TESTED**. There is no
automated device test for the integrated 14-tab build.
The 0.3.3-test APK was checked for image retention on repeated Colour ID
selection, offline launch and a saved Traceability JSON export.
Document import, worker-backed analysis, layout and additional exports need
physical Android verification. The two workspaces have separate palette state.
The Bundle interface is currently English. Store rights, privacy
declarations, accessibility and release signing remain release gates.
