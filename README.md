# ATLAS Clarus Connect

**Repository overview:** 6 October 2026  
**Status:** public source repository with separately versioned components  
**Workflow:** ATLAS Clarus Workflow v3.4.0

ATLAS Clarus connects colour selection, fixed reference identity, palettes,
analysis and experimental production preparation:

> Find a colour → understand it → transfer its identity without losing provenance.

See the [freieFarbe handover inventory (Deutsch)](docs/FREIEFARBE_BESTANDSUEBERSICHT_2026-10-06.md)
for dated versions, commits, public/tested states, evidence, rights and open work.
The original v0.1.0 [release approval](RELEASE_APPROVAL.md),
[manifest](RELEASE_MANIFEST.json) and [validation report](VALIDATION.md) are
historical records, not a release number or acceptance report for every component.

## Current components

| Component | Version / source state | Publication and evidence boundary |
| --- | --- | --- |
| [Mixing Atlas](mischatlas/README.md) | **0.1.5**, 38-illuminant experimental search | [Published release](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/atlas-mixing-v0.1.5): WordPress ZIP, standalone HTML and SHA256SUMS; package/Chromium checks passed; mobile live visual acceptance open. |
| [Adobe ASE libraries](downloads/adobe/README.md) | **1.0**, 13,283 RGB swatches and 73 hue libraries | Commit-pinned public downloads; binary/name/RGB readback verified; actual Adobe import **NOT_TESTED**. |
| [Browser Bundle](browser-bundle/README.md) | **0.2.0-rc28-source-provenance** candidate | Source adds original RGB provenance; public moving prerelease [browser-bundle-current](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/browser-bundle-current); reproducible source build. Checked-in `dist/` is the older RC20 baseline. |
| [WordPress Browser Edition](wordpress-browser-edition/) | **0.1.15-beta8**, RC28 candidate wrapper | Source and deterministic package checks; live activation and visual acceptance must be tracked separately. |
| [Hover Library](hover-library/manifest.json) | **0.2.6-beta1** | Public beta source/data; the older v0.1.5 approval does not establish acceptance of this version. |
| [Colour Identity Wheel](colour-identity-wheel/SOURCE_PROVENANCE.md) | Sites v22 provenance baseline plus repository changes; embed **1.0.0** | Recorded baseline and receiver tests; current public Site/repository parity is not established by historical provenance. |
| [Identity Handoff](identity-handoff/SPECIFICATION.md) | **0.1.0** | Protocol and executable valid/rejected transfer vectors. |
| [Naming and tone layers](designer-layer/) | Names **0.3.0**, Tone System **0.1**, search index **v1** | Included in RC27; descriptive metadata, not a replacement for reference identity. |
| [Android test app](android-test-app/DEVICE_TEST_LOG.md) | **0.4.0-beta.4**, version code 4 | Signed APK/AAB build evidence; recorded device observations through beta.3; no production-store release established by the log. |
| [Appearance Pixel Simulator](appearance-pixel-simulator/README.md) / [APF](apf-material-bridge/) / [MaterialX](materialx-render-service/) | **0.4.1** / **0.1** / **0.4.0** | Simulation, binding and optional self-hosted renderer sources; explicit runtime limits; no hosted renderer is provided. |
| [TryColors Bridge](trycolors-bridge/README.md) | **0.2.2**, Golden HB 59 pilot | Controlled external-service integration; simulated recipes, no measured mixture approval. |
| [Open Label](open-label/) / [Connect prototype](connect-v0.1-prototype/) / [CHSOS research](research/chsos-rebuild-v0.1/) | **0.1.1** / **0.1** / **0.1** | Draft documents, interoperability prototype and research; not certification or general runtime acceptance. |

The separately maintained desktop packages are in
[`HelabHLC/atlas-clarus-core` at commit `0a4d7ad1`](https://github.com/HelabHLC/atlas-clarus-core/tree/0a4d7ad1b741fb80312f1bafc70ae83bb86e0e48/integrations):
**Krita 0.3.4**, **GIMP 0.1.3** and **Inkscape 0.3.0**. They include recorded
prototype runtime tests, installation instructions and checksums. They are distinct
from the desktop workflow demonstrations inside the browser bundle.
See the [public application download page](https://arbe-lambda-star.com/atlas-clarus-downloads/)
and the handover inventory for the remaining licence-notice inconsistency.

## Offline browser bundle

Build with `python3 browser-bundle/build_bundle.py`, then open the generated
bundle's self-contained `index.html` in a modern browser. The public
[current ZIP](https://github.com/HelabHLC/atlas-clarus-connect/releases/download/browser-bundle-current/ATLAS_Clarus_Browser_Bundle_current.zip)
has a [checksum companion](https://github.com/HelabHLC/atlas-clarus-connect/releases/download/browser-bundle-current/ATLAS_Clarus_Browser_Bundle_current.zip.sha256).
This endpoint moves; preserve the source commit and checksum for reproducible handover.

The main path is image → reference → local palette → Clarus JSON backup/import.
Palettes also export as ASE, GPL, Figma Tokens and CSS. Parallel 4C/ECG preparation
and ICC previews retain the same fixed reference and separate profile contexts;
see the [RC28 candidate manifest](browser-bundle/manifest-rc28.json) and
[print-preview documentation](browser-bundle/PRINT_IMAGE_PREVIEW.md).
Software checks, visual acceptance, physical measurements and production approval
are separate evidence levels. Local browser storage is not a backup.

## Verified reference baseline

- Master rows: **13,283**.
- Master SHA-256: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.
- `atlas_row_id`: **zero-based**; human display rows, when shown, are **one-based**.
- Image-pixel binding uses the full master's stored RGB values; Lab/ΔE and ICC
  diagnostics do not redefine the assigned identity.

## Sources, rights and evidence

[LICENSING.md](LICENSING.md) records the original software/documentation/reference-data
licence map. Read it together with [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md),
the [Mixing Atlas source notices](mischatlas/SOURCES-AND-LICENSES.txt) and each
component's own notices. There is **no blanket licence for all material datasets**.
The handover inventory records missing provenance and inconsistent older notices
without assigning new licences.

ATLAS Clarus preserves a reference identity. Digital previews and computed recipes
do not establish a physical colour match. Basis-23/CHSOS candidates remain
computational and unmeasured; CHSOS has not validated the derived mixtures.
Observed source-context views do not assert Pantone identity or equivalence.
Open Label is a review draft, not certification.

The [validation workflow](.github/workflows/validate.yml) and component reports
identify available automated checks. Before deployment, use evidence for the exact
component/commit, preserve source-specific notices and complete its runtime/visual
gates. A historical PASS is not acceptance of a later build.

The Wheel WordPress embed is an iframe wrapper, not the Wheel application. It does
not forward the surrounding page's query parameters; identity handoff targets the
Wheel application directly. See [source provenance](colour-identity-wheel/SOURCE_PROVENANCE.md).

## Public entry points

- [Mixing Atlas](https://arbe-lambda-star.com/atlas-clarus-mischatlas/)
- [Browser Edition](https://arbe-lambda-star.com/atlas-clarus-browser-bundle/)
- [Application downloads](https://arbe-lambda-star.com/atlas-clarus-downloads/)
- [Hover Library](https://arbe-lambda-star.com/atlas-clarus-hover-library/)
- [Colour Identity Wheel](https://atlas-clarus-reference-wheel.arbe-lambda-star.chatgpt.site/)
- [Colour ID](https://arbe-lambda-star.com/atlas-clarus-colour-id/)
- [Mission](https://arbe-lambda-star.com/our-mission/)
