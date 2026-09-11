# ATLAS Clarus Browser Bundle

This directory builds a standalone offline HTML edition of ATLAS Clarus Connect.

## Build

```bash
python3 browser-bundle/build_bundle.py
```

The generated ZIP opens through `atlas-clarus-browser-bundle/index.html` without a web server. CSS, JavaScript and all 13,283 references are embedded directly in that entrypoint, so it also works when Windows opens the HTML directly from inside the ZIP.

RC19 adds optional 5 × 5, 11 × 11 and 21 × 21 area-mean sampling while retaining
single-pixel sampling as the default. Samples are clipped at image boundaries;
pixels with alpha below 128 are excluded. Mean RGB uses per-channel arithmetic
means rounded with JavaScript `Math.round`, and channel variation is reported as
population standard deviation for diagnostics only. Executable numerical vectors
cover mean and rounding, boundary clipping, the alpha threshold, empty selections,
valid-pixel counts and standard deviation.

The bundle provides several named palettes across Hover and Wheel. Palettes remain in
local browser storage and export as ASE, GPL, Figma Tokens JSON, CSS or Clarus JSON.
Users can select, rename, duplicate, delete and reorder palettes, and re-import a
Clarus JSON palette only after its master and exact identities validate.
An offline FAQ explains palette use, identity retention and claim boundaries.
A visible Credits & Licensing tab acknowledges freieFarbe e.V., distinguishes
upstream reference data from ATLAS modifications and states the licence map.
The licence summary is part of the self-contained entrypoint; it does not rely on
the browser extracting a relative `docs/` file from the ZIP.
On smartphones, an accessible hamburger menu exposes every section and closes
after selection, outside click or Escape.

## Release boundary

- Status remains `READY_PENDING_VISUAL_AUDIT` until desktop and smartphone browser QA passes.
- The ZIP uses fixed metadata and is byte-for-byte reproducible from the same source tree.
- GitHub Actions rebuilds the bundle twice, verifies reproducibility, internal checksums and export round-trips.
- The package does not alter reference binding, the active master, or the frozen A′ v0.4 selection logic.
- Interaction Wheel v0.5 content is diagnostic-only.
- Desktop application sections are documented workflow demonstrations, not embedded native integrations.
- Appearance output is simulated and never measured QC.
