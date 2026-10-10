# Image Projects — RC31 / RC31.1

The source branch includes a proposed [source/pixel consistency correction](IMAGE_SOURCE_BINDING.md)
after RC31.1. Published RC31.1 downloads are unchanged and do not include that fix.

Open **Colour Projects > Open Image Projects**. Load a PNG or JPEG, then click to
sample a colour or drag to select a rectangle. Exact coordinates are editable.
Choose exact sampled RGB within the rectangle, or all visible pixels there.
Recolour with a flat sRGB value (existing alpha is preserved), or make the selected
pixels transparent. Enter a reason before applying an edit. Matching is exact:
nearby RGB shades are not automatically included. There is no brush or soft mask.

Undo and redo append journal events; they do not delete edits. A new edit after
undo abandons redo availability but keeps the earlier branch in the full journal.
Transparent pixels keep their underlying RGB in the frozen source/replayed data.
The old Colour Projects palette editor and its JSON schema remain unchanged.

## Give the work to a colleague

Download **Complete handover ZIP**, then reopen that ZIP in Image Projects. It
contains the byte-identical original file, current `edited.png`, and self-contained
`image-project.clarus.json`. JSON alone also reopens the project, including its
original image and all changes. An ordinary PNG/JPEG file alone has no such history.
If chosen at creation, the current Colour Projects palette is attached as a
complete starting snapshot and exported separately for use in Colour Projects.
Image edits do not implicitly alter the linked palette or an external design file.

This image workspace lives **only in the open tab**. Download a ZIP/JSON before
closing. The UI warns on leaving or replacing a project without a download request.
There is no automatic browser/server storage or online collaboration. Import
verification finishes before replacing a workspace. Older/divergent versions of
the same project are rejected; automatic branch merging is not provided.

## What the JSON retains

Schema `atlas-clarus-image-project/1.0`: project UUID/name, fixed Atlas master,
original file bytes and hash, width/height, frozen browser-decoded sRGB RGBA8 pixels
and hash, optional complete Colour Projects snapshot, and a hash-linked journal.
Each entry records its time, note, operation, rectangle, exact RGB match/replacement,
full-master RGB-only references for those colours, affected pixel runs, changed
pixel count, before/after RGBA hashes, and the previous revision hash.

Pixel runs are zero-based row-major `[start,count,...]` pairs, from top left.
The original frozen pixel array plus the ordered operations retain previous values
and locations. Import replays every event and checks its mask, counts and hashes.
Undo/redo targets must match the derived undo/redo stacks. Hashes verify consistency,
not authorship or the truth of declared origin. The source file remains unchanged;
browser decoding to sRGB is a recorded conversion, not preservation of camera RAW,
ICC channels, vector objects, layers, animation or physical printing conditions.

The deterministic RGBA PNG writer retains exact working bytes, including RGB behind
alpha zero. It writes an sRGB-tagged PNG without premultiplied canvas re-encoding.
Packages contain a SHA-256 manifest. The ZIP importer accepts the bounded stored ZIP
format emitted by this editor, checks both ZIP directories and CRCs, and validates
every package file against a complete replay. Extract modified/recompressed ZIPs
and use their image-project JSON instead.

## Pilot limits

PNG/JPEG source files up to 8 MiB, 4,194,304 pixels, either edge at most 8192;
100 recorded events, 64 MiB compact project JSON, 96 MiB handover import.
Limits reject an operation/file without resizing, deleting history or replacing the
current project. One working image per image project. Large histories can take
time to verify because original pixels and all operations are checked.

Build: `python3 browser-bundle/build_bundle.py --image-projects --public-pilot`.
RC31.1 is the WordPress-pilot payload. Existing RC28/29/29.1/30/30.1 packages stay
independent. Live IONOS activation, native Adobe exchange and physical output
acceptance are not established by the file-level and browser tests.
