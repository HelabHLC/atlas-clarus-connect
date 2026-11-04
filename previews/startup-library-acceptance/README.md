# Customer colour acceptance by library address · 0.1.3 preview

A globally assigned ATLAS address must occur in the selected target library
before the Startup Kit accepts the palette. Selection never searches for a
different nearest reference inside the target library. Source RGB, the global
RGB-only assignment and all master/library data remain unchanged.

For example, the existing demo orange `#EA6325` maps to row 1737,
`H050_L060_C080`. That row is absent from the stored PSO Coated v3 list.
The UI now marks it as not accepted and blocks B/A and palette/Clarus export.
Removing the failed colour allows the remaining green and warm-white pair
to pass the PSO Coated v3 membership check and run the real ICC preview.

## Acceptance and preservation

- A known target library with valid row IDs is mandatory. Master-only, hidden,
  missing and unavailable libraries cannot satisfy this check.
- If a profile is loaded, its exact file hash must identify a catalog profile
  associated with the chosen library. This is a named association; original
  GamutMap profile-byte identity remains unverified.
- The target is inferred when unambiguous. Multiple associated libraries can
  be selected explicitly; changing the library invalidates the calculation.
- Failed or unresolved colours remain in the workspace with their original
  source values and globally assigned addresses. No automatic replacement.
- A draft ZIP preserves project, original image, ICC and a recomputed
  `library-check.json`. It omits ASE/GPL/CSS palettes and Clarus JSON while the
  check fails. The HTML card displays the status for every address.
- Import recomputes the check and rejects a forged report even if archive
  checksums were updated. Old dossiers are upgraded to the new rule and old
  calculations discarded. Removing rule metadata does not bypass export checks.
- The rule checks address membership, not source/reference equality, measured
  gamut membership or physical print approval. A source/reference tolerance
  has not been invented or added.

## FOGRA58 final and characterization data

The package contains final `TextileRGB_FOGRA58.icc`, but the existing GamutMap
address list is explicitly for FOGRA58 beta. No final address list is invented,
and the beta list cannot satisfy final-profile acceptance. The profile remains
available for inspection; acceptance and B/A remain blocked in this Startup
workflow until a properly associated final address list exists.

Fogra publishes [characterization data including final FOGRA58](https://fogra.org/en/downloads/work-tools/characterisation-data)
dated 2024-06-02. Those data do not constitute an ATLAS address list. A new
computed list needs a documented test basis, profile hash, engine/settings,
error metric and acceptance threshold. An sRGB roundtrip test must be labeled
as such, not silently substituted for a Lab/HLC gamut-membership reconstruction.
Final characterization data have not been verified for every catalog library.

## What GamutMap documents

The [FAQ](https://www.gamutmap.com/site/content/faq) says its data were created
with Adobe Photoshop and absolute colorimetric rendering intent. The
[usage guide](https://www.gamutmap.com/site/content/howto) describes HLC/Lab
tables and the intersection of all selected colour spaces. Browser swatches
use clipped sRGB and are not a reliable way to reconstruct the membership.

Neither page specifies the numerical inclusion threshold, black-point
compensation, exact Photoshop/CMM version or the hashes of the profile files
used. The stated Delta E00 < 1 concerns the printed atlas and is not evidence
of the gamut-filter threshold. Our process-libraries capture retains the
source-selected HLC addresses and verifies their exact intersection with the
frozen master; it does not reconstruct the undisclosed selection algorithm.

## Build and tests

Build from the exact 0.1.2 ZIP, SHA-256
`2bc3ae8108ba34b9713cb8edc0ff4a62fc5f85cc3c848bcbd5c3ac6623c73c2c`:

```sh
python3 previews/startup-library-acceptance/package.py --base /path/to/0.1.2.zip --output-dir /new/build-directory
node previews/startup-library-acceptance/test-core.cjs /path/to/bundle /path/to/PSOcoated_v3.icc /path/to/legacy-Farbmappe.zip
ATLAS_TEST_CHROMIUM=/path/to/headless_shell node previews/startup-library-acceptance/test-ui.cjs /path/to/bundle /path/to/screenshots
```

Validation covers member/nonmember palettes, preserved global assignment,
draft/approved ZIP contents, deterministic reopen, forged acceptance,
unknown/hidden/master-only libraries, profile mismatch and beta/final isolation.
Local Chromium tests run B/A with actual ICC data, exercise changed material
and draft reimport, and check a 390px viewport. Existing core and profile/UI
tests cover source/reference roundtrips, intents, BPC and Browser integration.

This change affects Startup Kit acceptance only. Browser Edition runtime,
ICC payloads, master data and worker remain byte-identical to 0.1.2.
No public deployment or physical print validation is included.

Validated package: `ATLAS_Clarus_Startup_Bibliothekspruefung_0.1.3.zip`,
136,867,933 bytes. SHA-256:
`96cb4cce7545107e9c6b522afaefe862eb7ad4098eb3b9f4b55fe00f33b51e2f`.
All 417 checksum entries and ZIP CRC checks pass; 409 inherited files are
byte-identical. A rejected image-colour test also preserves a PNG with embedded
sRGB ICC and its complete source assignment byte-for-byte. Desktop and mobile
membership states were visually inspected. Validation date: 2026-11-04.
