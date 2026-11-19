# ATLAS Clarus: ICC-independent reproduction — preregistered feasibility gate (draft v0.1)

Status: PROTOCOL ONLY. No evidence of advantage yet. Do not claim ICC replacement or production readiness.

## Hypothesis
An open, measured device-to-Lab model can reproduce held-out HLC target colours at acceptable CIEDE2000 error with materially fewer device measurements than a conventional device characterization.

## Baselines and fair comparison
- Reference: a validated ICC/LittleCMS workflow on the SAME printer, ink set, substrate, rendering intent and measurement conditions.
- Candidate: a deliberately simple transparent interpolation/regression from device control values to measured Lab D50/2°. An inverse search may propose device values, but only printed/measured output counts as success.
- Use a measurement-budget curve (e.g. 24, 48, 96, 192 patches) and a matched-budget comparison. These counts are exploratory, not validated minimums.
- Report calibration time, number of patches, median/95th percentile/max ΔE00, tolerance pass rate, and out-of-gamut exclusions separately.
- Customer tolerance must be specified before analysis; default research thresholds, if any, are NOT customer acceptance.

## Data and split
1. Obtain legitimately usable device-value/reflectance or device-value/Lab measurements for at least one explicitly named device, ink set, substrate, measurement geometry and illuminant.
2. Hold out an independently selected test set BEFORE fitting or tuning. No test-set leakage, no cherry-picking.
3. Repeat at least once with a different substrate or production condition to test transfer. Never imply universal material independence.
4. Retain source HLC/P3/ProPhoto coordinates; do not use clipped sRGB previews as model input.
5. For seven-channel ECG, use a separately defined experiment; do not generalize CMYK findings.

## Stop/go decision
- STOP if the independent held-out measurements do not demonstrate a practically meaningful measurement/time reduction at comparable ΔE00 tolerance-pass performance against a fair ICC baseline.
- STOP if quality or robustness deteriorates beyond the pre-agreed customer tolerance, or measurement data cannot be obtained.
- CONTINUE only if the advantage replicates across an independent repeat or substrate and remains after accounting for all setup measurements.
- Report negative results, failure modes, uncertainty and excluded colours.
- ICC-free *file format* alone is not sufficient evidence of added value; the relevant question is reduced characterization burden without sacrificing reproduction quality.

## Immediate gate
Before implementing a new inverse model, inventory available REAL device measurements and an ICC baseline for the same printer/material. If absent, do not substitute synthetic samples for the decisive feasibility result.
