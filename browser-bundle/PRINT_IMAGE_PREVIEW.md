# Parallel image previews — RC22

The Print preparation section now implements the controlled chain

`browser sRGB source → PKL Full Reference → 4C preview / ECG preview`.

Every composited source pixel is assigned deterministically to the nearest exact
RGB triplet in the active 13,283-row PKL master. Squared RGB distance is the only
identity metric; `atlas_row_id` resolves equal-distance ties. Lab and Delta E do
not participate. Both ICC paths consume the same resulting PKL raster; neither
consumes the other's output.

## Use

1. Open **Print preparation** and load a PNG, JPEG or WebP image, or choose
   **Use Image Picker image**. Transparency is composited on white.
2. Attach a CMYK output profile for 4C and a seven-channel `7CLR` output profile
   for ECG. Choose rendering intent and black-point compensation independently.
3. Choose **Create both previews**, or calculate one available path individually.
4. Save each comparison using **Save … B/A · PNG**. Save its **preview details ·
   JSON** to retain image/profile hashes, conditions and calculation settings.

The preview is limited to 1200 pixels on its longest side. Image dimensions and
resizing are displayed. The source is the browser's sRGB canvas rendition, not
the untouched source-file encoding or a native wide-gamut/CMYK document. Input
ICC handling before the sRGB canvas is delegated to the browser decoder. The
displayed reference pane is the PKL-bound raster, not that source raster.

## Calculation

Each path runs in its own local Blob worker with embedded WebAssembly:

`browser sRGB → exact PKL master RGB → selected output profile, 16-bit device values → sRGB display image`

- Engine: **LittleCMS 2.16**, from the pinned **lcms-wasm 1.0.5** npm archive.
- Forward transform uses the selected intent and BPC setting.
- Return transform uses relative colorimetric intent with BPC off.
- No paper-white simulation, monitor-profile selection, gamut alarm or physical QC.
- The file must contain usable A2B and B2A transformations. A correct printer
  header alone is insufficient; incomplete or unsupported transforms are rejected.
- `7CLR` support does not establish CMYKOGV ink order or FOGRA55 suitability.
- Intermediate device values exist only inside the calculation. They are not a
  press-ready separation export and do not fill the reference-job output fields.

This is a computational ICC round-trip screen preview. It is not a certified
colour proof or a measured prediction of a particular press. Images, previews
and workers stay local. The application makes no network request to run the
ICC calculation; the engine and WASM bytes are embedded in `index.html`.
Existing external links remain ordinary links the user can choose to open.

The UI terminates an affected worker and hides its obsolete image immediately
when that path's profile, intent, BPC, condition or substrate changes. The other
path survives. A replacement image invalidates both. Late responses are rejected
by revision checks. Work and image data are held in memory only; Print Handoff
JSON carries references/settings/profiles, not these preview rasters.

## Evidence and limits

- 16 exact RGB comparisons against independently generated native LittleCMS 2.14
  results: 4C and seven-channel, all four intents, BPC off/on.
- Additional real WASM tests cover chunk boundaries, input immutability, branch
  isolation, alpha handling, missing transforms, profile mismatch and no network.
- PKL binding tests verify exact master RGB output, deterministic row-ID tie
  resolution, zero foreign colours and unchanged master identity.
- DOM tests drive the real WASM through workers and verify shared PKL hashes,
  different outputs, per-path invalidation, cancellation, failure handling,
  PNG/metadata actions and unchanged ATLAS references. Canvas raster IO and PNG
  encoding are stubbed in these DOM tests; they do not claim visual acceptance.
- The test CLUTs are deliberately artificial software fixtures and are excluded
  from the shipped bundle. They are not measured press profiles. No production
  4C/ECG profile is bundled. Validation with the user's press profiles remains open.
- Real desktop/mobile browser and WordPress/IONOS acceptance remains open.

The vendor archive, engine bytes and JS runtime are pinned by SHA-256 in
`vendor/lcms-wasm/PROVENANCE.json`; the builder preserves upstream code and
adapts module packaging for offline classic workers. Both MIT notices are shipped.
Upstream sources: [lcms-wasm](https://github.com/mattdesl/lcms-wasm),
[LittleCMS](https://github.com/mm2/Little-CMS).

```bash
python3 browser-bundle/build_bundle.py
node browser-bundle/tests/validate_preview.js
node browser-bundle/tests/validate_preview_ui.js
```
