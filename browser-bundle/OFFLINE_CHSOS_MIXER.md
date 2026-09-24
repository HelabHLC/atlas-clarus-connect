# Offline CHSOS pigment mixer pilot

Open a PKL reference in the Hover Library or Wheel. Expand **Offline pigment mixer**. Choose the separately held, verified files `HLCcolourAtlas.rs` and `ATLAS_CHSOS_Acrylic_Model_v0_1.json`, then calculate. The two files stay in the browser; this bundle does not contain their original spectra.

The tool checks the exact file SHA-256, 13,283 unique Atlas references, 87 source registry records, and the frozen master digest. It uses 84 CHSOS Pigments Checker / Gorgias basis curves, excluding Kimera and two supplements. The original CHSOS samples were made with acrylic binder on cardboard. The tool does not add binder.

It derives K/S from individual-pigment reflectance and searches one to three components by spectral RMSE. The reported ΔE76 is a separate diagnostic under D50/2°, not its selection criterion. This is a bounded heuristic and is not the calibrated Color Mixing Tools model. Fractions are model weights, not measured dispensing masses. Each basis paint has an `opacity_marker` and `opacity_source`. The CHSOS research spectra contain no verified product opacity rating, so all 84 basis markers start as `UNKNOWN` with `opacity_source: null`. Do not infer opacity from reflectance or pigment codes. A future product-specific rating requires evidence for the exact paint and binder formulation. Mixture opacity remains **NOT_VERIFIED**, even if a basis marker is known, and physical QC is **NOT_MEASURED**. The PKL reference identity is never changed.

Source credit: Cultural Heritage Science Open Source (CHSOS), https://chsopensource.org/products/pigments-checker/. Computational processing by ATLAS Clarus. CHSOS has not validated derived mixtures.

Validation: `node browser-bundle/tests/validate_offline_mixer.js` from the repository root.
