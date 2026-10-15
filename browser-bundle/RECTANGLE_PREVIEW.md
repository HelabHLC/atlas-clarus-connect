# Rectangle protection offline preview

RC33.4 adds source-pixel rectangles on top of the pinned RC33.3 original-RGB preview. No frozen master or existing release module changes.

## Using it

1. Open Colour Reduction and load an image. Select a pixel in the input image. Refine the selection using the11×11 loupe or arrow keys.
2. Choose **Set first corner from selected pixel**. Select the opposite corner and choose **Protect rectangle to selected pixel**. Bounds are zero-based and inclusive. Reversed corner order is normalized. A one-pixel rectangle is supported.
3. Green input-preview outlines identify selected rectangles. Outlines are annotations only; they never enter the PNG or input RGBA evidence. Remove a rectangle with its listed button. **Cancel pending corner** cancels only the unfinished selection.
4. Create the preview. Every RGBA pixel inside the union of rectangles remains byte-exact, including partial alpha and hidden RGB of transparent pixels. Outside pixels continue through reduction unless globally protected by the separate original-RGB feature.

At most64 rectangles. Each distinct visible protected RGB reserves one output slot; overlaps and shared RGB within rectangles share slots. Atlas reference slots remain separate. If the palette budget is insufficient, computation fails without discarding protection, increasing the limit, or enabling stale exports. Fully transparent colours require no visible output slot. A wholly transparent source remains rejected as before.

This is no guarantee of spatial contrast outside the selection: surrounding pixels may independently map to a colour also present within the protected area. It preserves input pixels inside the region; it does not force surrounding colours away. Source values are the browser-decoded sRGB RGBA8 values, not physical textile measurements or necessarily the file's pre-decode channel values.

## Evidence and exports

Region runs use schema1.2 and a distinct method identifier. `rectangle_protection` records inclusive coordinates, union counts, visible and transparent counts, and mask semantics. `protected-pixel-mask.u8` stores one byte per input pixel, row-major:1 for selected rectangle or global original-RGB protection,0 otherwise. Every marked RGBA pixel must equal input-rgba.bin at the same coordinate. Full-master reference assignment is retained independently. Original output entries have no master row identity of their own; they carry separate source reference provenance.

PNG and GPL/ASE/CSS/Tokens contain the mixed output. Clarus chunks contain ATLAS reference entries only and cannot restore the mixed output or protected areas. Keep the complete ZIP; no reduction-job importer is supplied. Checksums establish consistency, not authorship or trusted origin.

## Validation

New core tests cover byte-exact source values, transparency, scope outside rectangles, overlap, inclusive endpoints, single pixels, transparent-only selections, all-protected images, malformed bounds, limits, global-RGB coexistence and no mutation. Browser CI tests corner selection through the loupe, cancellation, source reset, mask export and independent Python reconstruction. Existing original-RGB browser and legacy reduction suites run against the region preview.

Local new and previous core tests passed. Graphical CI status is recorded in the PR after completion. Physical devices, manual local acceptance and live deployment remain separate and untested until explicitly recorded. Build with `python browser-bundle/build_rectangle_preview.py`; the builder verifies the pinned RC33.3 SHA256 before creating the separate preview. Deployment flag remains false. WordPress and Android pins are unchanged.
