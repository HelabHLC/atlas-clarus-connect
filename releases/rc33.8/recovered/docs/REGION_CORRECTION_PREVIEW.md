# RC33.8 source-based region correction preview

Build: `python browser-bundle/build_inspect_preview.py --output-dir /tmp/atlas-correction-preview`.
Unzip the RC33.8 archive and open `atlas-clarus-browser-bundle/index.html`.
This is an offline preview, not a WordPress or Android deployment.

## Designer workflow

1. Load the source, select a library and maximum palette size, then reduce.
2. Optionally save the current variant. Enable the orange original-to-output
   difference overlay. Its threshold is Euclidean distance in 8-bit RGB channels,
   not Delta E or a perceptual quality judgement. Fully transparent pixels are excluded.
3. Hover/tap a source coordinate in any current comparison panel and set the first
   corner. Select the opposite corner and set the second, or enter coordinates.
   Both edges are included. Saved variants cannot be used as correction targets.
4. Choose either each original pixel's nearest library reference (retains nuances),
   or a single confirmed library reference for all visible pixels in the rectangle
   (intentional flat fill; it can remove detail). Five suggestions come from the
   first source pixel; optional HEX suggests other library references.
5. Preview the area and total references needed by all current protections.
   Keep the maximum to replace unlocked palette entries, or explicitly choose to
   increase it only when necessary. The application never silently drops a lock.
   More than 256 required references must be reduced by changing the selection.
6. Correct, protect and recalculate. Each recalculation starts from original source
   RGB, with independent full-master assignments retained. Other unlocked colours
   elsewhere may change. Clean up afterwards; corrected positions stay fixed under
   either cleanup scope. Save another variant to compare.

Corrections cannot overlap each other. A chosen reference conflicting with an
existing source-colour or rectangle protection is rejected; remove that protection
first. Alpha and fully transparent hidden RGB remain unchanged. Up to 64 correction
rectangles are supported. Remove-and-recalculate undoes a correction at the current
colour maximum. Loading a new source or changing library/mode clears corrections.

The export records inclusive coordinates, correction mode, chosen row ID (if any),
original-to-reference bindings and the explicit protection mask. Schema 1.4 and
method V2 identify corrected reductions; unchanged jobs retain schema 1.3/V1.
Evidence packages do not provide a correction-job importer. Source RGB, full-master
identity, library reference and derived output remain distinct. Display overlays
and yellow selection outlines are not baked into PNGs.

## Validation

Core tests: `node browser-bundle/tests/validate_region_corrections.js`.
Legacy library and scoped cleanup regressions are also run. Browser acceptance
and exact exported-pixel reconstruction are documented with the delivered test
results. Physical mobile devices, Firefox and Safari are not covered by Chromium
and touch emulation.
