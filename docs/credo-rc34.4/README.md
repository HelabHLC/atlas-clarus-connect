# RC34.4 Credo: editorial review draft

Status: **DRAFT — NOT APPROVED FOR RUNTIME INTEGRATION OR DEPLOYMENT**.

This isolated documentation proposal is based on PR #96 at commit `628bc43c62317fb492042075350acdaae22baed6`. It does not modify the public RC34.4, any master/reference data, calculations, library metadata, runtime source, release builder, release archive or machine schema.

## Review the preview

Download this branch as ZIP, extract it, and open `docs/credo-rc34.4/preview.html` in a browser. It is self-contained, works offline and needs no installation. Select Deutsch/English and filter the twelve proposed changes by area. Original source excerpts, pinned GitHub links and implementation notes remain visible for review. The full audit is `audit-DE-EN.html`; structured copy is `proposed-copy-DE-EN.json`.

This is an **editorial copy preview**, not an integrated runtime candidate. No production approval, physical validation or new application function is implemented. The preview uses no external scripts, network requests, storage or analytics.

## Findings and scope

- Clarify original/browser-decoded RGB, assigned fixed ATLAS reference, source-declared library membership and measured production testing as four separate records.
- Explain the library boundary at the selector; keep 78 new-work selections and all retained legacy definitions unchanged.
- Review the legacy visible `PRINTED — NOT MEASURED` label. Retain legacy machine values unless a separate compatibility change is approved.
- Preserve correct `PRINTABLE_NOT_MEASURED` and `NOT_PROVIDED` boundaries on decision cards.
- Correct obsolete no-importer/preview wording to reflect RC34.4 resumable jobs and Tool Exchange public beta.
- Explain designer/client/production-partner responsibilities without inventing approval-code services or automatic synchronisation.

## Evidence limits and next stage

The audit reviewed GitHub source, pinned build inputs, build assembly and the documented 18 October IONOS evidence. It did not inspect today's dynamic WordPress help or open the shipped binary bundle. Legacy source snippets are evidence of source wording, not a new live acceptance claim. Before runtime integration, compare actual RC34.4 output and dynamic WordPress text; then implement approved copy through a separately versioned overlay candidate. Do not change historical pinned builders or recovered assets.

## Validation

Local checks cover JSON parsing, twelve complete bilingual entries, source-excerpt anchors, JavaScript syntax and HTML structure. No runtime regression or physical print test has been performed because this draft changes no runtime. Runtime regression and narrow-screen/card-output acceptance remain required after integration.

No merge, public website update, release activation or deployment is authorised by this draft.
