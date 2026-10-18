# GamutMap source selections, snapshot 2026-10-18

`GAMUTMAP_CATALOG.json` records the 78 filters advertised in the captured
GamutMap catalog. `catalog-sources/` preserves the original HTML and each
single-filter / Atlas-XL-plus-filter AJAX response as deterministic gzip files.
The decompressed response hashes are stored with every record.

Each installed selection is the exact HLC-identifier intersection with the
existing 13,283-row frozen ATLAS master. The independently captured single
filter must yield the same intersection as the direct combined query.
GamutMap's displayed RGB values are never copied into the master.

Atlas XL aliases Core. sRGB HEX aliases sRGB only after exact membership
agreement. Existing FOGRA51 and FOGRA52 IDs remain unchanged. The common
FOGRA51/52 selection remains available. Other filters use stable source-number
IDs (`gamutmap_126`, etc.). Category and historical metadata reflect the
source menu; beta source names retain that designation.

Run `python process-libraries/install_catalog.py` for fully offline verification
and deterministic installation. Run `capture_catalog.py` to capture missing
responses; existing responses are reused, not silently refreshed. To create a
new snapshot, use a new dated source directory and schema version.

These are source-declared gamut memberships, not measured production approvals.
The immutable master identity, RGB-only binding, tie-break and existing stored
job reference lists are unchanged. Original source attribution accompanies
this directory in LIESMICH.txt. Source: https://www.gamutmap.de/
