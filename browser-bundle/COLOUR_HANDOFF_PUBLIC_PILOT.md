# RC29.1 website public pilot

The owner authorized activation on arbe-lambda-star.com on 2026-10-08.
RC29.1 promotes the tested RC29 handoff implementation to a public website pilot.
It changes deployment metadata, the visible pilot label and the introduction;
it does not change the decision protocol, RGB assignment or master data.
The RC29 candidate and the default RC28 build remain reproducible separately.

**The provenance travels in the companion JSON file.** Keep it with the ASE
swatches. It includes original values, recorded source, Atlas assignment and
linked decision history. Adobe does not automatically embed this JSON in a
working document. Native Adobe application round trips remain **NOT_TESTED**.
Hashes verify consistency, not authorship or the truth of a source statement.

The packaged manifest records the pre-deployment test state. Live acceptance
is recorded separately after deployment; a public pilot is not a production
colour guarantee. Existing local palettes and the 13,283-row master are unchanged.

Build: `python3 browser-bundle/build_bundle.py --colour-handoff --public-pilot`.
WordPress package: `python3 wordpress-browser-edition/build_handoff_plugin.py`.
The wrapper checks ZIP bytes, manifest and file checksums before switching the
runtime, and retains the previous runtime for the existing admin rollback.
