# RC26 ACMS Browser Edition

This directory captures the exact packages installed on IONOS staging and the public WordPress site on 2026-09-25. It is a release snapshot of the live RC25 Names v0.3.0 + CHSOS pilot UI4 runtime with ACMS-C/U recipe candidates and computed A/B previews added. The regular Browser Bundle and WordPress source builds now reproduce these installed packages independently of the RC25 archive. The archive remains a provenance record of the previously active runtime.

## Rebuild

From the repository root:

```sh
python browser-bundle/build_bundle.py
python wordpress-browser-edition/build_plugin.py
sha256sum browser-bundle/build/*.zip wordpress-browser-edition/build/*.zip

# Historical reconstruction from the captured RC25 runtime (independent comparison):
python releases/rc26-acms/build_bundle.py
python releases/rc26-acms/build_plugin.py
```

The seven `baseline/rc25.zip.part-*` files reconstruct the baseline ZIP downloaded from the authenticated IONOS staging installation before the RC26 update. Its SHA-256 is `005ccb7d5356777e0bad6706bf922f726144f98ab8aaf78ee82c15293c39a0dd`. The packages under `packages/` are local copies and are ignored by Git; the reproducible build recreates them under `work/rc26-preserved/` with the exact hashes above. The baseline PHP is the active staging wrapper v0.1.15-beta4 captured before updating. The build reads the tracked ACMS research dataset and `browser-bundle/src/acms-recipes.js`. The wrapper v0.1.15-beta6 has the corrected strict RC26 manifest pin; the intervening beta5 failed closed in staging and was never activated.

| Artifact | SHA-256 | Bytes |
| --- | --- | ---: |
| `work/rc26-preserved/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc26-names-v0-3-0-chsos-pilot-acms-spot-ba.zip` | `b5d65c2a0bb39ccb0af59709ca8a1bac1ed2765b381e0714cb6ed6ce51112615` | 3,903,163 |
| `work/rc26-preserved/ATLAS_Clarus_Browser_Edition_v0.1.15-beta6_RC26.zip` | `882a6319fe9bc7abce5b95887b3412831a5656aeb985c5c222f0d1d9597cb5c3` | 3,815,838 |

Validation: all 29 bundle file checksums match `SHA256SUMS.txt`; the wrapper embeds the exact bundle; staging and production runtime administration both reported installed bundle SHA-256 `b5d65c2a0bb39ccb0af59709ca8a1bac1ed2765b381e0714cb6ed6ce51112615`. Solid C and Solid U candidate panels were checked in staging. Production was checked for the C recipe at `H005_L040_C060`, including both model A/B previews and PNG controls. The existing core Basis23 path was inspected in staging.

ACMS mixtures and ΔE00 values are computational candidates, not measured paint recipes or production approvals. Coated and Uncoated memberships do not imply substrate-specific measurements. The regular source build contains Names v0.3.0, UI4 and ACMS-C/U and reproduces both deployed ZIP hashes. The preserved RC25 archive is no longer a build dependency.
