# Browser Edition documentation reconciliation — 1 November 2026

This is a dated, read-only documentation check. It distinguishes a published
package, the observed public runtime and the older source tree on `main`.
Only the root README and this evidence note are changed. No application, master,
installer, workflow, historical manifest or public installation is modified.

## Current public observations

| Observation | Evidence | Result |
| --- | --- | --- |
| Latest published Browser Edition | [RC34.11 release](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/v0.2.0-rc34.11-colour-origin), published 1 November 2026 | `0.2.0-rc34.11-colour-origin`; GitHub `prerelease: true`. Full WordPress package `0.1.20-beta1`, small installer `0.1.20-beta1.1`. |
| Public runtime identity | HTTP GET of the [live manifest](https://arbe-lambda-star.com/atlas-clarus-browser-bundle/BUNDLE_MANIFEST.json), 1 November at 13:31 CET | HTTP 200; 13,092 bytes; version `0.2.0-rc34.11-colour-origin`; status `COLOUR_ORIGIN_PUBLIC_BETA`. |
| Release/runtime manifest agreement | HTTP GET of the [release manifest](https://github.com/HelabHLC/atlas-clarus-connect/releases/download/v0.2.0-rc34.11-colour-origin/BUNDLE_MANIFEST.json) | Byte-identical to the live manifest; SHA-256 `983a94d4d2d91e8174abd8f207b705c7b8f72b57d979fb3ec9b802fddff9a531`. This compares manifests, not every installed runtime file. |
| Active WordPress plugin | Authenticated read-only `GET /wp/v2/plugins?search=ATLAS%20Clarus%20Browser%20Edition` on `https://arbe-lambda-star.com` | Plugin `atlas-clarus-browser-edition/atlas-clarus-browser-edition`, version `0.1.20-beta1.1`, status `active`. No activation/install ability was executed. |
| Public download page | Direct HTTP GET of [Application downloads](https://arbe-lambda-star.com/atlas-clarus-downloads/) | HTTP 200; leading section identifies RC34.11 as online and lists both WordPress packages. Older releases remain below it. A search-rendered cached copy still showed RC34.1 and was not used as current evidence. |

The current rollback slot was not inspected. Runtime identity does not establish
native QuarkXPress/RIP acceptance or physical print accuracy. The manifest still
reports `native_quarkxpress_validation: NOT_TESTED`.

## RC34.9 and the dated IONOS record

[RC34.9](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/v0.2.0-rc34.9-quarkxpress)
was published on 31 October 2026 from commit
`ad158876aa3615bef74a671a3b191f0274ff9fd2` as a public beta.
[PR #107](https://github.com/HelabHLC/atlas-clarus-connect/pull/107) records:

- IONOS activation of bundle `0.2.0-rc34.9-quarkxpress` and WordPress
  `0.1.18-beta1.1` on 31 October; the full downloadable installer is `0.1.18-beta1`.
- Active bundle SHA-256
  `5699974d6b5742786b92babc3315d32f3b1af0fd4d89b23cf7fbddc4d5cc2156`.
- RC34.8 retained as the previous runtime **at that activation**.
- Public UI/guide checks and a My Palettes XTG download independently checked
  for `H125_L075_C080`, RGB `118 / 205 / 39`.
- Native QuarkXPress import still untested. The linked
  [automated acceptance run](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/41186187838)
  is separate from native application acceptance.

These are historical deployment observations, not a claim that RC34.9 is still
the active version. [RC34.10](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/v0.2.0-rc34.10-quarkxpress-source-zip)
and RC34.11 were published on 1 November. RC34.10 added XTG + Source JSON in one
palette ZIP; RC34.11 added colour-origin metadata. Standalone XTG alone does not
retain every source assignment. The root README now states these format limits.

## Development and historical documentation

The inspected `main` commit is
[`f8c9c8b8867effbed77516090717bf6033f1b32d`](https://github.com/HelabHLC/atlas-clarus-connect/commit/f8c9c8b8867effbed77516090717bf6033f1b32d).
Its [RC28 manifest](https://github.com/HelabHLC/atlas-clarus-connect/blob/f8c9c8b8867effbed77516090717bf6033f1b32d/browser-bundle/manifest-rc28.json)
and [WordPress constants](https://github.com/HelabHLC/atlas-clarus-connect/blob/f8c9c8b8867effbed77516090717bf6033f1b32d/wordpress-browser-edition/atlas-clarus-browser-edition.php)
still identify `0.2.0-rc28-source-provenance` and `0.1.15-beta8`.
The source-build README identifies the checked-in `dist/` as RC20.
The 6 October handover inventory and original release/validation records remain
unchanged. Other component versions have not been re-audited.

The moving [browser-bundle-current release](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/browser-bundle-current)
still describes the 6 October build from
`60bf765e771c3e6493c88a02a046237c9ba69db9`, size 3,912,275 bytes,
SHA-256 `79a7b9a3df20d0ba6e2620b1d16d39316cce5d2c8534b622d7260fe896da12d8`.
That checksum also matches the RC28 WordPress source pin. Its existing ZIP and
checksum links are preserved and labelled as the older main-branch build.
The primary README downloads now use the version-specific RC34.11 release.

## Link and documentation validation

- GitHub release metadata confirms uploaded package/checksum assets for RC34.9
  and RC34.11, plus the retained moving build.
- All **14** tested asset URLs returned HTTP 200: HEAD for the seven ZIPs and
  GET for their seven checksum companions (three package pairs per numbered
  release, one pair for the moving release). Checksum text matches the GitHub
  asset digests; no full ZIP download or application regression test is claimed.
- All relative README targets resolve in the inspected repository tree or to
  this new evidence note. Version-specific release/source links were checked
  against GitHub metadata and file reads.
- The live manifest's palette export list is ASE, CorelDRAW XML, QuarkXPress XTG,
  GPL, Figma Tokens JSON, CSS, Clarus JSON and QuarkXPress Source ZIP. Print
  formats are described separately from palette formats.
- Whitespace/diff validation checks the two documentation files. No numerical,
  native-application or deployment tests are needed for this documentation-only
  correction; historical test results are attributed to their original evidence.

The fixed master remains 13,283 rows with SHA-256
`8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.
