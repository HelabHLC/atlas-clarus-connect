# ATLAS Clarus RC34.8 — CorelDRAW XML

Adds **CorelDRAW XML** to My Palettes and Colour Reduction. Complete reduction
job ZIPs include `palette.xml`. Atlas addresses and protected original-colour
names retain their exact 8-bit sRGB values. Each export is parsed and checked
before download. Keep Clarus JSON or the complete job for provenance.

This release extends the exact deployed RC34.7 package. Its master data,
reference libraries, numerical engines, FOGRA58 textile conversion, reference
PDF and image-preview modules remain byte-identical. No physical proof or
native CorelDRAW for Windows acceptance is claimed. A user-provided CorelDRAW
Web screenshot confirms H075_L060_C045 / RGB 180,136,67 / #B48843.

Automated browser acceptance covers all 13,283 master references and 256 channel
values, Unicode and escaped names, invalid inputs, corrupted XML, actual palette
downloads, unchanged ASE export, protected-original and reference-only reduction
palettes, and complete reduction-job export/reimport. The WordPress installer is
exercised with real ZIP IO, permissions, stale-state, integrity and rollback
checks before publication.

The site owner requested this homepage/IONOS update on 28 October 2026.
WordPress package version: **0.1.17-beta2**. Update the existing
`atlas-clarus-browser-edition` plugin, then use its native install ability or
Tools page to verify and activate the pinned runtime. Plugin activation alone
does not switch the runtime; the previous runtime is retained for rollback.
Export unsaved browser work before refreshing.
