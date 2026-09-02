# ATLAS Clarus Connect

**Release:** v0.1.0  
**Status:** PUBLIC SOURCE RELEASE  
**Workflow:** ATLAS Clarus Workflow v3.4.0

ATLAS Clarus Connect is an open colour-reference workflow for designers:

> Find a colour → understand it → transfer its identity without losing provenance.

It combines three parts:

1. **Hover Library** — find, inspect and collect ATLAS HLC references.
2. **Colour Identity Wheel** — understand and locate a selected reference.
3. **Identity Handoff** — transfer the zero-based identity, HLC designation and master digest between tools.

## Offline browser bundle

`browser-bundle/` builds a standalone edition that starts by opening `index.html`
directly in a modern browser. It includes the Hover Library, Colour Identity
Wheel, Identity Handoff, Appearance Pixel Simulator and documented workflow
demos for Inkscape, GIMP, Krita and Scribus.

The browser bundle performs no analytics and requires no account, installation,
server or network connection. Its application demos document integration
boundaries; they do not embed or claim native browser execution of the desktop
applications.

Current candidate: **v0.2.0-rc2 · READY_PENDING_AUDIT**. RC2 uses a self-contained
entrypoint so Windows may open `index.html` directly from the ZIP without losing
the stylesheet, application code or embedded reference data.

## Current release contents

| Component | Included | Status |
| --- | --- | --- |
| Hover Library | Complete WordPress plugin v0.1.5 | Source and data included |
| Identity Handoff | Protocol v0.1.0 and test vectors | Strict validation tested |
| Colour Identity Wheel | Site v22 baseline, tested release patch and WordPress embed v1.0.0 | Source included |
| Open Label | v0.1.1 documents | Review draft; not certification |

The exact source commit behind public Site version 22 is included as the provenance baseline. Version 0.1.0 adds a tested strict-HLC patch and the final repository licence map. The currently deployed Site remains on the unpatched version until separately published.

## Verified reference baseline

- Master rows: **13,283**
- Master SHA-256: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`
- `atlas_row_id`: **zero-based**
- Human display row, when shown: **one-based**

## Quick start: Hover Library

1. Zip the `hover-library` directory with that directory as the archive root.
2. In WordPress, open **Plugins → Add New → Upload Plugin**.
3. Install and activate it.
4. Add `[atlas_clarus_library]` to a page.

The plugin currently links to the public Wheel endpoint configured in `atlas-clarus-hover-library.php`.

## Repository structure

```text
hover-library/          WordPress plugin v0.1.5
colour-identity-wheel/ Exact Wheel application, WordPress embed and integration boundary
identity-handoff/      Normative transfer protocol and examples
open-label/            Review-draft label documents
browser-bundle/        Standalone offline HTML edition and deterministic ZIP builder
LICENSES/              Licensing status and notices
THIRD_PARTY_NOTICES.md Upstream rights and attribution boundary
RELEASE_MANIFEST.json  Release contents and readiness gates
```

## Important boundary

ATLAS Clarus preserves a reference identity. It does not claim that a screen, print, textile or material sample physically matches that reference unless a separate qualifying measurement has been performed.

The named source-context views in the Hover Library are observed coverage views. They are not Pantone libraries and assert no Pantone identity equivalence.

## Verification before deployment

Before deploying a modified build:

- preserve all required upstream attribution and modification notices;
- run the included plugin data validation from a clean checkout;
- run PHP validation in CI or a PHP 7.4+ environment;
- decide whether RC1 should also be deployed to the public Wheel Site.

## Public tools

- Hover Library: <https://arbe-lambda-star.com/atlas-clarus-hover-library/>
- Colour Identity Wheel: <https://atlas-clarus-reference-wheel.arbe-lambda-star.chatgpt.site/>
- Mission: <https://arbe-lambda-star.com/our-mission/>

## Wheel WordPress embed

`colour-identity-wheel/wordpress-embed-v1.0.0` contains the supplied WordPress plugin that embeds the public Wheel in an iframe. It is not the Wheel application itself. Its supplied source archive has SHA-256 `75375d730205bb55c07c83a0d1b699228594bb05d98127792c6136fcd08c5be7`.

The embed currently loads its configured Wheel URL without forwarding the surrounding WordPress page's query parameters. Identity handoff therefore continues to target the Wheel application directly.

## Wheel application source

`colour-identity-wheel/application/` contains the exact repository checkout used by public Sites version 22:

- Site project: `ATLAS Clarus Reference Wheel`
- Source baseline commit: `32767d209c3f45bdce557856c3850b17dec97757`
- RC1 patch: mandatory HLC validation, strict row-ID parsing and executable handoff tests
- Public URL: <https://atlas-clarus-reference-wheel.arbe-lambda-star.chatgpt.site/>

Generated dependencies, build output and Git metadata are excluded. See `colour-identity-wheel/SOURCE_PROVENANCE.md`.
