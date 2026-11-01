My Palettes now exports QuarkXPress XTG and the recorded Source Colours together in one ZIP. The package includes `palette.xtg`, `palette.clarus.json`, a SHA-256 manifest and German/English instructions. Extract the ZIP and import its Clarus JSON to restore source records.

Two distinct RGB sources, `#3D7B19` and `#3C7B19`, both map to `H130_L045_C055`. Automated browser tests verify that their unchanged RGB values, individual sampling positions, image hash and common ATLAS address survive export, fresh-context import and byte-identical ZIP re-export. Standalone XTG contains only the reference swatch; the companion JSON retains both source assignments. The compact `two-sources.quarkxpress.zip` asset demonstrates this case.

Palettes without recorded sources are explicitly marked; missing source colours are never reconstructed. Original image bytes are not included in this palette ZIP. For Colour Reduction, retain the complete job ZIP, which includes the original pixels and mappings. Individual palette JSON chunks from a reduction job do not contain full provenance.

The immutable master is unchanged: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`. Existing XTG, CorelDRAW, reduction and protected-original exports are regression-tested. Both WordPress installers verify the pinned bundle hash, size, manifest and all file checksums; activation preserves the prior runtime for rollback.

**Native QuarkXPress import remains NOT_TESTED.** Set sRGB IEC61966-2.1 for RGB solid colours. QuarkXPress does not automatically attach the companion JSON; keep the files together. Public beta, not a physical print approval.

WordPress full installer: 0.1.19-beta1. Small installer: 0.1.19-beta1.1. Browser bundle: 0.2.0-rc34.10-quarkxpress-source-zip. Publication and IONOS activation were explicitly requested on 1 November 2026.
