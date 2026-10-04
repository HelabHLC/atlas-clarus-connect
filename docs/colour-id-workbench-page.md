# ATLAS Clarus Colour ID — WordPress page copy

Target page: https://arbe-lambda-star.com/atlas-clarus-colour-id/  
Reviewed: 2026-09-29  
Embedded application observed: ATLAS Clarus Colour Picker Prototype v5.3.3 — Mobile Fit Fix

This is editorial copy for the WordPress page. Keep the existing Colour Picker embed and all its tabs. The WordPress page and the embedded plugin are not currently sourced in this repository; this document does not deploy either one.

## Proposed public page copy

# ATLAS Clarus Colour ID

## Explore a colour's identity in depth

Pick a pixel from an image or enter RGB/HEX to bind the observed 8-bit sRGB value to an ATLAS reference. The primary assignment uses squared RGB distance and a deterministic `atlas_row_id` tie-break. Lab and ΔE00 are used for subsequent comparison, not to choose the reference.

### Colour ID analysis workbench

This page hosts the standalone **ATLAS Clarus Colour Picker Prototype v5.3.3**. Its tabs support image picking, region analysis, palettes, ΔE00 heatmaps, traceability, master navigation, gamut analysis, ICC profile context, production comparison, measured/spectral QC, and approval reporting. The tabs are exploratory tools; keep the reference identity visible as the output conditions change.

Digital profile conversions and screen previews are calculations. They are not physical measurements, print proofs, or production approvals. Measured QC remains `NOT_MEASURED` until a real measurement record is imported and evaluated with explicit project limits.

**Colour reference and attribution:** HLC Colour Atlas XL reference material © freieFarbe e.V. / freieFarbe.de. ATLAS Clarus uses a modified, indexed master. “CIELAB” describes reference data available for analysis; it does not describe the primary RGB-only identity assignment.

[Keep the existing Colour Picker embed here, including every tab and the “Open full screen” control.]

### Continue with the Browser Edition

For the connected image → Hover Library → Colour Identity Wheel → palette → print preparation workflow, open the [ATLAS Clarus Browser Edition](https://arbe-lambda-star.com/atlas-clarus-browser-bundle/). It complements this detailed Colour ID workbench; the two applications have separate version numbers and different scopes.

## WordPress application checklist

- Replace the duplicate H1/H2 title with one H1 and the proposed H2/H3 structure.
- Keep the existing shortcode or iframe and its full-screen URL unchanged.
- Keep all current tabs and their underlying application/data intact.
- Put the prototype version and measurement boundary before the embed, so they are visible before interaction.
- Link to the Browser Edition as a complementary workflow, without calling the prototype obsolete or implying that a higher/lower version number identifies the newer of two different applications.
- Verify the page on desktop and mobile after editing. Confirm the embed, full-screen link, tab switching, RGB binding, production comparison, and `NOT_MEASURED` default.
- If the plugin version or master digest changes, verify this copy against the deployed build before publishing.

## Observed tab inventory (2026-09-29)

Bild-Picker; Region Trace & Fill; Region Palette; ΔE00 Heatmap; Measured QC; TRACE; HLC-Navigator; Atlas-Browser; GamutMap; Produktionsvergleich; ICC-Profile; Farbsatz; FP / Guardrail; Approval Report.

The observed traceability output reported master SHA-256 `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`, RGB-only assignment, and `PROTOTYPE_NOT_NORMATIVE`. The Browser Edition observed on the same day displayed the matching shortened master digest and its own RC27 marker. Neither observation proves a release or a physical colour match.
