# RC32.1 Colour Reference Card — WordPress update

Requested explicitly on 2026-10-11 after review of the RC32 implementation in
PR #72: “bitte in wordpress ändern”. This is a distinct public pilot package;
RC32 remains a non-deployable candidate with unchanged bytes. No old downloads,
master data, shortcodes, public routes or browser storage keys are replaced.

## Package identity

- WordPress: `ATLAS_Clarus_Browser_Edition_v0.1.15-beta12_RC32.1.zip`
- Size: `3923455` bytes
- SHA-256: `9c752ad30ccb304a01ae255fd0df0faa4606853d22a10e8a389f60dfb863d3fe`
- Embedded bundle: `0.2.0-rc32.1-colour-reference-card`, `4009778` bytes
- Embedded SHA-256: `d61cc48bc38b9e3a71a54d93bf4147b9a3eaa1a94bab0d0a413a382a683eb616`
- Reviewed RC32 input: commit `49fd639e191794fdf353546f6b5e4ea92265a0fe`,
  ZIP SHA-256 `beb52339521d7d5a354cd47ff33b0029d424e356bd110c2b158a8272e0dbe0ed`
- Base wrapper: immutable beta11 / RC31.1 download,
  SHA-256 `8ec7cdcd296cd179ff24a84a344bc3d6c2e989273c0d31977d6ac5518079e3bd`

Only the bundle version label, public-pilot manifest and corresponding file
checksums differ from RC32. The guarded installer and rollback implementation
are retained. Source-binding corrections from PR #70 remain included.

## Reproduce and check

```sh
python3 browser-bundle/build_colour_reference_card.py
python3 wordpress-browser-edition/build_reference_card_plugin.py --output-dir /tmp/atlas-wp-card
python3 wordpress-browser-edition/tests/validate_reference_card_package.py /tmp/atlas-wp-card/*.zip browser-bundle/build-colour-reference-card/*.zip
unzip -q /tmp/atlas-wp-card/*.zip -d /tmp/atlas-wp-card-extracted
php wordpress-browser-edition/tests/validate_plugin.php /tmp/atlas-wp-card-extracted/atlas-clarus-browser-edition
```

`.github/workflows/wordpress-colour-reference-card.yml` tests reproducibility,
exact distributed ZIP identity, PHP 7.4 / 8.5 guards, rejected inputs, failed
install preservation, successful switch and rollback. Chromium exercises the
actual embedded WordPress payload: two-green card export, full JSON reimport,
standalone HTML, separate A4 pages, unknown provenance, revisions and reference
adoption. These checks are gates before live switching, not proof of live use.

## Installation and explicit switch

1. Upload the ZIP via Plugins > Add Plugin > Upload Plugin; replace the existing
   `atlas-clarus-browser-edition` plugin. Its update alone keeps RC31.1 serving.
2. Under Tools > ATLAS Clarus Browser Edition select
   **Mitgeliefertes RC32.1 prüfen und aktiv schalten**, or use the existing
   `atlas-clarus/install-browser-bundle` ability after inspecting its current
   schema. Supply the exact embedded SHA and freshly read active-runtime SHA.
3. Verify the public manifest, card button and actual two-green export at
   `https://arbe-lambda-star.com/atlas-clarus-browser-bundle/`.
4. Verify that the previous-runtime snapshot still identifies RC31.1. If the
   live check fails, use **Zur vorherigen Laufzeit zurückwechseln**.

Live baseline observed 2026-10-11: beta11, active runtime
`fa538dd5b6f717f7c948a0cb11ecfff814678f114d2b9d3436148f8ed1861b3f`.
Live deployment completed on 2026-10-11 at 11:48:56 UTC after the user's manual
ZIP upload. The existing guarded `atlas-clarus/install-browser-bundle` ability
validated the pinned embedded package and switched from RC31.1 to RC32.1.
The previous-runtime snapshot retains the exact RC31.1 SHA above for rollback.

Public HTTP checks at 11:51 UTC returned 200 for the runtime, public canvas,
manifest and card module. Runtime HTML is byte-identical to the tested embedded
payload; the public canvas differs only by the wrapper's existing homepage link
and its style. The new export button and handler are present. Master identity
remains unchanged. See `evidence/rc32.1-live-20261011.json` for hashes and results.

The interactive export/reimport and two-A4-page checks passed in the exact
packaged payload (CI run `38134973526`). A separate post-deployment interactive
click test was **NOT_TESTED**: the cloud browser retained a credential-protection
error after manual sign-in, and the WPVibe rendered-DOM request exceeded its
32 MiB response limit. The successful public HTTP byte comparison is recorded
separately; it is not described as a successful live UI test. No original
package, previous release, master data or deployed manifest was edited to
change historical acceptance labels.

Colour Handoff > **Download colour reference card ZIP** exports printable HTML,
full `palette.clarus.json`, `reference-card.json` and `card-manifest.json`.
Open the HTML and use the browser print dialog to save PDF. The two greens
`#3D7B19` and `#3C7B19` keep separate sources and decisions despite their common
reference `H130_L045_C055`, row `4966`. Unknown provenance stays `UNKNOWN`.
Checksums establish integrity, not authenticated authorship. Physical output,
real mobile devices and native Adobe acceptance remain untested.
