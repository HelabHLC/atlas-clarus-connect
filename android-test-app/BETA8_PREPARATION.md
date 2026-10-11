# Android beta.8 — RC32.2 Image Exchange preparation

Update identity: application ID `com.atlasclarus.connect`, versionName
`0.4.0-beta.8`, versionCode `8`. RC32.2 bundle SHA-256:
`e2475f407ac77318662275f9a3c0ae006fc62135d1a87d7c5a64659a5c083f79`.
The preceding signed beta.7 source is
`9e369afc439f3cf22fdac34ef0a302c60f5ccfa6`. Its version code is not reused.

The native Activity, AndroidManifest, export adapter, HTTPS asset origin, app ID
and WebView storage boundary are unchanged. Colour Reference Cards are retained.
PR #70 source binding was already in beta.7. Beta.8 adds #75 handover help and its
honest compatibility boundary; the external desktop helper does not run on Android.

The actual beta.7 → beta.8 document update is tested with one persistent Chromium
profile: two palettes with original source records, two Colour Projects, chosen
and working revisions, saved Image Project JSON/ZIP including history, and card
ZIP exports through the unchanged Android adapter. Tests preserve stored values
exactly. This is a desktop regression, not a physical Android update test.

`test_release_identity.py` rejects reused versions, stale bundle/source pins and
automatic signing. `test_packaged_bundle.py` compares every packaged asset in APK
and AAB to the prepared payload. The signed workflow stays manual and protected
by `android-beta-signing`, using the existing reserved certificate:
`986ca730efc54a20cfc88af4fb61018dfe7658f3165c5b6fb55eb9c59ccad63c`.
No signing credentials or application identity are changed.

Before a real update, save open Image Projects outside the app as JSON/ZIP (no
autosave), plus palette/project backups. Use the existing Play test track for a
Play-installed app; a sideload APK may have a different certificate from Play App
Signing. Do not uninstall, clear data, force a downgrade or use the `.dev` debug
build as an update. Retest retained selections/history and the native document
picker on the device. Physical-device acceptance and Play upload are separate
from the preparation/build evidence.
