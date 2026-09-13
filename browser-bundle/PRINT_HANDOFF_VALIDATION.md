# Parallel print preparation — validation record

Date: 2026-09-13. Candidate: `0.2.0-rc21-parallel-print-handoff`.
Base: RC20 `96ec86e41fdfb6941ccffaa7e8cb7e98fc2d84f6`.

| Check | Result |
|---|---|
| Same frozen inputs for mandatory 4C and ECG branches | PASS |
| Branch isolation in both directions, including profile replacement | PASS |
| Exact master identity / typed IDs / order / duplicate rejection | PASS |
| Embedded ICC byte/hash/metadata round-trip | PASS |
| Malformed profile / wrong channel space rejection | PASS |
| Serial-path input, fabricated device values and QC/approval rejection | PASS |
| Async export snapshot and atomic failed import | PASS |
| Shipped UI selection, palette, profile attachment, download and restoration | PASS in DOM execution; canvas stubbed |
| Readable report escaping and export | PASS |
| Numerical image sampling | PASS |
| Existing palette export/readback and storage failure tests | PASS |
| Basis-23 before/after display regression, 13,283 references | PASS |
| Identity-handoff vectors | PASS |
| Existing responsive layout safeguards | PASS (static assertions) |
| Two independent builds produce the same ZIP | PASS |
| Visual desktop/mobile inspection of this new view | OPEN — cloud browser policy blocks local file navigation |
| Real 4C and ECG profile-bound device calculation | NOT IMPLEMENTED |
| PDF/X / Scribus handoff | OPEN |
| Physical measured QC | NOT_MEASURED, separately for both paths |

The DOM test executes the shipped application modules and data, including actual
UI event handlers. It does not validate browser paint, responsive geometry, native
file choosers or real-device download behaviour. No visual acceptance is claimed.
Existing PHP and complete built-Wheel gates run in the unchanged CI jobs; they
were not rerun locally as complete build pipelines for this change.

No real press profile was used to claim output generation. Synthetic ICC
containers exercise parsing and transfer only. The example for row 10519 leaves
both profile inputs and all device/measurement results open.

Final local ZIP:

`ATLAS_Clarus_Browser_Bundle_v0.2.0-rc21-parallel-print-handoff.zip`

SHA-256:

`d6bc4230d54e1160e6e1bb80179e4f106937f1f55a47eb1edc383e054914be95`

Size: 2,102,053 bytes. CI builds this candidate as an artifact. The checked-in
RC20 distribution is preserved. This work does not merge PR #28, publish a
release, or install/activate anything on WordPress.
