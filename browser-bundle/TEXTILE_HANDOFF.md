# Textile RGB / FOGRA58 — Print handoff preview

26 October 2026. Isolated extension of the existing #print workspace, no deployment.

Open index.html. Choose Hover/Wheel → Prepare for print → Use selected reference
or Use active palette. In Textile RGB load your locally downloaded final
TextileRGB_FOGRA58.icc. Set workflow, fabric, requested rendering intent and BPC.
Export all three paths as JSON plus the readable report. Keep them together.
4C/ECG continue independently. No new Textile RGB preview is provided.

The profile must match SHA-256
`fad691cc0f25e3d6a91942599755b7f9cf906b91f9e4f4834c3364e6c50a972d`
(2,886,856 bytes). Uploaded file and official final download were byte-identical
on 26 October 2026. Filename is not evidence. Renamed unrelated or beta profiles
are rejected. Exact user-attached ICC bytes are embedded in the exported JSON
and checked on import; the report records the profile identity/hash/settings.
The profile is not pre-bundled. Copyright remains with Tschudi Software Technology
and stated rights holders. No new redistribution licence is asserted.

The selected fixed references remain unchanged. No automatic palette selection,
conversion, profile reassignment, Happy Hack, final-profile gamut-membership claim
or print approval. The existing FOGRA58beta library is unchanged. Original master
RGB remain sRGB values; requested settings are recorded, not executed.
FOGRA58 is an exchange space, not the characterization of your actual printer,
ink and fabric. D65/10° textile conventions require an agreed production workflow;
the ICC header D50 PCS does not prove that workflow was validated.

Legacy print 0.1.0 imports remain supported and clear the textile card. Three-path
exports use 0.2.0, rejected by old bundles instead of silently dropping this path.
This Print snapshot preserves selected reference identities. It does not acquire
the full original-sampling and decision history from Colour Handoff automatically;
retain those existing source companions separately. Missing provenance is not invented.

From repository root:
```
python3 browser-bundle/build_textile_handoff.py --output-dir browser-bundle/build-textile-preview
node browser-bundle/tests/validate_print_handoff.js
TEXTILE_PROFILE=/absolute/path/TextileRGB_FOGRA58.icc node browser-bundle/tests/validate_textile_handoff.cjs
```
The new builder overlays two modules and a card on the existing RC34.5 build.
Original src/print-handoff.js, src/print-ui.js, legacy builders and master stay
unchanged. Overlay modules derive from those pinned originals; future upstream
updates require an explicit overlay review. Inspectable overlay sources are in
this package's docs/textile-handoff folder; the complete builder requires the
repository checkout at the documented base commit plus this change.

Sources:
https://fogra.org/digitaler-textildruck
https://fogra.org/fileadmin/files/1_forschen/Digitaldruck/13.006_Textile-RGB/TextileRGB_FOGRA58.icc

## Validation status

PASS: full-master legacy handoff regressions against both original and extended
modules; real final ICC byte-preserving export/import; 11 negative textile cases;
actual candidate DOM upload/export/report/import/tamper/legacy state tests; complete
generated HTML initialization. UI tests use jsdom with canvas stubbed.

Visual Chromium review: NOT_RUN. The available browser installer returned an invalid
download archive; no browser binary could be installed. Physical device acceptance,
textile conversion, gamut validation, CLO import and physical print: NOT_TESTED.

Additional tests (from repository root after npm ci --prefix browser-bundle/tests):
```
TEXTILE_PROFILE=/absolute/path/TextileRGB_FOGRA58.icc node browser-bundle/tests/validate_textile_ui.cjs
node browser-bundle/tests/validate_textile_bundle.cjs
```
The generated bundle path defaults to browser-bundle/build-textile-preview; set
TEXTILE_BUNDLE_DIR for a different output's atlas-clarus-browser-bundle directory.
