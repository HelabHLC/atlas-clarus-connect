# External PKL Image Picker provenance candidate

This adapter prepares **PKL Image Picker 0.3.1-beta3** from the project owner's
verified **0.3.1-beta2** installation. It requires **Hover Library 0.2.6-beta2**.
The upstream proprietary prototype is not relicensed or copied into this Git
repository. `prepare_picker.py` checks every baseline byte against pinned hashes,
copies a fixed file set into a new directory, and applies the integration there.
It refuses a changed baseline and never overwrites the input directory.

## Behavior

- Samples the original browser-decoded image canvas, even when the picker displays
  the mapped image. Captures one pixel, its integer coordinate, image dimensions,
  original filename and optional SHA-256 of the local file. Alpha below 128 blocks
  provenance handoff. No area sample, camera metadata or physical measurement is
  invented.
- Uses the same allowlisted RC28 schema 1.0 validator as Hover, including the
  full-master RGB winner and lower-row-ID tie rule. All 13,283 external-picker
  references/RGBs were compared with the Hover master and match.
- Keeps the existing reference swatch, reference ID and local image store.
  Session state uses schema `atlas-clarus-image-picker-handoff-v2` under the
  existing session key. The original V1 return path remains supported.
- Waits for the IndexedDB transaction to commit before navigation; rejects an
  intervening image or pixel change. Stale image decode/binding results are
  ignored. File bytes stay in the browser; metadata travels in the URL.
- On return, checks exact stored/returned identity and source record, then checks
  restored image dimensions/name/hash (when recorded) and the original pixel.
  The worker must reproduce the original reference. Missing or contradictory V2
  data blocks restoration; it is never silently treated as a V1 handoff.
- Resolves the Hover page within the current WordPress installation, preserving
  staging paths and query-based permalinks. The existing URL filter remains.

The records are **NOT_SIGNED**. These are consistency checks, not signature,
issuer-authentication, authenticity or anti-counterfeit claims. Locally modified
state is not protected. A file hash identifies bytes; browser decoding can vary.

## Reproduce

From the repository root, with the owner-supplied plugin directory:

```sh
python hover-library/external-picker/prepare_picker.py /path/to/beta2 /new/path/to/atlas-clarus-pkl-image-picker
node --check /new/path/to/atlas-clarus-pkl-image-picker/assets/explorer.js
node hover-library/external-picker/test-picker-provenance.js
node hover-library/external-picker/test-generated-picker.js /new/path/to/atlas-clarus-pkl-image-picker
php -l /new/path/to/atlas-clarus-pkl-image-picker/atlas-clarus-pkl-image-explorer.php
```

The first test runs in CI. The generated integration test requires the pinned
upstream directory and runs locally against the actual built script. It checks
original-canvas sampling, transaction completion before navigation, selection
races, failed storage and stale worker results. The helper tests additionally
check RC28 producer/parser interoperability, two sources per reference, legacy
returns, changed pixels/images/coordinates/identities, malformed and duplicate
parameters, alpha rejection and optional file hashing.

## WordPress acceptance status

Inspected on 2026-10-06 UTC using the connected WordPress test instance
`https://arbe-lambda-star.com/atlas-rc20-test` and production metadata. Both still
had active Hover 0.2.6-beta1 and Picker 0.3.1-beta2. Browser sign-in to staging
succeeded and displayed its authenticated picker page and administration.
The automatic browser package upload was blocked before installation. No plugin
replacement, palette mutation or completed visual acceptance is claimed.

The prepared installation kit includes both candidate ZIPs, beta1/beta2 rollback
ZIPs and a synthetic `two-greens.png` fixture. It is a staging candidate, not a
production release. Preserve/backup existing local palettes before testing:
staging is under the same origin as production, so localStorage is shared.

Still required on staging:

1. Upload/replace `hover-library` with 0.2.6-beta2 and the active
   `atlas-clarus-pkl-image-picker` with 0.3.1-beta3. Avoid the inactive duplicate
   Hover plugin folder `atlas-clarus-hover-library`.
2. Open picker page 5393, select the fixture, confirm sRGB and bind. Click one
   pixel on each side. Source RGBs `[61,123,25]` and `[60,123,25]` must both map
   to row **4966**, reference **H130_L045_C055**, RGB **[55,121,26]**, HEX
   **#37791A**; squared distances are **41** and **30**.
3. For each pixel, open Hover, add the source to the palette and return to the
   picker. Original image, coordinate and fixed reference must be restored.
   Exported Clarus 1.2 must retain one reference and two source assignments;
   reload must preserve both, with `NOT_SIGNED`.
4. Check an old identity-only handoff and a deliberately contradictory source
   record; the latter must be blocked without changing the palette.
5. Inspect the real WordPress layout at desktop and narrow/mobile width, save
   screenshots and record browser/viewport and test outcomes. Do not substitute
   DOM tests or a static mockup for this visual gate.

No merge, production activation or visual sign-off is implied by passing the
software tests.
