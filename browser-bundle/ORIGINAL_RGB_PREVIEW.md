# Exact original RGB protection preview

This isolated RC33.3 offline preview adds **Keep this original RGB unchanged** alongside the existing Atlas reference protection. Load a digital design, select a pixel or enter its source HEX, then use the new button. It preserves all visible pixels with that exact browser-decoded RGB and their alpha. A separate pixel-inspector button uses the current selection. It is not a region mask, tolerance match, connected component protection, or physical colour guarantee.

Each unique protected original reserves one slot, separately from reference slots. The remaining pixels use the existing deterministic reference reducer. Requests that leave no room for unprotected pixels, or for protected references, fail without dropping protection. This conservative slot budget may reserve two entries with identical RGB; it never exceeds the requested visible RGB limit. Other colours may still map to the same RGB as a protected original, so spatial isolation is not guaranteed. Original protection takes precedence for matching pixels; reference locks govern the remaining pixels. Only visible source RGB values may be protected. Original and reference protections reset with a new accepted source.

The frozen full-master assignment remains intact for every source pixel. Multiple protected originals that share one reference trigger an explicit warning and remain separate original entries. Mixed outputs use schema1.1 and a distinct method identifier. Original palette entries have `kind: ORIGINAL_RGB`, `atlas_row_id: null`, and separate `source_atlas_row_id` / `source_atlas_reference`. They are never invented master references. Output indices address the mixed palette; a source reference may map to several output entries.

PNG, GPL, ASE, CSS and Tokens contain the actual mixed output colours. Clarus JSON chunks contain **reference entries only** and cannot restore the mixed output or original protections. The ZIP README states this explicitly. No reduction-job importer is introduced. Token metadata does not label original colours FROZEN. Checksums establish internal consistency, not trusted origin or signatures.

The original RC33.1 and RC33.2 sources/builders, master data, WordPress and Android release pins stay unchanged. `build_original_rgb_preview.py` first reproduces the exact RC33.2 package and creates a separately versioned preview with deployment_allowed false. It does not install or activate it.

## Verification

- `node browser-bundle/tests/validate_original_rgb.js`: exact neighbouring source nuances, original precedence, alpha/hidden RGB, all256 indices, conflicts, collisions, determinism, no mutation and legacy parity.
- `node browser-bundle/tests/validate_colour_reduction.js`: existing core regression.
- `python browser-bundle/build_original_rgb_preview.py`: pinned baseline reproduction and preview generation.
- `node browser-bundle/tests/validate_original_rgb_browser.cjs`: UI, mixed exports, independent Python PNG reconstruction, reference-only Clarus chunks, limit failures, mobile widths and source reset.
- Existing browser reduction suite also runs against the preview without original locks.

Local core tests and baseline/preview build passed on15 October2026. The cloud browser rejects local file URLs; no graphical local or live RC33.3 acceptance is claimed. The dedicated CI workflow provides automated browser evidence when it succeeds. Physical devices, WordPress/Android installation and production printing remain untested. This is a source-RGB protection preview, not a region-protection release.
