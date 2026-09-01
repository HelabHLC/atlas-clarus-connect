#!/usr/bin/env python3
"""Create the native-grid CIE spectral-engine asset from supplied CIE CSVs."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from io import StringIO
from pathlib import Path
from zipfile import ZipFile


FILES = {
    "D50": "CIE_std_illum_D50.csv",
    "D65": "CIE_std_illum_D65.csv",
    "A": "CIE_std_illum_A_1nm.csv",
    "CIE1931_2": "CIE_xyz_1931_2deg.csv",
}
SOURCE_DOIS = {
    "D50": "10.25039/CIE.DS.etgmuqt5",
    "D65": "10.25039/CIE.DS.hjfjmt59",
    "A": "10.25039/CIE.DS.8jsxjrsn",
    "CIE1931_2": "10.25039/CIE.DS.xvudnb9b",
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def rows(data: bytes) -> dict[int, list[float]]:
    parsed = {}
    for row in csv.reader(StringIO(data.decode("utf-8-sig"))):
        parsed[int(float(row[0]))] = [float(value) for value in row[1:]]
    return parsed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_zip", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    wavelengths = list(range(380, 731, 10))
    with ZipFile(args.source_zip) as archive:
        raw = {key: archive.read(name) for key, name in FILES.items()}
    tables = {key: rows(data) for key, data in raw.items()}
    payload = {
        "format": "ATLAS_CLARUS_CIE_SPECTRAL_ENGINE_DATA",
        "version": "0.2.0-phase1",
        "calculation_status": "CALCULATED_NATIVE_MASTER_GRID",
        "observer": "CIE 1931 2 degree standard colorimetric observer",
        "integration": {
            "wavelengths_nm": wavelengths,
            "delta_lambda_nm": 10,
            "range_nm": [380, 730],
            "normalization": "Y=100 for perfect diffuser independently under each illuminant",
            "limitation": "ATLAS master reflectance ends at 730 nm; this is not a full 360-830 nm integration."
        },
        "cmf": {
            "x_bar": [tables["CIE1931_2"][w][0] for w in wavelengths],
            "y_bar": [tables["CIE1931_2"][w][1] for w in wavelengths],
            "z_bar": [tables["CIE1931_2"][w][2] for w in wavelengths]
        },
        "illuminants": {
            name: {"spd": [tables[name][w][0] for w in wavelengths]}
            for name in ("D50", "D65", "A")
        },
        "source_files": {
            key: {"name": FILES[key], "sha256": digest(raw[key]), **({"doi": SOURCE_DOIS[key]} if key in SOURCE_DOIS else {})}
            for key in FILES
        },
        "source_archive_sha256": digest(args.source_zip.read_bytes()),
        "redistribution_boundary": "Only the 36 values required on the ATLAS native 380-730 nm grid are included; original CIE CSV files are not redistributed."
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"result": "PASS", "output_sha256": digest(args.output.read_bytes()), "wavelength_count": len(wavelengths)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
