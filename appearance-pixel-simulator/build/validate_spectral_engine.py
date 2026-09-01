#!/usr/bin/env python3
"""Validate CIE native-grid data and phase-1 spectral calculations."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from io import StringIO
from pathlib import Path
from zipfile import ZipFile

import numpy as np
import pandas as pd


FILES = {"D50": "CIE_std_illum_D50.csv", "D65": "CIE_std_illum_D65.csv", "A": "CIE_std_illum_A_1nm.csv", "CIE1931_2": "CIE_xyz_1931_2deg.csv"}
BRADFORD = np.array([[0.8951, 0.2664, -0.1614], [-0.7502, 1.7135, 0.0367], [0.0389, -0.0685, 1.0296]])
BRADFORD_INV = np.array([[0.9869929, -0.1470543, 0.1599627], [0.4323053, 0.5183603, 0.0492912], [-0.0085287, 0.0400428, 0.9684867]])


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def table(data: bytes) -> dict[int, list[float]]:
    return {int(float(row[0])): [float(v) for v in row[1:]] for row in csv.reader(StringIO(data.decode("utf-8-sig")))}


def xyz(reflectance: np.ndarray, spd: np.ndarray, cmf: np.ndarray) -> np.ndarray:
    k = 100 / np.sum(spd * cmf[:, 1])
    return k * np.sum(reflectance[:, None] * spd[:, None] * cmf, axis=0)


def adapt(value: np.ndarray, source_white: np.ndarray, target_white: np.ndarray) -> np.ndarray:
    return BRADFORD_INV @ ((BRADFORD @ value) * ((BRADFORD @ target_white) / (BRADFORD @ source_white)))


def srgb(value: np.ndarray) -> list[int]:
    x, y, z = value / 100
    linear = np.array([3.2404542*x-1.5371385*y-0.4985314*z, -0.969266*x+1.8760108*y+0.041556*z, 0.0556434*x-0.2040259*y+1.0572252*z])
    encoded = np.where(linear <= 0.0031308, 12.92*linear, 1.055*np.power(np.maximum(0, linear), 1/2.4)-0.055)
    return np.clip(np.rint(encoded*255), 0, 255).astype(int).tolist()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_zip", type=Path)
    parser.add_argument("engine_json", type=Path)
    parser.add_argument("master", type=Path)
    args = parser.parse_args()
    engine = json.loads(args.engine_json.read_text())
    wavelengths = engine["integration"]["wavelengths_nm"]
    with ZipFile(args.source_zip) as archive:
        raw = {key: archive.read(name) for key, name in FILES.items()}
    source = {key: table(value) for key, value in raw.items()}
    assert wavelengths == list(range(380, 731, 10))
    for key in FILES:
        assert engine["source_files"][key]["sha256"] == sha256(raw[key])
    cmf = np.array([[source["CIE1931_2"][w][i] for i in range(3)] for w in wavelengths])
    assert np.array_equal(cmf[:, 0], engine["cmf"]["x_bar"])
    assert np.array_equal(cmf[:, 1], engine["cmf"]["y_bar"])
    assert np.array_equal(cmf[:, 2], engine["cmf"]["z_bar"])
    spds = {name: np.array([source[name][w][0] for w in wavelengths]) for name in ("D50", "D65", "A")}
    for name in spds:
        assert np.array_equal(spds[name], engine["illuminants"][name]["spd"])
    frame = pd.read_pickle(args.master)
    reflectance = frame.iloc[4665][[f"R_{w}" for w in wavelengths]].to_numpy(float)
    white_d65 = xyz(np.ones(36), spds["D65"], cmf)
    results = {}
    for name, spd in spds.items():
        value = xyz(reflectance, spd, cmf)
        adapted = adapt(value, xyz(np.ones(36), spd, cmf), white_d65)
        results[name] = {"xyz": value.round(8).tolist(), "adapted_xyz_d65": adapted.round(8).tolist(), "display_srgb_u8": srgb(adapted)}
    print(json.dumps({"result": "PASS", "native_grid_values_verified": 36*(3+3), "default_row": 4665, "calculations": results}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
