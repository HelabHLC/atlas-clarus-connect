# Android beta.9 / RC33.2

Version name `0.4.0-beta.9`, versionCode `9`. The prepared payload is the exact
RC33.2 ZIP, SHA-256 `95342c346fc8c73acb89a365ba9f4818184630e45b71b0e1726a9a1c76bf3aee`.
It carries RC33.1's deterministic RGB reduction, protected references, original
11 × 11 magnifier and source/output exports without changing calculation code.

The source image editor UI remains pinned at its old digest. The built UI adds
only RC33.1's deep-copy readCurrent bridge and is independently pinned at
`648bb3f2486a8cb6cd1a054a6c512fc241bcbe2ffe0c4551fdf9b117b21c6082`.
The image verifier, decoder, frozen master, reference cards and history modules
remain unchanged. Native code, export adapter, HTTPS origin, app ID and storage
keys remain byte-identical. Debug builds use the existing `.dev` application ID
and cannot replace the Play-installed app.

CI checks a persistent beta.8 → beta.9 document/profile restart without reseeding,
including palettes, independent original RGB records, Colour Projects revisions
and choices, exported Image Projects JSON/ZIP and reference-card ZIPs. The full
reduction browser suite also runs against Android-prepared HTML and captures
actual AndroidExport adapter bytes for PNG/palette/ZIP exports. This is automated
Chromium acceptance, not a physical Android/native picker test.

After checks pass, run the existing **Android signed beta** workflow on the exact
release branch. It uses the protected `android-beta-signing` environment and
reserved certificate, verifies APK/AAB assets and uploads signed packages.
No signing secrets are accessed locally. Disposable CI-key APK/AABs are not updates.

For an existing Play installation use the same Play test channel. Export open
Image Projects first; no autosave. Do not uninstall or clear data. Test portrait
and landscape: existing palettes/projects, import/export, magnifier selection,
protect a small accent, reduce to 24 colours and export PNG/ZIP. Compare original
RGB separately from the fixed Atlas reference. Play upload/release and physical
device acceptance remain pending until explicitly performed and recorded.
