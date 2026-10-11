# Colour Reference Card inside Colour Handoff

Status: development candidate, not a published release or WordPress activation.

## Existing implementation and data-contract comparison

`REFERENCE_CARD_HANDOFF.md` describes the existing v0.1 reference card. Its
implementation is `src/reference-card.js`, introduced in `1fad012`, integrated
through PR #30 (`98e0781`) and already present on main. It accepts one frozen
master row and creates an A4 HTML print view plus `ATLAS_CLARUS_REFERENCE_CARD`
0.1.0 JSON. Profile-bound DeviceCMYK/DeviceN cards are separate existing output
paths. Their production contracts are not used for an RGB source-colour card.
The repository establishes implementation and integration; this investigation
does not assert the current activation state of a WordPress installation.

| Contract | Existing v0.1 card | Colour Handoff / Colour Kit 0.3 | This extension |
| --- | --- | --- | --- |
| Identity | One frozen master row | Decision ID and revision ID, with separate assignment | One printable entry per active decision, never per unique row |
| Source RGB | Not represented | Root node and current record can differ | Starting source and current design shown separately |
| Reference | Master RGB/HEX, HLC, row, SHA-256 | Full-master RGB-only assignment and integer distance² | Reuses v0.1 `canonicalReference`; shows both starting and current assignment |
| History | No decision graph | Complete hashed revision graph | Full IDs printed; all nodes retained unchanged in companion JSON |
| Provenance | Master only | Optional attached Bundle 1.2, image and sampling data | Known values displayed; missing fields explicitly UNKNOWN |
| Reopen | v0.1 card validator | `atlas-clarus-startup/0.3` JSON | Same unchanged decision JSON reopens in either tool |

The extension adds `ATLAS_CLARUS_REFERENCE_CARD.colourHandoff` to the existing
component. It does not change the v0.1 API/schema, shared MIT handoff core, RGB
assignment, frozen master, existing UI sources, historical builders or releases.
It adds an export action to the existing Colour Handoff working set. No separate
application, automatic design advice, or new colour decision is created.

The source base is PR #70, `9b0f2c9799879da65f0f8f02b702595b1336ae24`, which includes
the stacked #66/#67/#68 work and the source/pixel consistency correction. This
candidate builds the common Bundle, including Colour Projects and Image Projects.
It does not modify Android packaging or imply acceptance of its pending release.

## Export and reopening

Build `python3 browser-bundle/build_colour_reference_card.py`, open the generated
Bundle `index.html`, then **Colour handoff**. Load a decision JSON or use the
active palette; choose **Download colour reference card ZIP**.

The ZIP contains:

- `colour-reference-card.html`: self-contained printable A4 view, one decision
  per card. Open it offline and use the browser's Print / Save PDF command.
- `palette.clarus.json`: the complete original Colour Kit 0.3 decision document,
  including IDs, all revisions and exact retained Bundle document text. Reopen
  this file through the existing Colour Handoff or Colour Kit JSON import.
- `reference-card.json`: a derived view of the same decisions, schema
  `atlas-clarus-colour-reference-card/1.0`, with a hash binding to the companion.
  It is not a replacement decision format and is not accepted as a palette.
- `card-manifest.json`: SHA-256 of the three files above; NOT_SIGNED.

The extension validates the complete existing handoff contract before export.
No decision/revision IDs, root records or history nodes are generated or updated.
Given the same decision JSON, export bytes are deterministic. `verifyFiles`
rebuilds the card and manifest from validated decision JSON; merely rehashing
an altered card/HTML cannot make it consistent with its companion.

## Honest source and output boundaries

Recorded image originals use the starting revision, not the current edited RGB.
The current revision and its current reference are shown separately, together
with the starting assignment. Deliberately adopted reference values are labelled
as a starting design; an earlier source remains `UNKNOWN` (`null` in JSON).
For Kit inputs, the input is a declaration, not a verified photographic origin.

Available filename, dimensions, coordinates/bounds, sample details and optional
image hash are preserved. Author/capture time are UNKNOWN because these contracts
do not record them. The synthetic example's notice is carried through. Other
metadata remain in the unchanged companion; no evidence is silently truncated.
Long labels can continue onto additional print pages rather than being clipped.

Patches are sRGB reproductions. Browser PDF output is not a DeviceCMYK/DeviceN
reference, measured proof, PDF/X certificate or production approval. The status
is `PRINTABLE_NOT_MEASURED`: export does not claim printing already occurred.
Print settings and colour management remain the receiving workflow's task.
Hashes provide consistency checks, not authenticated authorship or authenticity;
a wholly rewritten but consistent unsigned document is not authenticated.

## Two-green acceptance vector

The existing `tests/fixtures/colour-kit-030-two-greens.json` is used unchanged.

| Source HEX | Source RGB | HLC reference | atlas_row_id | Distance² | Decision ID |
| --- | --- | --- | --- | --- | --- |
| #3D7B19 | 61,123,25 | H130_L045_C055 | 4966 | 41 | 12f00a45-831a-4784-8456-09e5716ddffe |
| #3C7B19 | 60,123,25 | H130_L045_C055 | 4966 | 30 | 0aa198aa-e755-4e6f-a525-891258b88200 |

Both map to reference RGB 55,121,26 / #37791A. The cards retain their different
decision/revision IDs and sample centres (2,3) and (3,3); no grouping erases one.
The image hash is null in this synthetic fixture and prints as UNKNOWN.

## Validation commands and publication boundary

```sh
node browser-bundle/tests/validate_colour_reference_card.js
python3 browser-bundle/tests/validate_colour_reference_card_build.py
node browser-bundle/tests/validate_colour_reference_card_browser.cjs
node browser-bundle/tests/validate_reference_card.js
node browser-bundle/tests/validate_colour_handoff.js
```

The browser test exercises the actual export button, ZIP contents, JSON reimport,
separate-session opening, source/revision changes, desktop and narrow layouts,
and A4 PDF output. Evidence belongs to the executed run; test code alone is not
evidence of a pass. Local browser installation may be unavailable; CI is then
the browser validation environment. Physical print, native Adobe and physical
mobile-device acceptance remain separate open checks.

Only the new opt-in builder produces `0.2.0-rc32-colour-reference-card` as a
candidate. Existing `build_bundle.py` options, downloads, pins and WordPress/
Android versions remain untouched. No tag, release, merge or live activation
is performed by the candidate workflow.
