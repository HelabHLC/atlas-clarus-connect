# WordPress Colour Projects update — RC30.1 / beta10

The RC30 Browser Bundle ZIP is an offline web application and has no WordPress
plugin header. Uploading it under Plugins correctly produces “No valid plugins
were found.” This update supplies the separate, installable WordPress package.

## Package and replacement

Use **ATLAS_Clarus_Browser_Edition_v0.1.15-beta10_RC30.1.zip**.
It replaces **ATLAS Clarus Browser Edition**, including beta9 / RC29.1.
The plugin folder remains `atlas-clarus-browser-edition`; do not delete the
existing plugin first. Other ATLAS plugins are not replaced by this package.

1. In WordPress, choose **Plugins > Add New > Upload Plugin**.
2. Upload the beta10 ZIP without extracting it. Confirm replacing the installed
   **ATLAS Clarus Browser Edition**. Activate the plugin if WordPress asks.
3. Open **Tools > ATLAS Clarus Browser Edition** and click
   **Mitgeliefertes RC30.1 prüfen und aktiv schalten**.
4. Confirm **Neues Bundle aktiv: JA**, open the Browser Edition, and select
   **Colour Projects**. A runtime switch preserves the previous runtime for
   **Zur vorherigen Laufzeit zurückwechseln** on the same tools page.

Uploading/updating the plugin alone preserves the currently served runtime.
Existing URLs, shortcode and local palette storage keys remain unchanged.
Projects created in a downloaded HTML file can be moved into the website edition
by downloading project JSON and importing it there; browser storage is not shared
between a local file and a website.

## Verification and scope

The builder starts with the exact shipped beta9 ZIP, validates its fixed SHA-256,
and changes version labels, pinned runtime and strict manifest values. The
administrator guards, installation and rollback code are retained. Default RC28,
RC29.1 and the original standalone RC30 remain separate build targets.

- Plugin ZIP: 3,885,147 bytes, SHA-256
  `e9c68334d9bbb2a376fea6f14c0c2a82e70c85ea1da119de7b8b704e4a3b33d5`.
- Embedded RC30.1: 3,970,461 bytes, SHA-256
  `d5ebd533c76dd4c4dc4f86199ed7f47aa345399977029d218d1b1bc9773536a4`.
- Package validator checks the WordPress folder/header, full manifest, archive
  integrity and all embedded checksums. Project/handoff modules are byte-identical
  to the tested RC30 candidate.
- CI executes the actual plugin against the existing WordPress API shim on PHP
  7.4 and 8.5: capability/nonce rejection, invalid files, installation, repeated
  installation, navigation injection, prior runtime preservation and rollback.
  The project browser test runs against HTML extracted from this WordPress ZIP.

These are packaging/runtime tests, not a completed installation on the live
IONOS site. Live activation, native Adobe round trips and physical output
acceptance remain **NOT_TESTED** for RC30.1.

Build: `python3 wordpress-browser-edition/build_projects_plugin.py`.
