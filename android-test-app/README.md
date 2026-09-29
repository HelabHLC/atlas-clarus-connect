# ATLAS Clarus Android test app

This is an **offline, unsigned-for-release debug prototype**, not a Play Store
submission. It packages the reproducible Browser Bundle RC27 as local Android
assets and opens its built-in Image Picker at `#picker`. Picker → Hover → Wheel,
the frozen reference binding and all other bundle views use the unchanged
bundle code and reference data.

The app has no INTERNET permission. External credit links open the system
browser. Image and JSON imports use Android's document picker. Generated ASE,
GPL, JSON, CSS, PDF and PNG exports are handed to Android's Save Document dialog;
the prototype limits a single export to 64 MB. Palettes use this app's private
WebView storage, so a browser's palettes are not automatically imported.

The separate 14-tab Colour Picker v5.3.3 is not copied into this first build.
The Bundle's Image Picker is the entry point; the detailed Colour ID workbench
can be integrated later without changing the reference identity.

The second test APK fixes Android WebView's `blob:` export failure by reading
the original generated Blob directly. It has a separate test application ID and
appears as **ATLAS Clarus Test 2** alongside the initial prototype because CI
debug builds use different signing keys. Existing palettes remain in the first
app's private storage; export them there is affected by this bug, so add them
again in Test 2 if needed.

## Source and build

The asset preparation script rebuilds the bundle from repository source and
checks its ZIP against SHA-256
`3142adf2088734d34c98a3b0f337aab35a728d769e4b15bae420431178a140c7`.
Only then does it add the Android export adapter to the HTML. This pin ensures
that the app's reference data correspond to the published RC27 candidate.

Use JDK 17, Android SDK Platform 36, Build Tools 36.0.0 and Gradle 8.13:

```sh
gradle -p android-test-app :app:assembleDebug
```

The GitHub Actions workflow produces an APK artifact from a runner with the
Android SDK already provisioned. It does not install SDK packages or accept
SDK agreements. Install the resulting debug APK only on a test device you
control. This build is not signed with a release key.

## Test checklist

1. Launch offline; the Bundle Image Picker should appear.
2. Import a local PNG and sample a pixel. Check the HLC and `atlas_row_id`.
3. Open the reference in Hover, add it to a palette, then navigate to Wheel.
4. Export Clarus JSON, save it through Android, and import it again.
5. Rotate the device and repeat on a narrow phone screen.

Known limits: there is no automated device test yet; document picker and
download bridge require testing on physical Android devices. The Bundle
interface is currently English. App Store rights, privacy declarations,
accessibility and release signing remain separate release gates.
