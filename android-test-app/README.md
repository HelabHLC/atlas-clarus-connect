# ATLAS Clarus Android test app

This is an **offline, unsigned-for-release debug prototype**, not a Play Store
submission. It packages the reproducible Browser Bundle RC27 and the standalone
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

The second test APK fixes Android WebView's `blob:` export failure by reading
the original generated Blob directly. It has a separate test application ID and
appears as **ATLAS Clarus Test 2** alongside the initial prototype because CI
debug builds use different signing keys. Existing palettes remain in the first
app's private storage; export them there is affected by this bug, so add them
again in Test 2 if needed.

The updated Colour ID test APK has another application ID and installs beside
the earlier test builds. CI debug keys are not stable across runs. Use this APK
for the 14-tab workbench and Bundle start page; a future updateable beta needs
a stable signing key.

The current test app is named **ATLAS Clarus Connect**. Its second native
navigation item uses the same name. Colour ID has local Deutsch and English
pages and remembers the selected language when returning from Connect.
The image-preserving follow-up is labeled **ATLAS Clarus Connect Bildfix**
(0.3.1-test). It installs alongside the earlier CI debug APK because its
signing key may differ. Its local palettes start empty.

## Source and build

The asset preparation script rebuilds the bundle from repository source and
checks its ZIP against SHA-256
`3142adf2088734d34c98a3b0f337aab35a728d769e4b15bae420431178a140c7`.
Only then does it add the Android export adapter to the HTML entry points.
The bilingual presentation layer translates visible interface strings and
human-readable HTML reports; canonical identifiers, numeric data, evidence
JSON, and matching logic remain unchanged. The build checks that the German
and English assets have identical 13,283-row reference data.
Colour ID is fetched at build time from the public asset URL above; a local
file may be supplied through `ATLAS_COLOUR_ID_SOURCE` for an offline build,
subject to the same digest and row validation. Runtime use needs no network.

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

Known limits: there is no automated device test for the integrated 14-tab build
yet; document import, worker-backed analysis, save, and layout need physical
Android verification. The two workspaces have separate palette state. The
Bundle interface is currently English. Store rights, privacy
declarations, accessibility and release signing remain release gates.
