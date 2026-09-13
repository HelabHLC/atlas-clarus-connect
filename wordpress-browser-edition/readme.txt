=== ATLAS Clarus Browser Edition ===
Contributors: HelabHLC
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 0.1.11-beta1

WordPress / IONOS delivery wrapper for ATLAS Clarus Browser Bundle RC21.
STATUS: TEST CANDIDATE. Visual and WordPress/IONOS acceptance pending.

== Installation / update ==

1. Export important palettes as Clarus JSON. Export print jobs as Print JSON before closing or reloading: print jobs are held in memory.
2. WordPress > Plugins > Add New > Upload Plugin: upload this ZIP and replace the existing ATLAS Clarus Browser Edition. Do not delete/uninstall the old plugin first.
3. Tools > ATLAS Clarus Browser Edition: the existing runtime stays active until you explicitly switch it. The supplied bundle must show v0.2.0-rc21-parallel-print-handoff.
4. First test on your IONOS staging installation: select "Mitgeliefertes RC21 prüfen und aktiv schalten". This immediately switches the served runtime after verification.
5. Open /atlas-clarus-browser-bundle/ and check the scenarios in IONOS_RC21_ABNAHME.md. Clear any enabled WordPress/IONOS page cache for this route if the old version remains visible.
6. The control "Zur vorherigen Laufzeit zurückwechseln" restores the runtime active before the RC21 switch. It retains the previous files.

The plugin folder, options, full-canvas route, runtime route and shortcode [atlas_clarus_browser_edition] remain compatible. No page, menu or homepage setting is rewritten. The homepage link stays in the ATLAS navigation, without floating over content. WordPress needs a writable uploads directory and ZIP extraction support.

== RC21 print preparation ==

Select a reference in Hover or Wheel and choose "Prepare for print", or prepare a whole palette. Both 4C and ECG begin with the same frozen ATLAS reference IDs. Each path has separate ICC attachments, printing condition, substrate, rendering intent and black-point compensation settings. There is no conversion from one path to the other.

Export/import the complete job as Print JSON; export the readable HTML report for review. The JSON includes the attached ICC bytes and hashes. Missing profiles and incomplete conditions remain visible. A 7CLR ICC header does not establish CMYKOGV channel order or FOGRA55 suitability.

This candidate prepares a handoff. It does not calculate CMYK or ECG device values, create production PDF/X files or provide physical print approval. The frozen ATLAS master, RGB-only source assignment and A-prime v0.4 logic are unchanged.

== Integrity / provenance ==

Bundle version: v0.2.0-rc21-parallel-print-handoff
Bundle ZIP bytes: 2102053
Bundle SHA-256: d6bc4230d54e1160e6e1bb80179e4f106937f1f55a47eb1edc383e054914be95
Master SHA-256: 8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4
Master rows: 13283
Bundle source commit: 8dd064bffec54a845e35771f88dbfeebbe9acea6
Bundle source CI: https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/34775232421
Source and WordPress CI: https://github.com/HelabHLC/atlas-clarus-connect/pull/29

The installer checks the embedded ZIP size/SHA, strict manifest values and all listed file checksums before changing the runtime options. PACKAGE_VALIDATION.json records archive/source preflight, not a live WordPress test. The GitHub wordpress-browser-edition jobs separately execute PHP syntax, manifest rejection, installation failure preservation, successful switching and rollback tests using a WordPress API test shim. Visual and real IONOS integration checks remain open.

== Changelog ==

= 0.1.11-beta1 =
* Embed the exact verified RC21 parallel print preparation bundle.
* Validate the RC21 workflow, independent 4C/ECG paths, profile transport and export manifest fields.
* Preserve the beta3 navigation correction, existing runtime options and explicit switch/rollback.
* Add a reproducible WordPress package builder and executable PHP update/rollback tests in GitHub CI.

= 0.1.10-beta3 =
* Move the homepage link into ATLAS navigation; opaque mobile menu and section scroll offset.

= 0.1.10-beta2 =
* Restore verified computational Before/After previews for all 13,283 Basis-23 recipes.

= 0.1.10-beta1 =
* Embed RC20 with strict manifest identity and palette import/storage checks.
