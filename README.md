# ATLAS Clarus Connect

**Browser Edition / WordPress status checked:** 1 November 2026

**Other component overview:** 6 October 2026 (historical inventory)

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

The Browser Bundle and WordPress rows describe the published/observed public
versions on 1 November 2026. Other rows retain the 6 October inventory and have
not been re-audited here. The [development baseline on `main`](#development-baseline-on-main)
is versioned separately from the public Browser Edition.

| Component | Version / source state | Publication and evidence boundary |
| --- | --- | --- |
| [Mixing Atlas](mischatlas/README.md) | **0.1.5**, 38-illuminant experimental search | [Published release](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/atlas-mixing-v0.1.5): WordPress ZIP, standalone HTML and SHA256SUMS; package/Chromium checks passed; mobile live visual acceptance open. |
| [Adobe ASE libraries](downloads/adobe/README.md) | **1.0**, 13,283 RGB swatches and 73 hue libraries | Commit-pinned public downloads; binary/name/RGB readback verified; actual Adobe import **NOT_TESTED**. |
| [Browser Bundle / public Browser Edition](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/v0.2.0-rc34.11-colour-origin) | **0.2.0-rc34.11-colour-origin**, public beta | Published 1 November; the public runtime manifest matches the release manifest byte-for-byte. Includes RC34.9 XTG, RC34.10 XTG + Source JSON ZIP and RC34.11 colour-origin metadata. Native QuarkXPress import remains **NOT_TESTED**. |
| [WordPress Browser Edition](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/v0.2.0-rc34.11-colour-origin) | **0.1.20-beta1.1** active small installer; **0.1.20-beta1** full installer available | Active plugin version read from WordPress; runtime identity checked separately. See the [dated evidence](docs/BROWSER_EDITION_STATUS_2026-11-01.md). Publication, runtime activation and application acceptance are separate observations. |
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

## Public Browser Edition and downloads

Use the [online Browser Edition](https://arbe-lambda-star.com/atlas-clarus-browser-bundle/)
or the version-specific **RC34.11 public-beta** packages:

| Package | Download | Checksum |
| --- | --- | --- |
| Offline Browser Bundle RC34.11 | [ZIP](https://github.com/HelabHLC/atlas-clarus-connect/releases/download/v0.2.0-rc34.11-colour-origin/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.11-colour-origin.zip) | [SHA-256](https://github.com/HelabHLC/atlas-clarus-connect/releases/download/v0.2.0-rc34.11-colour-origin/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.11-colour-origin.zip.sha256) |
| WordPress full installer 0.1.20-beta1 | [ZIP](https://github.com/HelabHLC/atlas-clarus-connect/releases/download/v0.2.0-rc34.11-colour-origin/ATLAS_Clarus_Browser_Edition_v0.1.20-beta1_RC34.11.zip) | [SHA-256](https://github.com/HelabHLC/atlas-clarus-connect/releases/download/v0.2.0-rc34.11-colour-origin/ATLAS_Clarus_Browser_Edition_v0.1.20-beta1_RC34.11.zip.sha256) |
| WordPress small installer 0.1.20-beta1.1 | [ZIP](https://github.com/HelabHLC/atlas-clarus-connect/releases/download/v0.2.0-rc34.11-colour-origin/ATLAS_Clarus_RC34.11_Small_Installer.zip) | [SHA-256](https://github.com/HelabHLC/atlas-clarus-connect/releases/download/v0.2.0-rc34.11-colour-origin/ATLAS_Clarus_RC34.11_Small_Installer.zip.sha256) |

Extract the complete offline ZIP and open
`atlas-clarus-browser-bundle/index.html` in a modern browser. It is not a
WordPress installer. Updating the WordPress plugin alone does not switch the
runtime: its explicit verified installation step checks the pinned package and
retains the preceding runtime for rollback. Save open work before switching.

### Export formats and provenance

The main path is image → reference → local palette → Clarus JSON backup/import.
The public RC34.11 [runtime manifest](https://arbe-lambda-star.com/atlas-clarus-browser-bundle/BUNDLE_MANIFEST.json)
lists these palette exports:

| Export | Scope and evidence retained |
| --- | --- |
| Clarus JSON | Fixed reference identities and all recorded source assignments; RC34.11 also retains recorded colour-origin metadata. |
| ASE, GPL, Figma Tokens JSON, CSS, CorelDRAW XML | Swatch/design handoff; keep Clarus JSON or the complete job for source provenance. CorelDRAW XML was added in RC34.8. |
| QuarkXPress XTG (Beta) | Added in RC34.9 to My Palettes and Colour Reduction; complete reduction jobs include `palette.xtg`. Named RGB process swatches do not contain the full source-to-reference records or an embedded ICC profile. |
| QuarkXPress ZIP · XTG + Source JSON | Added in RC34.10 to My Palettes: `palette.xtg`, `palette.clarus.json`, SHA-256 manifest and DE/EN instructions together. Extract and import the JSON to restore recorded sources. QuarkXPress does not automatically attach the companion JSON. |

The palette ZIP contains recorded samples and metadata, not original image or
ICC bytes; missing source records are reported, never reconstructed. For Colour
Reduction, keep the complete job ZIP with the source image, frozen pixels and
assignments. Its individual palette JSON files do not retain full job provenance.
See the [RC34.10 source-ZIP guide](https://github.com/HelabHLC/atlas-clarus-connect/blob/v0.2.0-rc34.10-quarkxpress-source-zip/releases/rc34.10/README.md).

**Native QuarkXPress import remains NOT_TESTED.** Import XTG into a text box with
Interpret XPress Tags enabled and set sRGB IEC61966-2.1 for RGB solid colours.
Automated export checks and the live XTG download recorded in PR #107 do not
establish native application or physical-print acceptance.

Parallel 4C, ECG and FOGRA58 / TextileRGB preparation keeps separate output-profile
contexts. Available print exports include JSON, readable HTML reports,
profile-bound reference PDFs and B/A preview PNG with metadata JSON; see the
[RC34.7 release](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/v0.2.0-rc34.7-textile-conversion).
Software checks, visual acceptance, physical measurements and production approval
are separate evidence levels. Local browser storage is not a backup.

### Release history

- **6 October 2026:** the previous overview recorded Browser Bundle
  **RC28** and WordPress **0.1.15-beta8**. The
  [dated handover inventory](docs/FREIEFARBE_BESTANDSUEBERSICHT_2026-10-06.md)
  remains the historical record.
- **31 October 2026:** [RC34.9 public-beta release](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/v0.2.0-rc34.9-quarkxpress).
  [PR #107](https://github.com/HelabHLC/atlas-clarus-connect/pull/107) records
  IONOS activation of **RC34.9 / WordPress 0.1.18-beta1.1**, live XTG download
  verification and **RC34.8 retained as the rollback runtime at that time**.
  The release also provides the full **0.1.18-beta1** installer. These packages
  and evidence remain available; this is not a statement of today's rollback slot.
- **1 November 2026:** [RC34.10](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/v0.2.0-rc34.10-quarkxpress-source-zip)
  added the combined source ZIP (WordPress **0.1.19-beta1** full /
  **0.1.19-beta1.1** small); [RC34.11](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/v0.2.0-rc34.11-colour-origin)
  added colour-origin metadata. RC34.11 is the latest published and observed
  public version in this check. See [evidence and link verification](docs/BROWSER_EDITION_STATUS_2026-11-01.md).

### Development baseline on `main`

At reviewed commit [`f8c9c8b8`](https://github.com/HelabHLC/atlas-clarus-connect/commit/f8c9c8b8867effbed77516090717bf6033f1b32d),
`main` still contains the **RC28** source builder and
**WordPress 0.1.15-beta8**, with the older **RC20** checked-in `dist/`.
Running `python3 browser-bundle/build_bundle.py` there builds that baseline,
not the public RC34.11 release. See the [source-build README](browser-bundle/README.md),
[RC28 candidate manifest](browser-bundle/manifest-rc28.json) and
[WordPress source](wordpress-browser-edition/atlas-clarus-browser-edition.php).
Newer public packages are identified by their version-specific release tags;
this documentation correction does not merge the stacked release branches.

The existing moving [browser-bundle-current release](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/browser-bundle-current),
[ZIP](https://github.com/HelabHLC/atlas-clarus-connect/releases/download/browser-bundle-current/ATLAS_Clarus_Browser_Bundle_current.zip)
and [checksum](https://github.com/HelabHLC/atlas-clarus-connect/releases/download/browser-bundle-current/ATLAS_Clarus_Browser_Bundle_current.zip.sha256)
remain valid links. On 1 November they still identify the **6 October RC28 build**
from commit `60bf765e771c3e6493c88a02a046237c9ba69db9`, not the current public
Browser Edition. Preserve the exact source commit and checksum for handover.

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

