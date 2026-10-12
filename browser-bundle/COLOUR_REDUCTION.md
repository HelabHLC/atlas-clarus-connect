# Colour Reduction 0.1 — RC33 candidate

Adds an offline Colour Reduction workspace to the exact RC32.2 payload. Select
1–256 motif references, keep selected Atlas references, compare the input with
the derived image, export PNG and GPL / ASE / CSS / design tokens.

## Workflow

1. Open **Colour Reduction** in the main navigation.
2. Load PNG/JPEG, an Image Projects JSON/ZIP, or choose **Use current Image Project**.
3. Choose the maximum number of motif colours. For a flat T-shirt graphic, start
   with a small palette and discuss the result with the printer.
4. Click visible input pixels or enter HEX and choose **Protect its Atlas reference**.
   The displayed reference is what is protected, not the exact original HEX.
5. Generate and compare the preview. Change settings and rerun as needed.
6. Download the derived PNG, a palette, and the complete reduction ZIP.

No reduction changes the original Image Project. Its exact source-verification,
history and decoder modules are retained. The editor integration only reads a
deep copy of the current document and re-verifies it.

## Defined method

- Original/current input is browser-decoded sRGB RGBA8, up to 4,194,304 pixels,
  maximum edge 8192; new source image at most 8 MiB. No silent resize.
- Every alpha > 0 pixel is first assigned against the **complete 13,283-row master**
  using squared integer RGB distance; exact ties use the lower atlas_row_id.
- The separate reduction uses a histogram of those references, weighted by
  visible pixel count (not opacity), plus explicitly protected reference IDs.
- Deterministic weighted farthest-first seeds, then at most eight centroid/medoid
  updates choose existing reference RGB values. This is a bounded heuristic,
  not a claim of a globally optimal or perceptually uniform palette.
- Protected references remain fixed. The reduction can use fewer than the chosen
  maximum; unused protected references are marked. References with identical
  8-bit RGB remain distinct identities; actual used RGB count is shown separately.
- Palette assignment is nearest selected reference in squared RGB distance, with
  the lower ID tie-break. A source reference already selected retains its own ID,
  including equal-RGB identity collisions. No Lab/Delta E participates.
- Alpha stays byte-identical. Alpha=0 pixels retain their hidden RGB unchanged
  and receive no colour index. These hidden values do not count as motif colours.
- No dithering. Semi-transparent pixels can create more apparent colours on fabric.
- Browser worker computation supports cancellation; changed inputs/settings clear
  stale results and disable their downloads.

## Handover

The ZIP contains original source bytes, frozen input RGBA, unchanged source Image
Project when used, derived PNG, full palette exports, settings and hashes. For
every zero-based row-major pixel, `input-atlas-row-id.u16le` records its original
full-master assignment and `output-palette-index.u16le` records its reduced
palette index. Both use unsigned 16-bit little-endian values; 65535 means fully
transparent/unassigned. Pixel coordinates are retained through width/height.

The JSON reports input→full-master, full-master→reduced and input→output squared
RGB errors separately. None is Delta E or physical measurement. Checksums establish
internal consistency, not authorship or authenticity.

GPL, ASE, CSS and tokens contain up to 256 selected Atlas swatches. Existing saved
Bundle palettes still accept at most 64 references, so the ZIP emits compatible
Clarus JSON parts of at most 64 entries. No storage migration is needed. Palette
formats alone do not carry the source image or per-pixel provenance.

This reduction ZIP is **not** an Image Projects ZIP. Version 0.1 has no reduction
job importer. Regenerate from the retained image/project with the same settings;
compare the input RGBA hash where browser decoding differs. Protection is based
on IDs; `protected_ids` is authoritative when equal-RGB references exist.

## Production boundary

This is motif preparation, not automatic screen-print separation, underbase,
halftone, trapping, ink recipe, RIP output or fabric proof. A palette size does
not promise the same number of inks/screens. Full-colour DTF/DTG/sublimation
does not inherently require this reduction. Physical textile/device acceptance
has not been performed. The release is a candidate; live WordPress and Android
deployment are not part of this change.
