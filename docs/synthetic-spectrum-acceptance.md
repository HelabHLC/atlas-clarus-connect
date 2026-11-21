# Synthetic spectrum acceptance — engineering specification

Status: SPECIFICATION ONLY; not an implemented or validated feature.

## Goal
Extend the existing ATLAS Clarus Browser Edition with provenance-aware synthetic spectra for additional HLC addresses, without changing the original 13,283-reference master, existing workflows, or measured spectral records.

## Candidate pipeline
1. Identify the candidate HLC address and its documented target Lab under **D50 / CIE 1931 2°**. Do not infer the target white point from the address alone.
2. Identify eligible measured neighbouring reference spectra. Preserve each neighbour's HLC ID, source record identifier, spectral wavelength grid, units, measurement geometry and hash. Do not describe a Lab-only midpoint as a spectral interpolation.
3. Produce a candidate spectrum with a versioned, deterministic reconstruction algorithm. Persist its input hashes, neighbour IDs, parameters, wavelengths, reflectance values and output hash. Reject missing provenance and non-finite or out-of-range reflectance values.
4. Integrate the synthetic reflectance curve with documented D50 illuminant, CIE 1931 2° colour-matching functions, sampling/integration convention and normalization to XYZ; transform XYZ to Lab using the same white point and compute CIEDE2000 against the target Lab.
5. Apply a **predeclared** ΔE00 tolerance. Until a numeric threshold and authoritative integration weights are approved and independently checked, status remains `PENDING_VALIDATION`, not `PASSED`.
6. Optionally calculate D65/2° and A/2° colourimetry from the *same* synthetic curve. These are predictions, not material measurements or evidence of metamerism accuracy.
7. Render the existing spectral graph with a clear `SYNTHETIC_RECONSTRUCTED` provenance label, the D50 roundtrip ΔE00 and validation status. Keep original measured spectra labeled `MEASURED`; do not silently fabricate or replace any curve.

## Release gates
- Candidate set identity, count and relation to the proposed new HLC addresses must be verified. Earlier Lab midpoint candidate files explicitly state **no spectral interpolation**.
- Establish a deterministic reproducibility test, numerical D50 roundtrip test, and held-out measured-spectrum comparison; report D65/A limitations and negative outcomes.
- Do not imply physical printability, substrate fidelity, or a unique spectrum from Lab.
- Do not merge or deploy to IONOS before separate approval.
