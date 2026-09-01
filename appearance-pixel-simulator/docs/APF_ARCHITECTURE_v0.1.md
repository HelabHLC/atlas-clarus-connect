# ATLAS Clarus APF Architecture v0.1

Status: **Review Draft**  
Role: **Identity, Status and Evidence Layer**

## 1. Purpose

ATLAS Clarus APF does not define another pixel container, renderer, material
model, colour profile or spectral exchange format. APF is a machine-readable
evidence envelope that binds existing technical assets to a stable ATLAS Clarus
reference identity and records what is referenced, calculated, simulated,
measured and verified.

> APF binds existing colour, material, pixel and rendering assets to a stable
> identity and records the evidential status of every claim.

## 2. Position in the stack

| Existing system | Existing responsibility | APF responsibility |
|---|---|---|
| OpenEXR, TIFF, PNG, AVIF | Pixels, channels, image exchange and previews | Bind file, channel, region or pixel to an identity and evidence status |
| glTF, USD, MaterialX | Geometry, materials, shaders and scene description | Bind material/scene objects and declared viewing conditions |
| ICC | Device/profile transformations and production colour handling | Record profile identity, role, digest and processing status |
| CxF and spectral files | Measurement and spectral exchange | Record provenance, measurement status, digest and semantic relationship |
| Renderers and proofing systems | Compute or display appearance | Record engine, conditions, output asset and simulation status |
| QC instruments and reports | Physical measurement and conformance results | Record method, instrument, result, tolerance and evidence asset |

APF stores references and integrity bindings to those assets. It must not copy
their complete internal data merely to create an APF-native substitute.

## 3. Normative chain

1. **Reference Identity** — the stable ATLAS identity.
2. **Appearance Evidence** — material, geometry, illumination, observation and
   spectral evidence linked to that identity.
3. **Production Feasibility** — whether a declared production condition has
   been evaluated.
4. **Device Values** — device-specific values and profile bindings.
5. **Measured QC** — physical measurement and conformance evidence.

No later stage may silently rewrite the reference identity.

## 4. Core objects

### `identity`

The frozen ATLAS reference, including `source_atlas_row_id`, reference address,
master digest and optional display values. Identity status is separate from
appearance and QC status.

### `assets`

External files addressed by stable IDs. Each asset declares media type, role,
URI and SHA-256. Supported roles are extensible; v0.1 defines pixel container,
preview, material, scene, ICC profile, spectral evidence, measurement evidence,
device values and other.

### `bindings`

Links an identity to a whole asset or to a locator inside it. Locators can name
an image channel, pixel, rectangular region, material, scene node, object or
implementation-defined selector.

### `conditions`

Named viewing or production conditions. APF records conditions; it does not
invent their physical values when they are unavailable.

### `claims`

Every technical assertion has a status, method, subject, optional condition,
evidence references and responsible software or instrument. A simulation cannot
be promoted to measured evidence by wording alone.

### `workflow`

The five normative stages and their current state. `NOT_EXECUTED` and
`NOT_MEASURED` are valid, explicit outcomes rather than missing data.

## 5. Status vocabulary

| Status | Meaning |
|---|---|
| `REFERENCE_BOUND` | Stable identity successfully linked |
| `CALCULATED` | Result produced by a declared computation |
| `SIMULATED` | Result produced by an appearance/rendering model |
| `MEASURED` | Result originates from a physical measurement |
| `VERIFIED` | Evidence and declared verification rule passed |
| `NOT_EXECUTED` | The stage or operation was deliberately not run |
| `NOT_MEASURED` | No physical measurement exists for the claim |
| `INVALID` | Integrity, schema or evidential validation failed |

`VERIFIED` does not by itself mean `MEASURED`. Verification always applies to a
specific claim and method.

## 6. Mandatory claim boundary

An APF consumer must preserve the declared evidence class. In particular:

- simulated pixels remain `SIMULATED`;
- reference spectra remain reference evidence unless a measurement provenance
  explicitly establishes otherwise;
- measured QC remains `NOT_MEASURED` until a physical QC record is attached;
- a preview is not a physical proof;
- ICC or device values do not redefine the frozen identity.

## 7. Integrity model

APF v0.1 uses SHA-256 for the source master, external assets and optional
canonical-envelope digest. URIs locate assets; digests identify their bytes.
Moving an asset without changing its bytes therefore does not change its
identity binding.

## 8. Conformance levels

| Level | Minimum requirement |
|---|---|
| `APF-IDENTITY` | Valid envelope, frozen master identity and digest |
| `APF-EVIDENCE` | Identity plus asset/binding/claim evidence |
| `APF-PRODUCTION` | Production feasibility and device-value stages declared |
| `APF-QC` | Physical measurement evidence and measured-QC result |

An implementation must claim only the highest level for which all required
evidence is present.

## 9. v0.1 boundary

This draft defines the envelope and validation vocabulary. It does not define a
renderer, BRDF/BSDF representation, spectral file replacement, colour
transformation engine, production separation method or measurement procedure.

