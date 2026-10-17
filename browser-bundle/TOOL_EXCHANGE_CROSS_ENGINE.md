# RC34 complete Tool Exchange: cross-engine verification

This suite extends PR #91 using the 14 synthetic source files generated for PR #75. It does not change the application, released ZIPs, deployment pins, reference assignment or frozen master.

## Reproduce

Run from the repository root with Node 22 and Python 3.12:

```sh
npm ci --prefix browser-bundle/tests --ignore-scripts
browser-bundle/tests/node_modules/.bin/playwright install --with-deps chromium firefox webkit
python -m pip install Pillow
python browser-bundle/tests/prepare_source_binding.py /tmp/atlas-source-binding
python browser-bundle/build_tool_exchange_preview.py
node browser-bundle/tests/validate_tool_exchange.cjs
node browser-bundle/tests/validate_tool_exchange_cross_engine.cjs
```

Playwright is pinned to 1.62.1 by the existing lockfile. Firefox uses ICC mode 2, as in the earlier test. No missing engine is counted as a pass. External HTTP traffic from the test pages is blocked.

## Scope and assertions

Each engine decodes each original fixture itself and creates its own complete package. Native APIs construct the seed documents; the actual Tool Exchange UI imports and exports each seed. The transfer matrix imports these UI exports through the UI in each recipient engine, including same-engine controls (14 × 3 × 3 = 126 transfers).

Each package contains:

- Original palette with two distinct source greens sharing a fixed ATLAS reference, derived decisions and a Colour Project with a recorded choice and colour edit.
- Image Project with the exact original file and frozen decoded sRGB RGBA, attached Colour Project, pixel selection, recolour, undo and redo journal.
- Complete reduction job with an inclusive protected rectangle, deterministic output and retained source Image Project.
- Parallel print handoff with exact embedded synthetic 4C/ECG ICC byte strings, separate substrates, intents and black point compensation settings. These synthetic profiles test data preservation, not print suitability. The image corpus separately contains genuine embedded RGB profile test cases.

An accepted transfer must re-export identical document metadata, parent links and every payload byte. Native verification rechecks SHA-256, fixed references, source/decode binding, histories, protected masks and deterministic reduction replay. The sender's original file SHA is also checked against the independent Node hash of the fixture.

Before every transfer the recipient opens a valid saved package and its native Colour Project and Image Project. A decoder mismatch must display the existing source/pixel explanation, retain the file list and package summary and leave native project/history text intact. Re-export must retain every prior document/payload byte. The runtime's candidate validation precedes assignment of the active package; tests do not relax source binding or replace pixels.

## Evidence

The dedicated `RC34 Tool Exchange cross-engine compatibility` workflow uploads `RC34-cross-engine-matrix-and-packages` for 30 days. Its `report.json` records the tested HTML hash, fixture hashes, browser versions, per-direction frozen pixel hashes, input ZIP hashes, outcome and actual UI error. `MATRIX.md` presents all nine engine pairs for every fixture; unexecuted cells are `NOT_RUN`. Sender exchange ZIPs permit reproduction of individual failures. A report is PASS only after every assertion completes; failed runs retain partial evidence.

## Acceptance boundary

This is an automated **Linux** browser-engine test. Playwright WebKit is not an actual Safari installation on a Mac, iPhone or iPad. Physical Windows, macOS Safari, iPhone and iPad acceptance remains **NOT_TESTED**, including their file pickers, downloads, memory limits and OS-specific image decoding. A 390px viewport is not Apple-device acceptance. Device testing must record OS/browser versions and repeat real file export/import before making platform claims.
