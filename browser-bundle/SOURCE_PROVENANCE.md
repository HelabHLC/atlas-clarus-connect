# Original RGB source provenance — RC28 candidate

Clarus palette JSON **1.2** and local workspace **V3** retain original
browser-sampled RGB values alongside their frozen ATLAS references. This closes
the Picker → Hover → palette gap: previously only reference IDs were retained.
Reference data, names, spectra and the Workflow 3.4.0 selection rule are unchanged.

## Per-source record

A palette still holds up to 64 unique reference IDs. A separate
`source_assignments` array contains zero or more records for each reference:

| Fields | Meaning |
| --- | --- |
| `source_rgb`, `source_hex` | The sampled RGB or rounded area-mean RGB before reference assignment |
| `color_space`, `bits_per_channel` | `sRGB`, 8 bits per channel |
| `source_representation` | `BROWSER_DECODED_SRGB`: the browser-decoded canvas representation, not a claim about native file encoding or original device RGB |
| `atlas_row_id`, `reference` | Frozen zero-based master row and exact HLC reference |
| `reference_rgb`, `reference_hex` | Stored master representation, separate from the source |
| `master_sha256`, `workflow` | Fixed master and `ATLAS Clarus v3.4.0` |
| `metric`, `distance_squared`, `tie_break` | Integer squared RGB distance; smaller row ID wins exact ties |
| `sampling` | Pixel/area mode, requested size, centre, clipped inclusive bounds, valid pixel count, channel standard deviations, alpha threshold 128 and Math.round policy |
| `image` | Name, decoded dimensions and original-file SHA-256 when Web Crypto/file access is available; otherwise explicit `null` |
| `signature_status` | `NOT_SIGNED` |

The source record is separate from the immutable master row. Different source
colours, coordinates or images can share one reference without overwriting each
other. An identical repeated record is not added twice. There is an explicit
4096-record limit per palette; excess additions/imports are rejected with a
visible message, never silently truncated.

Example: source `#3D7B19` (`61,123,25`) → `H130_L045_C055`, row `4966`,
reference `#37791A` (`55,121,26`), `distance_squared = 41`.
A second source `#3C7B19` may share that reference and remains separately stored.

## Storage and handoff

- The source context is captured at sampling and carried into Hover and Wheel.
- Adding an existing reference with a new source appends the source record.
- Manual reference selection clears the current picker context; it does not
  fabricate an original RGB or attach a stale sample.
- Palette duplication deep-copies source records. Reordering keeps them;
  removing/clearing a reference removes its associated records in that palette.
- The palette drawer exposes source RGB, reference RGB, distance, sampling
  position/mode, image information and file hash.
- Clarus JSON 1.2 exports/imports the records. Versions 1.0/1.1 remain readable
  with an empty source list: absence means **not recorded**, not RGB equality.
- Local storage writes `atlasClarusPalettesV3`, including master/workflow binding.
  V2 is read for migration only and remains untouched. Old versions of the app
  do not understand new source records; use the new bundle to round-trip them.
- Storage quota failure retains the in-memory records and a persistent warning
  so a Clarus JSON backup can still be exported.
- ASE/GPL/CSS/Tokens continue to transfer reference swatches. The Clarus JSON
  companion is required to retain source provenance. Reference-card and print
  handoff formats are unchanged and do not acquire the new source records.

## Import validation

The whole file is checked before workspace mutation: typed RGB and IDs,
source/HEX agreement, master/row/reference agreement, declared distance,
workflow, sampling dimensions/bounds/count and hash syntax. Each source must
resolve to the declared full-master RGB winner with the prescribed tie-break.
A mismatch rejects the import; the receiver never silently rematches it.

A recorded image SHA-256 identifies supplied bytes; without those bytes, import
cannot independently verify the claimed pixel/area sampling or recompute the
image hash. The browser's image decoder and its handling of embedded profiles
remain part of the source observation. GIF sampling is the frame drawn at image
load; this format does not provide animation-frame reconstruction.

## Authentication boundary

These records establish inspectable, internally consistent colour provenance.
They are **unsigned**. An attacker can copy or replace a complete, self-consistent
record, including hashes. A master hash binds a dataset; it does not authenticate
an issuer or a physical sheet of paper. This release introduces no signatures,
anti-counterfeit guarantee, physical uniqueness or measured print approval.
Signed issuer records and a separately validated link to the particular physical
document would be additional work. `measured_qc_status = NOT_MEASURED` remains.

## Validation

- `validate_exports.js`: existing swatch exports and strict reference imports.
- `validate_source_assignments.js`: multiple-source round-trip, legacy import,
  strict rejection, full-master winner and RGB-collision tie cases.
- `validate_source_provenance_ui.js`: shipped picker/palette handlers, image hash,
  duplicate/remove, import rejection without mutation, reload and V2 migration.
- `validate_palette_workspace.js`: storage quota failure, recovery and limits.
- `validate_bundle.py`: reproducible RC28 ZIP, embedded checksums and source pins.

See `SOURCE_PROVENANCE_VALIDATION.md` for the executed candidate checks and hashes.
Live WordPress activation, visual acceptance on a real phone and physical
anti-counterfeit testing are not established by these software checks.
