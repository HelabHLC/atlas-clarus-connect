# Deployment model — user-operated renderer

ATLAS Clarus provides an open connector contract and a tested reference
implementation. It does not provide a public or commercial rendering service.

## Default WordPress use

- No external server is required.
- The colour-aware mock remains available.
- Material identity, digest and APF evidence can be created locally.
- Mock output is labelled `MOCK_SIMULATION` and is not MaterialX decoding.

## Optional external rendering

Users or organizations may deploy the reference container on infrastructure
they control, or connect another compatible renderer. They are responsible for:

- hosting, availability and cost;
- HTTPS, authentication and access control;
- privacy notices and data-processing obligations;
- updates, monitoring and incident response;
- renderer-specific licensing and operational security.

Connecting an external endpoint is an administrator decision. ATLAS Clarus does
not receive uploaded materials, render jobs, tokens or renderer output unless a
separate service operator explicitly offers such a service.
