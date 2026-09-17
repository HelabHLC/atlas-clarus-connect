# RC22 package integrity

Build with:

```bash
python wordpress-browser-edition/build_plugin.py
```

| Package | Bytes | SHA-256 |
| --- | ---: | --- |
| `ATLAS_Clarus_Browser_Bundle_v0.2.0-rc22-parallel-image-preview.zip` | 2481703 | `941d62d772e580ec9f265a800c4588ee48a3e1928cbdb921c4a9c2c12ab15a2f` |
| `ATLAS_Clarus_Browser_Edition_v0.1.12-beta1_RC22.zip` | 2451398 | `03ae5c15f93eced3330a812ca6bb5a9f2da8af4b686e05c07e23a8b813ebfa42` |

The WordPress package embeds the exact browser bundle listed above. RC22 keeps
`ATLAS_COMBINED_BASIS23_v0_8` as its runtime recipe dataset. The CHSOS rebuild
remains research-only and is not packaged or activated.
