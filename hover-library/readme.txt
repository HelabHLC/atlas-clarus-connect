=== ATLAS Clarus Hover Library ===
Contributors: atlas-clarus
Tags: color, colour, hlc, atlas, swatches
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 0.1.5
License: GPLv2 or later

Interactive ATLAS Clarus HLC reference library with exact active-PKL RGB swatches and hover details.

== Description ==

Use `[atlas_clarus_library]` or, for example, `[atlas_clarus_library view="solid_c" per_page="120" show_status="yes" show_search="yes" show_library_selector="yes"]`.

The Core view contains 13,283 exact active-master ATLAS identities. The 16 named source-context views are observed ATLAS coverage views derived from previously documented v3.4.0 screenshot-RGB mappings. They are not Pantone libraries and do not assert Pantone identity equivalence.

Workflow: ATLAS Clarus Workflow v3.4.0
Active master SHA-256: 8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4

SOURCE_AUTHORITY = UNRESOLVED for Pantone-derived observed views
FREEZE_STATUS = NOT_FROZEN_EXPERIMENTAL
measured_qc_status = NOT_MEASURED

No 4C, ECG, device or measured-QC values are created by this plugin.

== Installation ==

1. In WordPress go to Plugins > Add New > Upload Plugin.
2. Select the plugin ZIP, install and activate it.
3. Open Settings > ATLAS Clarus Library if you want to change defaults.
4. Add `[atlas_clarus_library]` to a page or post.

== Changelog ==

= 0.1.5 =
* Added verified deep-link handoff to the ATLAS Clarus Colour Identity Wheel.
* Transfers zero-based atlas_row_id, HLC reference and active-master SHA-256.
* Wheel blocks master, ID or HLC mismatches before selecting an identity.

= 0.1.4 =
* Added compact book-style swatch display.
* Added persistent right-hand ATLAS detail panel.
* Added descriptive nearby-reference display with explicit non-equivalence boundary.
* Added a browser-local palette with add, remove and clear controls.
* Added responsive two-column workspace layout.

= 0.1.3 =
* Added client-side dataset integrity and reference validation.
* Improved keyboard and screen-reader operation.
* Added robust clipboard fallback and visible copy confirmation.
* Debounced search and improved multi-instance cleanup.
* Added cache-safe asset versions and stronger theme-CSS isolation.

= 0.1.2 =
* Initial public-beta plugin with exact HLC Core Reference and 16 observed-coverage views.
* Hover tooltip positioning and theme-CSS isolation fix.
