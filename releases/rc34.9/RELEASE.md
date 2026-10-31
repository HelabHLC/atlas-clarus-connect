# ATLAS Clarus RC34.9 — QuarkXPress XTG public beta

QuarkXPress XTG is now available in My Palettes and Colour Reduction. Complete
reduction job ZIPs also include `palette.xtg`. Atlas addresses and RGB values,
including protected original colours, are retained. Exported files are checked
before downloading. A German/English import guide and a four-colour test file
are included.

Import the XTG file into a QuarkXPress text box through File → Import, enable
Interpret XPress Tags, and use sRGB IEC61966-2.1 for RGB solid colours. Start with
an empty project to avoid existing-name conflicts. The file contains RGB process
colours and does not embed an ICC profile. Keep Clarus JSON or the complete job
for source and reference evidence.

The user requested the public Browser Edition/IONOS update on 31 October 2026.
This release extends the previously verified RC34.8 runtime. Master data,
reference libraries, CorelDRAW exporter, numerical engines, textile modules and
WASM remain unchanged. QuarkXPress is labelled Beta in both export controls.
Native QuarkXPress import remains NOT_TESTED; no production approval is claimed.

The release workflow requires exact input hashes, all-master/channel export
checks, independent archive validation, actual Chromium XTG download and job
round-trip tests, CorelDRAW/ASE browser regression checks, and PHP installer
tests. The full and small WordPress installers preserve the previous runtime
for rollback, verify the new package before switching, and reject stale runtime
state. Plugin activation alone does not switch the Browser Edition.

Use `ATLAS_Clarus_RC34.9_Small_Installer.zip` when the host restricts upload size.
It downloads only the pinned official GitHub bundle during explicit activation.
The other ZIP is the full offline Browser Bundle. Export open browser work before
refreshing or switching versions.
