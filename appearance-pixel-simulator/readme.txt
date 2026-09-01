=== ATLAS Clarus Appearance Pixel Simulator ===
Contributors: atlasclarus
Tags: colour, color, appearance, pixel, simulation, PKL
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 0.1.1
License: GPLv2 or later

Master-bound, pixel-addressable appearance engineering simulator for WordPress.

== Installation ==

1. Upload the plugin ZIP under Plugins > Add New > Upload Plugin.
2. Activate the plugin.
3. Open Settings > ATLAS Clarus Appearance and select the default master row.
4. Add `[atlas_clarus_appearance_simulator]` to a page or post.

== Description ==

Version 0.1.1 binds the browser simulator to a verified projection of the active
ATLAS Clarus Master v2 illumext: 13,283 reference rows, 114 source columns,
36 spectral reflectance values per row and 26 illuminant diagnostics. The source
master and every browser asset are SHA-256 identified and verified at runtime.

Search or select a master identity, inspect its actual reference, RGB, HEX, Lab,
spectrum and illuminant diagnostics, then explore material, finish, illumination,
embellishment, texture, view angle, gloss and relief variants. Exports include a
master-bound manifest, pixel data JSON and PNG preview.

Master reference fields and spectra are source evidence. Appearance pixels are
an engineering simulation. They are not BRDF/BSDF measurements, a physical
proof, measured QC or certification.

== Changelog ==

= 0.1.1 =
* Bound all 13,283 identities to the verified active master projection.
* Added actual spectral reflectance and illumext diagnostics per master row.
* Added master search and runtime SHA-256 integrity verification.
* Preserved the boundary between reference evidence, simulation and measured QC.

= 0.1.0 =
* Initial engineering release.
