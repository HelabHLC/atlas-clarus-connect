# RC36 Public BYOS — integration evidence and release gates

Date: 2026-11-28. Status: DEVELOPMENT ONLY; no deployment or licence clearance.

## Confirmed source integration

Public Research Beta 0.6.0-beta.2, PR #129, was imported without changes from merge commit `2ffbb9740ef18e6587e7df7b97eb3d85c94a63af`.
All eight module files (HTML, six documentation files and the browser test) were compared by Git blob SHA against that exact source and matched.
The original test workflow was also copied. New CI outcomes have not yet been confirmed.
No private research repository, third-party profile binary or new reference dataset was copied.

The module remains a standalone workspace. It is not yet included in the RC36 runtime ZIP or connected to the shared reference record.
It accepts local user-selected observer, illuminant and spectral data; mathematical spectral optimisation is not physical print validation.

## ICC release gate

The existing baseline manifest lists `icc/profile-bank.js`, `icc/catalog.json`, `ICC_MANIFEST.json` and a profile-bound PDF workflow. A filename inventory alone does not prove whether proprietary profiles are embedded. The contents and redistribution terms must be reviewed.
`rc36/audit_public_byos.py` and the inventory workflow are committed, but a successful run and its findings are not yet confirmed. The scanner is a conservative aid, not a legal clearance mechanism.
Before public deployment:
- Inventory actual release bytes, including embedded/encoded data, nested archives, generated JS and compressed image/PDF metadata.
- Exclude every ICC binary or derived table with unverified rights; document explicitly cleared exceptions and provenance.
- Verify local file import, profile/header validation, SHA-256, missing-profile behaviour, local-only calculation, and export behaviour (no automatic redistribution of user ICC bytes).
- Test without any supplied ICC and with an independently obtained permissible test profile; separate computational results from physical print approval.
- Verify data lineage, attribution and licences of the 13,283 master references and separately of the 6,832 proposed synthetic identities; do not publish private data or infer printability from a gamut address.

## Integration and deployment

Keep existing RC34.11 IONOS installation and the original master untouched.
Integrate tested modules in the RC36 branch, then build an isolated administrator-only staging installer, test the actual IONOS runtime, and review release gates before replacing the public runtime.
The Multi-Gamut Designer, extended reference dataset, shared spectral handoff and profile-based media recommendation remain open.
