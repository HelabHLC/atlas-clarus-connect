# RC34.4 reference library release — 2026-10-18

Owner requested the IONOS and Browser Edition update. Preview commit
35b7a7fc136ed063899733159521e821461cc085 passed all 22 GitHub Actions runs.

The public candidate promotes the preview through metadata changes only:
index version, BUNDLE_MANIFEST.json and SHA256SUMS.txt. All other runtime assets
remain byte-identical. Master identity and values remain unchanged. There are
78 visible choices (Core plus 77 source-backed selections); 16 original views
remain unchanged solely for existing work.

WordPress Browser Edition 0.1.16-beta2 derives the guarded installer from the
checksum-pinned beta17 package. It preserves the live RC34.1 text-only exchange
help and last-body-tag injection fix. Boot does not switch runtimes. Exact ZIP
size/hash, manifest and all file checksums are checked before switching; the
previous runtime is retained for rollback. Hover Library 0.2.7-beta1 updates
the active `hover-library` plugin folder, not the inactive duplicate folder.

Local checks: deterministic standalone/WordPress/Hover rebuilds, real PHP ZIP
installation, permission/stale-input guards, failure preservation, repeat install,
rollback and unchanged application-script bytes after navigation/help injection.
PHP tests use a 512 MB test memory limit because they retain several complete
copies of the self-contained HTML simultaneously. These are local checks, not a
claim that a live deployment has completed.

Before deployment the site reported Browser Edition 0.1.16-beta1, active runtime
0.2.0-rc34.1-tool-exchange, bundle SHA256
e662761293864beea3573eca4273194174f1b3d4430af924c3be9304ba02626d.
Hover Library `hover-library/atlas-clarus-hover-library.php` was active at
0.2.6-beta2. The differently named duplicate plugin was inactive.

Deployment is pending. Browser authentication was submitted, but subsequent
browser control was blocked by credential protection. WPVibe then returned a
504 on a read and timed out on the permitted retry. No live plugin, runtime,
page or option was changed. Continue via the normal WordPress ZIP updater and
Tools > ATLAS Clarus Browser Edition; then verify the public runtime and retain
the prior bundle for rollback. Do not report this candidate as live until verified.
