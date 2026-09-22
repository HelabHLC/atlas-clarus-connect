=== ATLAS Clarus Browser Edition ===
Contributors: HelabHLC
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 0.1.13-beta3

WordPress / IONOS delivery wrapper for ATLAS Clarus Browser Bundle RC23.
STATUS: TEST CANDIDATE. Visual, real press-profile and IONOS acceptance pending.

== Installation / update ==

1. Export important palettes as Clarus JSON and print jobs as Print JSON before closing the page. Save image comparisons separately as B/A PNG and preview details JSON.
2. WordPress > Plugins > Add New > Upload Plugin: upload this ZIP and replace the existing ATLAS Clarus Browser Edition. Do not delete/uninstall the old plugin first.
3. Tools > ATLAS Clarus Browser Edition: the existing runtime stays active until you explicitly switch it. The supplied version must show v0.2.0-rc23-tone-system-v0-1.
4. First test on your IONOS staging installation: select "Mitgeliefertes RC23 prüfen und aktiv schalten". This immediately switches the served runtime after verification.
5. Open /atlas-clarus-browser-bundle/ and follow IONOS_RC23_ABNAHME.md. Clear any enabled IONOS/WordPress page cache for this route if the old version remains visible.
6. "Zur vorherigen Laufzeit zurückwechseln" restores the runtime active before RC23 was switched on, retaining its files.

The plugin folder, options, routes and shortcode [atlas_clarus_browser_edition] remain compatible. The homepage link stays in normal ATLAS navigation. WordPress needs a writable uploads directory and ZIP extraction support.

== PKL Full Reference / 4C and PKL Full Reference / ECG image previews ==

In Print preparation, load a PNG/JPEG/WebP image or choose "Use Image Picker image". Each path needs its own output profile (CMYK for 4C, 7CLR for ECG), rendering intent and BPC setting. "Create both previews" starts two independent calculations from the same browser sRGB image.

The bundled LittleCMS 2.16 engine (lcms-wasm 1.0.5, MIT) runs locally in WebAssembly workers, including offline. Each path performs sRGB -> selected profile's 16-bit device values -> sRGB. Return intent is relative colorimetric with BPC off. There is no paper-white simulation. Profiles need usable A2B and B2A transforms; missing or unsupported transforms produce a visible error instead of a fabricated preview.

The comparison is capped at 1200 pixels on the longest side; transparency is composited on white. Export each B/A comparison as PNG and its image/profile hashes and settings as preview JSON. Changing one path invalidates only its preview. Changing the image invalidates both. Images are held in memory and are not embedded in Print Handoff JSON.

These are computational screen previews, not measured or certified print proofs. A 7CLR profile does not establish CMYKOGV order or FOGRA55 applicability. The frozen ATLAS master, RGB-only source assignment and A-prime logic are unchanged. Production-ready reference separations, PDF/X output and physical print approval remain open.

== Parallel reference handoff ==

Select a reference in Hover/Wheel and choose "Prepare for print", or prepare a palette. 4C and ECG carry the same frozen ATLAS IDs with separate profiles and settings. Print JSON exports/imports both paths and their exact profile bytes. The reference handoff does not contain the image preview's transient device values.

== Integrity / validation ==

The pinned bundle version, size and SHA-256 appear in the plugin admin page and PACKAGE_VALIDATION.json. The installer checks ZIP integrity, manifest identity and listed file hashes before switching. The source tree and CI results are reviewable at https://github.com/HelabHLC/atlas-clarus-connect/compare/main...feature%2Fpkl-first-production-previews.

Automated coverage includes native/WASM ICC vectors, actual worker execution through DOM controls, independent invalidation, unchanged ATLAS identities, reproducible builds and PHP 7.4/8.3 install/rollback tests using a WordPress API shim. Canvas IO in DOM tests is stubbed. These tests do not replace real browser/IONOS or physical press acceptance. Test profiles are artificial software fixtures and are not shipped as end-user profiles.

== Changelog ==

= 0.1.13-beta3 =
* Embed RC23 with ATLAS Clarus Tone System v0.1 visible names across search, cards, Wheel, Hover, Appearance and reference cards.
* Keep PKL identity, HLC, RGB/HEX/Lab, A-prime and parallel 4C/ECG paths unchanged.
* Retain ISCC-NBS assignments as metadata.

= 0.1.12-beta1 =
* Embed RC22 with two independent profile-driven B/A image comparisons and PNG/metadata exports.
* Pin and validate image-preview topology, engine and export manifest fields.
* Preserve explicit runtime switch, previous-runtime rollback and navigation fixes.

= 0.1.11-beta1 =
* RC21 parallel 4C/ECG print preparation and profile transport.

= 0.1.10-beta3 =
* Homepage link in ATLAS navigation, opaque mobile menu and section scroll offset.

= 0.1.10-beta2 =
* Verified computational Before/After previews for all 13,283 Basis-23 recipes.
