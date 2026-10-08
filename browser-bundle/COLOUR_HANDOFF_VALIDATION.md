# Colour handoff candidate — validation, 8 October 2026

Base: GitHub main `60bf765e771c3e6493c88a02a046237c9ba69db9`.
Candidate: `0.2.0-rc29-colour-handoff` (explicit build flag).

| Check | Result and boundary |
| --- | --- |
| Embedded 13,283 RGB reference rows | Exact Colour Kit reference CSV hash verified; integer squared RGB assignment and lowest-row tie break. |
| Colour Kit 0.3.0 shared core | Byte-identical MIT module; pinned SHA in manifest and protocol test. |
| Two original greens / one address | `#3D7B19` and `#3C7B19` both map to row 4966 and keep distinct decision UUIDs. |
| Save, repeated source selection, reload | Same IDs, snapshots and revisions retained. |
| ASE export and simulated return | Original/current design RGB exported. Changed, reordered, grouped RGB and renamed friendly suffix accepted with identity prefixes intact. Repeated handoff retains history. |
| Invalid cases | 21 rejected protocol cases including damaged history, method/master/origin mismatch, invalid companions, missing/duplicate/stale revision names, non-RGB/nonfinite channels, truncation/trailing bytes and excessive range. |
| Large source palette | Explicit range of 10 from 260 source records; all 260 retained in attached original document. |
| Legacy reference-only palette | No original invented. Reference adoption requires explicit basis selection. |
| Real Chromium, local file entrypoint | Actual create/save/ZIP-download/return/import controls, drag/drop, reload and visible local-storage quota failure pass; no external HTTP requests or page errors. |
| Cross-tool browser test | Actual delivered Colour Kit 0.3.0 HTML imports the Bundle's returned JSON, exports it, and Bundle imports it again. Records and decision history compare equal. |
| Independent Python check | Colour Kit CLI verifies the generated returned JSON against the full reference set. |
| Responsive review | Desktop 1440px, emulated portrait 390×844 and landscape 844×390; no horizontal overflow. Desktop and portrait screenshots visually reviewed. These are not physical-device tests. |
| Existing regression checks | Palette exports, source provenance UI, source assignment rejection vectors, local persistence/quota/capacity all pass. |
| Existing RC28 default build | Reproduced twice byte-identically: `79a7b9a3df20d0ba6e2620b1d16d39316cce5d2c8534b622d7260fe896da12d8`. Android and WordPress pins retained. |
| RC29 candidate package | Reproducible build, ZIP CRC, all packaged hashes, inline modules/load order, MIT notice and candidate manifest checked. |

Delivered candidate ZIP SHA-256:
`70ef9c51a63ac9b6aa83a37250abda2ec03c6fbb512a2c9300cfba39a96c1729`.

## Open acceptance

- Native Illustrator / Photoshop / InDesign import–edit–export: **NOT_TESTED**.
- Physical mobile devices, live WordPress plugin activation and Android candidate
  packaging: **NOT_TESTED** for RC29. The default RC28 wrapper payload is unchanged.
- No physical measurement, print approval, authorship signature or authenticity
  verification is claimed. Provenance travels in JSON companions, not embedded
  automatically in Adobe documents.

The WordPress page `5344` was read through WPWriter. It embeds
`[atlas_clarus_browser_edition]` and links to application downloads. This read
does not identify the active plugin payload byte-for-byte. No page content or
plugin was changed. Candidate deployment requires the plugin/package release
path, not merely a change to that page's text.

The committed browser test can additionally run against a supplied Colour Kit
HTML with `COLOUR_KIT_HTML`; CI reports this optional gate as `NOT_RUN` if that
separate artifact is absent. Synthetic fixture coverage always runs. The dedicated
workflow uploads generated screenshots, browser results and candidate ZIP.
