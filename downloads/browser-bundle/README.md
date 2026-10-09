# ATLAS Clarus Browser Bundle downloads

## Image Projects — RC31.1 public pilot

[Download the Browser Bundle with Image Projects](ATLAS_Clarus_Browser_Bundle_v0.2.0-rc31.1-image-projects.zip)
· [SHA-256](ATLAS_Clarus_Browser_Bundle_v0.2.0-rc31.1-image-projects.zip.sha256)

Extract the ZIP and open `atlas-clarus-browser-bundle/index.html` in a modern
browser. Choose **Colour Projects > Open Image Projects**. No account is needed.

Load a PNG/JPEG, click a colour or drag a rectangle, then recolour or make
transparent. Undo and redo retain earlier decisions. Download the complete
handover ZIP or image-project JSON before closing the tab. A colleague can open
either file, continue editing and return the extended project. The original image
and recorded history travel with the project; a PNG alone does not carry them.

Pilot limits: PNG/JPEG up to 8 MiB and 4,194,304 pixels; rectangular selection,
exact RGB matching, 100 recorded steps. No automatic saving. An attached palette
is a separate starting snapshot. Native Adobe exchange is not yet tested.

The download is byte-identical to the runtime in the RC31.1 WordPress package.
Size: **3,995,891 bytes**. SHA-256:
`fa538dd5b6f717f7c948a0cb11ecfff814678f114d2b9d3436148f8ed1861b3f`.

[Usage and data format](../../browser-bundle/IMAGE_PROJECTS.md)
· [Validation](../../browser-bundle/IMAGE_PROJECTS_VALIDATION.md)
· [WordPress / IONOS installer](../wordpress/README_RC31_1.md)

## Earlier Colour Projects — RC30 local candidate

**For WordPress installation:** use the separate
[Browser Edition plugin update](../wordpress/README_RC30_1.md).
The Browser Bundle below is an offline web application and cannot be uploaded
through the WordPress plugin installer.

Download `ATLAS_Clarus_Browser_Bundle_v0.2.0-rc30-colour-projects.zip`, extract the ZIP and open
`atlas-clarus-browser-bundle/index.html` in a modern desktop browser. Choose
**Colour Projects** in the navigation. No installation or account is required.

Create a project, add Colour Kit / Colour handoff palette JSON, record changes
and choose the colour revisions to use. Download full project JSON to reopen or
share the complete project. The handover ZIP includes the full project, readable
passport, current working swatches and explicitly chosen versions, each with
its provenance companions.

Source commit: `d7c57a19555f76d9a295655de60dd7b4be3213ed`.
Candidate ZIP SHA-256: `946e2e6cfefb8ed253e777c0c26987340d8c4e57b080273dea5ca2894428645f`.
Size: **3,969,035 bytes**.

This is a local review candidate, not a WordPress installation ZIP. Project
storage is local; keep downloaded backups. The full project JSON preserves
recorded source documents and decision history. Keep image files separately.

Tested: Chromium workflow, working/chosen Colour Kit 0.3.0 JSON round trips,
project export/reopen, package checksums, and responsive layout. Native Adobe
application round trips and live WordPress activation remain untested for RC30.
See [usage](../../browser-bundle/COLOUR_PROJECTS.md) and
[validation](../../browser-bundle/COLOUR_PROJECTS_VALIDATION.md).
