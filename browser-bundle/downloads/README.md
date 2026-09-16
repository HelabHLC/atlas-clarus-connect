# RC22 browser candidate

Build the review candidate from the PR source with:

```bash
python browser-bundle/build_bundle.py
```

This is a test candidate with independent Original / 4C and Original / ECG ICC image previews. Supply the matching output profiles to calculate previews. Real browser, IONOS and press-profile acceptance remains open.

Expected size: `2467418` bytes.

Expected SHA-256: `a62f163584746531822e3148a74d5b7d2b03d057da32efcf0588e1a0718524e2`.

The package is produced and uploaded by GitHub Actions. It is not duplicated as
a checked-in binary, so reviewers have one reproducible artifact to trust.
