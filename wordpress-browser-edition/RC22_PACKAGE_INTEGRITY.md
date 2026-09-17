# RC22 package integrity

Build with:

```bash
python wordpress-browser-edition/build_plugin.py
```

| Package | Bytes | SHA-256 |
| --- | ---: | --- |
| `ATLAS_Clarus_Browser_Bundle_v0.2.0-rc22-parallel-image-preview.zip` | 2475796 | `30e3372c12a172e9f459ffc86b083461f6389ef9e424ae3a00b967d4119d165a` |
| `ATLAS_Clarus_Browser_Edition_v0.1.12-beta1_RC22.zip` | 2445581 | `6154f0257c611f2f97c9780f767cfa679a5665869d608d63bf2dc8652dcbf72d` |

The WordPress package embeds the exact browser bundle listed above. RC22 keeps
`ATLAS_COMBINED_BASIS23_v0_8` as its runtime recipe dataset. The CHSOS rebuild
remains research-only and is not packaged or activated.
