# ATLAS Clarus Startup Colour Kit — 0.1 preview

Startups need a small, understandable colour handover, including preparation for
print. This preview collects up to twelve colours from one original image and/or
explicit manual sRGB HEX values, keeps source colours separate from fixed ATLAS
references, and calculates output-profile previews for either chosen input basis.
It exports a reopenable colour dossier with a printable card and design palettes.

The owner approved the first version including **Druck vorbereiten** on
3 November 2026. This is an isolated downloadable preview; no WordPress, public
Browser Edition or IONOS installation is changed. The source is added on top of
the first-colour-origin branch at `2f8f8f5e8e51ecde1e88a15e777353ce39e0a4f8`.
The package itself derives from the exact published RC34.11 archive, independently
of the older source builder on `main`.

## Try it

Extract the whole ZIP and open **START_HERE.html**. Use a current browser with
Web Crypto available for local files, or serve the extracted package on HTTPS.
The managed HTTP preview can show the interface but cannot perform the SHA-256
operations used for file/profile validation. No profiles are bundled.

1. Enter a brand name. Open a PNG, JPEG, WebP or GIF (up to 32 MiB / 24 MP), then
   select pixels. Alternatively enter an explicit sRGB HEX value. Name the colours.
2. Under **Druck vorbereiten**, choose **Source Colour** or **ATLAS-Referenz**,
   load an appropriate output profile, and specify process and material. Review
   rendering intent and black-point compensation. Calculate the B/A comparison.
3. Save the complete **Farbmappe ZIP**. It includes a printable HTML card and
   separate source/reference palettes in ASE, GPL and CSS. Reopen it using
   **Farbmappe öffnen** and recalculate the print preview.

One image is retained per dossier. Opening another image replaces the previous
image-derived colours; manual colours remain. Save the old dossier first. Multiple
sampled sources can share a reference without losing their individual records.
The native design-application imports are not validated by this preview.

## What B/A means

- **B:** the explicitly chosen source RGB or frozen reference RGB, in sRGB RGB8.
- **A:** sRGB → device16 through the selected profile, followed by a relative
  colorimetric return to sRGB, with BPC disabled on the return. The selected
  intent/BPC apply to the forward transform. Device16 channel values are also shown.
- This is a computational roundtrip with no paper-white simulation. It is not a
  measured proof, an independent gamut test, a PDF/X certification or a production
  approval. A small returned-RGB difference does not establish physical equality.
- The inherited engine supports output-class CMYK (4C), seven-channel ECG with
  explicit channel order, and the exact final TextileRGB FOGRA58 profile. FOGRA58
  is a textile exchange space, not a particular printer/ink/fabric profile.
- The image source is browser-decoded sRGB. Original bytes and input-profile
  metadata survive, but the browser's actual conversion is not verified. This
  preview does not fix the 16-bit Display-P3 precision differences reported by
  PR #112. Manual HEX values are explicitly declared sRGB and have no image origin.

## Archive and trust boundaries

The new schema is `atlas-clarus-startup-colour-kit/1.0`. Files are deterministic
stored ZIP entries, limited to 56 MiB total. The dossier contains `project.json`,
`colours.clarus.json`, `farbkarte.html`, `read-me.txt`, six palette files, and, when
present, the original image, the exact output ICC and `print/calculation.json`.
`manifest.json` hashes every payload. The original's SHA-256 and inspected ICC
metadata must agree with every image source. The output profile is revalidated
against its path and hash. Wrong/absent originals, corrupt archives, unsupported
paths and inconsistent reference assignments are rejected.

Import validates all files before replacing the workspace. Saved source values
are not resampled. The UI may decode the original for further selections, but old
values remain unchanged. Saved calculations are structurally checked, then
discarded as active results; the user recalculates them with the loaded profile.
Embedded reports are not executed during import. Hashes establish internal
consistency, not authenticity or signatures. Original files may retain EXIF and
other metadata. Users need permission to pass on their loaded ICC profiles.

`colours.clarus.json` retains image source assignments and canonical ATLAS
references. Manual source entries retain their full provenance in `project.json`;
they are not disguised as browser image samples. The two palette directories are
explicitly named `source` and `reference` to prevent silent substitution.

The card is printable HTML. A browser-created PDF of this card is not a
profile-bound proof PDF. The complete inherited Browser Edition and its existing
profile-bound reference exports remain available through **Alle Werkzeuge**.

## Reuse and build

The builder verifies the published RC34.11 ZIP SHA-256
`6158babb2a0271b71658c989c79f08ad690c5b782b2c0565e33c849a6c0d6bfb`.
It leaves all 278 inherited runtime/data/documentation files byte-identical and
updates only the root `SHA256SUMS.txt`. The additions are `START_HERE.html`,
`STARTUP_KIT_MANIFEST.json`, and the `startup/` files. All inherited licence and
source notices are retained. New source uses the repository's software licence.

Reused unchanged: full master, RGB tie-breaking semantics, source-assignment
creation/validation, image ICC metadata inspection, ICC validation, the embedded
LittleCMS 2.16 / lcms-wasm 1.0.5 worker, ASE writing/readback and ZIP writing.
The ZIP reader is copied into its own `ATLAS_STARTUP_CODECS` namespace with its
entry limit raised from eight to sixteen; CRC, bounds and path checks are retained.
The original reader and original runtime stay unchanged.

```sh
python previews/startup-colour-kit/package.py --base inputs/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.11-colour-origin.zip --output-dir candidate
python releases/rc34.11/generate-fixtures.py fixtures
node previews/startup-colour-kit/test-core.cjs candidate/atlas-clarus-browser-bundle evidence /usr/share/color/icc/ghostscript/default_cmyk.icc fixtures
python previews/startup-colour-kit/native-oracle.py evidence/computations.json
python previews/startup-colour-kit/verify-archives.py evidence fixtures
```

Use Node 24, Python with Pillow and native liblcms2. The Ghostscript default CMYK
profile is only a locally installed test fixture and is never redistributed in
the app. Tests do not claim this generic profile represents a user's printer.

## Validation status

Recorded evidence is in `validation.json` and `evidence/`.

- PASS: twelve source/reference colours have exactly matching device16 and RGB8
  roundtrip results in the embedded worker and independent native LittleCMS.
- PASS: four forward intents and both BPC settings reach the real engine;
  output input basis, profile identity and result invalidation are checked.
- PASS: all eight image fixtures reopen with byte-identical originals, including
  three embedded ICC profiles, independently verified with Python/Pillow.
- PASS: deterministic ZIP export/reopen, source/reference ASE readback, wrong
  profiles, missing originals, modified references and corrupt ZIP rejection.
- PARTIAL browser QA: desktop layout, manual colours, actual RGB/reference
  readout, invalid HEX rejection and disabled calculation without a profile were
  inspected. There was no horizontal overflow in the inspected desktop viewport.
  The supplied HTTP preview has no Web Crypto; file/profile/ZIP browser acceptance
  therefore remains open. A browser download wait did not produce verified
  download evidence. Local file navigation is disallowed by the test browser.
- OPEN: complete browser acceptance on HTTPS or local file, physical mobile
  devices, native design-app import, valid ECG/FOGRA58 profiles in this new UI,
  and any physical print measurements. Existing engine checks are not a substitute
  for those new UI/production checks.

Do not promote this preview to the public installation before the open browser
acceptance and relevant device/profile checks have been completed.
