# Image Projects validation — 9 October 2026

Source base: `cf04bf69298d834e864f1ada96e7710d9de8704c` (Colour Projects).
The opt-in image build leaves default RC28 and existing RC29/29.1/30 builds
byte-identical to their recorded releases. RC30.1 is also checked by its existing
WordPress workflow. Reference data and project/handoff protocol cores are unchanged.

## Automated evidence

- `tests/validate_image_projects.js`: exact colour/rectangle masks, preserved alpha,
  retained RGB behind transparency, repeated undo/redo, new edits after undo,
  attached palette retention, JSON/ZIP round trips and invalid payload rejection.
- `tests/validate_image_png.py`: an independent Python replay verifies affected
  pixel locations, change counts and before/after hashes for every event. Pillow
  decodes the exported PNG and compares every RGBA byte, including hidden RGB.
- `tests/validate_image_projects_browser.cjs`: actual upload, colour click,
  rectangle drag, both edits, repeated undo/redo, downloads, ZIP import in a
  separate colleague session and return of extended JSON. Older/tampered imports
  leave the working project intact. Drag/drop JSON works. JPEG EXIF orientation
  is frozen into the recorded dimensions while the original file stays identical.
  Viewports 1440, 390 and 844 have no horizontal overflow; screenshots were reviewed.
- `../wordpress-browser-edition/tests/validate_images_package.py`: WordPress
  folder/header, package pin, manifest, all 44 payload checksums and unchanged
  existing protocol modules. The palette UI gains only a read-only snapshot bridge.
- GitHub workflow `wordpress-image-projects.yml` rebuilds twice, compares the
  committed ZIP, executes installer/rollback tests on PHP 7.4 and 8.5, and runs
  browser tests against the HTML extracted from the actual WordPress package.

Local core, independent replay and browser checks passed. GitHub Actions run
`37918845779` passed on PHP 7.4 and 8.5, including package reproduction,
installer/rollback checks and the complete image workflow from the WordPress ZIP.
The existing RC28/29/29.1/30/30.1 workflows also passed at source commit
`3840d2bdeb79294b28f6a0c694b6558f7a0dd267`. The separate Android build encountered
a network timeout downloading its unchanged Colour ID source; its bundle pin and
export adapter checks passed. This release supplies browser/WordPress packages.

## Boundaries

No live IONOS activation, native Adobe round trip, physical output, arbitrary
layered/vector design format, concurrent editing or cryptographic authorship
verification is claimed. The image workspace is in memory: download ZIP/JSON
before closing. PNG/JPEG only, up to 8 MiB and 4,194,304 pixels, 100 history events.
Exact matching does not automatically include similar shades or antialiased edges.
