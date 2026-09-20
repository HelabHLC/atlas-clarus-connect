# ISCC-NBS 267-category coverage audit

**Status:** audit complete; Designer Layer remains `NOT_RELEASED`.

The 13,283 ATLAS Clarus references represent **262 of 267** revised ISCC-NBS categories. **5 categories are defined by the standard but are not sampled by the Atlas grid.**

This is not a requirement that every standard category must occur. ISCC-NBS categories are unequal three-dimensional Munsell blocks; they are not 267 equal sectors of an HLC wheel.

## Unrepresented standard categories

| No. | ISCC-NBS name | Official centroid | Nearest Atlas reference | Actual category | Block distance* |
|---:|---|---|---|---|---:|
| 67 | Brilliant Orange Yellow | `9.0YR 8.4/12.1` | `H075_L080_C065` (row 2660) | 68 Strong Orange Yellow | 0.1154 |
| 124 | Deep Olive Green | `5.0GY 2.4/7.1` | `H135_L025_C035` (row 5206) | 138 Very Dark Yellowish Green | 0.2662 |
| 157 | Greenish Black | `7.5G 0.9/0.7` | `H215_L010_C005` (row 8365) | 152 Blackish Green | 0.0372 |
| 231 | Purplish White | `9.0P 9.1/1.0` | `H010_L090_C005` (row 187) | 252 Pale Purplish Pink | 0.1433 |
| 246 | Brilliant Purplish Pink | `4.0RP 7.9/11` | `H335_L075_C045` (row 12245) | 247 Strong Purplish Pink | 0.0625 |

\* Normalized HVC distance is a review aid only. Category assignment uses the official Munsell block boundaries.

## Verification

- All 13,283 saved assignments were independently reproduced from their stored Munsell HVC values.
- Every unrepresented category centroid classified back to its own ISCC-NBS number.
- Category counts sum to 13,283.
- No missing name was forced onto an Atlas reference.
- PKL identity values and Designer Layer records were not modified.

See `ISCC_NBS_267_COVERAGE_AUDIT.json` for exact block boundaries and evidence, and `ISCC_NBS_267_CATEGORY_COUNTS.csv` for all 267 counts.
