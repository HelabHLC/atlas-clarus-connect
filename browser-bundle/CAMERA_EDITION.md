# Browser Edition RC34.5 camera candidate

Complete RC34.4 workspace plus the shared live camera, without the Android bridge.
Build in a new directory:

```sh
python3 browser-bundle/build_camera_edition.py --output-dir /tmp/atlas-camera-edition
ATLAS_CAMERA_EDITION=/tmp/atlas-camera-edition/atlas-clarus-browser-bundle node browser-bundle/tests/validate_mobile_browser_camera.cjs
```

Live camera buttons appear beside eligible image inputs, including Image Picker,
Image Projects and Colour Reduction. Open the complete index.html over HTTPS in a
top-level Chrome or Safari page. Select a library, Fix, then Use image + selection.
The fixed PNG goes into the originating tool; save its PNG and selection JSON
separately to retain the original camera evidence. Existing project formats do not
embed that record. Camera access starts only on explicit use; permission denial
leaves normal file import available. Closing, navigation and background stop tracks.
Torch is shown only when the track supports it and its state can be confirmed.
Offline file use still supports ordinary tools; live camera depends on the browser's
secure-context support. Camera RGB is an observation affected by camera processing
and lighting, not a calibrated physical measurement.

Original observed RGB and fixed ATLAS reference remain separate. No Lab or delta-E
is introduced by this integration. The existing master and 78 visible libraries,
16 historical definitions, image processing and Tool Exchange assets stay unchanged.
The build asserts the exact RC34.4 base archive checksum and preserves every base
file except index.html, the manifest and checksum list. The self-contained index
embeds both camera modules, with inspectable copies under assets/.

Candidate status: not deployed. Desktop integration and physical mobile-browser
acceptance, including iPhone/Safari, orientation, download and torch checks, remain
release gates. Android device acceptance is not browser acceptance. Website and
WordPress installation require the reviewed candidate and a deployment step.
