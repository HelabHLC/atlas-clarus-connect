# Meine erste Farbe — isolated staging preview

This preview gives the Browser Edition a German three-step entry: open an image,
select a colour, and download that colour with its recorded origin. Advanced tools
remain available through **Alle Werkzeuge**. HLC and origin details are collapsed
until requested. A saved Clarus JSON file can be reopened without reconstructing
missing source information.

## Status and boundaries

- Preview: `0.2.0-rc34.11-first-colour-origin-preview.2`.
- Baseline: the published [RC34.11 colour-origin release](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/v0.2.0-rc34.11-colour-origin).
- Source base: `release/rc34.11-colour-origin-20261101` at
  `fb6cdaff141e66a446267f4c4157097b12d4bba1`. This preview does not change the
  development runtime on `main`, the public installation, or the WordPress plugin.
- The owner requested a separate IONOS VPS on 1 November 2026. Deployment is
  **pending the target address and access**; this document is not deployment evidence.
- `deployment_allowed: false` blocks promotion to the public installation. The
  owner's separate staging request is recorded in the preview manifest.
- Native QuarkXPress import remains untested. The optional original-file ZIP adds an evidence container; it makes no new
  claim of print or colour-management accuracy.

The builder accepts only the exact published ZIP with SHA-256
`6158babb2a0271b71658c989c79f08ad690c5b782b2c0565e33c849a6c0d6bfb`.
It patches the entry view and a small set of picker callbacks, retaining the
existing sampling, RGB matching, origin capture, and Clarus JSON validation APIs.
It checks the complete change allowlist: four modified files and four additions;
275 inherited files remain byte-identical. The 13,283-row ATLAS master is unchanged
(`8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`).

The downloaded Clarus JSON retains recorded source colours and references,
including multiple sources assigned to the same reference. It does not include
the original image bytes. The **optional Herkunfts-ZIP** now bundles that same
JSON with the unmodified selected image, a SHA-256 manifest and a short explanation.
The standalone JSON button and its output schema remain unchanged.
Malformed imports do not replace a valid selection; transparent or invalid image
selections cannot download the preceding colour. Palette and print actions pass
the complete saved record to the existing tools.

## Original-file ZIP: reuse decision and contract (2 November 2026)

This development stand is based on PR #110 at
`142dd9389599f28583a9bb6d41b1244cc563ef01`, on the separate branch
`feat/first-colour-origin-archive-20261102`. PR #110 was still an open draft when
this extension was prepared. Neither it nor this branch proves server installation.

Before implementation, these existing RC34.11 bundle functions were inspected:

| Existing function | Finding and decision |
| --- | --- |
| `image-projects.js`: `create`, `verify`, `exportFiles`, `importZip` | Retains actual source bytes as base64 plus SHA-256 and exports `original/image.*`. Full Image Projects also stores frozen decoded pixels, edit history and a current PNG. Reopening requires exact browser pixel reproduction and its source decoder accepts PNG/JPEG only. That whole schema is unsuitable for the smaller four-format guide backup. |
| `colour-projects.js`: `exportPackage` | Retains colour documents and history; it does not acquire the guide's original image file. |
| `clarus-handoff.js`: `zipStored`, `utf8` | Reused unchanged for deterministic ZIP writing and text encoding. Its integer-only canonicalizer is unsuitable for Clarus palettes with decimal Lab reference values. |
| `image-project-codecs.js`: `unzip` | Reused unchanged for bounded stored-ZIP reading, CRC verification, local/central header checks, unique safe paths and no unexpected data. |
| `palette-export.js`: `clarus`, `parseClarus` | Reused unchanged for the existing JSON and validation against the frozen master. |
| `colour-origin.js` | Existing metadata capture is retained. No pixel conversion or new profile assignment is introduced. |

`origin-archive.js` supplies only the small archive envelope and its validation.
The selected immutable browser `File` is retained in memory from the successful
picker callback, never reconstructed through canvas or re-encoded. At export its
actual SHA-256 must match **every** recorded source's `image.sha256`. A ZIP reopened
in a fresh tab restores its verified original bytes as a File for later re-export.

The four entries are:

- `original/image.png`, `.jpg`, `.webp` or `.gif`: the exact original file bytes.
  The actual original filename is metadata in the manifest; it is not an archive
  path. Embedded ICC bytes, EXIF and other data therefore survive unchanged.
- `colour.clarus.json`: exactly the same bytes as the existing JSON download.
- `read-me.txt`: the meaning and limits of these three distinct representations.
- `manifest.json`: schema `atlas-clarus-first-colour-origin/1.0`, master identifier,
  original filename/type/hash, all source-assignment indices, representation policy,
  and SHA-256 plus byte count for each of the three payload files. The manifest
  does not hash itself. This is internal consistency evidence, not a signature,
  timestamp service, proof of authorship or proof of a historical browser transform.

Import validates the entire archive before replacing the guide document or its
retained original. Source RGB and ATLAS references are restored, **not resampled**.
The original is retained for re-export but is not re-decoded into the picker:
for a new selection, extract and open the original as a new image. A different
browser may render it differently; the previous recorded values stay unchanged.
A successful import cancels a pending earlier image load. Selecting another image
or importing another document cancels a stale asynchronous ZIP operation.

Limits: one original file up to 32 MiB, Clarus JSON up to 16 MiB, entire ZIP up to
49 MiB, exactly four stored entries. Multiple recorded selections are supported
when all have the same original-file SHA-256. A standalone JSON, missing hashes,
reference-only data or records from different originals cannot create a complete
origin ZIP here; no missing original is inferred or silently omitted. Existing
JSON viewing/downloading remains available. For larger files, retain the original
separately. SHA-256 requires Web Crypto (HTTPS, localhost or local file in the tested
browser). Recompressed or edited ZIPs are intentionally rejected.

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
python releases/rc34.11/generate-fixtures.py fixtures
node previews/first-colour/archive-acceptance.cjs candidate/atlas-clarus-browser-bundle fixtures evidence/archive
python previews/first-colour/verify-archive.py fixtures evidence/archive
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

Recorded local results are in [validation.json](validation.json). The new archive
suite covers all eight generated PNG/JPEG/WebP/GIF fixtures, exact original/JSON
round-trips, three embedded ICC profiles checked independently with Python/Pillow,
16 malformed archives, size limits, same-file multiple sources, unrelated sources,
async cancellation and failure recovery. The 14 guided acceptance groups and the
inherited origin, source-ZIP and master/export checks are also run.

The dedicated workflow `.github/workflows/first-colour-origin-preview.yml` builds
the preview twice, compares ZIP bytes, runs these tests and uploads the test package
and evidence as an expiring Actions artifact. It has read-only repository permission
and contains no deployment step. Mobile coverage uses a 390-pixel simulated viewport;
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
