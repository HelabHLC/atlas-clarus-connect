=== ATLAS Clarus Appearance Pixel Simulator ===
Contributors: atlasclarus
Tags: colour, color, appearance, pixel, simulation, PKL
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 0.2.2
License: GPLv2 or later

Master-bound, pixel-addressable appearance engineering simulator for WordPress.

== Installation ==

1. Upload the plugin ZIP under Plugins > Add New > Upload Plugin.
2. Activate the plugin.
3. Open Settings > ATLAS Clarus Appearance and select the default master row.
4. Add `[atlas_clarus_appearance_simulator]` to a page or post.

== Description ==

Version 0.2.0 binds the browser simulator to a verified projection of the active
ATLAS Clarus Master v2 illumext: 13,283 reference rows, 114 source columns,
36 spectral reflectance values per row and 26 illuminant diagnostics. The source
master and every browser asset are SHA-256 identified and verified at runtime.

Search or select a master identity, inspect its actual reference, RGB, HEX, Lab,
spectrum and illuminant diagnostics, then explore material, finish, illumination,
embellishment, texture, view angle, gloss and relief variants. Exports include a
APF evidence envelope, pixel data JSON and PNG preview. The APF bundle registers
the exported assets by URI and SHA-256 and records pixel/region bindings.

Master reference fields and spectra are source evidence. Appearance pixels are
an engineering simulation. They are not BRDF/BSDF measurements, a physical
proof, measured QC or certification.

For CIE D50, D65 and A, the base colour stimulus is calculated from the master
reflectance, the CIE illuminant SPD and the CIE 1931 2 degree observer on the
native 380–730 nm, 10 nm master grid. XYZ is Bradford-adapted to the calculated
D65 white before display-sRGB encoding. The restricted spectral range is
reported in the UI and APF evidence. ALS LED and STR scenarios remain disabled
until their authoritative spectral power distributions are available.

== Changelog ==

= 0.2.2 =
* Adds a manufacturer-neutral renderer connector contract.
* Adds a clearly labelled deterministic mock renderer for end-to-end workflow testing.
* Adds an optional server-side external JSON adapter with protected bearer token.
* Binds verified renderer output hashes and SIMULATED/CALCULATED status into APF.

= 0.2.1 =
* Adds APF–AxF Bridge v0.1 import, identity binding, validation, status display and JSON export.
* Computes the selected AxF file SHA-256 in the browser without uploading the file.
* Keeps AxF decoding/rendering and physical measurement outside the WordPress runtime.

= 0.2.0 =
* Replaced RGB light multipliers for D50, D65 and A with spectral integration.
* Added CIE 1931 2 degree XYZ calculation and Bradford display adaptation.
* Added runtime SHA-256 verification of the CIE spectral-engine asset.
* Disabled ALS LED and STR scenarios without authoritative SPDs.
* Added CALCULATED spectral evidence and range limitation to APF export.

= 0.1.2 =
* Added APF v0.1 Identity, Status and Evidence Envelope export.
* Bound pixel JSON and PNG preview assets by SHA-256.
* Added pixel/region locators and five-stage workflow status.
* Added APF architecture, JSON Schema and complete cross-format example.

= 0.1.1 =
* Bound all 13,283 identities to the verified active master projection.
* Added actual spectral reflectance and illumext diagnostics per master row.
* Added master search and runtime SHA-256 integrity verification.
* Preserved the boundary between reference evidence, simulation and measured QC.

= 0.1.0 =
* Initial engineering release.
