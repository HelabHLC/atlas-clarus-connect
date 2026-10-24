# Browser Edition RC34.5 — Live Camera and user help

Documentation updated 24 October 2026.

## Release status

RC34.5 has a public-beta package: `manifest-rc34.5.json` records
`LIVE_CAMERA_PUBLIC_BETA_DEVICE_QA_PENDING` and `deployment_allowed=true`.
The WordPress release packager explicitly converts the build candidate to that
public-beta state. The builder below still creates a candidate first; do not
confuse its intermediate manifest with the packaged release manifest.

On 24 October 2026 the IONOS/WordPress installation reported Browser Edition
plugin 0.1.16-beta3.1, an active RC34.5 runtime path, and the public runtime
BUNDLE_MANIFEST.json returned version 0.2.0-rc34.5-live-camera with the public-beta
status. This confirms the served release identity, not physical camera acceptance.
Physical browser-device acceptance remains NOT_TESTED in that manifest.

## Build and automated checks

Complete RC34.4 workspace plus the shared live camera, without the Android bridge.
Build in a new directory:

```sh
python3 browser-bundle/build_camera_edition.py --output-dir /tmp/atlas-camera-edition
ATLAS_CAMERA_EDITION=/tmp/atlas-camera-edition/atlas-clarus-browser-bundle node browser-bundle/tests/validate_mobile_browser_camera.cjs
```

PR #104 reports successful pinned-base rebuild, candidate build, syntax and
synthetic camera tests (fixed-frame handoff, torch invalidation, permission denial
and late-stream cleanup). These use simulated frames, streams, file transfer and
PNG encoding. They are not real-decoder, full-workspace or physical-device tests.
This documentation update did not rerun the camera build or hardware tests.

## Camera → Colour Reduction → palette

1. Open the complete edition directly over HTTPS in a browser supporting camera
   access. Open Live camera beside the Colour Reduction image input.
2. Explicitly allow camera access. If denied, normal file import remains available.
3. Aim at the subject and select a reference library. The source is a central
   11 × 11-pixel mean; the nearest library reference is shown separately.
4. Fix captures and samples the same frame. The live video can continue.
   Changing library, camera or lamp clears the fixed selection.
5. Use image + selection sends the fixed PNG to the originating image input.
   The library selector is set where supported. This does not run reduction,
   add to a saved palette or set reduction protection.
6. Use Save fixed image and Save selection record to download the original camera
   PNG and ATLAS_Camera_Selection.json separately. Retain the pair together.
7. After successful image import, choose the maximum motif colours (for example
   24), output library and protection. Select Create reduced preview.
8. Compare the result, export the desired palette/PNG, and save the complete
   reduction job ZIP for further editing. Keep the separate camera evidence too.

Colour Reduction input limits still apply: 8 MiB image file, 4,194,304 pixels,
maximum edge 8192. A camera handoff is not proof of a successful tool import.
The camera requests a resolution; hardware can return another size.

## Evidence, permissions and limitations

Existing project formats do not automatically embed the camera selection record.
The JSON is not a palette backup or complete project, and its automatic reimport
as camera state is not promised. It records source/reference values separately,
library, row ID, master hash, sampling, timestamp, image name/dimensions/SHA-256,
lamp state and available camera-reported processing settings. It is unsigned;
a hash establishes consistency, not authenticated physical colour.

Camera starts only on explicit use. Closing, navigation and background stop
tracks and clear an unapplied selection. Lamp control is enabled only if the
current track supports it; a failure to confirm its state stops the camera.
Changing the lamp changes the observation and requires fixing again. It illuminates
an area, not a projected measurement point. A disabled lamp is not necessarily
a camera failure.

Ordinary downloaded tools support offline use. Live camera additionally depends
on the browser's secure-context support and permission; local-file use is not a
general camera guarantee. Camera RGB depends on lighting, white balance, exposure
and camera processing. It is not calibrated physical measurement. Source RGB and
reference RGB may differ. The 78 libraries do not grant production approval.

Original RGB and fixed ATLAS references stay separate. No Lab or delta-E is added
by this integration. The 13,283-row master, 78 visible libraries, 16 historical
definitions, image processing and existing Tool Exchange/project assets are
unchanged. The builder pins the RC34.4 base archive and preserves its files except
index.html, the manifest and checksum list; two camera modules are added.

## User-facing documentation

- [Current DE/EN camera guide and FAQ](https://github.com/HelabHLC/atlas-clarus-connect/blob/main/docs/manual/ATLAS_Clarus_RC34.5_Live_Camera_DE_EN.html)
- [Maintained interactive help source](https://github.com/HelabHLC/atlas-clarus-connect/blob/main/docs/manual/ATLAS_Clarus_Help_FAQ_RC34.5_DE_EN.html)
- [Public interactive guide and FAQ](https://arbe-lambda-star.com/atlas-clarus-interactive-user-guide/)
- [Public browser manual](https://arbe-lambda-star.com/atlas-clarus-browser-edition-user-manual/)

The current browser guidance and older native Android beta.10 instructions have
separate scopes. The web manual loader now points to the RC34.5 camera guide;
RC22 PDF/Word downloads are explicitly historical. The WordPress Browser Bundle
page also supplies camera instructions to the existing in-app text-help panel.
Page edits do not alter runtime files or master data.

## Still pending

Full workspace interaction and physical Android-browser/iPhone-Safari acceptance,
including permission recovery, rotation, lamp, background/return, real PNG/JSON
downloads and camera-to-reduction-to-job reopening. Record browser/device versions
and separate PASS / FAIL / NOT TESTED results. Android native-app acceptance
does not establish browser acceptance.
