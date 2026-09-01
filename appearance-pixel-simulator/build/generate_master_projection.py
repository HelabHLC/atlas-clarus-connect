#!/usr/bin/env python3
"""Build the browser projection from the verified ATLAS active master."""

from __future__ import annotations

import argparse
import ast
import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd


EXPECTED_MASTER_SHA256 = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"
EXPECTED_ROWS = 13283
EXPECTED_COLUMNS = 114
DEFAULT_ROW_ID = 4665

INDEX_FIELDS = [
    "source_atlas_row_id", "reference", "hex", "rgb_r", "rgb_g", "rgb_b",
    "atlas_identity_valid", "cxf_present", "cxf_object_index", "cxf_measure_date",
    "cxf_spectrum_exact_match_bin", "srgb_out_of_gamut_before_clip",
    "hex_provenance", "rgb_provenance", "id_H_matches_H", "id_L_matches_L",
    "id_C_matches_C", "reference_pattern_valid"
]

NUMERIC_FIELDS = [
    "H", "L", "C", "lab_L", "lab_a", "lab_b",
    "refresh__practical_mean", "refresh__practical_max", "refresh__practical_worst",
    "refresh__practical_band", "refresh__stress_mean", "refresh__stress_max",
    "refresh__stress_worst", "refresh__stress_band", "refresh__overall_preliminary",
    "refresh__max_abs_delta_window_nm", "refresh__fail_rate",
    "refresh__strict_risk_score_working", "refresh__firewall_worst_scenario",
    "refresh__firewall_worst_window_start_nm", "refresh__firewall_calibrated_tier",
    "refresh__overall_calibrated_1_0b", "refresh__calibration_reason",
    "lambda_v2_nm", "lambda_ee_nm", "delta_lambda_nm", "mu2_nm2",
    "sigma_star_nm", "mu3_nm3", "skewness_gamma1",
    "id_H_parsed", "id_L_parsed", "id_C_parsed"
]

ILLUMINANT_FIELDS = [
    "illumext_lambda_v2_nm__ALS_BASE_D50", "illumext_shift_from_core_nm__ALS_BASE_D50",
    "illumext_lambda_v2_nm__ALS_BASE_D65", "illumext_shift_from_core_nm__ALS_BASE_D65",
    "illumext_lambda_v2_nm__ALS_BASE_A", "illumext_shift_from_core_nm__ALS_BASE_A",
    "illumext_lambda_v2_nm__ALS_LED_P1", "illumext_shift_from_core_nm__ALS_LED_P1",
    "illumext_lambda_v2_nm__ALS_LED_P2", "illumext_shift_from_core_nm__ALS_LED_P2",
    "illumext_lambda_v2_nm__ALS_LED_P3", "illumext_shift_from_core_nm__ALS_LED_P3",
    "illumext_lambda_v2_nm__ALS_STR_1", "illumext_shift_from_core_nm__ALS_STR_1",
    "illumext_lambda_v2_nm__ALS_STR_2", "illumext_shift_from_core_nm__ALS_STR_2",
    "illumext_lambda_v2_nm__ALS_STR_3", "illumext_shift_from_core_nm__ALS_STR_3",
    "de00_from_d50__ALS_BASE_D65", "de00_from_d50__ALS_BASE_A",
    "de00_from_d50__ALS_LED_P1", "de00_from_d50__ALS_LED_P2",
    "de00_from_d50__ALS_LED_P3", "de00_from_d50__ALS_STR_1",
    "de00_from_d50__ALS_STR_2", "de00_from_d50__ALS_STR_3"
]

SPECTRAL_FIELDS = [f"R_{wavelength}" for wavelength in range(380, 731, 10)]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_compact_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def file_record(path: Path, relative_path: str) -> dict:
    return {
        "path": relative_path,
        "byte_size": path.stat().st_size,
        "sha256": sha256(path),
    }


def clean_scalar(value):
    if pd.isna(value):
        return None
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, (np.integer, int)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return float(value)
    return str(value)


def parse_rgb(value) -> list[int]:
    parsed = ast.literal_eval(value) if isinstance(value, str) else value
    rgb = [int(channel) for channel in parsed]
    if len(rgb) != 3 or any(channel < 0 or channel > 255 for channel in rgb):
        raise ValueError(f"invalid RGB value: {value!r}")
    return rgb


def build(master_path: Path, output: Path) -> None:
    actual_hash = sha256(master_path)
    if actual_hash != EXPECTED_MASTER_SHA256:
        raise SystemExit(f"MASTER_HASH_MISMATCH expected={EXPECTED_MASTER_SHA256} actual={actual_hash}")

    frame = pd.read_pickle(master_path)
    if frame.shape != (EXPECTED_ROWS, EXPECTED_COLUMNS):
        raise SystemExit(f"MASTER_SHAPE_MISMATCH expected={(EXPECTED_ROWS, EXPECTED_COLUMNS)} actual={frame.shape}")
    required = set(NUMERIC_FIELDS + ILLUMINANT_FIELDS + SPECTRAL_FIELDS + [
        "reference", "hex", "rgb", "atlas_identity_valid", "cxf_present",
        "cxf_object_index", "cxf_measure_date", "cxf_spectrum_exact_match_bin",
        "srgb_out_of_gamut_before_clip", "hex_provenance", "rgb_provenance",
        "id_H_matches_H", "id_L_matches_L", "id_C_matches_C", "reference_pattern_valid"
    ])
    missing = sorted(required - set(frame.columns))
    if missing:
        raise SystemExit(f"MASTER_COLUMNS_MISSING {missing}")

    default = frame.iloc[DEFAULT_ROW_ID]
    if default["reference"] != "H125_L075_C080" or parse_rgb(default["rgb"]) != [118, 205, 39]:
        raise SystemExit("DEFAULT_IDENTITY_BINDING_MISMATCH")

    output.mkdir(parents=True, exist_ok=True)
    index_rows = []
    for row_id, row in frame.iterrows():
        rgb = parse_rgb(row["rgb"])
        index_rows.append([
            int(row_id), str(row["reference"]), str(row["hex"]), rgb[0], rgb[1], rgb[2],
            bool(row["atlas_identity_valid"]), bool(row["cxf_present"]), int(row["cxf_object_index"]),
            clean_scalar(row["cxf_measure_date"]), bool(row["cxf_spectrum_exact_match_bin"]),
            bool(row["srgb_out_of_gamut_before_clip"]), int(row["hex_provenance"]),
            int(row["rgb_provenance"]), bool(row["id_H_matches_H"]), bool(row["id_L_matches_L"]),
            bool(row["id_C_matches_C"]), bool(row["reference_pattern_valid"])
        ])

    index_payload = {
        "projection_version": "0.1.1",
        "source_master_sha256": actual_hash,
        "row_count": EXPECTED_ROWS,
        "row_id_base": 0,
        "row_id_range": [0, EXPECTED_ROWS - 1],
        "non_identity_sentinel_uint16": 65535,
        "fields": INDEX_FIELDS,
        "constants": {
            "source_atlas": clean_scalar(frame.iloc[0]["source_atlas"]),
            "source_cxf": clean_scalar(frame.iloc[0]["source_cxf"]),
            "spectrum_grid_nm": clean_scalar(frame.iloc[0]["spectrum_grid_nm"]),
            "lambda_v2_method": clean_scalar(frame.iloc[0]["lambda_v2_method"])
        },
        "rows": index_rows,
    }
    index_path = output / "master-index.json"
    write_compact_json(index_path, index_payload)

    numeric = frame[NUMERIC_FIELDS].to_numpy(dtype="<f8", copy=True)
    illuminant = frame[ILLUMINANT_FIELDS].to_numpy(dtype="<f8", copy=True)
    spectral = frame[SPECTRAL_FIELDS].to_numpy(dtype="<f4", copy=True)
    numeric_path = output / "master-numeric.f64"
    illuminant_path = output / "master-illuminant.f64"
    spectral_path = output / "master-spectral.f32"
    numeric.tofile(numeric_path)
    illuminant.tofile(illuminant_path)
    spectral.tofile(spectral_path)

    manifest = {
        "format": "ATLAS_CLARUS_MASTER_BROWSER_PROJECTION",
        "projection_version": "0.1.1",
        "source_master_name": master_path.name,
        "source_master_sha256": actual_hash,
        "source_master_rows": EXPECTED_ROWS,
        "source_master_columns": EXPECTED_COLUMNS,
        "source_master_schema": "ARBE Atlas Master v2 illumext",
        "row_id_base": 0,
        "row_id_range": [0, EXPECTED_ROWS - 1],
        "default_source_atlas_row_id": DEFAULT_ROW_ID,
        "non_identity_sentinel_uint16": 65535,
        "numeric": {"dtype": "float64-le", "shape": [EXPECTED_ROWS, len(NUMERIC_FIELDS)], "fields": NUMERIC_FIELDS},
        "illuminant": {"dtype": "float64-le", "shape": [EXPECTED_ROWS, len(ILLUMINANT_FIELDS)], "fields": ILLUMINANT_FIELDS},
        "spectral": {"dtype": "float32-le", "shape": [EXPECTED_ROWS, len(SPECTRAL_FIELDS)], "fields": SPECTRAL_FIELDS, "wavelength_start_nm": 380, "wavelength_step_nm": 10, "wavelength_count": len(SPECTRAL_FIELDS)},
        "files": {
            "index": file_record(index_path, "master-index.json"),
            "numeric": file_record(numeric_path, "master-numeric.f64"),
            "illuminant": file_record(illuminant_path, "master-illuminant.f64"),
            "spectral": file_record(spectral_path, "master-spectral.f32"),
        },
        "build_status": "VERIFIED_SOURCE_MASTER_PROJECTION",
        "claim_boundary": "Master data are reference evidence. Material/specular/height/appearance layers remain simulated; measured QC remains NOT_MEASURED."
    }
    manifest_path = output / "master-manifest.json"
    write_compact_json(manifest_path, manifest)
    print(json.dumps({
        "result": "PASS",
        "master_sha256": actual_hash,
        "rows": EXPECTED_ROWS,
        "columns": EXPECTED_COLUMNS,
        "default_reference": default["reference"],
        "output_files": {path.name: path.stat().st_size for path in [index_path, numeric_path, illuminant_path, spectral_path, manifest_path]}
    }, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("master", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build(args.master.resolve(), args.output.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
