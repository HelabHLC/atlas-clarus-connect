# Image Projects source/pixel consistency — source-only correction

This proposal follows the demonstrated boundary in [PR #69](https://github.com/HelabHLC/atlas-clarus-connect/pull/69).
It is based on PR #68 commit `4a42f74aba2cdc0408e52b91b4dc57e798830491`.
It is not a published release, a replacement download, or a live-site update.

## Actual import path and correction

The file input and drop handler in `src/image-projects-ui.js` call `open`.
JSON goes to `ATLAS_IMAGE_PROJECTS.verify`; ZIP goes to `importZip`, which calls
`exportFiles` and therefore the same `verify`. `commit` verifies again before
assigning `current`/`state`. Creation, editing and exports also use this verifier.

Previously, verification checked the embedded file hash, frozen RGBA hash, source
dimensions, Atlas assignments, journal replay, event hashes and document hash
independently. It did not establish that the source file decodes to those starting
pixels. Recomputing unsigned hashes can make unrelated source/pixel data appear
internally consistent.

The existing image loading code is moved from the UI into a shared `decodeSource`.
After the existing validations, `verify` decodes the embedded bytes through that
same path and requires **exact oriented width, height and every RGBA byte** to
equal `original`. A decode error, unavailable decoder or discrepancy rejects the
operation. There is no tolerance, metadata-based exemption, warning-only import,
hash-only fallback or silent replacement of frozen pixels. The comparison is
against starting pixels, not the edited frame. No source-binding success is cached.

The project and ZIP schemas, exact field sets, read-me companion bytes, master,
reference assignment, coordinate convention, masks and journal algorithms remain
unchanged. Successful verification does not mutate a project. The UI preserves
the current workspace on failed JSON, ZIP or drop import.

## Browser decoding and compatibility limits

The shared path remains `Blob -> HTMLImageElement -> naturalWidth/naturalHeight ->
sRGB canvas drawImage -> getImageData -> RGBA8`. It deliberately does not switch to
another JPEG decoder, `createImageBitmap`, raw ICC values or Python pixel values.
Encoded and decoded dimensions are bounded before canvas allocation. The decoded
dimensions must match the stored orientation, including same-area rotations.

| Case | Policy |
| --- | --- |
| Opaque PNG | Compare actual browser-decoded bytes exactly. |
| JPEG, including progressive | Decode with the current browser; no lossy re-encoding, RGB tolerance or perceptual threshold. |
| EXIF | Retain the browser's oriented dimensions and pixel order; no second manual rotation. Tests cover orientations 1–8. |
| ICC / untagged image | Retain native conversion to an sRGB canvas; do not strip profiles or infer camera/print colours. Test profiles have linear TRCs so conversion is observable. |
| PNG alpha | Compare the captured canvas representation, including its premultiplication/rounding effects. The browser may lose RGB behind source alpha zero. Embedded file bytes retain that information; the frozen canvas array does not promise to. RGB made transparent by a later journal event remains unchanged in replay/export. |
| Another browser or decoder version | Accept only if it reproduces the stored bytes exactly. A legitimate legacy project may fail; the message says consistency was not verified, not that forgery was proved. Use the creating browser/version and retain the original project. |
| Missing/failed decoder | Fail closed. Node hosts may supply a **trusted host-only** `ctx.decodeSource(bytes)` returning `{width,height,rgba: Uint8Array}`. This is not a JSON field, option from an imported document, or a validation bypass. Its fidelity is the host's responsibility, just like `ctx.sha` and `ctx.assign`. |

This is format-compatible, not a promise of byte-identical decoding across every
browser, OS, GPU, codec version, embedded profile, animation or unusual image.
The tests use static PNG/JPEG fixtures; animated PNG is not qualified. Achieving
portable acceptance for all legacy decoders would require a separate versioned,
deterministic decode policy. Broad tolerances would reintroduce the one-byte gap.

Relevant platform definitions:
[canvas colour spaces](https://html.spec.whatwg.org/multipage/canvas.html#colour-spaces-and-colour-correction),
[drawing images](https://html.spec.whatwg.org/multipage/canvas.html#drawing-images-to-the-canvas),
[premultiplied alpha](https://html.spec.whatwg.org/multipage/canvas.html#premultiplied-alpha-and-the-2d-rendering-context).

## What this establishes

Successful import establishes agreement between the **embedded** source bytes,
the current browser's decoded starting pixels and the replayable edit journal.
It does not prove authorship, physical authenticity, a capture date, a trusted
external origin, or that an unsigned history was never rewritten. An attacker who
replaces both source and starting pixels and consistently rebuilds a whole unsigned
project can still create a different, internally consistent project. Independent
trusted hashes/signatures would be needed to bind a project to an external origin.
PR #69's separate parent-image/crop-offset manifest is still not imported here.

## Reproduce

From the repository root, with Node, Python/Pillow and Playwright:

```bash
npm ci --prefix browser-bundle/tests --ignore-scripts
browser-bundle/tests/node_modules/.bin/playwright install --with-deps chromium firefox webkit
python3 -m pip install Pillow
python3 browser-bundle/build_bundle.py --image-projects --output-dir browser-bundle/build-source-binding
python3 browser-bundle/tests/prepare_source_binding.py /tmp/atlas-source-binding
node browser-bundle/tests/validate_image_source_binding.cjs
SOURCE_BINDING_BROWSER=firefox node browser-bundle/tests/validate_image_source_binding.cjs
SOURCE_BINDING_BROWSER=webkit node browser-bundle/tests/validate_image_source_binding.cjs
node browser-bundle/tests/validate_image_projects.js
python3 browser-bundle/tests/validate_image_png.py /tmp/atlas-image-projects-core/project.zip
IMAGE_PROJECTS_HTML=browser-bundle/build-source-binding/atlas-clarus-browser-bundle/index.html node browser-bundle/tests/validate_image_projects_browser.cjs
python3 browser-bundle/tests/validate_image_png.py /tmp/atlas-image-projects-browser/project.zip
```

`PLAYWRIGHT_MODULE` / `CHROMIUM_PATH` can select local installations. The preparation
script makes 14 synthetic fixtures, including 65,536-pixel images, alpha, baseline
and progressive JPEG, eight EXIF transformations and generated linear RGB ICC
profiles. It records their hashes and extracts the **hash-checked, unmodified**
published bundle as the comparison importer. It does not require an external
painting archive and does not claim a rerun of the Ruisdael experiment.
Playwright's Firefox build disables ICC correction for screenshot reproducibility;
the test explicitly sets `gfx.color_management.mode=2` for tagged images and records
that preference. The application itself does not alter browser preferences.
WebKit may expose `getContextAttributes()` without a `colorSpace` property; the
shared decoder retains the requested/default sRGB path in that case.

The differential test creates real legacy projects through the old browser UI,
then verifies unchanged JSON and complete ZIP in the candidate. It generates
eight attack variants: single RGB byte, alpha byte, starting RGB plus a fully
rehashed four-event journal, transposed dimensions, changed source colour profile,
undecodable header-only source, JPEG pixel and ICC PNG pixel. Pixel/document/event
hashes, ZIP CRCs and manifests are rebuilt. Each must be accepted by the old
JSON/ZIP verifier and rejected by the candidate's JSON/ZIP verifier. UI tests check
JSON, ZIP and drop failure with unchanged workspace. The existing workflow tests
cover Atlas assignment, coordinate selection, linked palette, edits, transparency,
undo/redo, history handover and independent Pillow replay.

## Published package boundary and validation evidence

No release ZIP, checksum sidecar, manifest pin, deployment setting, WordPress
plugin version, Atlas reference data or release tag is updated. The frozen
WordPress installer CI reproduces RC31.1 from its exact source commit above and
compares the result to the still-pinned downloads. A separate CI job builds and
tests the current **non-public** source candidate. Do not run the current source
through the RC31.1 public-pilot packager and change its pins to accommodate it;
a future release needs a new version and its own acceptance.

Unchanged download hashes:

- Browser ZIP: `fa538dd5b6f717f7c948a0cb11ecfff814678f114d2b9d3436148f8ed1861b3f`
- WordPress ZIP: `8ec7cdcd296cd179ff24a84a344bc3d6c2e989273c0d31977d6ac5518079e3bd`

Executed validation on 10 October 2026, source commit
`dfad36a452515ec35e3fff8984494a7bbd9612c2`:

| Environment / check | Result |
| --- | --- |
| Chromium 151.0.7922.34 | 14 legacy image cases; 8 rehashed attacks rejected through both JSON and ZIP; UI preservation: PASS |
| Firefox 153.0, tagged-image ICC enabled | Same cases and strict rejection: PASS |
| WebKit 26.5 | Same cases and strict rejection: PASS |
| Candidate edit workflow / independent Pillow replay | Atlas reference, coordinates, linked palette, recolour, alpha, undo/redo, separate-session ZIP and returned JSON: PASS |
| Frozen RC31.1 installer | Exact package reproduction, PHP 7.4/8.5 installer and rollback: PASS |
| All seven repository PR workflows at this source commit | PASS |

[Executed CI run](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38056368446).
[Persisted machine-readable evidence](tests/evidence/image-source-binding-2026-10-10.json)
includes browser versions, every fixture's source/RGBA hashes, attack outcomes,
job IDs, checked source/test hashes and the unchanged release hashes. Local syntax,
fixture generation and candidate build also passed. Local browser installation
failed, so all browser results above are from the actual GitHub runners.
Live IONOS, mobile devices, native Adobe and physical output are **NOT_TESTED**.
