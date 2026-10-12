# ATLAS Clarus RC33.1 — Colour Reduction & Pixel Magnifier

**Public test preview · offline Browser Bundle**

Reduce an image's palette, protect important Atlas references and inspect original pixels with the new magnifier.

## Download and start

Download **ATLAS_Clarus_Browser_Bundle_v0.2.0-rc33.1-colour-reduction-loupe.zip** from the assets below. The ZIP is the ready-to-use application; GitHub's automatically generated “Source code” archives are for developers.

1. Extract the entire ZIP into a new folder.
2. Open `atlas-clarus-browser-bundle/index.html` in your browser.
3. Choose **Colour Reduction**, load a PNG/JPEG, set a palette limit and create a preview.
4. Hover over the input image, or click/tap to keep a pixel selection. Use the enlarged grid or arrow keys to refine it, then protect its Atlas reference if desired.

The bundle runs locally. Image processing does not upload your images to a server. Export work before closing the tab; the reduction ZIP preserves evidence but is not a reopenable reduction-job file.

## What is included

- A palette limit of **1–256 Atlas references**, selected by deterministic RGB-only reduction.
- Protected references that count towards the palette limit and apply across the image.
- An **11 × 11 original-pixel magnifier**, RGB/HEX/alpha and separate Atlas-reference readouts, grid selection, arrow-key navigation and touch selection.
- Separate original RGB, Atlas assignments and reduced output, with alpha preserved.
- Reduced PNG, GPL, ASE, CSS and design-token exports, plus compatible Clarus JSON palette parts.
- A source-and-reduction ZIP with the source bytes, frozen input pixels, palette, pixel assignments and checksums.
- Verified Image Projects import and a read-only copy of the current image project.

## Test status and scope

[Acceptance run: PASS](https://github.com/HelabHLC/atlas-clarus-connect/actions/runs/38266487858) — Chromium 151, desktop and mobile-sized viewports, touch emulation, pixel selection, protected colours, alpha, all 256 palette indices, exports, independent PNG decoding and existing Image Projects/reference-card workflows.

Physical mobile devices, Safari/Firefox acceptance of the new reduction workspace, native design-application imports and textile printing remain unverified for this candidate.

This is a **pre-release for testing**. It is a separate offline download; publishing it does not update the WordPress website or Android app. The package is not a WordPress installer or an Android APK. Existing packages and their download links remain available.

Original RGB values and Atlas-reference RGB values can differ. Protection keeps the assigned Atlas reference in the selected palette. RGB motif colours are not printing inks or screens: the tool does not produce separations, underbase, halftones, trapping or ink recipes.

## Provenance and checksum

- Application source: [`b6993cfde7ddf8e62ec10914babc6c387373b4ec`](https://github.com/HelabHLC/atlas-clarus-connect/commit/b6993cfde7ddf8e62ec10914babc6c387373b4ec)
- Candidate development: [PR #77](https://github.com/HelabHLC/atlas-clarus-connect/pull/77)
- ZIP size: **4,036,930 bytes**
- ZIP SHA-256: `2df593619196cdf4b808e8f2199a28e1fb7aaf7a65cc5db6e5056e632174b1e5`

The attached `.sha256` file provides the same checksum. This release promotes the exact ZIP from the successful acceptance run; the application was not rebuilt or changed for publication.

Atlas reference data: HLC Colour Atlas XL / freieFarbe e.V. All bundled source-specific licences and attribution remain in force. Application and reference documentation are included in the ZIP.

Please report your browser, operating system and steps to reproduce any problem. Avoid posting private images or personal data in public issue reports.

**EVERY COLOUR HAS AN ADDRESS.**
