# ATLAS Clarus colour advice · Browser Edition and Startup Kit · 0.1.4

When an assigned address is absent from the selected library, the user can
now find another library containing that original address or compare the
closest contained sRGB reference against a project tolerance. For example,
source `#EA6325` retains its global assignment `H050_L060_C080` (row 1737).
The nearest stored sRGB candidate in PSO Coated v3 is `H050_L060_C075`
(row 1736, `#E8682A`), with ΔE00 **1.153921033120213** to that source.
The missing original address is never silently remapped.

## User flow

- Suggestions identify libraries for each original address and for the entire
  original palette. Matching output paths are ordered first; every suggestion
  explicitly leaves print process and material suitability unverified.
- Choosing another library clears an incompatible ICC and printing condition.
  The user explicitly loads its profile and checks material/process.
- The tolerance starts unset. A number from 0 through 100 must be entered.
  The UI presents source and nearest candidate side by side, the addresses,
  five displayed decimals of ΔE00, and the selected threshold.
- The exact unrounded distance determines eligibility. A colour outside the
  threshold cannot be accepted. Finding a candidate is not confirmation.
- `Ersatzfarbe übernehmen` records a separate decision and switches the
  visible calculation basis to `Bestätigte Auswahl`. B/A must be recalculated.
- Undo keeps original source and assignment. Changing library/tolerance
  withdraws earlier decisions, including when the user later returns to the
  earlier setting. Import verifies and restores deliberately saved decisions.

## Identity, scope and persistence

The original full-master RGB-only assignment and all 13,283 master rows remain
unchanged. `colour-advice.js` implements an independent advisory search;
`library-acceptance.js` accepts a replacement only when the documented choice
is active, within tolerance, a real library member, and consistent with the
currently loaded profile's catalog association.

`project.json` retains original source RGB, original reference and source
assignment, plus the separate replacement record. `colour-advice.json` carries
the recomputed alternatives, comparison basis and decision; forged reports or
distances are rejected even if archive checksums have been updated. Checksums
and the confirmation flag are unsigned records, not proof of a person's consent.

After acceptance, `palettes/accepted.{ase,gpl,css}` and `accepted.clarus.json`
carry the chosen references. Original `source` and `reference` palettes and
`colours.clarus.json` remain separate. An image assignment is never attached to
an unrelated replacement reference. The original Clarus export also retains
recorded Browser source assignments when the original file is unavailable.
Unaccepted projects remain draft ZIPs without palette/Clarus output. Old
0.1.2/0.1.3 dossiers remain readable; stored B/A is discarded on reopening.

Browser Edition exposes `Ausgewählte Farbe beraten` and `Aktive Palette
beraten` below the library toolbar, plus an entry in the palette drawer. A
read-only context bridge transfers the current selected reference or palette
to the same Startup advice UI in a modal iframe. It never overwrites the
native palette. The accepted Clarus file can be imported as a separate native
palette; the full dossier keeps the original-to-replacement relationship.
Closing unsaved advice prompts the user to save or explicitly discard it.

The original current image is included when it matches and is no larger than
32 MiB. Source records for older images remain `recorded_srgb`, with their RGB,
address and provenance intact but without inventing missing original bytes.
Direct reference selections are explicitly `atlas_reference`, not invented
customer sources. The existing twelve-record limit is enforced without silent
truncation, including multiple source records per native reference.

## Comparison basis and limitations

`SRGB8_TO_LAB_D65_2_DE00_K111_V1` converts both stored sRGB triplets to Lab with
D65/2° and evaluates CIEDE2000 with kL=kC=kH=1. The reference's HLC target Lab
is deliberately not used in this sRGB comparison. Equal or clipped RGB
representations may conceal distinct HLC target colours. No physical printing
accuracy, spectral/material match or device gamut proof is inferred.

The independent implementation follows the CIEDE2000 equations. Verification
uses all 34 published numeric test pairs from
[Sharma, Wu and Dalal's implementation notes](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/),
including reversed operands. `fixtures/ciede2000-author-tests.txt` preserves
their published numerical validation data, retrieved 2026-11-04; no MATLAB or
spreadsheet implementation is included. The maximum error is below 0.00005
against the authors' four-decimal expected values. The sRGB transfer function
and primary/white-point matrix are grounded in the
[ICC sRGB registry](https://registry.color.org/rgb-registry/srgb) and
[W3C colour conversion reference](https://www.w3.org/TR/css-color-4/#color-conversion-code).

Library lists are the captured GamutMap address memberships. They are not
reconstructed from this ΔE00 threshold. Final FOGRA58 still has no corresponding
final address list; beta membership cannot stand in for it. Source-declared
profile associations do not establish the exact historical GamutMap ICC bytes.

## Build and verification

Build only from the pinned 0.1.3 archive with SHA-256
`96cb4cce7545107e9c6b522afaefe862eb7ad4098eb3b9f4b55fe00f33b51e2f`:

```sh
python3 previews/colour-advice/package.py --base /path/to/0.1.3.zip --output-dir /new/output
node previews/colour-advice/test-core.cjs /path/to/bundle /path/to/test-output
ATLAS_TEST_CHROMIUM=/path/to/headless_shell node previews/colour-advice/test-ui.cjs /path/to/bundle /path/to/screenshots
```

The tests decode `fixtures/source-with-icc.png.base64` into their temporary
output folder. It is a generated 1×1 sRGB PNG with RGB 234/99/37 and an embedded
sRGB ICC. No external network request is used by the app.

Validated: reference equations; exact tolerance boundary; deterministic tie
breaks; no-candidate, unknown/hidden, profile-mismatch and beta/final paths;
global assignment invariance; explicit confirmation, withdrawal and undo;
forged records; deterministic dossier reopen; real LittleCMS accepted-colour
calculation; original/reference source roundtrips; all four intents and BPC
settings; existing library/catalog flows; direct Browser reference, image and
mixed-palette transfer; recorded sources without an original; exact original
PNG and embedded ICC preservation; mobile 390px layout and visual inspection.

The package preserves 408 inherited files byte-for-byte. ICC payloads, catalog,
address lists and LittleCMS worker are unchanged. All 423 checksum entries
and the ZIP CRC are verified. Browser changes are limited to the read-only
bridge, launch controls and shared advice workspace. The overlay patches the
actual pinned runtime and does not overwrite it with the older source app.
There is no public deployment or physical proof measurement.

Test package: `ATLAS_Clarus_Browser_Startup_Farbberatung_0.1.4.zip`,
136,883,896 bytes; SHA-256
`6fff7e48b1a1766d5ca57dee3ac47be48ede193129d24d56be296155493ea816`.
