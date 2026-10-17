# Android beta.10 — RC34.1 internal candidate

Version `0.4.0-beta.10`, versionCode `10`, application ID `com.atlasclarus.connect`.
Payload `0.2.0-rc34.1-mixing-recipe-preview`, ZIP SHA-256
`c703ccc4145f67b6bb39ad7d69e16fc3b34b38b89cdfc2f760aef3a135bab2a5`.
The exact preview is rebuilt and verified before adding the unchanged Android adapter.
Its upstream `deployment_allowed=false` status remains intact: internal test candidate,
not a new public Browser Edition/WordPress release or Play publication.

Tool Exchange carries complete supported native documents and source bytes,
including complete reduction jobs and stored recipe documents. It opens supported
Bundle workspaces. The separate standalone Mixing Atlas importer/search is not
embedded in Android, nor are the VTracer/SVG experiments from the design session.
Colour ID v5.3.3 remains separately pinned and bilingual.

Native Java, Android manifest, app ID, HTTPS origin, storage keys, signing key and
export adapter are unchanged. VersionCode 9 is not reused. Browser master identity
and calculations remain unchanged. Gradle inputs include every nested builder,
recovered RC33.8 asset and recipe-exchange dependency.

## Export boundary

The unchanged Android native export adapter limits one saved file to 64 MiB.
The desktop Exchange carrier permits larger packages; those do not become
exportable on Android merely because they can be opened. Over-limit native exports
fail explicitly and must not be described as successfully saved. No online sharing,
code-based server retrieval, sync or autosave is added.

## Validation

- Existing release-identity guard covers beta.10, exact payload pin and unchanged
  native boundary; negative tests reject versionCodes 4–9, stale workflows and pins.
- DE/EN 14 tabs and 13,283 identical rows; same-page language change and restored
  image provenance after manual colour selection.
- Full Tool Exchange browser suite can target Android-prepared HTML, capture the
  actual AndroidExport adapter bytes and independently verify original ZIP payloads.
- CI retains the beta.8 restart regression and adds a persistent beta.9 → beta.10
  profile restart, without reseeding saved work. These are Chromium document tests,
  not evidence of a physical phone, WebView or native Save Document acceptance.
- Debug APK uses `.dev`; disposable CI signing is not the reserved update key.
- The manual signed workflow uses the existing reserved key and verifies APK/AAB
  signatures, application identity and every packaged asset.

## Remaining device acceptance

Install through the same Play testing channel as the existing Play installation.
Do not uninstall or clear app data. Export open Image Projects first (no autosave).
Check existing palettes/projects, portrait/landscape, image import, a complete
reduction-job export/reopen and complete Tool Exchange export/reopen. Verify saved
files can be opened externally. Native export and large-file failure need physical
Android checks. Play upload/submission is separate from producing a signed APK/AAB.
