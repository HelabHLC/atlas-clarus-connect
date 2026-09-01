# ATLAS Clarus Renderer Connector v0.1

Status: Review Draft

The connector is manufacturer-neutral. It transports an APF Material identity
binding to a renderer and binds the returned bytes as a render-result asset.
Material formats remain interchangeable adapters.

## Request

HTTP `POST` with JSON:

- `connector_contract: ATLAS_CLARUS_RENDERER_CONNECTOR_v0.1`
- `identity`: ATLAS row, reference, master digest and status
- `asset`: material identity, URI, digest, media declaration and, in external
  WordPress mode, `content_base64`
- `material_selector`: selector type, value and resolution status
- `scene`: scene ID, illumination, view angle, gloss proxy and camera

## Response

The external endpoint must return:

- `job_id`
- `renderer`
- `renderer_version`
- `status`: `CALCULATED` or `SIMULATED`
- `media_type` (`image/png`, `image/jpeg` or `image/webp` in external mode)
- `output_base64`
- optional `limitation`

WordPress independently calculates `output_sha256`. Output is limited to
10 MiB. A renderer result is never accepted as physical measurement evidence.

## Modes

- `mock`: public deterministic connector test, no material decoding.
- `external`: server-to-server adapter; WordPress `upload_files` capability
  required. Bearer token remains server-side.
