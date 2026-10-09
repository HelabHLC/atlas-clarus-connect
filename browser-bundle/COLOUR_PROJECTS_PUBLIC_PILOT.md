# Colour Projects RC30.1 — WordPress public pilot

The site owner requested installation on 9 October 2026 after WordPress rejected
the standalone RC30 browser ZIP. RC30.1 packages the same project application
for the existing ATLAS Clarus Browser Edition WordPress plugin, version
**0.1.15-beta10**. This packaging step does not itself activate the live site.

## Choose the right ZIP

- `ATLAS_Clarus_Browser_Edition_v0.1.15-beta10_RC30.1.zip` is the installable
  WordPress update. Upload this ZIP without extracting it.
- `ATLAS_Clarus_Browser_Bundle_*.zip` is the standalone browser application.
  It has no WordPress plugin header and cannot be installed in the plugin uploader.

Replace **ATLAS Clarus Browser Edition**, keeping its existing plugin folder,
shortcode, runtime URLs and options. In WordPress, open **Tools > ATLAS Clarus
Browser Edition**, then **Mitgeliefertes RC30.1 prüfen und aktiv schalten**.
The plugin verifies the embedded ZIP, master, manifest and every file checksum
before switching the runtime. It preserves the previous runtime for rollback.
Uploading the plugin alone does not switch the currently served application.

## Scope

The Colour Projects and shared handoff JavaScript match RC30. Public-pilot labels,
version, documentation and deployment metadata identify this website package.
The fixed master, original RGB values, reference assignments and decision IDs
are unchanged. Project records remain in each visitor's browser, with explicit
JSON/ZIP backups. There is no server project account or online collaboration.

The project JSON retains all recorded origin and decision history; palette
companions retain the corresponding colour history. Images must be kept
separately. Native Adobe application round trips and live IONOS acceptance
remain NOT_TESTED. A design choice is not physical production approval, and
hashes establish consistency rather than authenticated authorship.
