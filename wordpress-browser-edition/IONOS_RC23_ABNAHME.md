# IONOS acceptance — RC23

**Browser Edition v0.1.13-beta1 — RC23 test candidate.**

RC23 adds the ATLAS Clarus Tone System v0.1 to visible names and search results. The existing PKL identity, HLC address, `atlas_row_id`, RGB, HEX, Lab, A′ v0.4 and parallel 4C/ECG paths remain unchanged.

## Staging checks

1. Upload the plugin ZIP in WordPress and replace the existing plugin files.
2. Do not activate the bundled runtime until its version, byte size and SHA-256 pass the admin preflight.
3. Activate RC23 on staging only.
4. Search for `Forest Green` and verify that `H150_L035_C035` displays `ATLAS Deep Forest Green`.
5. Verify the same visible name in Hover, Colour Identity Wheel, Appearance Pixel Simulator and a reference card.
6. Confirm that the technical identity remains `H150_L035_C035` with the same `atlas_row_id`, RGB, HEX and Lab values.
7. Verify the existing 4C and ECG preview paths independently.
8. Use rollback if any identity, navigation or layout check fails.

**Deployment status:** not activated by this pull request.
