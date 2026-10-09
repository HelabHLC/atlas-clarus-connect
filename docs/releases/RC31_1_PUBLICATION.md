# RC31.1 publication — 9 October 2026

Owner request: prepare the IONOS update and a user download on the homepage.

- Download source commit: `87ba5bab96c64052d6adfc2dabfc9ace3c480564`.
- Homepage post 4758: added a clearly labelled RC31.1 pilot download button next
  to the existing stable Browser Bundle link. The stable release endpoint remains
  governed by its main-branch publication workflow.
- Downloads page post 5516: added the Image Projects card, direct version-pinned
  download, usage guide, checksum, limits and save-before-closing instruction.
- WordPress content edits and authenticated read-back both succeeded through the
  connected WPVibe REST API. WPWriter reads timed out during this update.
- Both ZIPs are committed on GitHub. The user ZIP is byte-identical to the embedded
  WordPress runtime. The IONOS plugin ZIP is prepared for manual upload and guarded
  activation; no plugin installation or live runtime switch was performed.
- All seven GitHub workflows passed at the download source commit, including
  Image Projects run 37919758208 (PHP 7.4/8.5, reproducibility, independent pixel
  replay, browser handover and matching offline/WordPress payloads). The Android
  job also passed on this run after the earlier network timeout.

Public pages:
- https://arbe-lambda-star.com/
- https://arbe-lambda-star.com/atlas-clarus-downloads/#clarus-image-projects-download

User ZIP:
https://github.com/HelabHLC/atlas-clarus-connect/raw/87ba5bab96c64052d6adfc2dabfc9ace3c480564/downloads/browser-bundle/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc31.1-image-projects.zip

IONOS installer:
https://github.com/HelabHLC/atlas-clarus-connect/raw/87ba5bab96c64052d6adfc2dabfc9ace3c480564/downloads/wordpress/ATLAS_Clarus_Browser_Edition_v0.1.15-beta11_RC31.1.zip

Install: Plugins > Add New > Upload Plugin; replace ATLAS Clarus Browser Edition.
Then Tools > ATLAS Clarus Browser Edition > Mitgeliefertes RC31.1 prüfen und aktiv schalten.
Open Colour Projects > Open Image Projects.

The two HTML fragments beside this file record the exact new public content.
For rollback remove only that added homepage anchor and the section with
id `clarus-image-projects-download`. Earlier page content was retained.
