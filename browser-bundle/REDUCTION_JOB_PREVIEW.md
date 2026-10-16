# Complete reduction job preview RC33.9

A complete reduction job ZIP can be exported and reopened using the dedicated Open complete reduction job ZIP control. This isolated offline preview is based on byte-pinned RC33.8. It does not update WordPress or Android, and deployment_allowed remains false.

The job carries original image bytes, frozen browser-decoded RGBA, optional complete source Image Project, independent full-master pixel assignments, selected library IDs, requested budget, explicit reference locks, original RGB protections, inclusive rectangles, ordered NEAREST_LIBRARY/REFERENCE corrections, mixed palette entries, current output, pre-cleanup output, cleanup settings, up to three saved comparison variants and the comparison view. A new browser profile can reopen it without localStorage. Pending, unapplied UI input is not an applied design decision and is not part of the saved job.

Import checks the bounded STORE ZIP structure, CRC, every SHA-256, schema, exact master and available library; verifies original file-to-frozen-pixel consistency using the browser decoder (or the complete Image Project history); replays reduction and cleanup for current and saved variants; compares pixel buffers, full-master IDs, indices, masks and report fields. Workspace replacement occurs only after validation completes. Consistency hashes are not signatures or proof of authorship.

Limits are explicit: original image max 8 MiB, image max 4,194,304 pixels/8192 per edge, metadata max 32 MiB, whole ZIP max 384 MiB, at most 3 variants. Oversize jobs fail rather than silently dropping data. A different browser decoder may disagree on frozen source channels; that import is rejected rather than silently changing them. Legacy reduction evidence packages contain no complete job snapshot and are rejected with an explanatory message. They are not silently migrated or rebound.

Build: `python browser-bundle/build_reduction_job_preview.py`.
Core: `node browser-bundle/tests/validate_reduction_job.cjs`.
Browser: `node browser-bundle/tests/validate_reduction_job_browser.cjs` after installing the pinned Playwright Chromium.

Initial local core result: PASS, actual 13,283-row master, complete and repeated roundtrip, both modes, two originals sharing a reference, partial alpha/hidden RGB, rectangles, both correction modes, cleanup, variants, continued edit and 20 negative cases. A linked Image Project test also preserves the original file, recorded image edit, linked Colour Project and complete journal. Browser verification is required before claiming accepted UI operation. The standard local Chromium download failed because its endpoint returned an unavailable-site page. A separately installed Chromium 153 test binary subsequently passed the real browser roundtrip locally. The dedicated GitHub Actions workflow also passed its browser roundtrip and existing reduction UI regression at initial commit 72e8cbc23686491e38b2fc4339a8d48c4e0dcf81; follow-up validation below is pinned to the final head.

Independent downloaded-file verification: `python browser-bundle/tests/verify_reduction_job_exports.py` uses Python zipfile/hashlib, NumPy and Pillow. It verifies package hashes and actual PNG pixels, reconstructs pixels from the output palette indices, independently recomputes full-master winners, and checks source bytes, alpha and protected original RGBA.
