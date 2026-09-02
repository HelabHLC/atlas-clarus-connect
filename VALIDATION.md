# Validation report — ATLAS Clarus Connect v0.1.0

## Browser bundle v0.2.0-rc1

- JavaScript syntax: PASS
- Embedded reference count: 13,283
- Unique zero-based `atlas_row_id` values: 13,283
- Master SHA-256 metadata: PASS
- Local entrypoint and relative asset paths: PASS
- External runtime dependencies: 0
- ZIP integrity/readback: PASS
- A′ v0.4 selection logic: UNCHANGED; v0.5 information is diagnostic-only
- Automated visual browser run: NOT_EXECUTED in the build environment
- Release state: `READY_PENDING_AUDIT`

The browser bundle does not constitute measured QC, a physical proof or native
runtime validation of Inkscape, GIMP, Krita or Scribus.

**Package status:** APPROVED FOR PUBLIC GITHUB RELEASE — NOT YET UPLOADED  
**Validation scope:** locally available release candidate

## Passed

- All JSON files parse successfully.
- Hover Library JavaScript passes `node --check`.
- Handoff example set passes structural validation: 1 valid and 8 rejection vectors.
- Plugin data contains 13,283 colour records.
- Colour IDs are contiguous and zero-based: `0..13282`.
- Core view contains the complete `0..13282` identity range.
- Colours and views declare the expected master SHA-256.
- The supplied Hover Library v0.1.5 ZIP is byte-identical to the source archive used for assembly: SHA-256 `d26dce8fd0a9681a666722ef1a8a07ea1a8689f295d16a9cee664d8aa43fb155`.
- The supplied Reference Wheel WordPress v1.0.0 ZIP was inspected and included: SHA-256 `75375d730205bb55c07c83a0d1b699228594bb05d98127792c6136fcd08c5be7`.
- The Wheel WordPress plugin contains an escaped, settings-controlled iframe wrapper and declares GPL-2.0-or-later.
- The exact repository HEAD matches public Sites version 22 source commit `32767d209c3f45bdce557856c3850b17dec97757`.
- The unmodified Wheel checkout completed its locked dependency installation, Vinext build, Sites artifact validation and rendered-HTML test successfully.
- The Wheel application contains 19 documented L* plane files, the 13,283-reference manifest and the expected active-master SHA-256.

## Pending

- The included PHP validator was not executed because PHP was unavailable in the assembly environment. An equivalent data-integrity check was performed with Python.
- Clean WordPress installation test.
- Clean repository checkout and package reproduction.

## Blocking public source release

- The corrected receiver requires HLC and source, strictly parses row IDs and blocks duplicate critical parameters; all eight application tests pass.
- The repository licence map assigns GPL-2.0-or-later to software, CC BY 4.0 to original documentation and zlib to HLC-derived reference data, with upstream attribution and modification notice.

## Result

```text
PACKAGE_ASSEMBLY = PASS
GITHUB_RELEASE_APPROVAL = GRANTED
LIVE_SITE_MATCHES_RELEASE = NO
REMAINING_OPERATIONAL_GATE = GITHUB_UPLOAD
```
