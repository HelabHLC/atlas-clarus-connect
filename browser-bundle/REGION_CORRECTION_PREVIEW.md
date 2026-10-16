# RC33.7 region correction development preview

Development branch only. Built by `build_library_reference_preview.py`. Deployment is forbidden by the preview manifest. No changes to master/reference data, public WordPress or Android.

RGB only is the entry point. Default output limit is 32. Original and reduced image are side by side on desktop and stacked on narrow screens. Select two inclusive source-coordinate corners directly on the reduced canvas (click/tap); Enter and arrows also select a rectangle. Original and result crops and the selected source pixel's decoded RGBA, output RGBA and independent full-master assignment are shown.

“Bereich korrigieren und schützen” uses the existing reduction guarantees:

- Library: source RGB → nearest reference of the selected library, tie by lower row ID; fix those references within the requested palette budget. This cannot recover colours outside that library and does not preserve original RGB. Multiple source colours can share one reference.
- Original: restore frozen browser-decoded source RGBA within the rectangle. Distinct visible originals reserve separate palette entries. This is not a promise about channels stored before browser decoding.

Recalculation affects the whole image. Cleanup resets on successful recalculation. Correction or budget failure/cancellation retains the previous output and rolls back the attempted protection. Increase the palette limit and regenerate, or select a smaller region. Existing protections are never silently removed.

The RGB map uses Euclidean distance in encoded 8-bit RGB (default threshold 60), excluding fully transparent pixels; it is not perceptual ΔE. Outlines and map never enter the PNG export. The correction report records rectangle, mode, changed pixels and visible-pixel mean RGB distances before/after. ZIP also retains the image before the last successful correction and its RGBA hash, plus original bytes, frozen input, independent full-master assignments, palette indices, protection mask and manifest hashes.

Validation commands:

```
node browser-bundle/tests/validate_library_reference.js
node browser-bundle/tests/validate_rectangle_protection.js
node browser-bundle/tests/validate_area_cleanup.js
python3 browser-bundle/build_library_reference_preview.py
node browser-bundle/tests/validate_library_reference_browser.cjs
node browser-bundle/tests/validate_region_correction_browser.cjs
```

The last test downloads actual PNG/ZIP files through Chromium and invokes an independent Pillow/ZIP verifier. It checks both modes, reconstruction from palette indices, cleanup protection, original file identity, invariant full-master assignments, conflict rollback and every package checksum. Synthetic 16×8 test motif; acceptance on the user's textile image remains a separate visual check.
