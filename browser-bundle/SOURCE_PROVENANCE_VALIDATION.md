# RC28 source-provenance validation — 6 October 2026

Status: **SOFTWARE_CHECKED_CANDIDATE; LIVE_ACCEPTANCE_PENDING**
Base commit: `ce800940490aab29adf2b874de612562dbfd3e52`.
Master SHA-256: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`.

## Executed checks

| Check | Result |
| --- | --- |
| JavaScript syntax and `git diff --check` | PASS |
| Existing palette exports / ASE RGB readback | PASS |
| Source-record schema, legacy 1.0/1.1 import and 1.2 round-trip | PASS |
| Full-master winner verification, including shared-RGB row-ID ties | PASS |
| Wrong source/RGB/distance/row/master/workflow/sampling rejection | PASS |
| Shipped Picker → Hover → palette handlers with two sources for row 4966 | PASS (JSDOM; canvas decoding stubbed) |
| Original-file hash, repeated click, duplicate/remove and stale-context clearing | PASS (JSDOM) |
| Export/import, rejected import without mutation, reload and V2→V3 migration | PASS (JSDOM) |
| Local-storage quota failure, in-memory retention, recovery and capacity | PASS |
| Existing numerical sampling and PKL image binding | PASS |
| Reference-card and profile-bound reference-card contracts | PASS |
| Parallel print contract and shipped print preparation UI | PASS (DOM for UI) |
| Existing native/WASM ICC vectors and independent image preview interactions | PASS (DOM/canvas boundary stubbed where documented) |
| Responsive layout safeguards | PASS (static safeguards, not visual acceptance) |
| Offline mixer model and Basis-23 previews | PASS |
| RC28 bundle rebuilt twice, fixed digest, ZIP CRC, embedded hashes and inline syntax | PASS |
| WordPress candidate preflight and byte-identical repeat build | PASS |

The unchanged `validate_offline_mixer_ui.js` assertions also pass but report a
post-close JSDOM MutationObserver exception in the unchanged mixer module. This
is not counted as a clean visual/browser acceptance result.

## Reproducible artifacts

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `ATLAS_Clarus_Browser_Bundle_v0.2.0-rc28-source-provenance.zip` | 3,912,275 | `79a7b9a3df20d0ba6e2620b1d16d39316cce5d2c8534b622d7260fe896da12d8` |
| `ATLAS_Clarus_Browser_Edition_v0.1.15-beta8_RC28.zip` | 3,824,989 | `31ba76f11992d56df261bcbc6f10728658f24a19e5565fd9a6f8193d20bdde84` |

Before editing, the RC27 browser baseline was rebuilt and matched its existing
`3142adf2088734d34c98a3b0f337aab35a728d769e4b15bae420431178a140c7` pin.
The new pins describe RC28; they do not relabel the public RC27 build.

## Android integration follow-up

RC28 is assigned to Android `0.4.0-beta.5` / `versionCode 5`. The previously
signed beta.4 / versionCode 4 remains historical RC27; its identifier must not
be reused for the RC28 payload. Android's ZIP pin, CI version checks and manual
signed-workflow artifact names move together. See
[`android-test-app/DEVICE_TEST_LOG.md`](../android-test-app/DEVICE_TEST_LOG.md)
for the original pin failure, regression checks and explicit device boundaries.
Android debug/release-path CI and regular validation are merge gates; this
follow-up does not sign with the reserved key, submit to Play, or establish
mobile or live WordPress acceptance.

## Remaining boundaries

- Live WordPress/IONOS activation: **NOT TESTED**.
- Real desktop-browser image decoding and visual acceptance: **NOT TESTED** in
  this local run. The attempted local Chromium download did not produce a usable
  browser archive. The JSDOM handler tests do not substitute for that check.
- Real smartphone visual acceptance: **NOT TESTED**.
- PHP installation/rollback execution: delegated to the existing PHP 7.4/8.3 CI
  job; no local PHP binary was available. Its outcome must be read from the PR's
  checks, separately from this local report.
- Source-image bytes are not embedded by this palette extension. A hash is a file
  identifier, not evidence of an authenticated photographer, issuer or decoder.
- No digital signature, physical authentication, anti-counterfeit validation,
  measured-colour approval or change to the existing reference master.

These changes are supplied as a branch/PR candidate. They have not been merged
or deployed by the implementation run. A merge to `main` triggers the repository's
existing moving browser-bundle publication workflow.
