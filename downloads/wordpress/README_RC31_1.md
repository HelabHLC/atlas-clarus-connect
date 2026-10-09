# WordPress Image Projects update — RC31.1 / beta11

[Download the installable WordPress ZIP](ATLAS_Clarus_Browser_Edition_v0.1.15-beta11_RC31.1.zip)
· [SHA-256](ATLAS_Clarus_Browser_Edition_v0.1.15-beta11_RC31.1.zip.sha256)

Use **ATLAS_Clarus_Browser_Edition_v0.1.15-beta11_RC31.1.zip** from
`downloads/wordpress/`. This is the installable WordPress plugin, with the existing
folder `atlas-clarus-browser-edition`. It replaces Browser Edition beta10 or earlier.

1. WordPress: **Plugins > Add New > Upload Plugin**. Upload this ZIP without
   extracting it and confirm replacing **ATLAS Clarus Browser Edition**.
2. Open **Tools > ATLAS Clarus Browser Edition** and select
   **Mitgeliefertes RC31.1 prüfen und aktiv schalten**.
3. Confirm **Neues Bundle aktiv: JA**. Open the Browser Edition, then
   **Colour Projects > Open Image Projects**.

The plugin update alone retains the currently served runtime. The explicit switch
preserves the previous runtime for **Zur vorherigen Laufzeit zurückwechseln**.
Existing public URLs, shortcode and palette storage keys are retained.

## First handover

Load a PNG/JPEG, click a colour or drag a rectangle. Recolour or make transparent,
with a note. Undo/redo adds history entries and preserves earlier decisions.
Download **Complete handover ZIP** before closing the tab. Your colleague can open
that ZIP or its `image-project.clarus.json` in Image Projects, continue editing,
and return the newer project. The JSON embeds the original file and frozen sRGB
pixels; an ordinary image file alone does not carry this history.

The workspace has no autosave. PNG/JPEG up to 8 MiB / 4,194,304 pixels; 100 events.
An attached Colour Projects palette is a starting snapshot, separate from image
edits. Exact colour matching does not automatically include nearby shades.

## Package verification

- WordPress ZIP: 3,909,029 bytes; SHA-256
  `8ec7cdcd296cd179ff24a84a344bc3d6c2e989273c0d31977d6ac5518079e3bd`.
- Embedded RC31.1: 3,995,891 bytes; SHA-256
  `fa538dd5b6f717f7c948a0cb11ecfff814678f114d2b9d3436148f8ed1861b3f`.
- Builder starts from the exact shipped beta10 ZIP and retains its guarded
  installation, runtime switching and rollback implementation.
- See [validation](../../browser-bundle/IMAGE_PROJECTS_VALIDATION.md). CI checks PHP
  7.4/8.5 and the browser workflow from this package.

Live installation on IONOS is not performed by packaging or CI. Live activation,
native Adobe exchange and physical-output acceptance remain **NOT_TESTED**.

Build: `python3 wordpress-browser-edition/build_images_plugin.py`.
