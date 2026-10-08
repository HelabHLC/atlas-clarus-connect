# Colour handoff — RC29 candidate

Direct Bundle → Colour Kit / Adobe handoff, based on GitHub main
`60bf765e771c3e6493c88a02a046237c9ba69db9` (8 October 2026 checkout).

Build: `python3 browser-bundle/build_bundle.py --colour-handoff`

Open the generated `index.html`, select **Colour handoff**, or use the new
button in the palette drawer. The layout uses the Bundle's existing visual tokens.

1. Choose recorded original RGB, or explicitly adopt reference values as new
   design colours. Choose a range of 1–250 colours; no truncation is implicit.
2. **Use active palette** creates a working set with decision UUIDs. Different
   source samples retain different decisions even when they share an Atlas row.
3. **Save full decision JSON** preserves IDs, all revisions and the complete
   source Bundle document. Open it directly in Colour Kit 0.3.0 or this panel.
4. **Download Adobe handoff ZIP** exports current design RGB, an ASE name linking
   each swatch to its decision/revision, full JSON and a checksum manifest.
5. To return, select the returned ASE plus the original two JSON companions,
   confirm sRGB interpretation, then verify. The return creates linked revisions.

The handoff working set is a separate snapshot from the reference palette.
Changing the Hover/Wheel palette does not silently change it. The existing
palette drawer's Clarus JSON is still version 1.2 and contains reference/source
records, not decision history. Use **Save full decision JSON** in this panel for
decision interchange. Reopening the same active-palette snapshot/basis/range
retains the current IDs and edits. A different selection creates new decisions;
save the current JSON first. One working set is kept in local browser storage;
storage failure is visible and JSON export remains available.

Imported Colour Kit 0.3 documents retain their IDs, original roots and edits.
The source image itself is not included; its available filename, dimensions,
sample coordinates/bounds, RGB, and optional SHA-256 stay in the attached Bundle.
A null image hash remains unknown. Reference RGB is never presented as an
unrecorded image original. The fixed master and integer RGB assignment with
lowest-row tie break remain unchanged; no Lab/ΔE/ICC enters this assignment.

## Protocol and boundaries

The MIT `vendor/clarus-handoff/clarus-handoff.js` is **byte-identical** to the
Colour Kit 0.3.0 implementation (SHA-256
`d1f1cc6fb8a1abff1cbcf3c7221d92c528a9ad1e64158090a4f56071eebc419e`).
Its complete licence and protocol are included in the candidate ZIP. The adapter
checks the exact RGB reference CSV hash as well as history hashes, original
source bindings, the full-master winner, return identifiers and companion bytes.
The adapter commit in Bundle-origin documents identifies the v1.2 mapping
contract used by Colour Kit 0.3.0; it is not a claim about this candidate's build
commit. The manifest identifies the candidate separately.

Limits: 250 active decisions, 5,000 revisions, 16 MiB full JSON, 1 MiB returned
ASE. CMYK/Lab ASE, missing/extra/duplicate/foreign decision names and damaged
companions are rejected. Cosmetic name suffix changes and reordered/grouped RGB
swatches are supported. 32-bit returned RGB channels are recorded and quantized
to 8-bit sRGB for the new assignment. Hashes are integrity checks, not signatures
or authentication of declared authorship/source.

**Native Illustrator/Photoshop/InDesign round trip: NOT_TESTED.** Provenance
travels in companion JSON; it is not embedded automatically into Adobe documents.
No Adobe, WordPress or Android deployment is part of this candidate. A desktop
headless-browser check does not establish physical-device acceptance.

The default builder still reproduces RC28 exactly, keeping its Android and
WordPress payload pins valid. The `--colour-handoff` flag produces separately
named RC29 artifacts. Promoting RC29 into those wrappers requires new package
identities and their existing release gates. The checked-in RC20 distribution,
published releases and live website are not replaced by this build.

Tests:

```sh
npm ci --prefix browser-bundle/tests --ignore-scripts
node browser-bundle/tests/validate_colour_handoff.js
python3 browser-bundle/tests/validate_colour_handoff_build.py
python3 browser-bundle/build_bundle.py --colour-handoff --output-dir browser-bundle/build-handoff
browser-bundle/tests/node_modules/.bin/playwright install chromium
node browser-bundle/tests/validate_colour_handoff_browser.cjs
```

Set `COLOUR_KIT_HTML` to the separate Colour Kit 0.3.0 HTML to additionally test
the actual two-application browser round trip. Without it that one gate is
reported as `NOT_RUN`; the committed Kit fixture is always tested. `CHROMIUM_PATH`
can select a locally installed Chromium and `HANDOFF_TEST_OUTPUT` the evidence
directory. The dedicated GitHub workflow builds the candidate and retains its
ZIP and browser evidence as CI artifacts.
