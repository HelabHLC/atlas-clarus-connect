# RC22 package integrity

Build with:

```bash
python wordpress-browser-edition/build_plugin.py
```

| Package | Bytes | SHA-256 |
| --- | ---: | --- |
| `ATLAS_Clarus_Browser_Bundle_v0.2.0-rc22-parallel-image-preview.zip` | 2637399 | `9b3fe33886beb194f730c27faae7dc937c504dc33188aaa0f02349665b3ec361` |
| `ATLAS_Clarus_Browser_Edition_v0.1.12-beta1_RC22.zip` | 2607229 | `f4f1d7d0ca33a064a33be5872b7e877818214452ac4bf57b0d7ca0175b0b15a0` |

The WordPress package embeds the exact browser bundle listed above. RC22 keeps
`ATLAS_COMBINED_BASIS23_v0_8` as its runtime recipe dataset. The CHSOS rebuild
remains research-only and is not packaged or activated.
