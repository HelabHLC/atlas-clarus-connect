# Process libraries and retained screenshot views

RC34.2 adds Gamutmap-sourced process selections on the pinned RC34.1 Tool Exchange runtime:

- `pso_coated_v3_fogra51`: 9,034 references.
- `pso_uncoated_v3_fogra52`: 5,513 references.
- `pso_fogra51_fogra52_common`: 5,492 references.

The active master, reference IDs, RGB values, full-master pixel binding and reduction numerics remain unchanged. Source responses and a reproducible identifier-based join are in `process-libraries/`. This is source-declared gamut membership, not a new gamut calculation, physical QC result, Pantone mapping or production certification.

`solid_c` and `solid_u` keep their exact names and ordered ID arrays. They are hidden only from new selections. A fully verified existing reduction job reveals its retained option before the UI restores its library ID. Changing away removes that temporary option. A new job can therefore never silently acquire different palette membership under an old library ID. Projects are not assumed absent.

The Hover Library also hides these two choices, while explicitly configured legacy shortcodes and saved defaults remain supported. Other screenshot-derived views are unchanged. No user data or local storage keys are rewritten.

## Build

```
python browser-bundle/build_process_library_preview.py
node browser-bundle/tests/validate_process_libraries.cjs
node browser-bundle/tests/validate_process_libraries_browser.cjs
```

The wrapper preserves baseline builders and their checksum pins. Browser output is in `browser-bundle/build-process-libraries/`. Local `CHROMIUM_PATH` may specify an installed browser; default CI uses Playwright Chromium.

## Validation completed locally

- All 13,283 identifiers agree with the source XL atlas. FOGRA51, FOGRA52 and their intersection agree with independent single-filter intersections and the direct Gamutmap multiple-filter response.
- Real-master native job export/import and second export: old and all three new views, including byte-identical package exports in the core test.
- Chromium: old and new job restore/export/second restore with unchanged displayed output; hidden legacy choices reappear only for retained jobs and disappear after changing away.
- Chromium: complete Tool Exchange regression, source return, fresh-profile exchange import, invalid-import preservation and narrow-screen layout.
- Hover frontend: new choices and explicit retained defaults, tested with jsdom.
- Existing native reduction jobs, palette exports and source-assignment regression checks.

No WordPress live activation, public runtime replacement, APK rebuild, physical-device acceptance or print measurement is included. The Hover PHP changes have not been executed locally; CI runs its data validation and syntax check before release.
