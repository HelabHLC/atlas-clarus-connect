# RC23 browser candidate

Build the review candidate from the PR source with:

```bash
python browser-bundle/build_bundle.py
```

This is a test candidate with the ATLAS Clarus Tone System v0.1 and a shared PKL Full Reference feeding independent 4C and ECG ICC image previews. Supply the matching output profiles to calculate previews. Real browser, IONOS and press-profile acceptance remains open.

Expected size and SHA-256 are generated and verified by GitHub Actions from the reviewed source commit.

The package is produced and uploaded by GitHub Actions. It is not duplicated as
a checked-in binary, so reviewers have one reproducible artifact to trust.
