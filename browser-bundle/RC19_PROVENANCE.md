# Browser Bundle RC19 provenance sync

## Corrective scope

RC19 area sampling was merged in PR #26 without the generated `dist` state or
README release description. Its validator checked implementation strings but did
not execute numerical sampling vectors. This corrective change synchronises the
source, documentation, generated distribution, manifest and checksums from one
tree and tests the same pure sampler used by the browser.

## Sampling contract

- Single pixel remains the default.
- Optional square samples are 5 × 5, 11 × 11 and 21 × 21 pixels.
- Areas are clipped to decoded image bounds.
- Pixels with alpha below 128 are excluded; alpha 128 is included.
- RGB channels use arithmetic means and JavaScript `Math.round`.
- Variation is per-channel population standard deviation, diagnostic only.
- A sample with no qualifying pixels returns no result and cannot bind an identity.

Executable vectors cover single-pixel compatibility, arithmetic mean and rounding,
edge clipping, alpha 127/128, all-excluded areas, valid-pixel count and standard
deviation.

## Frozen boundaries

- Master SHA-256 remains `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.
- Master count remains 13,283 and `atlas_row_id` remains zero-based.
- Primary assignment remains full-master 8-bit sRGB squared distance, without Lab
  or ΔE; lower row ID remains the tie-break.
- Area sampling changes only the observed input and cannot redefine a frozen ID.
- A′ v0.4 is unchanged; v0.5 fields remain diagnostic only.
- `COMPUTATIONAL_ONLY`, `NOT_MEASURED`, no physical equality, no CHSOS
  endorsement and no production approval remain in force.

## Release gate

Automated validation must pass reproducible ZIP generation, extracted-file
checksums, numerical sampling vectors and palette-export round trips. Desktop and
smartphone visual browser QA remains required before release tagging.
