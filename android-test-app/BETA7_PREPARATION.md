# Android beta.7 — RC32.1 reference-card test update

Prepared on 2026-10-11. This is a source/build preparation record. Physical Android
update acceptance, native Save Document acceptance and Play submission are pending.

## Reviewed payload and update identity

| Field | Candidate |
| --- | --- |
| Application ID | `com.atlasclarus.connect` (unchanged) |
| Version | `0.4.0-beta.7`, versionCode `7` |
| Bundle | `0.2.0-rc32.1-colour-reference-card` |
| Bundle ZIP SHA-256 | `d61cc48bc38b9e3a71a54d93bf4147b9a3eaa1a94bab0d0a413a382a683eb616` |
| Master SHA-256 | `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4` |
| Required reserved beta certificate SHA-256 | `986ca730efc54a20cfc88af4fb61018dfe7658f3165c5b6fb55eb9c59ccad63c` |
| Previous signed source | `3bb3f7ca67d9aeeec74f4d930688ebf745eb3b9d` (beta.6) |
| Previous successful signing run | [38066171773](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38066171773) |

The native Activity, AndroidManifest and export adapter are unchanged from beta.6.
The app still uses `https://appassets.androidplatform.net/index.html`, the default
private WebView data directory and the existing localStorage keys. No data-clearing,
renaming, migration or new application identity is introduced. Debug `.dev` builds
cannot update the installed release. Play App Signing may use a different installed
certificate from the reserved sideload key; use the matching distribution channel.

## What the update adds

Colour Handoff's **Export reference card** produces one ZIP with:

- `colour-reference-card.html`: standalone screen/print card, one decision per page;
- `palette.clarus.json`: the complete original decision document, including history;
- `reference-card.json`: the machine-readable card projection;
- `card-manifest.json`: file checksums for integrity checking, not authenticated authorship.

The original/current RGB and HEX, separate ATLAS reference, HLC address, row ID,
master checksum, available provenance, decision and revision identities are retained.
Missing provenance is `UNKNOWN` in the display and null/unknown in the data contract.
The regression fixture keeps `#3D7B19` and `#3C7B19` separate even though both map
to `H130_L045_C055`, row `4966`. The unchanged native Save Document adapter receives
the ZIP bytes. Open the extracted HTML in a browser to print or save as PDF; this
update does not add a native Android PDF renderer or claim physical print accuracy.

## Reproducible checks

`test_release_identity.py` rejects reused versions, wrong payloads, native storage
boundary changes and automatic signing. `test_packaged_bundle.py` checks every
prepared asset in the actual APK/AAB, including embedded source-binding and card
code. Existing source/pixel, locale, provenance and export tests remain active.

`test-card-upgrade.cjs` uses the immutable beta.6 checkout and beta.7 Android-prepared
HTML at the native HTTPS origin. It creates two palettes with both source records,
two Colour Projects and a revised colour with a separately chosen earlier revision.
It then closes Chromium, swaps the document and reopens the same disk profile.
It requires byte-for-byte identical stored values, working JSON exports, unchanged
selection/history, and reopening of beta.6 Image Project JSON and ZIP including
original image bytes and linked colour project. Actual card-button exports pass
through `android-export.js` to a captured JavaScript/native boundary; the returned
ZIP is independently opened and its manifest/content verified. No device test is
implied by this desktop test. The card browser test separately checks mobile-width
layout and two complete A4 PDF pages.

Run the Android PR workflow for debug/disposable-key package checks and evidence.
The **Android signed beta** workflow remains manual, protected by the existing
`android-beta-signing` environment and reserved certificate pin. It generates an
APK and an AAB only; no Play upload or production activation is performed.

## Physical update acceptance (pending)

1. Record the installed version, package and signing certificate. Export each
   palette and Colour Project as Clarus JSON. Export every open Image Project as
   JSON or ZIP **before closing the app or installing**: Image Projects has no
   autosave. Preserve these backups outside the app's private storage.
2. Use the existing test track or a matching-certificate beta.7 APK. Install over
   the current app. Do not uninstall, clear app data, accept a downgrade, or use
   the `.dev` artifact to force an update.
3. Confirm saved palette/project counts, names, original source records, active
   selections, decision IDs, complete revisions and chosen-versus-working colours.
   Reopen saved Image Project JSON and ZIP; confirm original image and history.
4. Import the two-green fixture in Colour Handoff. Save the card ZIP through
   Android's document picker, reopen it outside the app, and confirm two decisions,
   original HEX values, shared row/address and unknown origin labels. Reimport
   `palette.clarus.json` and compare with the input. Check Save Document cancellation
   and a failed save leave the workspace exportable.
5. Record device/Android/WebView versions, old/new app versions, matching signing
   certificate, package checksums and outcomes. Only after device acceptance submit
   the reviewed AAB to the already agreed test track. Production remains separate.

Frozen master, historical packages and the live WordPress deployment are untouched.
