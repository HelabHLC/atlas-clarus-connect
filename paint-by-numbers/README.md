# ATLAS × drakarah — standalone offline preview 0.3

Direct image → ATLAS RGB-only reduction → drakarah Paint by Numbers contour pipeline. Independent HTML application; no bundle, WordPress or Android integration and no ZIP input required.

## Use

Open `ATLAS_Paint_by_Numbers.html` locally in a modern browser, select PNG/JPEG/WebP, choose 1–256 colours, optionally click important accents to protect their Atlas references, and click “Malvorlage erzeugen”. Download numbered SVG, coloured SVG, HTML legend and JSON map individually. Original pixel RGB and assigned Atlas RGB are shown separately. Protection is global and counts towards the colour limit.

## Pipeline and provenance

1. Unchanged ATLAS `ATLAS_RGB_WEIGHTED_MEDOIDS_V1` reduction core from RC33.2, with full-master RGB nearest assignment and lower-row-ID tie break. No Lab/Delta-E. Original RGBA/source hashes remain separate from reference/output RGB.
2. Unmodified drakarah `FacetCreator` consumes the selected palette index map directly, bypassing upstream k-means.
3. Unmodified `FacetBorderTracer` traces regions.
4. Unmodified `FacetBorderSegmenter` matches shared segments with zero point-halving passes.
5. Unmodified `FacetLabelPlacer` determines label positions. Adapter checks each label against its source region and uses a source-pixel fallback when needed.
6. SVG renderer uses upstream wall geometry shifted from pixel-centre to SVG coordinates. These vector outlines are not identical to the previous pixel-edge renderer. Numbers remain palette index + 1, preserving distinct Atlas row IDs and unused protected entries.

Upstream: https://github.com/drakarah/paintbynumbersgenerator, pinned commit `8c717508798525cca25548f1fb52e73025f0661a`, MIT; source and license in `vendor/` (line endings normalized in repository). Upstream resizing, k-means, narrow-strip cleanup and facet deletion are intentionally bypassed to retain protected pixel assignments. Geometry simplification is off. A full upstream GUI is not embedded; this standalone interface drives its contour/label engine.

## Limits

Fully opaque input only, max 1,048,576 pixels / 16 MiB. No automatic resize or alpha flattening. Single-pixel islands retain numbers, which may require zoom. Detailed photos can produce many small regions; this is a test preview rather than a simplified commercial painting kit. Atlas RGB is a reference, not a paint formulation. Hashes establish consistency, not authorship or physical measurement.

## Reproduction

`npm ci && npm run build && npm test` in this directory. Node checks cover protected islands, 256 reference numbers, tamper rejection, alpha, direct reduction and nested-region contours/labels. Browser acceptance in CI decodes an actual PNG, protects an accent by click, generates and downloads SVG. Standalone HTML embeds all required code and data; no CDN or server is needed. Legacy reduction-ZIP reader remains developer-only.
