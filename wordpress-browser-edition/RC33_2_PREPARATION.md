# RC33.2 installable colour reduction update

The owner requested the RC33.1 functions in the Browser Edition and Android on
14 October 2026. RC33.1 remains an immutable offline preview. RC33.2 is its
separately versioned installable public pilot. All runtime modules are identical
to the accepted RC33.1 source `b6993cfde7ddf8e62ec10914babc6c387373b4ec`.
Only the visible version, manifest status/deployment flag and checksum list change.

## Packages

- Browser: `ATLAS_Clarus_Browser_Bundle_v0.2.0-rc33.2-colour-reduction-update.zip`
  - 4,036,928 bytes
  - SHA-256 `95342c346fc8c73acb89a365ba9f4818184630e45b71b0e1726a9a1c76bf3aee`
- WordPress: `ATLAS_Clarus_Browser_Edition_v0.1.15-beta14_RC33.2.zip`
  - SHA-256 `42f077f427d4f392b7fc3d599916b8245de7cfe429b682275dd16bf66b6a7478`
- Android: `0.4.0-beta.9`, versionCode `9`, application ID `com.atlasclarus.connect`.

Build with `browser-bundle/build_colour_reduction_release.py` and
`wordpress-browser-edition/build_colour_reduction_plugin.py`.
CI uploads Browser and WordPress under `ATLAS-Clarus-RC33.2-WordPress-and-Browser`.

## Installation and rollback

Export open Image Projects as JSON/ZIP before closing or updating: no autosave.
Do not clear browser/app data. Replace the existing WordPress plugin with beta14.
Replacing the plugin preserves the current public runtime until the guarded
activation. Use Tools > ATLAS Clarus Browser Edition >
**Mitgeliefertes RC33.2 prüfen und aktiv schalten** or the registered
`atlas-clarus/install-browser-bundle` ability with the new embedded checksum and
the freshly read current runtime checksum. Activation checks the exact ZIP,
manifest and all files and retains the previous runtime for rollback.
Public URLs, shortcode and client storage keys stay unchanged.

## Acceptance

Local source/package checks pass: deterministic RGB reduction, protected accent,
alpha/hidden RGB, 256 indices, GPL/ASE roundtrip, manifest/checksums, exact preview
module boundary, preserved guarded installer/rollback, Android release identity,
native/storage/adapter hashes and Colour ID DE/EN identity.
The local Playwright browser download was unavailable. Full graphical-browser,
PHP 7.4/8.5 and APK/AAB acceptance are assigned to the dedicated CI workflows;
record results and exact source commit after they complete.

Physical Android/Apple acceptance and live activation are not established by CI.
Android signing remains the existing manually dispatched protected workflow.
No Play release or WordPress activation is implied by package generation.
RGB motif count is not printing-ink count. Reduction ZIPs document source and
output but are not reopenable reduction jobs. Existing Image Projects remain
independently reopenable. The separate desktop exchange helper is still RC32.2.
