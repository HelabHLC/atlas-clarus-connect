# ATLAS Clarus Colour Projects 0.1 — RC30 local candidate

Your colours. Your decisions. A project you can take with you and keep developing.

Create a named project in the existing Browser Bundle. Bring complete colour sets
from Colour handoff or Colour Kit 0.3 JSON, record notes, edit working RGB colours,
and explicitly choose the design revision to use. A later edit never silently
changes a chosen revision. Project versions append; earlier source snapshots stay.

## Use

1. Open `index.html`, choose Colour Projects and create a named project.
2. Give a colour set a name. Import a Colour Kit/handoff JSON or prepare a palette
   in Colour handoff and choose **Add colours from Colour handoff**.
3. Edit a working colour with a change note; choose a design version with a
   selection note. Add general project notes or rename the project as needed.
4. Download **project JSON** for full reopening and file exchange. The **handover
   ZIP** adds a readable HTML passport, `working/` swatches and, only where chosen,
   `chosen/` swatches. Chosen colours may differ from the current working colours.
5. Extract ZIPs first. Open `project.clarus.json` in Colour Projects. Palette JSON
   inside each colour set remains readable in Colour Kit 0.3 and Colour handoff.

The passport is a summary. The project JSON retains the complete source palette
and all recorded history. Images themselves are not embedded: keep original image
files separately. No source is invented when the supplied data did not record it.

## Data contract and limits

`atlas-clarus-colour-project/1.0` contains a UUID, the fixed reference master,
SHA-256-addressed complete palette snapshots, an append-only project-version chain
and a document checksum. Each project version records the name, note, colour-set
pointers and explicit chosen decision/revision IDs. Shared Colour Kit decision
IDs and origin records remain unchanged. Local RGB edits use the unchanged shared
`KIT_EDIT` history event; the project journal identifies them as `COLOUR_EDIT`.
All assignment uses integer squared sRGB distance across the full 13,283-row master,
with atlas_row_id tie-breaking. No delta E enters primary assignment.

Ten colour sets per project, 250 colours per set, 200 project versions, 100 distinct
palette snapshots, and a 16 MiB complete formatted project JSON limit. Reaching a
limit fails without truncating history. Up to ten projects can be kept locally;
browser storage may fill sooner. Export the full project before closing if a
storage warning appears. Browser storage is not a durable backup.

Imports verify the entire project before changing the workspace. A newer project
file may replace its local ancestor; identical imports are idempotent. Older or
divergent files are rejected without overwriting either version. There is no
online sync, concurrent editing, automatic branch merging or authenticated user
identity. Update an existing set only with the same decision IDs, complete earlier
history and descendant current revisions; add unrelated palettes as a new set.

A chosen version is a recorded design decision, not measured production approval.
Hashes establish consistency, not authorship or the truth of declared provenance.
Native Adobe round trips, physical-device acceptance and live WordPress deployment
are NOT_TESTED for RC30. The tested RC29.1 public runtime is a separate release.

## Build

`python3 browser-bundle/build_bundle.py --colour-projects --output-dir browser-bundle/build-projects`

Default RC28, opt-in RC29 and public RC29.1 build identities remain separate.
