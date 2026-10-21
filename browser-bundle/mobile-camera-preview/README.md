# Mobile browser camera preview

A standalone curiosity preview, separate from the public RC34.4 Browser Edition
and the beta.14 Android payload. It uses the same frozen master and camera core,
and reuses the Android camera UI through a build-only browser opt-in. No Android
source, version code, archive pin, WordPress plugin or existing website is changed.

Build:

```sh
python3 browser-bundle/build_mobile_camera_preview.py --output-dir /tmp/atlas-mobile-camera
node browser-bundle/tests/validate_mobile_browser_camera.cjs
```

Host the generated directory over HTTPS. Open the top-level URL in a mobile
browser (not a cross-origin iframe); allow camera access. Fix captures the frame
used for the selected sample, while the live preview continues. Use imports
that exact PNG into the local preview. The record and image can be downloaded.
A manually opened image supports centre sampling or tapping an area. The camera
requires secure context and a supported getUserMedia implementation. Torch is
available only when the active track exposes and confirms it. No upload service,
analytics, microphone, account connector or cloud storage is used by this app.

All 13,283 immutable rows and 78 visible library choices come from the existing
GitHub data. Mean RGB and deterministic nearest reference matching use the
reviewed core; smaller row ID breaks exact ties. Source RGB remains distinct
from reference RGB. Camera results remain estimates, not physical measurements.
A selected library is a documented reference selection, not production approval.

Browser QA: local image load and reference output verified through the managed
browser. Local preview runs over HTTP and therefore deliberately disables live
capture. Real Android-browser and iPhone/Safari camera, orientation, torch,
background lifecycle and file downloads still need physical-device acceptance.
The existing Android smartphone observations do not establish browser acceptance.

New hosting is private by default. Sharing with LinkedIn readers requires an
explicit public-access request and a verified HTTPS publication.
