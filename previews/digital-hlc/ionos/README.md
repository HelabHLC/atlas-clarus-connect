# IONOS deployment · digital HLC preview 0.1.8

Deployed to https://arbe-lambda-star.com on 8 November 2026. This adds a separate digital-colour workspace to the existing Browser Edition and publishes its offline ZIP, navigation links and bilingual help. The WordPress adapter is **0.1.23-beta1**; the digital application is **0.1.8-preview**. The active RC34.11 / brand-palette 0.1.7 runtime remains selected.

## Live entry points

- [Browser Edition](https://arbe-lambda-star.com/atlas-clarus-browser-bundle/) — direct P3 / ProPhoto link in the primary navigation.
- [Digital preview](https://arbe-lambda-star.com/atlas-clarus-browser-bundle/digital/index.html?lang=de)
- [Offline ZIP](https://arbe-lambda-star.com/atlas-clarus-browser-bundle/digital/offline.zip)
- [Downloads](https://arbe-lambda-star.com/atlas-clarus-downloads/#digital-hlc-018)
- [Help & FAQ](https://arbe-lambda-star.com/atlas-clarus-interactive-user-guide/#digital-hlc-018)
- [Manual](https://arbe-lambda-star.com/atlas-clarus-browser-edition-user-manual/#digital-hlc-018-de)

The home page, tools directory and Critical FAQ also link to the extension. The interactive guide includes chapter 22, six bilingual steps and eight bilingual FAQ entries. Its local help-chat routes P3/ProPhoto questions to these answers; it performs no colour calculation.

## Reproduce the installer

Download `ATLAS_Clarus_Browser_Test_0.1.7_IONOS_Installer.zip` from the [public 0.1.7 release](https://github.com/HelabHLC/atlas-clarus-connect/releases/tag/v0.2.0-brand-palette-0.1.7), then run from the repository root:

```sh
python previews/digital-hlc/ionos/build.py /path/to/ATLAS_Clarus_Browser_Test_0.1.7_IONOS_Installer.zip /path/to/output
```

The builder checks the baseline installer, offline ZIP and standalone HTML hashes, retains the existing installer and rollback code, and adds three fixed routes. It does not change the active runtime option. The served offline ZIP is byte-identical to `../download/ATLAS_Clarus_P3_ProPhoto_0.1.8_Offline.zip`. No ICC files are added.

`build-info.json` records all hashes. The final installer is 3,358,172 bytes, SHA-256 `a6fc95fa4bf6a765146b423e64d070cf1b01de69a9ebb0a67c3ec6495e1e5db8`. Its archive is reproducible from the checked-in builder and inputs.

## Verification

- Core regression: 13,283 master references, 94 library views, tagged RGB sources, unchanged identity and list membership, JSON/CSS round trips and rejected forged records.
- Independent numerical comparison: 22,251 vectors passed; see `validation/oracle-results.json`.
- Public browser: DE/EN interface, H295_L040_C100 identity and source RGB, P3 colour H290_L040_C095 outside sRGB, full Display-P3 and ProPhoto JSON downloads, palette export/remove/reimport, and the direct main-navigation link.
- Published help: English ProPhoto count question and the short German query `P3` return the new FAQ. Chapter 22 is the default; the original brand-palette anchor still opens chapter 21.
- Served offline ZIP hash matches the source archive. Final PHP parses as PHP 7.4. The active runtime option is unchanged and the installed adapter reports 0.1.23-beta1.
- Public-page response checks and downloaded JSON counts are recorded in `validation/live-results.json`; `live-palette-export.json` is the actual browser export used for the reimport test.

Source-list membership is kept separate from computed gamut. P3 contains 15,430 source-selected addresses (565 outside the strict computed gamut); ProPhoto contains 22,248 (330 outside). The additional addresses do not acquire measured spectra, ARBE values, production-library membership or print approval. No physical display calibration or print validation is claimed. The base image workflow remains sRGB.

## Content changes and recovery

`wordpress-copy.json` contains the published bilingual additions; `wordpress-patches.json` records page IDs, menu entries and interactive-help changes. WordPress page revisions retain the earlier content. The extra menu items are 5770, 5771 and 5772 in menu 328. Restoring the original adapter removes the separate digital routes; remove or revise their navigation links at the same time. It does not require switching or replacing the stored 0.1.7 runtime.
