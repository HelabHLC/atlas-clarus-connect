# Research Beta 0.6.0-beta.2 — verification scope

- Public standalone source: no bundled CIE, FOGRA, HLC or Pantone numeric reference dataset; no network-fetch scripts.
- Headless Chromium local verification: DE/EN switching, source links, synthetic 36D examples, strict CSV checks, seven illuminant priorities, user-supplied observer and SPD files, ΔE00, 36D constrained optimisation and JSON/CSV exports.
- CIE original source format: CIE 1931 observer and all seven illuminants (D50/D55/D65/D75/A/LED-B2/LED-B3) successfully loaded from local publisher-originated files **without shipping them**.
- User-held HLC original v1.2 CxF and FOGRA51 spectral CGATS each loaded by exact selected reference; the data were used only locally in validation and are not included in the distribution.
- Synthetic-format regression cases tested local CxF/CGATS import, single-reference CSV extraction, LED source column selection and refusal of reflectance >1.
- Direct `file://` navigation is administratively blocked in this execution environment. Chromium used in-memory page injection; real Windows Edge / Firefox and hosted-site acceptance remain unverified.

Numerical predictions are experimental mathematical fits, not independently measured physical printing, spectral uniqueness, certified proofs or device/ink recipes.
