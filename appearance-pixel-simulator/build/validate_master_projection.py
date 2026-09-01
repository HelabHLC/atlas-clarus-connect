#!/usr/bin/env python3
"""Independently validate the browser projection against the active master."""

from __future__ import annotations

import ast
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd


EXPECTED_MASTER_SHA256 = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fail(message: str) -> None:
    raise AssertionError(message)


def validate(master_path: Path, asset_dir: Path) -> dict:
    manifest_path = asset_dir / "master-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    frame = pd.read_pickle(master_path)

    if sha256(master_path) != EXPECTED_MASTER_SHA256:
        fail("source master SHA-256 mismatch")
    if tuple(frame.shape) != (manifest["source_master_rows"], manifest["source_master_columns"]):
        fail("source master shape mismatch")
    if manifest["source_master_sha256"] != EXPECTED_MASTER_SHA256:
        fail("manifest source binding mismatch")

    for record in manifest["files"].values():
        path = asset_dir / record["path"]
        if path.stat().st_size != record["byte_size"] or sha256(path) != record["sha256"]:
            fail(f"asset integrity mismatch: {path.name}")

    index = json.loads((asset_dir / manifest["files"]["index"]["path"]).read_text(encoding="utf-8"))
    numeric = np.fromfile(asset_dir / manifest["files"]["numeric"]["path"], dtype="<f8").reshape(manifest["numeric"]["shape"])
    illuminant = np.fromfile(asset_dir / manifest["files"]["illuminant"]["path"], dtype="<f8").reshape(manifest["illuminant"]["shape"])
    spectral = np.fromfile(asset_dir / manifest["files"]["spectral"]["path"], dtype="<f4").reshape(manifest["spectral"]["shape"])

    if len(index["rows"]) != len(frame):
        fail("index row count mismatch")
    for row_id, (projected, (_, source)) in enumerate(zip(index["rows"], frame.iterrows())):
        rgb = ast.literal_eval(source["rgb"]) if isinstance(source["rgb"], str) else source["rgb"]
        expected = [row_id, str(source["reference"]), str(source["hex"]), *[int(v) for v in rgb]]
        if projected[:6] != expected:
            fail(f"identity mismatch at row {row_id}")

    source_numeric = frame[manifest["numeric"]["fields"]].to_numpy(dtype="<f8")
    source_illuminant = frame[manifest["illuminant"]["fields"]].to_numpy(dtype="<f8")
    source_spectral = frame[manifest["spectral"]["fields"]].to_numpy(dtype="<f4")
    if not np.array_equal(numeric, source_numeric, equal_nan=True):
        fail("numeric projection differs from source")
    if not np.array_equal(illuminant, source_illuminant, equal_nan=True):
        fail("illuminant projection differs from source")
    if not np.array_equal(spectral, source_spectral, equal_nan=True):
        fail("spectral projection differs from source")

    default_id = manifest["default_source_atlas_row_id"]
    default = index["rows"][default_id]
    if default[:6] != [4665, "H125_L075_C080", "#76CD27", 118, 205, 39]:
        fail("default row binding mismatch")

    return {
        "result": "PASS",
        "source_master_sha256": EXPECTED_MASTER_SHA256,
        "projection_manifest_sha256": sha256(manifest_path),
        "rows": len(frame),
        "source_columns": len(frame.columns),
        "index_rows_verified": len(index["rows"]),
        "numeric_values_verified": int(numeric.size),
        "illuminant_values_verified": int(illuminant.size),
        "spectral_values_verified": int(spectral.size),
        "spectral_min": float(np.nanmin(spectral)),
        "spectral_max": float(np.nanmax(spectral)),
        "default_identity": {"source_atlas_row_id": default[0], "reference": default[1], "hex": default[2], "rgb": default[3:6]},
    }


if __name__ == "__main__":
    try:
        print(json.dumps(validate(Path(sys.argv[1]), Path(sys.argv[2])), indent=2))
    except Exception as exc:
        print(json.dumps({"result": "FAIL", "error": str(exc)}, indent=2))
        raise
