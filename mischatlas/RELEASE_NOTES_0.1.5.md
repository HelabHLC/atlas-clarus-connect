# ATLAS Clarus Mixing Atlas 0.1.5 — reference status correction

Fixes the stale success message reported during the live visual review of 0.1.4. After changing the target, the status now says "Reference changed. Calculate a recipe for this reference." This works after a completed search and while a search is running. The previous result is cleared and JSON preparation remains disabled until a new recipe exists.

Status messages for light, palette and search-setting changes are also shown when no worker is running. Worker cancellation and all numerical calculations are unchanged.

The existing Chromium test now checks the reference-change message, empty recipe and removal of the result swatch. The original reference/recipe payload, spectra, light data, mixing kernels, candidate search and result calculations are unchanged. Packaging updates the displayed version and WordPress cache key to 0.1.5.

This correction does not close the separate outstanding mobile live visual inspection. Earlier automated checks and the 0.1.4 review remain historical evidence; no physical mixture accuracy or production approval is claimed. All existing source-specific licences and attribution remain in force.
