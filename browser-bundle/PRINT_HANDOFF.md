# Parallel print handoff v0.1.0

Status: development candidate, preparation only. Based on RC20 commit
`96ec86e41fdfb6941ccffaa7e8cb7e98fc2d84f6` and Workflow v3.4.0.

## User path

1. Select an ATLAS reference in Hover or Wheel, then choose **Prepare for print**.
   Alternatively, choose **Prepare palette for print** in the palette workspace.
2. The selected references are copied into a job. Changes to the original
   palette or selection do not silently change the job. Use the explicit
   selection/palette buttons to replace the job's references.
3. Prepare **4C and ECG together**. Each has its own ICC file, printing
   condition, substrate, rendering intent and black-point-compensation setting.
4. Export both paths as one `.print-handoff.json`. Attached ICC files are
   embedded, including their SHA-256 and checked header metadata.
5. Export the optional readable HTML report for the receiving prepress operator.
   It is a preparation record, not PDF/X artwork or a colour proof.
6. Import the JSON to restore the preparation. The whole package is checked
   before any current job data are changed. Export before closing the page:
  print jobs are held in memory, not automatically saved in browser storage.

The checked-in [row 10519 example](examples/parallel-print-row-10519.print-handoff.json)
can be imported directly: `H285_L025_C065`, master RGB `0 / 55 / 157`. Both
branches are present, with profiles, device calculations and measurements open.
No synthetic ICC test profile is included in this user-facing example.

## Required topology

Both production paths read the same ordered frozen reference set directly.
Neither branch accepts the other's device values as input. Serial scheduling of
computer instructions is irrelevant to this data-flow rule.

| Property | 4C | ECG |
|---|---|---|
| Input | Shared frozen ATLAS reference set | Same shared frozen ATLAS reference set |
| Profile class / space | `prtr` / `CMYK` | `prtr` / `7CLR` |
| Input from another path | `null` | `null` |
| ICC settings | Path-specific | Path-specific |
| Device values | `null` until a later calculation | `null` until a later calculation |
| Feasibility | `NOT_EVALUATED` | `NOT_EVALUATED` |
| Measured QC | `NOT_MEASURED` | `NOT_MEASURED` |

Version 0.1.0 prepares the default `RGB_ONLY_DLambda_POSTHOC` mode:
`production_atlas_row_id == source_atlas_row_id` for every reference. It does not
activate or simulate active Δλ production selection. A future active-mode
adapter must preserve the separate source and production IDs required by
Workflow v3.4.0. Source assignment and A′ v0.4 are unchanged.

## Profile and identity checks

- Exact frozen master digest, typed row IDs, unique ordered references and exact
  HLC/RGB/HEX/Lab values; no nearest-colour fallback or identity coercion.
- ICC v2/v4 output-class header, declared file length, PCS, expected device
  space, rendering intent, tag-table bounds and unique tag names.
- Maximum profile size: 16 MiB per branch. Import limit: 46 MiB per handoff.
- Embedded profile bytes are hashed again on import. Declared metadata must
  match those bytes. This checks structure and integrity, not whether an ICC
  engine can execute the profile or whether it represents a particular press.
- A `7CLR` signature alone does not prove CMYKOGV ink order or FOGRA55
  applicability. ECG channel order remains unconfirmed at this stage.
- Both branches are mandatory. Unknown fields, a cross-path input, changed
  reference sets, forged device values, fabricated QC/approval statuses and
  inconsistent profile bytes are rejected.
- Async export snapshots references and settings before hashing, so UI edits
  cannot cause one branch to receive a different version of the input.

## Current capability boundary

This implementation makes the previously missing preparation/transfer step
usable offline. It does **not** introduce an ICC transform engine, calculate
CMYK or seven-channel values, create a PDF/X file, automate Scribus, or verify a
physical print. No real 4C or ECG production profile is bundled with this feature.
Missing profiles and calculations stay open in **both** paths. The existing
Wheel measurement-entry widget is not copied into either production QC record.

The next receiver must independently calculate each path from the shared
reference input and exact supplied profile, document its engine/version, and
return a separately validated result. This preparation format deliberately
rejects injected output/QC records: a future result format needs its own
validation contract. Physical measurement is required for measured QC claims.

## Development build and review

```bash
node browser-bundle/tests/validate_print_handoff.js
python3 browser-bundle/tests/validate_bundle.py
python3 browser-bundle/build_bundle.py
npm ci --prefix browser-bundle/tests --ignore-scripts
node browser-bundle/tests/validate_print_ui.js
```

The RC21 development build is written to `browser-bundle/build/` and remains
separate from the checked-in RC20 distribution in `browser-bundle/dist/`.
`--output-dir PATH` selects a different build destination. CI publishes a
downloadable candidate artifact; it does not publish a release or update WordPress.

The regression suite tests full-master identity preservation, both directions
of branch isolation, JSON/profile round-trip, async snapshots, malformed ICC
containers, serial-path injection, forged measurement/approval claims and HTML
escaping. Its tiny synthetic ICC containers are parser fixtures only, never
presented as executable press profiles or production evidence.
