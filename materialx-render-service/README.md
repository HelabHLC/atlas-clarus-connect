# ATLAS Clarus MaterialX Render Service v0.4.0

License: `GPL-2.0-or-later`. MaterialX remains a separate Apache-2.0 project.

Manufacturer-neutral external renderer for the APF Material Bridge. It accepts
the existing `ATLAS_CLARUS_RENDERER_CONNECTOR_v0.1` JSON request, verifies the
ATLAS master digest and material bytes, invokes the open-source MaterialXView
renderer and returns a SHA-256-bound PNG.

## Evidence boundary

- Material bytes: decoded by MaterialXView.
- Renderer output: `CALCULATED / EXTERNAL_RENDERER_OUTPUT`.
- Physical comparison and measured QC: remain `NOT_MEASURED`.
- Mock fallback: prohibited. A missing renderer returns HTTP 503 with
  `RENDERER_UNAVAILABLE`.

## Run

1. Change `RENDERER_BEARER_TOKEN` in `docker-compose.yml`.
2. Build and start:

   `docker compose up --build -d`

3. Put a TLS reverse proxy in front of `127.0.0.1:8080`.
4. Test `GET /healthz`; `renderer_available` must be `true`.
5. In WordPress, choose **External JSON renderer**, enter the public HTTPS URL
   ending in `/v1/render`, and enter the same bearer token.

The first Docker build compiles MaterialXView 1.39.4 and can take considerable
time. The container uses Mesa software OpenGL through Xvfb; a GPU is optional.

## v0.4.0 limits

- Input: one `.mtlx` file, maximum 10 MiB by default.
- Output: PNG, 960 x 600.
- Built-in geometry: sphere, folding carton, bottle, can, plate and fabric proxy.
- Texture sidecars and ZIP packages are not yet accepted.
- Selector presence is recorded, but selector resolution is delegated to the
  loaded MaterialX document and MaterialXView.
- The renderer produces digital appearance evidence, not physical proof.

## Security

- Bearer authentication is optional in code but mandatory for public deployment.
- No remote asset URLs are fetched by the service.
- XInclude, DTD/entity declarations, filename inputs and external texture paths
  are rejected in v0.4.0.
- Material SHA-256 must match the decoded bytes.
- Rendering uses a per-job temporary directory, fixed executable arguments,
  no shell invocation, a timeout and a non-root container user.

## Conformance automation

`scripts/run_conformance.py` performs the end-to-end API checks used by the
included GitHub Actions workflow. It renders both supplied materials and verifies
the returned PNG signatures, calculated status and SHA-256 digests.
