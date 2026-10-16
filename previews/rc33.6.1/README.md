# ATLAS Clarus RC33.6.1 — Offline Preview

[Download the offline preview ZIP](ATLAS_Clarus_RC33.6.1_Cleanup_Preview.zip?raw=true)

Choose an output reference library, protect selected references or inclusive image rectangles, reduce the colour count and clean up small unprotected colour areas using the existing palette. Unzip the download and open `atlas-clarus-browser-bundle/index.html` in your browser.

This is an experimental offline preview, not an update to the public WordPress application or Android app. RGB-only digital reference mapping is not physical print approval.

## Validation

Core library, protection, cleanup, legacy rectangle and package checksum tests passed locally. User browser export comparisons verified the unchanged output palette and alpha, 20,302 unchanged pixels for a protected reference, and all 25 converted pixels in a 5×5 protected rectangle unchanged across cleanup. The rectangle contained 24 original RGB colours mapped to five library references.

Automated browser test: [GitHub Actions](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38844573023). Check its current conclusion before relying on automated browser acceptance.

[Source and review: PR #88](https://github.com/HelabHLC/atlas-clarus-connect/pull/88)

## SHA-256

`2fd9d575b641058ff0cf681da15068569db7a50228fb21e692f77b339032aae4  ATLAS_Clarus_RC33.6.1_Cleanup_Preview.zip`
