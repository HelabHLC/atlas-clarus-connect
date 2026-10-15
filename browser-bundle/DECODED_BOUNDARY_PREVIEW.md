# Decoded input protection boundary — review preview

This proposal clarifies the guarantee established by PR86 on 2026-10-15.
“Original RGB” and rectangles protect frozen browser-decoded sRGB RGBA8, not
arbitrary channel numbers stored in the encoded PNG. Partial-alpha decoding can
round channels before reduction. The pixel magnifier displays the frozen values.
The original file remains separate, byte-for-byte, with `source.file_sha256`;
`source.input_rgba_sha256` identifies `input-rgba.bin`. Neither hash is a signature.
For an Image Project, the current frame is the reduction input; the retained
original file and complete project remain separate evidence.

## Preview integration

`build_decoded_boundary_preview.py` builds the exact pinned RC33.5 first, then
replaces the legacy region HTML with `src/colour-reduction-decoded-boundary.html`.
The latter is the proposed replacement of `src/colour-reduction-region.html`.
The separate template avoids breaking historical deterministic package pins or
silently changing a released RC33.5 build. Only UI copy, preview version,
manifest and derived checksum list change. All JavaScript, worker code, master,
reduction algorithms and original evidence/export behavior remain byte-identical.
The preview manifest explicitly has `deployment_allowed: false`.
No WordPress package, current download, Android pin or deployment is updated.

## Reproduce

```sh
python browser-bundle/build_decoded_boundary_preview.py
npm ci --prefix browser-bundle/tests --ignore-scripts
browser-bundle/tests/node_modules/.bin/playwright install --with-deps chromium
python -m pip install Pillow
node browser-bundle/tests/validate_decoded_boundary_browser.cjs
ATLAS_TEST_HTML="$PWD/browser-bundle/build-decoded-boundary-preview/atlas-clarus-browser-bundle/index.html" node browser-bundle/tests/validate_swatch_reference_browser.cjs
```

The new browser test creates a 4×1 PNG with two stored `(61,123,25,128)`
pixels, an opaque `(61,123,25,255)` control and a contrasting pixel. Pillow
independently checks the stored G123 values. Chromium's actual file-input decode
and loupe must show `(62,124,26,128)` at X0/Y0. The test then separately applies
(1) the global original-RGB lock through the loupe, and (2) rectangle `[0,0,0,0]`
through the actual corner buttons. It downloads each ZIP through the UI.
Independent Pillow verification checks G124 and all protected RGBA channels in
`reduced.png`, the frozen input, alpha, rectangle mask, unmodified original PNG,
both distinct source hashes, output hash and every manifest file checksum.
Global protection must preserve both matching semi-transparent pixels; the
rectangle mask must mark only the first. The opaque decode control stays exact.

This is an explicit Chromium regression expectation, not a universal decoding
rule for all engines. A change in Chromium's rounding must fail this test and be
investigated, rather than silently weakening the expected G123→G124 assertion.
Outputs and browser version are retained under `/tmp/atlas-decoded-boundary`.
The dedicated PR workflow runs this and the existing swatch/rectangle browser
regression and uploads evidence and the offline preview ZIP.

## Local validation

The preview build successfully reproduces pinned RC33.5 SHA-256
`d209594b7bad339f587d82da1527eeca3429dd08256e76174f85e7894dc74e68`
before applying copy changes. Browser execution is recorded by the dedicated CI
workflow; do not treat a local build alone as a browser PASS.
