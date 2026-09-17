# RC22 package integrity

Build with:

```bash
python wordpress-browser-edition/build_plugin.py
```

| Package | Bytes | SHA-256 |
| --- | ---: | --- |
| `ATLAS_Clarus_Browser_Bundle_v0.2.0-rc22-parallel-image-preview.zip` | 2481068 | `4ce129a68234ab985f79fc60d01e4582797c9340f07a5df0668276a00711e40c` |
| `ATLAS_Clarus_Browser_Edition_v0.1.12-beta1_RC22.zip` | 2450776 | `4cb6bf47f7d4e7792b22af8f981e72be14dad7c75d2e02a9573cb1b497573b61` |

The WordPress package embeds the exact browser bundle listed above. RC22 keeps
`ATLAS_COMBINED_BASIS23_v0_8` as its runtime recipe dataset. The CHSOS rebuild
remains research-only and is not packaged or activated.
