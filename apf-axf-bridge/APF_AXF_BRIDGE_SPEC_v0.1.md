# ATLAS Clarus APF–AxF Bridge v0.1

Status: **Review Draft**  
Schema dialect: JSON Schema Draft 2020-12

## 1. Purpose and boundary

ATLAS Clarus APF does not replace AxF. It binds an AxF material to a stable colour identity and preserves the evidence chain from reference to rendered and measured appearance.

AxF owns the encoded appearance material. APF owns identity, references, status, provenance, integrity and evidence links. APF v0.1 does not decode, rewrite or render AxF.

## 2. AxF asset role and media declaration

The APF asset role is `APPEARANCE_MATERIAL`. Because this draft does not assert a registered AxF Internet media type, an AxF asset is declared as:

- `media_type: application/octet-stream`
- `format: AXF`
- `file_extension: .axf`
- `media_type_status: UNREGISTERED_FALLBACK`

The byte identity is the SHA-256 digest; the URI is only a locator.

## 3. Material selector

A selector addresses one material or representation inside the AxF asset. Supported selector types are `AXF_MATERIAL_ID`, `AXF_REPRESENTATION_ID`, `AXF_DISPLAY_NAME` and `IMPLEMENTATION_DEFINED`. Resolution is explicit: `RESOLVED`, `SOURCE_DECLARED`, `UNRESOLVED` or `INVALID`.

The optional representation model records what an importer reports: `SVBRDF`, `EP_SVBRDF`, `BTF`, `CARPAINT`, `OTHER` or `UNKNOWN`. APF does not infer this value from a filename.

## 4. Identity binding

The binding joins exactly one stable ATLAS identity to exactly one AxF asset and selector. It never changes the colour reference. A binding is `REFERENCE_BOUND` until its identity, asset digest and selector resolution are verified; it may then be `VERIFIED`.

## 5. Measurement provenance

`measurement_provenance.status` is one of:

- `MEASURED`: measurement evidence is supplied.
- `SOURCE_DECLARED`: the source asserts measurement origin, but APF has not independently verified it.
- `NOT_MEASURED`: explicitly not measured.
- `UNKNOWN`: no reliable statement.

AxF presence, AxF digest verification and successful rendering do not establish `MEASURED`.

## 6. Render result

A render result links a renderer, scene, illumination, camera, selected AxF material and output asset. Its status is `CALCULATED` or `SIMULATED`; it is never physical measurement evidence. Output files use the role `RENDER_RESULT`.

## 7. Status path

| Layer | Typical initial status | Evidence-backed status |
|---|---|---|
| ATLAS identity | REFERENCE_BOUND | VERIFIED |
| AxF bytes | SOURCE_DECLARED | VERIFIED |
| Selector | SOURCE_DECLARED / UNRESOLVED | RESOLVED |
| Material origin | UNKNOWN / SOURCE_DECLARED | MEASURED |
| Render | CALCULATED | SIMULATED |
| Physical comparison | NOT_MEASURED | MEASURED |
| QC conclusion | NOT_MEASURED | VERIFIED |

Forbidden promotions:

1. AxF availability must not promote material origin to `MEASURED`.
2. A render must not become `MEASURED`.
3. Digest verification must not be treated as measurement verification.
4. Measured material origin must not be treated as measured output QC.
5. `VERIFIED` binding requires verified identity, verified asset bytes and a resolved selector.

## 8. Integrity rules

All referenced binary assets require SHA-256. IDs are unique; all references resolve. An AxF asset must use the media declaration in section 2. A `MEASURED` provenance record requires at least one evidence reference and a method, organization or device. A `VERIFIED` QC conclusion requires physical measurement evidence. Renderer output and physical evidence are distinct asset roles.

## 9. Conformance levels

- `APF-AXF-REFERENCE`: identity, AxF asset, selector and binding.
- `APF-AXF-RENDERED`: reference level plus render result.
- `APF-AXF-MEASURED`: reference level plus evidenced measured origin.
- `APF-AXF-QC`: measured physical comparison and verified QC.

The declared level must not exceed the evidence present.

