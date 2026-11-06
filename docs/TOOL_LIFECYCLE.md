# ATLAS Clarus tool family — development direction

Decision agreed with the project owner on 8 October 2026.

Concentrate new development on Browser Bundle, Colour Kit and the shared
colour-decision / provenance interchange. New user-facing modules use Bundle
typography, navigation, controls and source/reference presentation. Reuse shared
components and file contracts; verify interchange before claiming compatibility.
Start a separate tool only when an existing family member cannot reasonably
serve its task.

| Area | Direction |
| --- | --- |
| Bundle, Colour Kit, shared provenance | Active development priority. |
| Hover, Wheel, Colour ID | Preserve useful functionality; consolidate extensions into the family. Replace a standalone route only after its successor works. |
| Krita, GIMP, Inkscape adapters | Prepare documented final snapshots; further development needs a named maintainer. |
| Mixing Atlas, Appearance/MaterialX, research bridges | Preserve source and evidence; resume development for a concrete use case with someone responsible for development and validation. |
| Android and WordPress wrappers | Distribution routes of the common core, with their own version, compatibility and release gates. |

This direction is not an assertion that a maintainer has accepted ownership or
that installed applications have been retired. Component-specific retirement
notices must state the final version, exact test coverage, known limitations,
maintenance/support end date, licence and successor (if one exists). Source and
downloads remain available. A project without a maintainer is archived, not
described as community-maintained. Continuation is subject to each component's
software and data licences; no blanket relicensing is implied.

Hosting and installed WordPress software remain operational responsibilities
while running. Pausing feature development is distinct from deciding security
maintenance, support or decommissioning. Keep these commitments explicit. This
document is an engineering scope decision, not a liability waiver.

First implementation: the opt-in [Bundle colour handoff candidate](../browser-bundle/COLOUR_HANDOFF.md).
The Colour Kit redesign and component retirement notices are subsequent work.
This change does not archive repositories, change live installations, or assign
responsibility to freieFarbe e.V. or any other third party.
