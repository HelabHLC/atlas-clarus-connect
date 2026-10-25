# User-provided reference package inputs

The example motif and the mapping sidecars are supplied separately by the user
as `ATLAS-Clarus-CLO-Referenzdaten-0.2.zip`. They are included in the user-facing
pilot archive, but not published as new repository assets by this change.

Extract that archive, then build with:

```
python3 cloth-preview/scripts/build.py --reference-package /absolute/path/to/ATLAS-Clarus-CLO-Referenzdaten-0.2
```

The builder verifies all package checksums before copying PNG files and reference
sidecars into this directory. No new reference assignment is computed.
