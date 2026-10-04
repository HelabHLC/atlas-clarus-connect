# ATLAS Clarus Mixing Atlas 0.1.4 — light-dependent mixing

Adds an experimental recipe search driven by selected illuminants. The fixed reference and original recipe database are preserved byte-for-byte. Available: 38 Explorer illuminants, with D50/D65/FL11/LED-B3 selected initially; D50-only or minimax CIEDE2000 matching; a 31-sample Golden Heavy Body subset or a validated user-imported palette; cancellation; 38-light numerical comparisons; persistent recipe JSON downloads.

Search uses deterministic seed 42, a bounded candidate pool, integer refinement, up to four components and 100 model parts. It uses Kubelka–Munk S=1 and does not prove a global optimum. Model percentages are not calibrated physical grams or drops. Same-series product names do not establish calibrated material compatibility. Existing 12-light diagnostics remain separately available.

Explorer source metadata, including approximated-table notices, is retained. Reflectance is linearly interpolated from 10 nm to 1 nm over 380–730 nm with the supplied CIE 1931 2° observer. No extrapolation. D50/D65 were independently cross-checked against Explorer reference Lab values (maximum numerical error below 3e-13). Display swatches remain D65/sRGB; changing selected lights changes search conditions and numerical diagnostics, not a simulated photograph.

Validation: original 13,283 reference/recipe payload unchanged; all executable scripts parse; full document startup and controls tested with a lightweight DOM and real Node workers; selected-light and D50 searches, 38 comparison rows, cancellation, reference changes, imported palette, persistent JSON export and master immutability passed. A graphical-browser check remains required for complete visual acceptance.

No production approval or measured mixture accuracy is claimed. All previous source-specific licences and attribution remain in force. The added source uses GPL-2.0-or-later; bundled material data retains its original source-specific conditions.
