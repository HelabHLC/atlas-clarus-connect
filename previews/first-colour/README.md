# Meine erste Farbe — isolated staging preview

This preview gives the Browser Edition a German three-step entry: open an image,
select a colour, and download that colour with its recorded origin. Advanced tools
remain available through **Alle Werkzeuge**. HLC and origin details are collapsed
until requested. A saved Clarus JSON file can be reopened without reconstructing
missing source information.

## Status and boundaries

- Preview: `0.2.0-rc34.11-first-colour-preview.1`.
- Baseline: the published [RC34.11 colour-origin release](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/v0.2.0-rc34.11-colour-origin).
- Source base: `release/rc34.11-colour-origin-20261101` at
  `fb6cdaff141e66a446267f4c4157097b12d4bba1`. This preview does not change the
  development runtime on `main`, the public installation, or the WordPress plugin.
- The owner requested a separate IONOS VPS on 1 November 2026. Deployment is
  **pending the target address and access**; this document is not deployment evidence.
- `deployment_allowed: false` blocks promotion to the public installation. The
  owner's separate staging request is recorded in the preview manifest.
- Native QuarkXPress import remains untested. This work adds no export format and
  makes no new claim of print or colour-management accuracy.

The builder accepts only the exact published ZIP with SHA-256
`6158babb2a0271b71658c989c79f08ad690c5b782b2c0565e33c849a6c0d6bfb`.
It patches the entry view and a small set of picker callbacks, retaining the
existing sampling, RGB matching, origin capture, and Clarus JSON validation APIs.
It checks the complete change allowlist: four modified files and three additions;
275 inherited files remain byte-identical. The 13,283-row ATLAS master is unchanged
(`8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`).

The downloaded Clarus JSON retains recorded source colours and references,
including multiple sources assigned to the same reference. It does not include
the original image bytes. Users must keep their original image separately.
Malformed imports do not replace a valid selection; transparent or invalid image
selections cannot download the preceding colour. Palette and print actions pass
the complete saved record to the existing tools.

## Build and try locally

Run from the repository root with Python 3.12 and Node.js 24. The output directory
must not already exist.

```sh
mkdir inputs
gh release download v0.2.0-rc34.11-colour-origin --repo HelabHLC/atlas-clarus-connect --pattern 'ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.11-colour-origin.zip' --dir inputs
python previews/first-colour/package.py --base inputs/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.11-colour-origin.zip --output-dir candidate
```

Open `candidate/atlas-clarus-browser-bundle/index.html`. The default view is the
guide; `#picker` opens the existing full picker. The package is also ready to serve
as static files from its own test host. No WordPress installation is required.

## Reproduce acceptance checks

Install test dependencies in a disposable checkout:

```sh
npm install --prefix qa-runtime --ignore-scripts --no-audit --no-fund playwright@1.54.1
qa-runtime/node_modules/.bin/playwright install --with-deps chromium
python -m pip install Pillow==12.0.0
export NODE_PATH="$PWD/qa-runtime/node_modules"
python -m zipfile -e inputs/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.11-colour-origin.zip baseline3411
node previews/first-colour/browser-acceptance.cjs candidate/atlas-clarus-browser-bundle baseline3411/atlas-clarus-browser-bundle evidence/first-colour
node releases/rc34.9/verify.cjs candidate/atlas-clarus-browser-bundle
```

Reuse the historical origin and source-ZIP regression suites:

```sh
gh release download v0.2.0-rc34.10-quarkxpress-source-zip --repo HelabHLC/atlas-clarus-connect --pattern 'ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.10-quarkxpress-source-zip.zip' --dir inputs
python -m zipfile -e inputs/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.10-quarkxpress-source-zip.zip baseline3410
python releases/rc34.11/generate-fixtures.py fixtures
node previews/first-colour/run-regression.cjs origin candidate/atlas-clarus-browser-bundle baseline3410/atlas-clarus-browser-bundle fixtures evidence/origin
node previews/first-colour/run-regression.cjs source-zip candidate/atlas-clarus-browser-bundle evidence/source-zip
```

The regression adapter changes only the initial route to `#picker` and the accepted
preview identity/deployment flag. It retains the historical functional assertions
and leaves the historical test files unchanged.

Recorded local results are in [validation.json](validation.json): all 14 guided
acceptance groups, the origin suite, source-ZIP suite, and master/export verification
passed in Chromium 139.0.7258.5. Mobile coverage uses a 390-pixel simulated viewport;
physical devices and a usability study remain outstanding. Screenshots generated
by the tests are internal QA artifacts.

## Separate VPS handoff

Use a separate HTTPS hostname/origin for this preview. A second path under the
production origin would share browser storage with the public app. Serve only the
contents of the preview bundle from a dedicated document root on the additional
VPS, retaining the ZIP and its checksum for rollback. Do not run the public IONOS
release installers or modify the public WordPress configuration for this preview.

The bundle contains `noindex` and `robots.txt`; these discourage indexing but do
not restrict access. Configure staging access at the test server if required.
Before calling deployment complete, verify the remote manifest/version and static
file checksums, HTTPS, image selection, download/reopen, and return to full tools
at the actual staging URL. No remote acceptance has been performed yet.
