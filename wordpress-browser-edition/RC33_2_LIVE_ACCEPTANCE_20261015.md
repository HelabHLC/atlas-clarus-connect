# RC33.2 public Colour Reduction: scoped live acceptance, 15 October 2026

## Scope and result

PASS for the desktop cloud Chrome journeys below on https://arbe-lambda-star.com/atlas-clarus-browser-bundle/#colour-reduction .
The live footer identified v0.2.0-rc33.2-colour-reduction-update. This is actual interaction with the public WordPress-served application, followed by independent Python/Pillow verification of downloaded bytes. It is not a physical-device test or a claim that every regression case passed live.

Comparison source: PR #80, exact source commit 0e149e257070b94792350b84d5468beb5a1e5471, browser-bundle/tests/validate_colour_reduction_browser.cjs.
The current PR body reports all 13 workflows passing. This session inspected the browser test source and PR report; it did not rerun all CI workflows or independently rehash every live runtime asset. Prior deployment byte-match evidence remains distinct from this live journey.

## Fixtures and live operations

1. Recreated the CI 360 × 280 motif with three large areas, a small RGB 61/123/25 accent, transparent pixels, and alpha-128 columns. PNG compression differs from CI's encoder; image construction follows the same pixel recipe. Browser-decoded pixels are authoritative for partial alpha.
2. Loaded via the actual file chooser; set maximum colours to 24.
3. Clicked the input image at its centre: original pixel X180/Y140 showed #335C7A and RGB 51/92/122 separately from Atlas H260_L035_C025, #33557A, row 9706.
4. Used the 11 × 11 original-pixel inspector's Shift+arrow navigation to X290/Y210. It showed original #3D7B19, RGB 61/123/25, alpha255 separately from H130_L045_C055, #37791A, row4966.
5. Protected the selected pixel's Atlas reference. Ran the reduction and downloaded standalone PNG and source+reduction ZIP.
6. Changed the limit to 2. The previous output controls disappeared from the accessibility tree and the UI requested a fresh preview. An attempted query of the removed controls timed out in the automation tooling; browser state was recovered without reload, then the two-colour journey and ZIP download completed. This tooling timeout is not evidence of an application failure.
7. Loaded a second 360 × 280 opaque fixture containing 64 colour blocks plus the same 24 × 29 pixel accent (696 pixels). Each block i=(x//45)+(y//35)*8 uses RGB ((67*i+23)%256,(109*i+41)%256,(149*i+71)%256); override 280<x<305 and 195<y<225 with (61,123,25).
8. Set 24, protected #3D7B19 again, ran reduction and downloaded standalone PNG and ZIP. UI reported 65 input RGB colours → 24 output RGB colours, 24 selected references; the protected reference had exactly 696 pixels.

## Independent verification of downloaded files

For all three ZIPs:
- ZIP CRC test passed; every manifest file SHA-256 matched.
- Embedded original.png equals the uploaded original byte-for-byte.
- Frozen input-rgba.bin SHA-256 matches source.input_rgba_sha256.
- Reconstructed every output pixel from frozen input, output-palette-index.u16le and report.palette. Reconstructed output hash matches output_rgba_sha256.
- Pillow-decoded reduced.png equals that reconstruction byte-for-byte.
- Output alpha is retained from input; fully transparent RGB is retained, with both index arrays using 65535 for transparent pixels.
- Every input pixel assigned row4966 still outputs row4966: 696/696 preserved in each case.
- X290/Y210 retains original (61,123,25) in frozen input and outputs reference (55,121,26); these are correctly distinct.
- For both 24-limit journeys, the separately downloaded PNG equals reduced.png inside the ZIP byte-for-byte.
- Master identifier remains 8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4 in the report. No master data or runtime code was modified.

| Journey | Visible input RGB | Output RGB | Protected source pixels retained | ZIP SHA-256 |
| --- | ---: | ---: | ---: | --- |
| CI-style motif, maximum24 | 8 | 5 | 696/696 | 71e4a801328024b5baeb9860fe6955cf3aaf8e8404301a885cb2c752ef596c35 |
| Same motif, maximum2 | 8 | 2 | 696/696 | e063954fd9a5f9ff2696cb51b7ced3a70efba459075271a27e0608654d8098db |
| 65-colour motif, maximum24 | 65 | 24 | 696/696 | 23a927b82c85ff7182908542166b3d881ea92851f7b9afe2613e9d4c7333c7da |

Maximum24 is a ceiling, so five outputs from a source with five assigned references is expected. The second fixture establishes actual reduction from more than24 source colours to24 outputs.

Protection preserves the assigned Atlas reference, not original RGB. The two-colour stress case also maps other source references to the protected output reference; it does not preserve the accent as the only region using that output colour. This follows the documented palette protection semantics.

## Comparison with CI and limits

Live results agree with CI's protected accent, original/reference separation, alpha policy, per-pixel export reconstruction and retained source. The new live 65→24 case complements CI's 2-colour and 256-index cases.

Not repeated live: mobile/touch/Apple/physical Android, full256 export, all palette formats, cancellation, malformed imports, project/history bridge, transparent edge navigation and browser-engine comparisons. CI tests these additional software paths where specified; they are not converted into live passes here. No independent nearest-reference search across all master rows was rerun in this session.

No functional error was established in the tested journeys; no corrective runtime patch is warranted from this evidence. A full-page screenshot captures the24 result and protected swatch; it also includes off-canvas UI because it is a full-document capture, and is not a responsive-layout acceptance test.

PR #81 Paint-by-Numbers is excluded. This documentation changes neither frozen data nor live deployment. Status is SCOPED_DESKTOP_LIVE_PASS, not universal acceptance.
