# Validation — v0.4.0

| Gate | Required result |
|---|---|
| Request schema | PASS |
| Frozen master digest | MATCH |
| Material base64 | VALID |
| Material SHA-256 | MATCH |
| Maximum material size | ENFORCED |
| Accepted format | MATERIALX `.mtlx` |
| XInclude / external entity | REJECTED |
| Filename / external texture input | REJECTED |
| XML nesting | MAXIMUM 64 |
| Shell execution | NOT USED |
| Per-job workspace | TEMPORARY |
| Render timeout | ENFORCED |
| Missing MaterialXView | HTTP 503 `RENDERER_UNAVAILABLE` |
| Mock fallback | PROHIBITED |
| Output signature | PNG VERIFIED |
| Output SHA-256 | CALCULATED |
| Evidence class | EXTERNAL_RENDERER_OUTPUT |
| Physical QC | NOT_MEASURED |

The source package can be statically validated without MaterialXView. End-to-end
render conformance requires building the Docker image and rendering the supplied
MaterialX asset on the deployment host.
