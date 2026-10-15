# RC33.5 / WordPress beta15 deployment — 2026-10-15

## Installation and activation

The owner authorized the public WordPress update and signed into wp-admin.
The normal plugin ZIP upload replaced beta14 with beta15 successfully. No theme,
raw option writes, arbitrary PHP execution or master-data changes were used.
The native `atlas-clarus/install-browser-bundle` ability then checked the newly
embedded bundle pin against the fresh current runtime and switched it:

- Plugin: `0.1.15-beta15`
- Runtime: `v0.2.0-rc33.5-original-area-protection`
- Active bundle SHA-256: `d209594b7bad339f587d82da1527eeca3429dd08256e76174f85e7894dc74e68`
- Retained previous RC33.2: `95342c346fc8c73acb89a365ba9f4818184630e45b71b0e1726a9a1c76bf3aee`
- Installable ZIP SHA-256: `8c1138243e0f3be70b59e4be1bb016e14b680af24baf699ef70ace9e31e9e654`

## Automated release checks

[Release CI 38727715079](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38727715079)
passed PHP 7.4 and 8.5: deterministic packages, guarded installation, failed-install
preservation, rollback, original/rectangle core checks, embedded browser controls,
reference labels, independent PNG/mask reconstruction and existing reduction,
Image Projects and Colour Reference Card regressions.

An initial workflow run failed because the reference-card fixture generator was
omitted. Adding that test preparation fixed the full run; runtime/package unchanged.

## Interactive public desktop test

Public page: https://arbe-lambda-star.com/atlas-clarus-browser-bundle/#colour-reduction

After reloading the public page, RC33.5 and both new protection controls were visible.
A synthetic 256×128 motif containing 69 decoded RGB colours was uploaded using the
public file chooser. Two global original locks were selected (#3D7B19, #A82A5D).
The original-pixel loupe was operated with keyboard arrows to X0/Y0; it showed
source #3D7B19 separately from H130_L045_C055 row4966, reference #37791A.
A rectangle from (0,0) to (1,1), including both endpoints, was protected.

The public Reduce button produced exactly 24 output RGB colours: 19 ATLAS entries
and 5 exact original entries. Three distinct protected originals shared row4966
but remained distinct RGB entries. Each original card displayed its separate
immutable reference HLC, row, RGB and HEX. Both PNG and source/reduction ZIP were
exported through the actual public controls.

Setting the limit to 2 produced the explicit protected-colours conflict and hid the
old export output. Restoring 24 produced the valid preview again; the separate
reference labels remained present. This is an agent-operated interactive check
on the public WordPress URL in cloud Chromium, distinct from the CI browser tests.

Independent downloaded-file verification and public byte comparison are recorded
in `browser-bundle/evidence/rc33.5/live-verification.json`.

## Important source boundary and remaining acceptance

Protection preserves frozen **browser-decoded sRGB RGBA8** exactly. In this fixture
a partially transparent PNG pixel with G123 decoded as G124 before protection,
as expected from browser canvas alpha rounding. The loupe and exported frozen
input both report G124; the original PNG file is retained byte-for-byte. Therefore
this test does not establish byte-identical decoding of the PNG's stored channels
across engines. It does establish exact protection relative to the declared frozen
browser input, including alpha. No silent reference substitution was observed.

Physical Apple/Android devices, native Adobe apps and textile/press production are
not certified by this desktop test. Paint-by-Numbers PR81 is outside this release.
No live functional defect was demonstrated in the tested protection/export scope.
