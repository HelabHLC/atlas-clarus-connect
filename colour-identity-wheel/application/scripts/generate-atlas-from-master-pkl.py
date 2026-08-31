#!/usr/bin/env python3
"""Build the browser dataset directly from the active ATLAS master PKL.

The restricted unpickler accepts only the pandas/numpy constructors required
by this DataFrame. It rejects every other global before deserialisation.
"""
import hashlib
import ast
import json
import pickle
import sys
from pathlib import Path

ALLOWED_GLOBALS = {
    ("builtins", "slice"),
    ("numpy", "ndarray"),
    ("numpy", "dtype"),
    ("numpy._core.multiarray", "_reconstruct"),
    ("numpy.core.multiarray", "_reconstruct"),
    ("numpy._core.numeric", "_frombuffer"),
    ("numpy.core.numeric", "_frombuffer"),
    ("pandas._libs.internals", "_unpickle_block"),
    ("pandas.core.frame", "DataFrame"),
    ("pandas.core.indexes.base", "_new_Index"),
    ("pandas.core.indexes.base", "Index"),
    ("pandas.core.indexes.range", "RangeIndex"),
    ("pandas.core.internals.managers", "BlockManager"),
}


class RestrictedUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if (module, name) not in ALLOWED_GLOBALS:
            raise pickle.UnpicklingError(f"Blocked global: {module}.{name}")
        return super().find_class(module, name)


source = Path(sys.argv[1])
root = Path(__file__).resolve().parents[1]
out_dir = root / "public" / "atlas"
out_dir.mkdir(parents=True, exist_ok=True)

with source.open("rb") as handle:
    frame = RestrictedUnpickler(handle).load()

required = {
    "reference", "H", "L", "C", "lab_L", "lab_a", "lab_b", "hex", "rgb",
    "lambda_v2_nm", "sigma_star_nm", "skewness_gamma1", "source_cxf",
    "cxf_measure_date", "cxf_spectrum_exact_match_bin", "cxf_object_index",
}
missing = required.difference(frame.columns)
if missing:
    raise SystemExit(f"Master PKL is missing required columns: {sorted(missing)}")

conditions = [
    ("D50", "ALS_BASE_D50"), ("D65", "ALS_BASE_D65"), ("A", "ALS_BASE_A"),
    ("LED P1", "ALS_LED_P1"), ("LED P2", "ALS_LED_P2"), ("LED P3", "ALS_LED_P3"),
    ("STR 1", "ALS_STR_1"), ("STR 2", "ALS_STR_2"), ("STR 3", "ALS_STR_3"),
]
groups = {}
for zero_index, row in frame.iterrows():
    scenarios = []
    for label, suffix in conditions:
        de_column = f"de00_from_d50__{suffix}"
        scenarios.append({
            "condition": label,
            "lambda": round(float(row[f"illumext_lambda_v2_nm__{suffix}"]), 3),
            "shift": round(float(row[f"illumext_shift_from_core_nm__{suffix}"]), 3),
            "deltaE00": 0 if label == "D50" else round(float(row[de_column]), 3),
        })
    worst = max(scenarios, key=lambda item: item["deltaE00"])
    raw_rgb = ast.literal_eval(row["rgb"]) if isinstance(row["rgb"], str) else row["rgb"]
    rgb = [int(value) for value in raw_rgb]
    lightness = int(row["L"])
    record = {
        # Normative zero-based identity: the active master's DataFrame row.
        # cxf_object_index identifies a source object and is not atlas_row_id.
        "id": int(zero_index),
        "sample": str(row["reference"]),
        "h": int(row["H"]), "l": lightness, "c": int(row["C"]),
        "lab": [round(float(row["lab_L"]), 4), round(float(row["lab_a"]), 4), round(float(row["lab_b"]), 4)],
        "lambda": round(float(row["lambda_v2_nm"]), 4),
        "rgb": rgb,
        "hex": str(row["hex"]).lower(),
        "spectrum": [round(float(row[f"R_{nm}"]), 4) for nm in range(380, 731, 10)],
        "illumination": {
            "coreLambda": round(float(row["lambda_v2_nm"]), 4),
            "scenarios": scenarios,
            "worst": worst,
            "sigmaNm": round(float(row["sigma_star_nm"]), 3),
            "skewness": round(float(row["skewness_gamma1"]), 3),
            "qualityTier": int(row["refresh__firewall_calibrated_tier"]),
            "riskScore": round(float(row["refresh__strict_risk_score_working"]), 4),
            "failRate": round(float(row["refresh__fail_rate"]), 3),
            "spectrumExactMatch": bool(row["cxf_spectrum_exact_match_bin"]),
            "measureDate": str(row["cxf_measure_date"]),
            "sourceCxf": str(row["source_cxf"]),
        },
    }
    groups.setdefault(lightness, []).append(record)

for lightness, records in groups.items():
    records.sort(key=lambda item: (item["c"], item["h"], item["id"]))
    (out_dir / f"l{lightness:03d}.json").write_text(
        json.dumps(records, separators=(",", ":"), ensure_ascii=False), encoding="utf-8"
    )

manifest = {
    "version": "atlas_master__active_master__v2_illumext",
    "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "count": sum(map(len, groups.values())),
    "levels": [{"l": level, "count": len(groups[level])} for level in sorted(groups)],
    "wavelengths": list(range(380, 731, 10)),
    "colourSource": "PKL columns rgb and hex; no Lab-to-sRGB substitution",
}
(out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print(json.dumps(manifest, indent=2))
