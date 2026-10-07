# External PKL Image Picker provenance candidate

This adapter prepares **PKL Image Picker 0.3.1-beta4** from the project owner's
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
- Beta4 connects the existing magnifier status element to its existing update
  logic and removes a broken sentence fragment below the file controls. These
  are the only behavioral/text changes from beta3, apart from version markers
  and the changelog; reference data and provenance handling are unchanged.

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

On 2026-10-07 the owner installed Hover 0.2.6-beta2 and Picker 0.3.1-beta3 on
`https://arbe-lambda-star.com/`. Authenticated plugin metadata confirmed both
active versions; served JS/CSS and reference files matched the tested packages.
No installation was performed by the assistant.

The owner's desktop screenshots and downloaded Clarus 1.2 palette establish a
successful fixture round trip on the main site's picker and Hover pages:

- Hover displayed `source record checked` and `NOT_SIGNED` for row 4966.
- The downloaded palette retained one reference and two distinct source records:
  `[61,123,25]` at `(90,41)`, squared distance 41, and `[60,123,25]` at `(143,43)`,
  squared distance 30. Both resolve to `H130_L045_C055`, reference `[55,121,26]`.
- The export passed the full-master validator, palette round-trip comparison,
  original test-image SHA-256/dimensions and actual pixel checks. Both records
  remain `NOT_SIGNED`. Export SHA-256:
  `32e8e22d9c3290386dab46df6fb222295b599aee9e6c9d154e7d6958c3850f84`.
- The return screenshot displayed `Returned from Hover Library`, the restored
  image/selection, source `#3C7B19`, reference `#37791A` and squared distance 30.

This was an owner-operated desktop test reviewed from supplied evidence, not an
assistant-operated browser run. It exposed two UI defects: an unconnected
magnifier status element still said `wartet auf Binding`, and the file-control
note contained `Die eingefrorene Die ausgewählte`. Beta4 corrects those defects.

After delivery of beta4, the owner supplied two further main-site desktop
screenshots on 2026-10-07 at 03:13–03:14 Europe/Berlin. The first shows the
complete corrected note and `Returned from Hover Library`. The second shows
the magnifier status `aktiv`, restored image/selection and `RETURN VERIFIED`
at pixel `(73,28)`, source `[61,123,25]` / `#3D7B19`, unchanged row 4966 /
`H130_L045_C055`, reference `#37791A`, distance squared 41 and `NOT_SIGNED`.
Both reported UI defects are **PASS in the supplied desktop visual recheck**.
These are visible results after the update; neither screenshot includes the
plugin version badge. No second palette export was supplied for that recheck.

Evidence identifiers (original screenshots retained in the owner session, not
published with personal browser chrome):

| Screenshot | SHA-256 |
| --- | --- |
| `image(20261007-011328).png` — corrected note and return | `1c03f7553237e712d76ec4c8996d16cd11f0654de71f54c61aceeb6d46fdb6e5` |
| `image(20261007-011427).png` — active magnifier and returned pixel | `d4404e176c80e14686a8bbeb616cbe6116c06e5e1e7602e81298758ee0a7e42c` |

The beta4 code commit `d3f787fffff065e89c9114a851a0d4da9e3cf3e1` passed
[GitHub validation run 37555579417](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/37555579417).
The owner-operated desktop fixture path and its two UI corrections are now
evidence-reviewed. Mobile layout, live legacy/invalid handoff cases and palette
reload remain **NOT TESTED** live; existing automated results do not establish
those live results.

The original staging kit contains Hover beta2, Picker beta3, rollback ZIPs and
the synthetic `two-greens.png` fixture. The separate Picker beta4 ZIP supersedes
its Picker candidate. Replace only
`atlas-clarus-pkl-image-picker/atlas-clarus-pkl-image-explorer.php`; keep Hover
0.2.6-beta2. The beta3 ZIP remains the immediate rollback package.

Remaining live checks on the main site:

1. Check palette persistence after a fresh reload: one reference and both source
   assignments must remain present, with `NOT_SIGNED`.
2. Check an old identity-only handoff and a deliberately contradictory source
   record; the latter must be blocked without changing the palette.
3. Inspect narrow/mobile layout and initial unbound magnifier status. The desktop
   screenshots establish the shown controls and returned/bound state only.

No merge or complete cross-device visual sign-off is implied by these results.
