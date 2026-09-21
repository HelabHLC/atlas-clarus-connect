# RC22 package integrity

Build with:

```bash
python wordpress-browser-edition/build_plugin.py
```

| Package | Bytes | SHA-256 |
| --- | ---: | --- |
| `ATLAS_Clarus_Browser_Bundle_v0.2.0-rc22-parallel-image-preview.zip` | 2640766 | `583a4538cf0ee7dbcefef3d69158409b06dda3b4f31fbb3e4e942bb4311259ea` |
| `ATLAS_Clarus_Browser_Edition_v0.1.12-beta1_RC22.zip` | 4053074 | `fe19a7978cde92ff39716411cc4fbea580a26eb1bb2a865f72d217c36b7778bf` |

The WordPress package embeds the exact browser bundle listed above. RC22 keeps
`ATLAS_COMBINED_BASIS23_v0_8` as its runtime recipe dataset. The CHSOS rebuild
remains research-only and is not packaged or activated.
