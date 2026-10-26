# ATLAS Clarus RC34.7 — FOGRA58 Textile RGB public beta

Owner authorized publication on 26 October 2026 after local functional testing.
Adds a third independent Print path: fixed ATLAS sRGB → pinned final FOGRA58
RGB16, ICCBased RGB reference PDF and PKL-first image round-trip previews with
B/A PNG and JSON. Local profile loading; the ICC is not redistributed inside
these app packages. The master, reference identities and beta-library membership
stay unchanged. Native/WASM comparisons and actual browser export tests precede
publication. No physical textile proof or production approval is claimed.

The WordPress beta4 package preserves the existing guarded installation approach:
plugin activation does not switch the runtime. The admin ability validates exact
embedded ZIP size/hash, strict manifest and every file checksum before switching;
permission/stale-state guards apply and the previous runtime is kept for rollback.
The 4C/ECG paths continue independently. Existing help/navigation injection is retained.

Installation: update the existing atlas-clarus-browser-edition plugin with beta4,
then explicitly verify/install RC34.7 via Tools → ATLAS Clarus Browser Edition or
the authenticated native install ability with the release-info hash and current
runtime hash. Export unsaved work before refreshing an open browser workspace.

For FOGRA58: load the final TextileRGB_FOGRA58.icc, choose intent and BPC; use
Create FOGRA58 RGB reference data + ICCBased PDF or load a preview image and
Create FOGRA58 preview. Workflow/fabric fields are required for reference cards.
Keep JSON provenance alongside PDF/PNG. The shared print-handoff remains a request;
computed reference/preview results are separate files, as for CMYK and ECG.
