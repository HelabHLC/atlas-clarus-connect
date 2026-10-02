# ATLAS Clarus Mixing Atlas 0.1.3

Every colour has an address — and a starting point for mixing.

The English Mixing Atlas connects 13,283 fixed ATLAS references with computed mixing candidates. It displays Target HLC → Model HLC → H/L/C difference, with Lab values below, plus a B/A screen preview and spectral diagnostics under twelve illuminants.

## Developing spot colours

Use a fixed HLC address as the target for a custom spot colour. The atlas supplies a digital starting recipe and shows its model differences. A production recipe requires compatible base colours and binder, defined dosing, a sample on the intended substrate, measurement and adjustment. Current model parts are not calibrated drops or grams, and the atlas does not certify printing-ink or textile suitability.

The current dataset contains 12,714 HLC model matches and 569 open fields. An open field means no match was found under the current palette, model and search constraints; it does not establish fundamental unmixability.

## Your own spectral palette

Import compatible external spectral JSON data locally in your browser, calculate a candidate and compare it with the existing recipe for the same reference. Existing reference values and recipes are preserved. Imported files are not uploaded to a server. Download B/A PNG previews and JSON results using the visible links.

## Downloads

- atlas-clarus-mischatlas-0.1.3.zip: installable WordPress plugin; shortcode [atlas_clarus_mischatlas].
- atlas-clarus-mixing-atlas-0.1.3.html: standalone browser atlas; download and open locally.
- SHA256SUMS.txt: SHA-256 checksums of both files.

## Listener correction in 0.1.3

The English translation of the UI word Liste also altered the substring in addEventListener, breaking event registration before the initial atlas render. This caused empty tables and spectra despite a misleading ready status. The translation now matches Liste as a standalone word and asserts that the corrupted API name cannot occur. Reference data, recipes, spectra and numeric kernels remain unchanged. Version 0.1.3 supersedes 0.1.2 for use and download.

## Validation and attribution

Package build, PHP lint, JavaScript syntax and a deterministic before/after calculation comparison passed. On 2 October 2026, Norbert Woiwod reported that the import, computation and PNG/JSON downloads all work in his browser. This is user-reported manual acceptance, not an independently inspected export-file audit.

ATLAS references: HLC Colour Atlas XL / freieFarbe e.V. Reference system and analysis: ATLAS Clarus, Norbert Woiwod. Other material and CIE sources retain their individual notices in the atlas and SOURCES-AND-LICENSES.txt. Dr Ulrich Backes stated CC BY-SA on 1 October 2026 without confirming a version; no version is invented. GPL-2.0-or-later applies only to the PHP wrapper. No blanket licence or new material approval is asserted for the complete dataset.
