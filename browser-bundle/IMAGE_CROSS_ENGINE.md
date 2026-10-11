# Image Projects: exact cross-engine handover

Source-only follow-up to [PR #70](https://github.com/HelabHLC/atlas-clarus-connect/pull/70),
proposed in [PR #75](https://github.com/HelabHLC/atlas-clarus-connect/pull/75).
This is not an Android, WordPress or public browser-bundle release.

## What is being tested

`tests/validate_image_cross_engine.cjs` creates projects through the unchanged
RC31.1 UI **separately in Chromium, Firefox and WebKit**. Each project includes a
linked Colour Projects palette. Each original is tested both without edits and
with four recorded operations: exact-RGB recolouring at X=2/Y=3, transparency,
undo and redo. The original source bytes are never changed.

Each sender's actual JSON and complete ZIP is imported in every receiving engine:
14 files × 3 senders × 3 receivers × 2 formats × 2 history states = **504 imports**.
This includes **336 cross-engine imports** and 168 same-engine controls. It covers
all six directed cross-engine pairs, not just Chromium → Firefox → WebKit.

Successful cases must preserve the entire project object and every re-exported
ZIP byte, including the embedded original, frozen RGBA, oriented dimensions,
coordinates, exact source RGB, Atlas references, attached palette, masks and
journal. Edited PNG bytes must also agree. A rejection must be caused by the
source/pixel mismatch, not an unrelated error.

Additional regression checks:

- 36 actual UI rejections: all six directions × three problematic files × JSON/ZIP;
  the previously open project must remain exactly unchanged.
- Six UI roundtrips of an opaque PNG: a colleague imports ZIP, adds an undo event,
  returns JSON, and the sender verifies the extended journal.
- 18 matching-engine helper roundtrips for the problematic files, including a new
  edit and returned JSON; both incoming formats are exercised.
- 72 coherently rehashed one-byte attacks: four files × three origins × three
  receivers × two formats; the legacy exporter supplies consistent hashes, CRCs
  and ZIP manifests, but every strict verifier must reject them.
- A project rejected by every engine cannot be opened by the helper.

The expected fixture boundary is pinned in the test. Browser or decoder changes
that move that boundary fail the test and require investigation. Do not update
expectations merely to make CI green. These synthetic fixtures are not a new
Ruisdael archive test and cannot establish universal image compatibility.

## Safe exchange route

The regular browser importer remains strict. Its verifier, source decoder,
project schema, journal algorithm and ZIP companions are unchanged from #70.
The helper **does not make an incompatible engine accept a project**. It finds
an available local engine that independently verifies that exact project, then
opens an ordinary Image Projects workspace in that engine.

1. The sender retains and sends the complete original JSON or ZIP. Record the
   file's SHA-256 separately if an independent transfer identity is required.
2. On a desktop recipient computer, run the compatibility check below. It reads
   the incoming file once and runs the complete strict JSON/ZIP verifier in each
   installed, pinned Playwright engine. `VERIFIED`, `REJECTED` and `UNAVAILABLE`
   are distinct. The check reports file, document, source, pixel and rendered-frame
   hashes, dimensions, history count, bundle hash, engine versions and OS.
3. Choose an engine marked `VERIFIED`. `--open` starts a fresh process and repeats
   full verification before using the actual UI import route. It never consumes
   a saved report as permission to import.
4. Continue editing and download JSON or ZIP from that workspace. The command
   retains requested downloads in a new `atlas-exchange-downloads-*` directory
   beside the incoming file, prints their paths, and does not overwrite the input.
   Wait for `Saved:` before closing the editor. Closing alone does not save work.
5. Return the saved JSON or ZIP. The sender repeats strict verification before
   accepting it. The original and earlier journal entries remain intact.

If **no engine verifies**, stop and keep the unchanged files. Ask the sender to
continue in an environment that still verifies them, or reproduce that trusted
decoder environment. An engine name or matching version number alone is not
proof; every project still has to pass the full byte comparison.

There is no tolerance, unsigned attestation bypass, decoder supplied by the
project, pixel replacement, profile stripping, image conversion, history flattening
or automatic rebase. The check report is unsigned local diagnostic output, not
proof of authorship, a signature, an external-origin certificate or a transferable
verification credential. Sending `edited.png` alone is not an editable handover.

## Desktop setup and commands

Prerequisites: a reviewed checkout of this candidate, Python 3, Node.js, and the
Playwright browser/system dependencies. Installation requires network access;
after installation the project check/editor uses local files and blocks HTTP(S)
requests. Run untrusted images with an appropriately maintained local runtime.
Do not substitute the published RC31.1 importer: it predates strict source binding.
The helper refuses that known legacy API.

From the repository root:

```bash
npm ci --prefix browser-bundle/tests --ignore-scripts
browser-bundle/tests/node_modules/.bin/playwright install --with-deps chromium firefox webkit
python3 browser-bundle/build_bundle.py --image-projects --output-dir browser-bundle/build-source-binding
node browser-bundle/tools/image-project-exchange.cjs /path/to/project.zip --check
node browser-bundle/tools/image-project-exchange.cjs /path/to/project.zip --open chromium
```

Choose `firefox` or `webkit` instead when that engine verifies. The helper supports
`.json` as well as `.zip`. It uses the **exact source-binding candidate built above**;
there is no downloaded script or project-controlled browser executable. `--check`
prints a JSON report to standard output and exits 0 if at least one engine verifies,
2 if none verifies, and 1 on command/setup errors. `--open` fails before importing
if verification fails. Error output is not evidence that a file was malicious:
legitimate decoder differences also cause rejection.

Playwright is pinned by `tests/package-lock.json` (currently 1.62.1). Firefox is
launched with `gfx.color_management.mode=2` to enable tagged-image ICC conversion;
Playwright's default screenshot preferences otherwise disable it. The helper
records this setting. Normal browser preferences are not changed. A Firefox
installation with other settings is a different decoding environment.

## Reproduce the regression suite

```bash
python3 -m pip install Pillow
python3 browser-bundle/tests/prepare_source_binding.py /tmp/atlas-source-binding
node browser-bundle/tests/validate_image_cross_engine.cjs
```

The preparation script verifies the frozen RC31.1 archive before extracting it.
Fixture hashes and real sender JSON/ZIP files are retained under
`/tmp/atlas-source-binding/`. `cross-engine-report.json` records every import and
its exact input hash. The `Image Projects cross-engine exchange` workflow uploads
that report, the fixtures manifest, helper checks and all actual sender files.
The existing #70 workflow continues to test decode errors, rehashed journals,
EXIF orientation, ICC conversion, UI drop failures and the published package.

## Compatibility limits and release gates

- The strict policy is **per project and decoding environment**, not per file
  extension or browser brand. Opaque PNG/JPEG successes in these fixtures do not
  qualify all PNG/JPEG images, arbitrary profiles, animated images or future codecs.
- JSON and ZIP have the same source/pixel boundary. Packaging does not fix decoding.
- The desktop helper is an explicit compatible-engine workflow, not native
  cross-engine editing of incompatible pixels and not a universal web-only fix.
- Playwright WebKit on Linux is **not Safari on an iPhone, iPad or Mac**. Physical
  iPhone, physical iPad, macOS Safari, Windows desktop and Android/WebView checks
  remain **NOT_TESTED** by this suite. A viewport resize is not a device test.
- Linux headless browser tests do not establish acceptance of a headed desktop
  session on another OS. `--open` repeats the strict check in that session and
  refuses it if the environment produces different bytes.
- Fully portable native editing would need a separately versioned deterministic
  decoder policy and a deliberate migration design. No such conversion or claim
  is introduced here.

## Executed cross-import results — 11 October 2026

The completed suite passed on Chromium **151.0.7922.34**, Firefox **153.0** and
WebKit **26.5**, using Playwright 1.62.1 on a GitHub-hosted Linux runner.
Firefox tagged-image colour management was explicitly enabled as described above.
[Executed run](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38155586500)
checked source commit `c257c2ff6e1f24aefdc049187db4e7f46032e4f1`.
[Complete machine-readable evidence](tests/evidence/image-cross-engine-2026-10-11.json)
contains all 504 cases, source/pixel/input hashes, UI and helper results, 72
attack outcomes, tested source hashes and all eight successful CI workflow IDs.
The evidence-only commit does not alter the tested runtime or tests.

Each cell below covers **both JSON and ZIP**, both the initial project and the
four-event edited project. “Reject” means an exact source/pixel mismatch; the
unchanged source file's SHA-256 remains valid.

| Fixture | Chromium ↔ Firefox | Chromium ↔ WebKit | Firefox ↔ WebKit |
| --- | --- | --- | --- |
| `alpha.png` | Reject both directions | Reject both directions | Reject both directions |
| `linear-icc.png` | Reject both directions | Reject both directions | Reject both directions |
| `linear-icc.jpg` | Reject both directions | Reject both directions | Reject both directions |
| `opaque.png`, `plain.jpg`, `progressive.jpg`, `exif-1.jpg`–`exif-8.jpg` | Unchanged, both directions | Unchanged, both directions | Unchanged, both directions |

All 14 fixtures pass the same-engine controls. The measured counts are:

| Direction | Unchanged imports | Expected rejections |
| --- | ---: | ---: |
| Chromium → Firefox | 44 | 12 |
| Firefox → Chromium | 44 | 12 |
| Chromium → WebKit | 44 | 12 |
| WebKit → Chromium | 44 | 12 |
| Firefox → WebKit | 44 | 12 |
| WebKit → Firefox | 44 | 12 |
| Same-engine controls combined | 168 | 0 |
| **Total** | **432** | **72** |

All 36 UI workspace-preservation checks, all six opaque-PNG edit/return
roundtrips, all 18 problematic-file matching-engine edit/return roundtrips and
all 72 rejection checks for coherently rehashed attacks passed. The CLI check
returned the correct exit statuses; repeated JSON and ZIP downloads survived
browser closure without overwriting the input. Damaged ZIPs were rejected and
unavailable engines were distinguished from failed verification. The 72 expected
compatibility rejections are separate from the 72 malicious test variants.

The pixel/source verifier remains byte-for-byte identical to #70 (SHA-256
`3b5b6e90abd28f52b5236ea0793ff6b9394cb0754f504951df2f0da6117e2c45`).
Original source and browser-decoded sRGB values remain distinct. The embedded
file retains information (including profile and hidden RGB) that a browser's
initial canvas capture may already have converted or rounded; this work does
not claim to reverse that original capture conversion.
