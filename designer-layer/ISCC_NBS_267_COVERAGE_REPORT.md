# ISCC-NBS 267-category coverage audit

**Status:** audit complete; Designer Layer remains `NOT_RELEASED`.

The 13,283 ATLAS Clarus references represent **262 of 267** revised ISCC-NBS categories. **5 categories are defined by the standard but are not sampled by the Atlas grid.**

This is not a requirement that every standard category must occur. ISCC-NBS categories are unequal three-dimensional Munsell blocks; they are not 267 equal sectors of an HLC wheel.

## Unrepresented standard categories

| No. | ISCC-NBS name | Official centroid | Nearest Atlas reference / actual category | Delta E 76* |
|---:|---|---|---|---:|
| 67 | Brilliant Orange Yellow | `9.0YR 8.4/12.1` | `H075_L080_C080` / 68 Strong Orange Yellow | 5.804 |
| 124 | Deep Olive Green | `5.0GY 2.4/7.1` | `H125_L030_C040` / 125 Moderate Olive Green | 10.670 |
| 157 | Greenish Black | `7.5G 0.9/0.7` | `H170_L010_C005` / 152 Blackish Green | 2.359 |
| 231 | Purplish White | `9.0P 9.1/1.0` | `H000_L090_C000` / 263 White | 2.523 |
| 246 | Brilliant Purplish Pink | `4.0RP 7.9/11` | `H355_L075_C045` / 247 Strong Purplish Pink | 5.265 |

\* Delta E 76 is a review aid only. Category assignment uses the official Munsell block boundaries.

## Verification

- All 13,283 saved assignments were independently reproduced from their stored Munsell HVC values.
- All 267 official category centroids classified back to their own ISCC-NBS number.
- Category counts sum to 13,283.
- No missing name was forced onto an Atlas reference.
- PKL identity values and the existing Designer Layer records were not modified.

See `ISCC_NBS_267_COVERAGE_AUDIT.json` for exact block boundaries and nearest-reference evidence, and `ISCC_NBS_267_CATEGORY_COUNTS.csv` for all category counts.
