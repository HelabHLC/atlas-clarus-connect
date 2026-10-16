# RC33.7 variant comparison and cleanup protection scope

Build: `python browser-bundle/build_compare_preview.py`. Separate offline candidate; no site or Android deployment.

Three synchronized comparison views show original frozen source, the uncleaned reduced image, and current output or a saved variant. Shared zoom and drag/arrow-key pan do not modify image data. Save up to three in-session variants; changing source clears them. Changing reduction settings invalidates output, but snapshots for the same source remain for comparison. Saved variants are comparison-only and are not restored or exported; PNG and ZIP always use the current output. Close/reload loses comparison snapshots. No grading or display transforms are applied.

Palette locks always retain their references during reduction. Cleanup offers legacy protection of all pixels using protected palette entries, or MASK_ONLY, which protects only explicit selected source-colour positions/rectangles plus exact original RGB entries. This lets a rectangle protect its own pixels without automatically exempting the same references everywhere else. Components touching protected positions are conservatively skipped as a whole. The complete selected palette remains available; no new RGB is invented. Cleanup scope is recorded in area_cleanup.protection_scope. All cleanup runs start from uncleaned reduction; Reset restores it.

Validation: scoped cleanup core tests and JS syntax pass. Interactive browser verification remains pending.
