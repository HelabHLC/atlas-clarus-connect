# RC29.1 public website pilot

Owner authorization: 2026-10-08, activation on arbe-lambda-star.com.
Provenance travels in the companion JSON; native Adobe application validation
remains NOT_TESTED. The original candidate RC29 is not rewritten.

## Reviewed package

- Source commit: `d1f5fec345a1e3c3eb302e036b8e8ffaa84611f4`
- Plugin: `0.1.15-beta9`
- Bundle: `0.2.0-rc29.1-colour-handoff`
- Plugin ZIP: `ATLAS_Clarus_Browser_Edition_v0.1.15-beta9_RC29.1.zip`
- Plugin ZIP size: 3,861,512 bytes
- Plugin ZIP SHA-256: `5cde09b34bed7b02d30504f4c7fceba22ddd9c6aa8c57355f6b1f331fe6cb603`
- Embedded bundle size: 3,946,953 bytes
- Embedded bundle SHA-256: `827ce6725ad7f0769c56ccf8583e1e82378306f9030c583cc5d593818f564dd9`
- PHP 7.4 and 8.5 guards, strict manifest rejection, failed install preservation,
  successful install, repeat install, canvas injection and rollback: PASS in
  [GitHub Actions](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/37821485067).
- RC29.1 Chromium create/save/reload, handoff ZIP, simulated ASE return, rejection,
  drag/drop and storage-failure warning: PASS at 1440, 390 and 844 pixel widths.
- Default RC28 WordPress ZIP remains byte-identical.

## Deployment and rollback

Update the installed `atlas-clarus-browser-edition` plugin using the pinned ZIP.
This alone keeps the existing public runtime. Then run the plugin's admin
installer under Tools > ATLAS Clarus Browser Edition, or discover and run
`atlas-clarus/install-browser-bundle` on WordPress 6.9+.
The ability requires `manage_options`, the exact embedded `bundle_sha256` and
`expected_runtime_sha256`. It runs the existing installer, accepting no file
path, network URL or executable code. Re-read state after a stale-hash rejection.
The API uses WordPress authentication; the existing admin form keeps its nonce.

Before deployment the live plugin was beta7 with RC27 runtime SHA-256
`3142adf2088734d34c98a3b0f337aab35a728d769e4b15bae420431178a140c7`.
The installer preserves that runtime and records it as the rollback target.
Use the existing rollback button in the same admin screen to restore it.
No old runtime files, colours or local user palettes are deleted by this release.

Live activation and website acceptance must be recorded after the actual switch.
The embedded manifest deliberately retains the pre-deployment NOT_TESTED flags;
changing those bytes after installation would break the pinned package identity.
