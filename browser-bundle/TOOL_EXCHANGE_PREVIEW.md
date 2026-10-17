# Clarus Tool Exchange RC34 preview

This isolated offline preview adds a shared **Tool Exchange** workspace to the replay-tested RC33.9 Browser Bundle. It preserves exact native source-file bytes in a bounded ZIP, links derived working documents to their sources, verifies native schemas, and sends supported documents into existing tool importers. It does not deploy to WordPress or Android.

## What lossless means here

The **complete exchange ZIP** is the unit of transfer. Every added source and captured edit remains available as its own immutable byte payload, including original RGB, reference assignment, source metadata, project choices/history, images and attached profiles when present in that native document. Original files can be downloaded byte-for-byte after reopening in a fresh browser profile.

A working view is explicit and can expose fewer editable fields than its source. A reference-only Browser palette does not become an editable image project, and an ASE does not acquire image masks. The original full document stays in the exchange alongside the derived view. A native file downloaded on its own is only that file, not the complete exchange. This does not claim universal semantic interchange of every existing Atlas tool or legacy export.

## Supported native documents

| Document | Verified | Native opening or working views |
|---|---|---|
| Browser palette JSON 1.0–1.2 | Master, references and version-specific source records | Browser palette; decisions from all recorded originals, or deliberately adopted references |
| Colour handoff decision JSON | Master, source and decision history | Colour handoff; Colour Projects; source palette recovery; reference view; cards and print handoff |
| Colour Projects JSON/ZIP | Complete journal, choices, source snapshots and ZIP companions | Colour Projects; all current colour sets as decision documents; source palettes and reference views |
| Image Projects JSON/ZIP | Source bytes/pixels, complete edit history and optional linked Colour Project | Image Projects; direct complete input to Colour Reduction; linked colour sets |
| Complete reduction job ZIP | RC33.9 full replay, masks, source project, cleanup, variants and output | Colour Reduction; exact attached source Image Project; new Image Project from output if PNG decoding preserves RGBA exactly; output colours as new design inputs |
| Parallel 4C/ECG print JSON | Frozen identities, separate settings and embedded ICC files | Print handoff; reference-only working palette while full original print request remains retained |
| Decision reference-card ZIP | Rebuilt cards, companion checks and full decision JSON | Colour handoff; subsequent project/print/reference views |
| Adobe handoff ZIP | Decision history, original ASE and both JSON companions | Colour handoff; companions retained as one original payload |
| Single reference-card JSON | Native reference-card contract | Retained document; reference working view and print handoff |
| Other formats including recipes, PNG, ASE, GPL, CSS and tokens | Byte integrity only, explicitly added as attachments | Exact retrieval; no editable schema conversion is claimed |

Standalone Mixing Atlas, Appearance/APF/MaterialX tools, standalone WordPress Hover/Picker installations and external ArtCraft/PhotoCraft integrations are not given new native importers by this preview. Their files may be kept intact as attachments; that is not a completed semantic integration. Existing native validators and limits remain in force.

## Workflow

1. Add a complete native file or use **Add current tool state to exchange**. For other formats, explicitly select **Add as unchanged attachment only**.
2. Open the verified native document in its tool, or prepare an explicitly named working view. To move an Image Project into reduction, choose **Colour Reduction source** as the open destination.
3. Edit in that tool and capture its complete native state back into the exchange. The original payload is not overwritten. Captures opened via Exchange are linked to their source document.
4. Save **ATLAS_Clarus_Exchange.zip**. Reopen that file in another browser/profile, choose a document, and continue using its native tool.

A shared package banner stays available in native tool views, with capture and save controls. Reduction-job verification runs in a worker to keep the interface responsive.

Capture suppresses the intermediate native download and puts its bytes in the in-memory exchange instead. The workspace warns before leaving with an unsaved exchange. Save the complete exchange ZIP before closing. No autosave or online sync is claimed.

## Preservation and failure rules

- Same pinned full master and existing RGB-only assignment rules; no rebinding of existing source identities.
- Reference-only views are labelled. Original source RGB and history remain in the complete parent file.
- Reduction output colours adopted for a new design are explicitly new inputs, not a rewrite of source pixel identities.
- More than 250 decision inputs are split into complete native sets; more than 10 colour sets split into complete Colour Projects; reference and print views split at 64. No hidden truncation.
- Complete attached Colour Projects can be recovered with their choices and history. A print request can be recovered from a reference view when exactly one nearest retained print source is identifiable; profiles and settings are not guessed or reset.
- A native tool's stale-version, conflicting-branch, source-decoder or capacity rejection remains in force. The carrier retains every file even if native opening fails.
- At most 100 documents and 384 MiB per exchange ZIP; native tools retain their stricter limits. An over-limit operation fails as a whole.
- Source bytes use generated UUID payload paths; filenames are display/download metadata. CRC, SHA-256, schema/master checks and acyclic source links are checked before an imported exchange replaces the open one.
- Checksums establish consistency, not authenticity, authorship, licensing or production approval. Attachments are not labelled as semantically validated.

## Reproduction

Build: python browser-bundle/build_tool_exchange_preview.py

Core: EXCHANGE_TEST_OUTPUT=/tmp/atlas-tool-exchange-core node browser-bundle/tests/validate_tool_exchange.cjs

Browser: node browser-bundle/tests/validate_tool_exchange_browser.cjs with pinned Playwright Chromium installed, or an explicitly supplied CHROMIUM_PATH for local verification.

Independent bytes: python browser-bundle/tests/verify_tool_exchange_exports.py

The build verifies the pinned RC33.9 ZIP hash before adding the workspace and sets deployment_allowed=false. Frozen release files and reference data are unchanged.
