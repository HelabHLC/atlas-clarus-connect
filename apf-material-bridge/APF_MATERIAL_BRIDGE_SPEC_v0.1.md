# APF Material Bridge v0.1

Status: **Review Draft**

## Boundary

APF owns identity, binding, status, provenance, integrity and evidence. A
material format owns its material representation. A renderer owns its computed
or simulated image. Physical measurement remains a separate evidence layer.

## Material formats

Core declarations are `MATERIALX`, `OPENPBR_JSON`, `GLTF`,
`PBR_TEXTURE_SET` and `OTHER`. `AXF_ADAPTER` is optional and must never be
interpreted as the APF core or as a partnership claim.

## Conformance

- `APF-MATERIAL-REFERENCE`: identity, material asset, selector and binding.
- `APF-MATERIAL-RENDERED`: reference plus calculated or simulated output.
- `APF-MATERIAL-MEASURED`: reference plus evidenced measurement provenance.
- `APF-MATERIAL-QC`: physical comparison plus verified QC evidence.

## Integrity

Every binary asset requires SHA-256. A URI locates; a digest identifies.
`VERIFIED` binding requires verified identity, verified asset bytes and a
resolved selector. Rendering never establishes physical measurement. A
proprietary adapter never changes the stable ATLAS colour identity.

