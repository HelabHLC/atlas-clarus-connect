# RC33.8 recovered source and public release preparation

Owner requested IONOS and Browser Bundle update on 16 October 2026 and corrected the target to RC33.8. RC33.7 was packaged but not installed on WordPress.

Source: repaired `ATLAS_RC338.zip` and `ATLAS_RC338_Tests.zip`, retrieved by exact Library identity. Every extracted file passed its original SHA256SUMS; both archives passed CRC checks. The existing independent photo evidence describes 441 nearest-reference pixels preserved through cleanup and 5,041 deliberately filled reference pixels. No WordPress or Android deployment was part of that earlier acceptance.

`recovered/index.delta.json` reconstructs the original RC33.8 entrypoint from the frozen RC33.5 entrypoint with exact before/after SHA-256 guards. Remaining recovered assets replace/add only the delivered changed files. The reconstruction checks every delivered file hash before public promotion. Public promotion changes only entrypoint version text, manifest and checksum list. All actual runtime modules, master data and reference identities stay identical to the recovered RC33.8 preview.

WordPress beta17 uses the previous guarded installer and rollback implementation, with new bundle/manifest pins. No Android package is built or deployed. Test fixture: Joel Salmi / Unsplash, https://unsplash.com/photos/-FWBJPvp_WI ; original JPEG SHA-256 5b0e20242b9efbbec0308d4597e97898373858763f62e010c1ce5ebd29dc8caf. It is used only for reproducible verification and retained attribution.

Run `python wordpress-browser-edition/build_rc338_release.py`, then the release workflow checks deterministic packages, real PHP installer/failure/rollback behavior, the Chromium photo acceptance and independently reconstructed actual PNG/ZIP downloads. Live activation and public delivery are recorded separately after they happen. No physical print, Safari or real iOS/Android approval is implied.
