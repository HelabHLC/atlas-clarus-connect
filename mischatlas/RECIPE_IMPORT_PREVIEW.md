# Mixing Atlas recipe return import — development preview, 2026-10-17

This branch adds a **stored-result importer**, a richer snapshot export for new light searches, and RC34.1 recipe recognition. No published application, release archive, frozen master, palette, spectral dataset or numerical mixing algorithm is changed. `build.py` still builds unchanged 0.1.5; the extra builder creates a separate standalone preview with `deployment_allowed=false`. Nothing is deployed.

## Existing records and restoration boundary

| Record | Preserved and restored | Missing / limitation |
|---|---|---|
| `atlas-light-dependent-recipe-v1` | Original UTF-8 bytes (including whitespace, unknown fields and provenance), master checksum, fixed ID/name, target/model spectra, components with spectra and parts, objective, optimized illuminants, seed/budget, stored Lab/DE00 evaluations, material warnings | Complete candidate palette, kernels/whitepoints and original seed recipe are absent. The exact checked-but-unsealed result is displayed; no editable search session or automatic replay is claimed. |
| Older schema-less row export | Entire original document, row/reference, labels, model parts, spectra, observations, method and unknown metadata | Not a light-search session. Source spectra of all candidate pigments and search inputs are absent. No full-search restoration. Open rows without a recipe are rejected as non-recipe documents. |
| `atlas-mixing-recipe-snapshot/1.0` | Exact original file embedded as base64 with SHA-256; duplicated parsed record verified against original; canonical record SHA-256; complete new worker request and environment with their own SHA-256 | Checksums establish consistency after capture, not authenticity. Engine bytes are identified by digest, not executed or embedded. A re-run must use that exact engine. The explicit new-search bridge described below checks compatibility before restoring inputs. |

A new search snapshot retains **all samples**, component IDs/names/spectra, seed recipe, selected lights (also when D50 is the objective), objective, budget, random seed, target identity/spectrum, all 38 integration kernels, whitepoints, source provenance and engine SHA-256. Result spectrum, recipe, evaluation counts, all stored evaluations and `physical_measurements:false` remain separate from these inputs. Existing values are never replaced by recomputed ones on import. A new calculation is an explicit separate action in the normal mixer; it does not alter the imported result or its re-export.

The importer shows a distinct stored-document view. It does not push imported results into `lcRender`, which calculates diagnostics from the currently loaded environment. The native editor's selected reference/settings remain a separate new-search workspace. The imported record's reference, conditions, recipe, all evaluations and provenance appear together in the stored view. This is the first semantic result-return path, **not a claim that every legacy calculation or entire application session can be resumed**.

## Workflow

1. Build unchanged base: `python mischatlas/build.py`.
2. Build standalone preview: `python mischatlas/build_recipe_import_preview.py`. Open `mischatlas/dist/recipe-import-preview/atlas-clarus-mixing-recipe-import-preview.html`.
3. Calculate explicitly and use the light recipe export. It now creates a snapshot with complete search inputs. Existing base-row export is unchanged and also importable.
4. Build RC34.1: `python browser-bundle/build_tool_exchange_preview.py`. In Tool Exchange add the recipe as a native document (leave attachment-only unchecked). Save the complete exchange ZIP.
5. Reopen that ZIP in a fresh workspace, select the recipe and use **Download original file**. “Open in native tool” explains this standalone handoff; it does not claim to open an embedded mixer.
6. In the standalone preview use **Recipe JSON**. Inspect the stored record and its limitations. **Re-export imported file exactly** prepares its unchanged bytes for download.

RC34 also allows an explicit reference-only working view of the fixed target. Recipe components, calculated material performance and production settings are not converted into design or print instructions. Unsupported schemas can still be stored explicitly as attachments.

## Validation and failure rules

The shared validator checks the pinned master digest, row ID/name, optional master HEX, spectral bounds/grid, positive model parts totalling 100 for light recipes, unique component indices, stored light observations and explicit computational status. The standalone importer additionally checks the reference spectrum against the frozen built-in row. RC34 checks identity against its RGB master and does not claim independent spectral verification. Snapshot import checks original bytes, semantic equality and all recorded SHA-256 digests; replay components must agree with the retained full palette. Missing/unknown data is never guessed. Rejected imports leave the previous imported record/package intact.

Legacy files have no trustworthy pre-export digest: structurally valid earlier edits cannot be detected retrospectively. Their `LEGACY_UNSEALED` label states this. A snapshot created later can protect subsequent transfer consistency, not certify the past. Coordinated changes to data and all checksums are not cryptographic authentication.

Reproduce:

```sh
node mischatlas/test_recipe_exchange.cjs
python mischatlas/verify_recipe_exchange.py
node browser-bundle/tests/validate_tool_exchange.cjs
ATLAS_PLAYWRIGHT_MODULE=/path/to/playwright node mischatlas/test_recipe_import_browser.cjs
```

The committed JSON fixture and SHA256SUMS pin an actual deterministic 16-candidate test calculation (not a physically measured recipe). Node tests the real worker algorithm, import/export, ZIP carrier, byte-equal original and re-export, reference view, both legacy formats, invalid master/reference and changed recipe/replay data. Python independently checks SHA-256, base64 original bytes and ZIP CRC/payload hashes. Browser regression asserts no Worker or spectral calculation on import, invalid-import preservation, old-file labels, fresh-search snapshot capture, exchange reopen and narrow layout. The dedicated development workflow runs these checks and uploads previews/evidence; it has no publication step.

Local verification: core roundtrip PASS (13 rejected invalid cases), independent Python checks PASS, existing RC34 core PASS (13 rejected cases), standalone script syntax PASS. Local Chromium execution is unavailable: browser installation returned truncated ZIP downloads. Browser results must be read from the dedicated CI run; pending is not acceptance.

All recipes are computational candidates. Model parts are not calibrated dosing units. No physical mixture measurement, validated printing/pigment recipe, production suitability or production approval is established.

## Explicit new search from a snapshot

The preview now offers **Als neuen Suchlauf übernehmen** for complete snapshots.
Adoption itself starts no Worker. It copies the target, complete spectral candidate
palette, selected lights, objective and budget into the existing light-search UI.
The saved random seed and original seed recipe are retained for that target; both
are named in the adoption status. The snapshot palette is a separate option and
does not replace the original user-palette editor. A budget absent from the usual
menu is added explicitly. The user must then press **Calculate recipe**.

The local bundled engine must match the saved engine SHA-256. All integration
kernels and whitepoints must also match the UI environment, because the existing
renderer uses those built-in data. Mismatches block adoption and explain the
missing prerequisite. Imported engine code is never executed. Older files without
complete replay data remain stored results; no missing parameters are invented.

Each completed adopted search shows a separate comparison of recipe components,
model spectrum, stored per-light evaluations and search diagnostics. It reports
`EXACT_NUMERICAL_MATCH` or `DIFFERENT`, lists differing result sections, and shows
original/new/delta DE00 by illuminant. `same_inputs` separately indicates whether
the actual worker request equals the saved request; a changed setting or target
must not be described as reproduction. Equality means exact numerical equality
in this runtime, not a physical validation or a guarantee across engines/runtimes.
The imported document and its exact re-export remain unchanged. Cancellation and
failed searches do not replace the stored result or produce a comparison.

Additional reproducible check (after the roundtrip fixture has been built):

```sh
node mischatlas/test_recipe_resume.cjs
```

This executes the real unchanged numerical engine, checks exact results and copied
inputs, and rejects missing replay data, changed engines, kernels and whitepoints.
The browser regression now also tests adoption without Worker startup, explicit
calculation, exact reproduction, changed-input labeling and original-byte retention.

### Runtime precision check

The browser regression distinguishes exact input restoration from cross-runtime
floating-point equality. The committed Node fixture and Chromium produced the
same recipe and model spectrum; some per-light observations differed in the last
digits (observed maximum DE00 delta about 3.1e-14). The application correctly
reports `DIFFERENT` and retains the unrounded values. It now also reports
`max_abs_delta_DE00` and explains that the comparison applies no tolerance.
The test requires an identical complete worker request and tightly bounded light
observations for this fixed cross-runtime fixture. A second capture/import/replay
within the same Chromium runtime requires `EXACT_NUMERICAL_MATCH` and unchanged
original bytes. A test tolerance is not an application equality rule or physical
acceptance criterion.
