# RC22 browser candidate

Build the review candidate from the PR source with:

```bash
python browser-bundle/build_bundle.py
```

This is a test candidate with a shared PKL Full Reference feeding independent 4C and ECG ICC image previews. Supply the matching output profiles to calculate previews. Real browser, IONOS and press-profile acceptance remains open.

Expected size: `2475796` bytes.

Expected SHA-256: `30e3372c12a172e9f459ffc86b083461f6389ef9e424ae3a00b967d4119d165a`.

The package is produced and uploaded by GitHub Actions. It is not duplicated as
a checked-in binary, so reviewers have one reproducible artifact to trust.
