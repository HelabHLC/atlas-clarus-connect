# Colour Identity Wheel source provenance

**Site title:** ATLAS Clarus Reference Wheel  
**Public URL:** <https://atlas-clarus-reference-wheel.arbe-lambda-star.chatgpt.site/>  
**Sites version:** 22  
**Source baseline commit:** `32767d209c3f45bdce557856c3850b17dec97757`  
**Export target:** `colour-identity-wheel/application/`

The repository HEAD was compared with the source commit recorded by Sites for version 22 and matched exactly before the RC1 patch was applied.

## RC1 release patch

The GitHub release candidate intentionally differs from the still-live Site v22 baseline in four source files:

- `app/page.tsx` — delegates handoff validation to a testable validator;
- `app/identity-handoff.ts` — requires HLC and source, strictly parses row IDs and rejects duplicate critical parameters;
- `tests/identity-handoff.test.mjs` — tests valid and rejected handoffs;
- `package.json` — runs the handoff tests and declares GPL-2.0-or-later.

This patch has not been deployed to the public Site in this release-packaging step.

## Excluded generated or repository-local paths

- `.git/`
- `node_modules/`
- `dist/`
- `.sites-runtime/`
- `.wrangler/`

These paths are not required as source and can be regenerated or are repository metadata.

## Validation of the unmodified checkout

```text
LOCKED_DEPENDENCY_INSTALL = PASS
VINEXT_BUILD = PASS
SITES_ARTIFACT_VALIDATION = PASS
RENDERED_HTML_TEST = PASS
```

## Resolved conformance gap

RC1 requires the master digest, a canonical non-negative integer row ID, row existence and a matching non-empty HLC reference. A missing HLC produces `IDENTITY_HANDOFF = BLOCKED_MISSING_REFERENCE`.
