# Colour Projects RC30 validation — 9 October 2026

Candidate based on the RC29.1 handoff branch at
`3cc1a6475b0020ba360acca085fc30fda82520ca`.
The fixed 13,283-row master and shared Colour Kit 0.3 handoff core are unchanged.

## Observed local results

- `validate_colour_projects.js`: PASS. Two complete source palettes are retained,
  including separate image origin documents and additional palette metadata.
  Edits preserve decision UUIDs and parent revisions. An explicit chosen revision
  survives later edits and returned swatches. Full project JSON reopens unchanged.
  Working and chosen ASEs contain their respective original RGB values.
  Fourteen invalid/limit cases reject without truncating history.
- `validate_colour_projects_browser.cjs`: PASS in Chromium 151.0.7922.34 on Linux.
  Create, edit with note, choose, download, reopen, reload, switch projects,
  drag/drop, malformed/older import, Bundle handoff bridge and returned palette
  update were exercised through the built offline HTML.
  The ZIP was independently opened with Python: CRC and every manifest SHA-256
  passed. Denied/full browser storage still permits project export. A simulated
  cross-tab storage event blocks writes and enables recovery export.
- The separately delivered English Colour Kit **0.3.0** imported both the working
  and chosen palette JSON exports and re-exported matching records, complete
  decision histories and Bundle origin documents. This optional local test is
  enabled with `COLOUR_KIT_HTML`; CI does not contain the separate Kit artifact.
- Desktop 1440 px, portrait 390 px and landscape 844 px: no horizontal overflow;
  inspected desktop/portrait screenshots. No page exceptions or HTTP requests
  occurred in the offline project workflow.
- `validate_colour_projects_build.py`: reproducible candidate, complete internal
  checksums and unchanged RC28, RC29 and RC29.1 ZIP identities. Existing wrappers
  remain pinned to their existing releases.

## Reproduce

```sh
node browser-bundle/tests/validate_colour_projects.js
python3 browser-bundle/tests/validate_colour_projects_build.py
python3 browser-bundle/build_bundle.py --colour-projects --output-dir browser-bundle/build-projects
npm ci --prefix browser-bundle/tests --ignore-scripts
browser-bundle/tests/node_modules/.bin/playwright install --with-deps chromium
node browser-bundle/tests/validate_colour_projects_browser.cjs
```

The browser test accepts `PROJECTS_HTML`, `PROJECTS_TEST_OUTPUT`,
`CHROMIUM_PATH`, `PLAYWRIGHT_MODULE` and optional `COLOUR_KIT_HTML` overrides.
GitHub Actions publishes the candidate and browser evidence as workflow artifacts.

Native Adobe application round trips, physical device/print acceptance,
authentication of declared origin, live WordPress activation and multiuser
collaboration are **not validated** by these tests. File hashes check consistency.
