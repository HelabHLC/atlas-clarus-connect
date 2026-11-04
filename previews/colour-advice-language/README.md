# Colour advice / Startup Kit 0.1.5 — German and English

Adds a persistent Deutsch / English selector to Startup Colour Kit and Browser
Edition's colour advice launcher and shared advice dialog. It covers dynamic
guidance, validation, replacement decisions, the printer inquiry, exported
colour cards and dossier read-me notes. The legacy Browser UI retains its
existing language.

The language is a local presentation preference, not project data. A valid
`?lang=de` or `?lang=en` overrides the stored preference; absent both, German is
used. Storage failure is non-fatal. The current UI language controls exports,
including after importing an older dossier. Import still invalidates the old
calculation; switching language does not.

`language-en.js` contains English wording; `language.js` maps canonical German
UI text and controlled message templates. Original node text is retained for
reversible switching. Only the designated advice surfaces are observed in
Browser Edition. Text areas and user-content elements are excluded; printer
inquiries and report summaries use explicit localized templates. User names,
material descriptions, ICC filenames, library names and reference identifiers
are preserved. No translation request leaves the browser.

The report now uses “Starting colour · sRGB” and retains each row's provenance.
Direct reference selection does not claim an independently recorded customer
colour. B/A has two adjacent swatches and CMYK/ECG percentage values alongside
the original 16-bit values. If all original addresses belong to the selected
library, the report states that no replacement tolerance is required.

Build from the immutable 0.1.4 release (SHA-256 checked by the script):

```sh
python3 previews/colour-advice-language/package.py --base /absolute/path/ATLAS_Clarus_Browser_Startup_Farbberatung_0.1.4.zip --output-dir /absolute/path/new-output
```

Validation against the built runtime:

```sh
node previews/colour-advice/test-core.cjs RUNTIME CORE_OUTPUT
ATLAS_TEST_CHROMIUM=/path/to/chromium node previews/colour-advice/test-ui.cjs RUNTIME LEGACY_UI_OUTPUT
ATLAS_TEST_CHROMIUM=/path/to/chromium node previews/colour-advice-language/test-ui.cjs RUNTIME LANGUAGE_UI_OUTPUT
```

The language UI test runs actual bundled PSO Coated v3 conversions. It verifies
byte-identical project, decisions, original and accepted Clarus/palettes, ICC
and calculation files across DE/EN changes, English exports, reverse switching,
local preference and storage-failure fallback, parent/iframe synchronization,
and a 390px layout. Deliberately German user names matching dictionary entries
must remain unchanged. The previous advice core and complete Browser handoff
tests pass, including 34 CIEDE2000 reference pairs and original-image/ICC
preservation.

The reported screenshot case was independently reproduced with the unchanged
worker and bundled PSOcoated_v3.icc: H005_L050_C075, row 104, is present in the
PSO51 address list; sRGB [227,20,112] yields [228,22,112] with relative
colorimetric intent and BPC off. CMYK16 is [169,65535,12009,948], equivalent to
[0.26,100.00,18.32,1.45] percent rounded to two decimals. This verifies the
software calculation, not physical print accuracy.

The build checks all inherited files outside the presentation allowlist,
regenerates the checksum inventory and checks ZIP CRCs. Master/library data,
profile catalog, ICC files and LittleCMS worker remain byte-identical. Local
test release only; this change does not deploy or merge the public site.
