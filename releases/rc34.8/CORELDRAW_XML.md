# CorelDRAW XML — RC34.8

## Windows: use a Clarus palette

1. Open index.html in your browser, select references and add them to a palette.
2. Open PALETTE → My Palettes and choose **CorelDRAW XML**.
3. In CorelDRAW, choose Window → Dockers → Palettes → Open a palette and select the downloaded .xml file.

German CorelDRAW: Fenster → Andockfenster → Paletten → „Öffnet eine Palette“.

The existing Atlas address is the swatch name. Channels are written as sRGB
values normalized to 0–1, preserving the exact original 8-bit values.
Every exported palette receives a fresh UUID; repeat downloads are separate
palette files. There is no automatic sync with CorelDRAW.

## Colour Reduction

Choose **CorelDRAW XML** in Palette format and click Download palette.
Complete reduction job ZIPs also contain palette.xml. Mixed palettes preserve
the exact protected original RGB and their existing “Original #RRGGBB” names;
these colours are not relabelled as Atlas references.

Keep Clarus JSON for reference identity/source evidence, or the complete
reduction job ZIP for mixed palettes, image state and protection settings.

## Verification

The export is checked with the browser XML parser before downloading. Palette
and swatch names, swatch order, the sRGB model and channel values are compared
with the selected palette. XML special characters and Unicode names are escaped.

Automated Chromium tests passed for all 13,283 master references, all 256 channel
values, special characters, invalid inputs, corrupted readback, the download
button, empty palettes, existing ASE export, reference-only and mixed reduction
palettes, and complete reduction job export/reimport. Master data is unchanged.

Native CorelDRAW for Windows import has NOT been tested in this environment.
A user-provided CorelDRAW Web screenshot confirms the sample H075_L060_C045
with RGB 180/136/67 (#B48843). This does not extend to native Windows acceptance.

Format source: https://community.coreldraw.com/sdk/w/articles/177/creating-color-palettes
Windows help: https://product.corel.com/help/CorelDRAW/Documentation-Windows/CorelDRAW-de/CorelDRAW-Organize-and-show-color-palettes.html
