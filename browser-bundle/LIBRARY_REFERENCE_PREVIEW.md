# Library reference reduction preview

Build: `python browser-bundle/build_library_reference_preview.py --output-dir /tmp/atlas-library-preview`.
Open the resulting index.html and select Colour Reduction. The new default mode converts visible pixels to references from the chosen library before reducing the palette. Select the library explicitly in Colour Reduction; search and lightness filters do not constrain its membership.

Source colour locks and inclusive rectangles convert to nearest library RGB references (lower row ID breaks ties). Those references are fixed through subsequent reduction and count within the requested maximum. Multiple source colours mapping to the same reference share a slot. If protected references exceed the limit, reduction stops without dropping protection. Each nuance in a rectangle is mapped independently; rectangles are not flattened to one colour.

Changing mode/library invalidates the preview and clears manually selected reference locks. Source RGB selections and rectangles remain and are remapped on the next run. The original protection mode retains the legacy full-master/exact-pixel behavior. Fully transparent hidden RGB and all alpha values remain unchanged in both modes. The library constraint applies to visible RGB, not composited screen appearance.

ZIP evidence retains the original bytes, frozen RGBA, full-master reference assignments, selected library IDs, per-source protection bindings, selected positions mask, output indices and hashes. A mask in reference mode means converted and fixed, not unchanged original RGBA. No reduction-job importer. No physical print approval.

This is a separately versioned offline candidate, not a WordPress or Android deployment.

## Small-area cleanup (RC33.6.1)
After reduction, choose a minimum component size and click Clean up unprotected areas. Four-connected components smaller than the threshold may merge into a larger touching component (equal sizes prefer the lower row-major component ID). The longest shared border wins; ties use the lower component ID. Each run uses the original reduced result, never the previous cleanup. Reset restores that exact result.

Only existing palette entries are used. Components containing explicit protected positions or protected palette colours are never changed. Transparency breaks connectivity; alpha and hidden RGB are preserved. Components without eligible neighbours remain. This is one conservative pass, not a guarantee that all small components disappear. Export records settings, changed-pixel counts and recomputed palette counts/mappings.
