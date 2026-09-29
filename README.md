# ATLAS Clarus Colour ID Languages

Page-scoped DE/EN presentation layer for WordPress page 5227 and its existing same-origin `atlas_clarus_picker` iframe.

The switch appears above the Colour ID introduction. English is the default; `?lang=de` opens German. The 14 application tabs, RGB-only identity binding, master data, measurements, QC state, and exports are not rewritten. English translations cover static controls, observed dynamic status text, titles, aria labels, placeholders and common dialogs. The German view restores original application strings. The current reference selection persists when switching languages without reloading.

The English expanded view keeps the translated iframe in the page. The German full-screen link continues to open the original standalone app. The plugin only enqueues a script on page 5227; it does not alter the original Colour Picker plugin or the active theme.

## Installation

Install the ZIP containing this PHP file and `colour-id-i18n.js` at its archive root, then activate the plugin. Keep `[atlas_clarus_picker]` on page 5227. The source is pinned to the observed v5.3.3 UI; review the string map if the Colour Picker plugin changes.

## Validation performed in private preview

- All 14 tabs opened in English and the source UI returned in German.
- An observed few remaining strings were added to the map.
- `#F4E46A` resolved to `H095_L090_C060`, `atlas_row_id` 3421; the same selection persisted across the language switch.
- The English expanded view retained the iframe and its language.

The translation runs in the browser. WordPress still emits its site-level `lang="de"` in initial HTML and the script corrects it after loading. For search indexing and no-JavaScript language pages, separate server-rendered translations would be a later project. Technical evidence codes and export payloads remain in their canonical language.
