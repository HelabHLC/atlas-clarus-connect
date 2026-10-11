# RC32.2 Image Exchange — installable update preparation

RC32.1 already includes the strict source/pixel correction from PR #70. This
update integrates PR #75 into that current release lineage, retaining Colour
Reference Cards. It joins Android beta.7 (#74) and the cross-engine work (#75).
This document describes preparation, not a claim of live activation or a Play upload.

## Deliverables

| Deliverable | Version | SHA-256 |
| --- | --- | --- |
| Browser ZIP | 0.2.0-rc32.2-image-exchange | e2475f407ac77318662275f9a3c0ae006fc62135d1a87d7c5a64659a5c083f79 |
| WordPress installer | 0.1.15-beta13 / RC32.2 | 8ea6a1be099e05d858856ddea352a9f9aba599eb3d321dd0c4865ce1dc19cff1 |
| Desktop exchange helper ZIP | RC32.2 | 1868286804b0a62b281cdf18f96b8dc96541bb64c8c5be78f5df2c3341bdc75f |
| Signed Android APK | 0.4.0-beta.8 / code 8 | b7bd511b1cb5898811374bee320138cbc6d22b7177058813932ee3797cb8811d |
| Signed Android AAB | 0.4.0-beta.8 / code 8 | bbe82dd02e39389c35236e7c5e049825d9aac6ac8af51df536f2df536464a90d |

## Acceptance completed on 2026-10-11

Prepared and signed from `8f8f8eeb5eed32e5ef2d0eddb233921f224e90b8`,
with all eleven PR workflows successful. The full reports, package hashes,
workflow IDs and remaining device gates are committed in
[`image-exchange-release-2026-10-11.json`](../browser-bundle/tests/evidence/image-exchange-release-2026-10-11.json).
The subsequent evidence commit changes documentation only.

- [RC32.2 package acceptance, run 38157445042](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38157445042):
  deterministic ZIPs; exact embedded payload and helper; preserved source/data
  modules and installer; PHP 7.4/8.5 failure preservation, activation and rollback;
  actual image-project history, independent PNG replay, card exports and PDF.
- [Cross-engine acceptance, run 38157445035](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38157445035):
  504 JSON/ZIP imports (432 verified unchanged, 72 expected rejections),
  36 rejected UI imports preserve the workspace, 18 helper edit/return roundtrips,
  72 coherently rehashed one-byte attacks rejected, persistent downloads verified.
- [Android regression, run 38157445047](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38157445047):
  beta.7 to beta.8 persistent-profile migration, exact retained palettes/projects,
  image JSON/ZIP history and reference-card exports, APK/AAB asset checks.
- [Protected manual Android signing, run 38157534683](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38157534683):
  APK and AAB signed with the existing reserved certificate; application ID,
  version code/name and every one of 50 packaged assets verified.

Downloadable CI artifacts are `ATLAS-Clarus-RC32.2-installers-and-helper` in the
package run and the two `0.4.0-beta.8` artifacts in the signing run. Each signed
artifact archive contains one `app-release.apk` or `app-release.aab`; the hashes
above are for those extracted files. Signing artifacts expire after 14 days.
Keep downloaded copies with their checksums.

The first package run failed because generated card test fixtures were missing.
The corrected workflow runs the existing fixture generator before browser tests;
no runtime or package bytes were changed to obtain the passing result.

The browser builder verifies and extracts the immutable beta12/RC32.1 payload,
then replaces only the reviewed Image Projects UI script and handover section,
updates version/manifest/checksums and includes a quick-start document. The strict
verifier, decoder, reference-card modules, Atlas data and all other payload files
remain byte-identical. The standalone helper includes that exact new browser
payload, the #75 helper and pinned npm dependencies; install browser engines once.
It is a desktop tool, not code executed in WordPress or on a phone.

The WordPress builder uses the beta12 wrapper, preserving its installer, guards,
public routes, shortcode, rollback and active-runtime handling. It pins the new
bundle's exact bytes and manifest. Installing the plugin does not switch the live
runtime until the existing guarded activation action is explicitly used.

## Reproduce

```
python3 browser-bundle/build_image_exchange_pilot.py --with-helper
python3 wordpress-browser-edition/build_image_exchange_plugin.py
python3 wordpress-browser-edition/tests/validate_image_exchange_package.py wordpress-browser-edition/build-image-exchange/*.zip browser-bundle/build-image-exchange/ATLAS_Clarus_Browser_Bundle_*.zip browser-bundle/build-image-exchange/ATLAS_Clarus_Image_Exchange_*.zip
```

The RC32.2 workflow checks deterministic builds, all preserved files and checksum
companions, PHP 7.4/8.5 installer failures/switch/rollback, and real card export and
image editing/history from the exact embedded WordPress payload. The full #75
504-case cross-engine suite now runs against the actual RC32.2 payload. Historical
RC32/RC32.1 workflows reproduce their frozen source commits, not newly repinned
archives. Existing historical ZIPs are not changed.

## WordPress installation after preparation

1. Export open Image Projects as JSON/ZIP before closing or updating; no autosave.
2. Upload the beta13 ZIP without extracting it, replacing the existing Browser
   Edition plugin. The current active runtime remains selected.
3. Under Tools > ATLAS Clarus Browser Edition, use **Mitgeliefertes RC32.2 prüfen
   und aktiv schalten**, or the existing guarded install ability with the exact
   new bundle SHA and a freshly read active-runtime SHA.
4. Check manifest/version and real image-project/card exports on the public page.
   The previous runtime remains the rollback target.

No activation is performed by this preparation. Physical iPhone/iPad, macOS Safari
and device acceptance remain open. Exact import rejection of legitimately different
ICC/alpha decoding remains intentional; use the matching-engine desktop route.
