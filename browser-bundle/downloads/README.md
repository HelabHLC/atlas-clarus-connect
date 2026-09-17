# RC22 browser candidate

Build the review candidate from the PR source with:

```bash
python browser-bundle/build_bundle.py
```

This is a test candidate with a shared PKL Full Reference feeding independent 4C and ECG ICC image previews. Supply the matching output profiles to calculate previews. Real browser, IONOS and press-profile acceptance remains open.

Expected size: `2640766` bytes.

Expected SHA-256: `583a4538cf0ee7dbcefef3d69158409b06dda3b4f31fbb3e4e942bb4311259ea`.

The package is produced and uploaded by GitHub Actions. It is not duplicated as
a checked-in binary, so reviewers have one reproducible artifact to trust.
