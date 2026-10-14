# ATLAS × Paint by Numbers — separate offline preview 0.1

Connects the existing RC33.1/RC33.2 Colour Reduction ZIP to the facet creation algorithm from [drakarah/paintbynumbersgenerator](https://github.com/drakarah/paintbynumbersgenerator), pinned at `8c717508798525cca25548f1fb52e73025f0661a` (MIT). Unmodified upstream source and license are in `vendor/`; this adapter deliberately does not run its k-means, resizing, narrow-strip cleanup, facet reduction or smoothing.

## Use

1. In Colour Reduction, reduce an opaque image and export the complete ZIP.
2. Open `ATLAS_Paint_by_Numbers.html` locally in a modern browser and choose that ZIP.
3. Download the worksheet package: `worksheet.svg`, `coloured.svg`, `legend.html`, `atlas-number-map.json`, and the original reduction ZIP.

All processing is offline. Numbers are palette index + 1, retaining Atlas row IDs even for duplicate RGB and unused protected references. Connected regions and exact pixel edges preserve small accents. Single-pixel regions remain; labels in tiny regions may require magnification. Output can be very detailed rather than a simplified commercial painting kit. Atlas RGB swatches are not physical paint formulations.

First-preview limit: 1,048,576 pixels, 32 MiB input ZIP / 64 MiB expanded. Fully opaque input only; transparent and partially transparent images are rejected explicitly. The source dimensions are never silently changed. Large maps can take time in the browser.

Import validates listed hashes, bound input RGBA, full-master assignments and deterministic reduction against the pinned 13,283-row Atlas data. It checks source/output index arrays and output RGBA hash, then uses the recomputed assignments. It does not decode/reverify the original encoded image or PNG: frozen RGBA is the reduction input, potentially an edited Image Project frame. Hashes prove internal consistency, not authorship or physical measurement.

This is a standalone preview, not an update of the deployed WordPress/Android apps or the upstream project.

## Build and checks

`npm ci && npm run build && npm test` in this directory. Five tests cover protected one-pixel islands, 256-number mapping, recomputed assignment tamper rejection and transparency. Set `ATLAS_REAL_ZIP` for an actual alpha-containing RC33.2 fixture. Set `ATLAS_DEMO_PATH` to emit a small reproducible example ZIP.
