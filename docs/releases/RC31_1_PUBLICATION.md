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

The two HTML fragments beside this file record the new pilot content.

## Download-link correction — 9 October 2026

The owner reported receiving `v0.2.0-rc28-source-provenance`. The existing GitHub
`browser-bundle-current` asset still contained RC28; adding a pilot button had left
the navigation and two earlier download links pointing to that older asset.

Corrected the website's existing paths to the verified RC31.1 user ZIP above:

- Homepage post 4758: removed the redundant old RC28 download anchor, retaining
  the new RC31.1 pilot button.
- Download page post 5516: changed the older footer download to the RC31.1 ZIP
  and labelled it `Download Browser Bundle RC31.1 · Image Projects pilot`.
- Navigation menu 326, item 5487: changed the URL to the same RC31.1 ZIP and the
  title to `Download Browser Edition RC31.1`.

Verified the actual user ZIP: manifest and visible HTML footer both identify
`0.2.0-rc31.1-image-projects`, with no `rc28-source-provenance` text in its HTML.
The ZIP SHA-256 remains
`fa538dd5b6f717f7c948a0cb11ecfff814678f114d2b9d3436148f8ed1861b3f`.
This is a link correction; the application binaries and IONOS installer did not
change. The historical moving GitHub release was not overwritten outside its
existing main-branch publication workflow.
