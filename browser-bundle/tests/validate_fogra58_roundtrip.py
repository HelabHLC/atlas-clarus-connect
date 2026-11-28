#!/usr/bin/env python3
"""Reproduce the pinned FOGRA58 ICC roundtrip and verify Lab inputs against the master.

This verifies data lineage and software calculation consistency only. It does
not establish physical printability or production approval.
"""
from __future__ import annotations

import argparse
import base64
import csv
import gzip
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageCms

EXPECTED_PROFILE_SHA256 = "fad691cc0f25e3d6a91942599755b7f9cf906b91f9e4f4834c3364e6c50a972d"
EXPECTED_CSV_SHA256 = "cc0bd536bf500faebaac47e28ef37db8eb836d566b9d36c14b750467e58d8643"
MASTER_SHA256 = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"
EXPECTED_ROWS = 13283
ROUNDING_TOLERANCE = 0.00001
LAB_MASTER_TOLERANCE = 0.0000051


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def delta_e_2000(lab1: tuple[float, float, float], lab2: tuple[float, float, float]) -> float:
    """CIEDE2000, unit weighting factors."""
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    rad = math.pi / 180.0
    deg = 180.0 / math.pi
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
    Cbar = (C1 + C2) / 2.0
    G = 0.5 * (1.0 - math.sqrt(Cbar**7 / (Cbar**7 + 25.0**7)))
    ap1, ap2 = (1.0 + G) * a1, (1.0 + G) * a2
    cp1, cp2 = math.hypot(ap1, b1), math.hypot(ap2, b2)
    h1 = (math.atan2(b1, ap1) * deg) % 360.0 if cp1 else 0.0
    h2 = (math.atan2(b2, ap2) * deg) % 360.0 if cp2 else 0.0

    dL, dC = L2 - L1, cp2 - cp1
    dh = 0.0
    if cp1 * cp2:
        dh = h2 - h1
        if dh > 180.0:
            dh -= 360.0
        elif dh < -180.0:
            dh += 360.0
    dH = 2.0 * math.sqrt(cp1 * cp2) * math.sin(dh * rad / 2.0)

    Lbar, Cpbar = (L1 + L2) / 2.0, (cp1 + cp2) / 2.0
    if not cp1 * cp2:
        hbar = h1 + h2
    elif abs(h1 - h2) <= 180.0:
        hbar = (h1 + h2) / 2.0
    elif h1 + h2 < 360.0:
        hbar = (h1 + h2 + 360.0) / 2.0
    else:
        hbar = (h1 + h2 - 360.0) / 2.0

    T = (
        1.0
        - 0.17 * math.cos((hbar - 30.0) * rad)
        + 0.24 * math.cos(2.0 * hbar * rad)
        + 0.32 * math.cos((3.0 * hbar + 6.0) * rad)
        - 0.20 * math.cos((4.0 * hbar - 63.0) * rad)
    )
    delta_theta = 30.0 * math.exp(-(((hbar - 275.0) / 25.0) ** 2))
    Rc = 2.0 * math.sqrt(Cpbar**7 / (Cpbar**7 + 25.0**7))
    Sl = 1.0 + 0.015 * (Lbar - 50.0) ** 2 / math.sqrt(20.0 + (Lbar - 50.0) ** 2)
    Sc, Sh = 1.0 + 0.045 * Cpbar, 1.0 + 0.015 * Cpbar * T
    Rt = -math.sin(2.0 * delta_theta * rad) * Rc
    x, y, z = dL / Sl, dC / Sc, dH / Sh
    return math.sqrt(max(0.0, x * x + y * y + z * z + Rt * y * z))


def load_fixture(path: Path) -> tuple[bytes, bytes]:
    encoded = path.read_bytes().strip()
    compressed = base64.b64decode(encoded, validate=True)
    csv_bytes = gzip.decompress(compressed)
    actual = sha256(csv_bytes)
    if actual != EXPECTED_CSV_SHA256:
        raise ValueError(f"CSV fixture SHA-256 mismatch: {actual}")
    return compressed, csv_bytes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", type=Path, required=True, help="base64-encoded gzip CSV fixture")
    parser.add_argument("--profile", type=Path, required=True, help="official FOGRA58 ICC profile")
    parser.add_argument("--master", type=Path, required=True, help="ATLAS colors.json master")
    args = parser.parse_args()

    profile_bytes = args.profile.read_bytes()
    actual_profile_sha = sha256(profile_bytes)
    if actual_profile_sha != EXPECTED_PROFILE_SHA256:
        raise ValueError(f"ICC profile SHA-256 mismatch: {actual_profile_sha}")

    _, csv_bytes = load_fixture(args.fixture)
    rows = list(csv.DictReader(csv_bytes.decode("utf-8-sig").splitlines()))
    if len(rows) != EXPECTED_ROWS:
        raise ValueError(f"Expected {EXPECTED_ROWS} CSV rows, got {len(rows)}")
    references = [row["ATLAS_Referenz"] for row in rows]
    if len(set(references)) != EXPECTED_ROWS:
        raise ValueError("CSV contains missing or duplicate ATLAS references")

    master = json.loads(args.master.read_text(encoding="utf-8"))
    if master.get("master_sha256") != MASTER_SHA256 or master.get("entry_count") != EXPECTED_ROWS:
        raise ValueError("ATLAS master identity/count mismatch")
    master_refs = {colour["ref"] for colour in master["colors"]}
    if len(master_refs) != EXPECTED_ROWS or set(references) != master_refs:
        raise ValueError("CSV references do not exactly cover the ATLAS master")

    master_by_ref = {colour["ref"]: colour for colour in master["colors"]}
    master_lab_mismatches = 0
    maximum_master_lab_component_difference = 0.0
    for row in rows:
        reference = row["ATLAS_Referenz"]
        source_lab = tuple(float(row[key]) for key in ("Lab_L", "Lab_a", "Lab_b"))
        master_lab = tuple(float(value) for value in master_by_ref[reference]["lab"])
        if len(master_lab) != 3 or any(not math.isfinite(value) for value in master_lab):
            raise ValueError(f"Invalid Lab triplet in master for {reference}")
        maximum_difference = max(abs(source - master_value) for source, master_value in zip(source_lab, master_lab))
        maximum_master_lab_component_difference = max(maximum_master_lab_component_difference, maximum_difference)
        if maximum_difference > LAB_MASTER_TOLERANCE:
            master_lab_mismatches += 1
    if master_lab_mismatches:
        raise ValueError(
            f"CSV Lab inputs do not match the freieFarbe-derived ATLAS master: "
            f"{master_lab_mismatches} rows; max component difference="
            f"{maximum_master_lab_component_difference:.8f}; tolerance={LAB_MASTER_TOLERANCE:.8f}"
        )

    lab_profile = ImageCms.createProfile("LAB")
    rgb_profile = ImageCms.getOpenProfile(str(args.profile))
    source_lab: list[tuple[float, float, float]] = []
    lab_pixels: list[tuple[int, int, int]] = []
    for row in rows:
        lab = tuple(float(row[key]) for key in ("Lab_L", "Lab_a", "Lab_b"))
        source_lab.append(lab)
        lab_pixels.append((round(lab[0] * 255.0 / 100.0), round(lab[1] + 128.0), round(lab[2] + 128.0)))

    lab_image = Image.new("LAB", (EXPECTED_ROWS, 1))
    lab_image.putdata(lab_pixels)
    to_rgb = ImageCms.buildTransform(lab_profile, rgb_profile, "LAB", "RGB", renderingIntent=1, flags=0)
    to_lab = ImageCms.buildTransform(rgb_profile, lab_profile, "RGB", "LAB", renderingIntent=1, flags=0)
    rgb_image = ImageCms.applyTransform(lab_image, to_rgb)
    rgb_pixels = list(rgb_image.get_flattened_data())
    output_lab_pixels = list(ImageCms.applyTransform(rgb_image, to_lab).get_flattened_data())

    rgb_mismatches = lab_mismatches = delta_e_mismatches = 0
    maximum_delta_e_difference = 0.0
    for index, row in enumerate(rows):
        expected_rgb = tuple(int(row[key]) for key in ("TextileRGB_R", "TextileRGB_G", "TextileRGB_B"))
        if rgb_pixels[index] != expected_rgb:
            rgb_mismatches += 1

        pixel = output_lab_pixels[index]
        output_lab = (pixel[0] * 100.0 / 255.0, float(pixel[1] - 128), float(pixel[2] - 128))
        expected_lab = tuple(float(row[key]) for key in ("Ruecktransformation_L", "Ruecktransformation_a", "Ruecktransformation_b"))
        if any(abs(actual - expected) >= ROUNDING_TOLERANCE for actual, expected in zip(output_lab, expected_lab)):
            lab_mismatches += 1

        computed_delta_e = delta_e_2000(source_lab[index], output_lab)
        expected_delta_e = float(row["DeltaE00_Roundtrip"])
        difference = abs(computed_delta_e - expected_delta_e)
        maximum_delta_e_difference = max(maximum_delta_e_difference, difference)
        if difference >= ROUNDING_TOLERANCE:
            delta_e_mismatches += 1

    if rgb_mismatches or lab_mismatches or delta_e_mismatches:
        raise ValueError(
            f"Roundtrip mismatch: RGB={rgb_mismatches}, Lab={lab_mismatches}, "
            f"ΔE00={delta_e_mismatches}; max ΔE00 difference={maximum_delta_e_difference:.8f}"
        )

    print(json.dumps({
        "status": "PASS",
        "rows": EXPECTED_ROWS,
        "profile_sha256": actual_profile_sha,
        "csv_sha256": EXPECTED_CSV_SHA256,
        "rgb_mismatches": rgb_mismatches,
        "lab_mismatches": lab_mismatches,
        "master_lab_mismatches": master_lab_mismatches,
        "maximum_master_lab_component_difference": round(maximum_master_lab_component_difference, 8),
        "master_lab_source": "freieFarbe-derived ATLAS master",
        "delta_e00_mismatches": delta_e_mismatches,
        "maximum_delta_e00_difference": round(maximum_delta_e_difference, 8),
        "pillow": Image.__version__,
        "littlecms": ImageCms.core.littlecms_version,
        "scope": "ICC software roundtrip only; not physical production QC",
    }, indent=2))


if __name__ == "__main__":
    main()
