# Browser Bundle RC18 provenance sync

## Gap closed

The public page identified itself as `v0.2.0-rc18-pixel-loupe`, while repository
`main` still built RC12 and the top-level README still named RC11. No RC13–RC18
branch, tag or commit was present when this candidate was prepared.

The live public HTML was retrieved on 2026-09-11 UTC. Its SHA-256 was:

`381fe8a0430d1f35ce9d84c35d6756c669eec49a5183799061a7b3e800d9221d`

The source files in this candidate reconstruct the application portion of that
page. WordPress page-shell additions, including the floating homepage link, are
deployment wrapper code and are intentionally not treated as Browser Bundle
source.

## Functional delta from repository RC12

- Image Picker and local image decoding.
- Original-pixel coordinate mapping rather than sampling the scaled preview.
- 11 × 11 nearest-neighbour loupe with marked centre, X/Y and RGB.
- Deterministic full-master squared-RGB binding with lower row ID tie-break.
- Picker → Hover and contextual return navigation across Picker, Hover and Wheel.
- Basis-23 computational-recipe presentation already merged through PR #23.
- CHSOS attribution and the existing computational/non-measured boundaries.

## Frozen boundaries

- Master SHA-256 remains `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.
- Master count remains 13,283 and `atlas_row_id` remains zero-based.
- Primary picker assignment uses 8-bit sRGB squared distance, not Lab or ΔE.
- A′ v0.4 selection logic is unchanged; v0.5 fields remain diagnostic only.
- Recipes remain `COMPUTATIONAL_ONLY`, `NOT_MEASURED`, without physical
  validation, CHSOS endorsement or production approval.

## Release gate

This commit is a provenance-sync candidate, not a retroactive assertion that the
GitHub artifact was the source of the already-running deployment. Before tagging,
run the automated reproducibility test and a browser parity check for desktop and
mobile, including the documented picker example:

`RGB 35/56/57 → H220_L020_C010 → atlas_row_id 8515 → master RGB 30/52/57 → d²RGB 41`
