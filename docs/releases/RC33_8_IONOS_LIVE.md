# RC33.8 / IONOS live activation — 16 October 2026

Owner installed the verified WordPress beta17 ZIP through normal WordPress upload. Fresh authenticated plugin inspection confirmed active `0.1.15-beta17`. The existing `atlas-clarus/install-browser-bundle` ability then verified the embedded archive and switched the runtime with the freshly read RC33.5 expected-runtime SHA as a concurrency guard.

- Active runtime: `v0.2.0-rc33.8-region-correction`
- Active ZIP SHA-256: `cc08c0e2a31dfe52693a03ac28885278d7efa85c5362c58849167cbb255bd4d6`
- Retained previous RC33.5 SHA-256: `d209594b7bad339f587d82da1527eeca3429dd08256e76174f85e7894dc74e68`
- WordPress installer SHA-256: `002fb876ed70aca8536dfdc3720d3d74fe0983e6073ba510db450d67c6d453dc`
- Immutable master: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`

Public entrypoint https://arbe-lambda-star.com/atlas-clarus-browser-runtime/ returned the RC33.8 footer and correction controls with `no-cache, must-revalidate`. Fresh version-query reads of the manifest, atlas-data, app and all six correction/inspection/cleanup modules matched the verified release byte-for-byte. The unversioned manifest alone initially returned a cached RC33.5 response; the actual noncached HTML application was already RC33.8. The WordPress-served assets/bundle.zip matched the active ZIP SHA exactly.

The Downloads page and homepage ZIP button point to the pinned RC33.8 offline package. After activation, the Downloads page was updated to say RC33.8 is active; public HTML verification confirmed the stale RC33.5 pending-install notice is gone.

## Public Chromium acceptance

https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38911431776 — PASS.

The acceptance script ran against the actual public runtime URL, not a local copy. It verified the 32-colour baseline, RGB overlay without export mutation, source-based suggestions, failed-budget output preservation, nearest-reference correction, 441 protected pixels after cleanup, independent saved variant, exact undo, explicit budget increase, designer-chosen single reference, overlap rejection, 390/768-width layout, library invalidation, original-mode rectangle protection and absence of page errors.

PNG/ZIP downloads from the public UI passed independent Pillow/NumPy reconstruction: source bytes and hashes, frozen input, full-master identity, palette indices/counts, library membership, alpha, exact correction masks, protected cleanup and every package-manifest checksum.

Package/installer acceptance: https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38909363164 — PASS.

No master/reference data changes, Android update, main merge, physical print approval or real iOS/Safari acceptance were performed. RC33.5 remains available through the native rollback mechanism.
