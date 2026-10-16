# RC33.7.1 hover inspection preview

Build with `python browser-bundle/build_inspect_preview.py`. Unzip and open atlas-clarus-browser-bundle/index.html. Separate offline candidate; interactive browser acceptance is pending.

After reduction, hover or tap any of the three comparison panels. The same source pixel is marked in all three. Arrow keys move selection by one source pixel; dragging pans all views. Three 11×11 magnifiers show original frozen input, reduced image before cleanup, and current output (or the selected saved variant). The inspector separates original RGB/alpha, full-master reference assignment, nearest library reference, reduced output and cleaned output. It identifies protected, unchanged, changed or protection-violation states. Full transparency has no reference assignment.

The optional overlay appears only on the third comparison panel: green means protected according to the cleanup scope; magenta means changed by cleanup; red means a protected pixel changed (a violation). Counts are computed from complete RGBA differences against the pre-cleanup reduction. Protected palette entries are evaluated from that baseline, not the potentially changed output. Explicit masks, cleanup scope and exact-original entries are respected. Counts describe the recorded pixel protection, not every additional component conservatively skipped by cleanup. They do not assert that original image RGB was preserved through library conversion.

Snapshots retain their own baseline, output and protection metadata. Selecting a saved variant switches all three panels and inspection to that variant; exports still use current output. Up to three snapshots are retained in memory until cleared, source replacement or reload.

Markers, overlay, magnifiers and zoom are display aids. They never change exported pixels. Tests use simulated canvas for controller coordinates, snapshots, violation detection and overlay non-mutation; core scope tests pass. Physical touch, visual rendering and browser download acceptance remain pending.
