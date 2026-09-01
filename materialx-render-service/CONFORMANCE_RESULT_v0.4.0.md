# ATLAS Clarus MaterialX Render Conformance v0.4.0

Date: 2026-09-01

GitHub Actions run: `33516222307`
Commit: `d40bbdddc0485696272c2c4059adaeedb9651ca4`

| Gate | Result |
|---|---|
| Docker image build | PASS |
| MaterialX 1.39.4 source build | PASS |
| MaterialXView installed | PASS |
| Service health | `renderer_available: true` |
| Mock fallback | `false` |
| Standard Surface render | PASS |
| Standard Surface PNG bytes | 104,684 |
| Standard Surface PNG SHA-256 | `25f7b13f2665ca1cb82008c3fc369859ad2ff89d09c4723a09eb6e66d5445afe` |
| OpenPBR Surface render | PASS |
| OpenPBR PNG bytes | 103,055 |
| OpenPBR PNG SHA-256 | `adbeb8e822650043641dbe7d53c5900dc581d883afecbfd02f28905a65d29731` |
| Output status | `CALCULATED` |
| Evidence class | `EXTERNAL_RENDERER_OUTPUT` |
| Physical QC | `NOT_MEASURED` |

The GitHub Actions container is ephemeral. WordPress production binding remains
pending until the same image is deployed behind a persistent HTTPS endpoint.
