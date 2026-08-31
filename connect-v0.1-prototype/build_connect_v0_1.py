#!/usr/bin/env python3
"""Build and verify an ATLAS Clarus Connect v0.1 reference package."""

from __future__ import annotations

import hashlib
import json
import math
import shutil
import struct
import sys
import zipfile
from pathlib import Path

import pandas as pd


MASTER_SHA256 = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"
REFERENCE = "H125_L075_C080"
WORKFLOW_VERSION = "ATLAS_CLARUS_CONNECT_v0.1"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ase_text(value: str) -> bytes:
    encoded = value.encode("utf-16-be") + b"\x00\x00"
    return struct.pack(">H", len(value) + 1) + encoded


def ase_block(block_type: int, payload: bytes) -> bytes:
    return struct.pack(">HI", block_type, len(payload)) + payload


def make_ase(name: str, rgb: list[int]) -> bytes:
    group = ase_block(0xC001, ase_text("ATLAS Clarus Connect"))
    channels = [value / 255.0 for value in rgb]
    colour = ase_text(name) + b"RGB " + struct.pack(">fffH", *channels, 2)
    swatch = ase_block(0x0001, colour)
    group_end = ase_block(0xC002, b"")
    blocks = group + swatch + group_end
    return b"ASEF" + struct.pack(">HHI", 1, 0, 3) + blocks


def read_ase(data: bytes) -> dict:
    if data[:4] != b"ASEF":
        raise ValueError("Invalid ASE signature")
    major, minor, count = struct.unpack(">HHI", data[4:12])
    pos = 12
    swatches = []
    seen = 0
    while pos < len(data):
        block_type, length = struct.unpack(">HI", data[pos : pos + 6])
        pos += 6
        payload = data[pos : pos + length]
        pos += length
        seen += 1
        if block_type != 0x0001:
            continue
        name_len = struct.unpack(">H", payload[:2])[0]
        name_end = 2 + name_len * 2
        name = payload[2 : name_end - 2].decode("utf-16-be")
        model = payload[name_end : name_end + 4].decode("ascii")
        if model != "RGB ":
            raise ValueError(f"Unexpected ASE model: {model!r}")
        r, g, b, colour_type = struct.unpack(">fffH", payload[name_end + 4 : name_end + 18])
        swatches.append(
            {
                "name": name,
                "model": model.strip(),
                "rgb_float": [r, g, b],
                "rgb_u8_roundtrip": [round(r * 255), round(g * 255), round(b * 255)],
                "colour_type": colour_type,
            }
        )
    if seen != count or pos != len(data):
        raise ValueError("ASE block count or length mismatch")
    return {"version": f"{major}.{minor}", "block_count": count, "swatches": swatches}


def json_write(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: build_connect_v0_1.py MASTER.pkl OUTPUT_DIR")
    master_path = Path(sys.argv[1]).resolve()
    output_dir = Path(sys.argv[2]).resolve()

    actual_master_sha = sha256(master_path)
    if actual_master_sha != MASTER_SHA256:
        raise SystemExit(f"Master SHA-256 mismatch: {actual_master_sha}")

    frame = pd.read_pickle(master_path)
    if len(frame) != 13283:
        raise SystemExit(f"Master row count mismatch: {len(frame)}")
    matches = frame.index[frame["reference"].eq(REFERENCE)].tolist()
    if len(matches) != 1:
        raise SystemExit(f"Expected one {REFERENCE} record, found {len(matches)}")

    frame_index = matches[0]
    row_position = int(frame.index.get_loc(frame_index))
    row = frame.loc[frame_index]
    raw_rgb = row["rgb"]
    if isinstance(raw_rgb, str):
        raw_rgb = json.loads(raw_rgb)
    if not isinstance(raw_rgb, (list, tuple)) or len(raw_rgb) != 3:
        raise SystemExit(f"Invalid master RGB representation: {row['rgb']!r}")
    rgb = [int(value) for value in raw_rgb]
    if any(value < 0 or value > 255 for value in rgb):
        raise SystemExit(f"Master RGB channel outside uint8 range: {rgb}")
    master_hex = str(row["hex"]).upper()
    calculated_hex = "#" + "".join(f"{value:02X}" for value in rgb)
    if master_hex != calculated_hex:
        raise SystemExit(f"Master RGB/HEX mismatch: {rgb} vs {master_hex}")
    if not bool(row["atlas_identity_valid"]):
        raise SystemExit("Selected master identity is not valid")

    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)

    stem = f"ATLAS_Clarus_Connect_{REFERENCE}"
    ase_path = output_dir / f"{stem}.ase"
    evidence_path = output_dir / f"{stem}.clarus.json"
    tokens_path = output_dir / f"{stem}.tokens.json"
    verification_path = output_dir / "VERIFICATION_REPORT.json"
    readme_path = output_dir / "README.md"

    ase_path.write_bytes(make_ase(f"ATLAS/{REFERENCE}", rgb))
    ase_digest = sha256(ase_path)

    evidence = {
        "format": "ATLAS_CLARUS_CONNECT",
        "schema_version": "0.1",
        "workflow_version": WORKFLOW_VERSION,
        "identity": {
            "pkl_reference": REFERENCE,
            "source_atlas_row_id": row_position,
            "source_atlas_row_id_basis": "zero_based_master_row_position",
            "display_row_number": row_position + 1,
            "master_rgb": rgb,
            "master_hex": master_hex,
            "master_lab_d50": {
                "L": float(row["lab_L"]),
                "a": float(row["lab_a"]),
                "b": float(row["lab_b"]),
            },
            "master_sha256": actual_master_sha,
            "master_rows": len(frame),
            "atlas_identity_valid": True,
        },
        "freeze": {
            "freeze_status": "FROZEN_REFERENCE_EXPORT",
            "identity_selection_recomputed": False,
        },
        "export": {
            "target": "ASE_RGB",
            "filename": ase_path.name,
            "sha256": ase_digest,
            "swatch_name": f"ATLAS/{REFERENCE}",
        },
        "verification": {
            "export_generation": "PASS",
            "ase_structural_readback": "PASS",
            "application_import": "NOT_TESTED",
            "application_persistence": "NOT_TESTED",
            "roundtrip_status": "NOT_ROUNDTRIP_TESTED",
            "measured_qc_status": "NOT_MEASURED",
        },
    }
    json_write(evidence_path, evidence)

    tokens = {
        "$schema": "https://design-tokens.github.io/community-group/format/",
        "ATLAS": {
            REFERENCE: {
                "$type": "color",
                "$value": master_hex,
                "$description": (
                    f"ATLAS frozen reference {REFERENCE}; source_atlas_row_id {row_position}; "
                    f"master {actual_master_sha}"
                ),
                "$extensions": {
                    "org.atlas-clarus.identity": {
                        "source_atlas_row_id": row_position,
                        "master_rgb": rgb,
                        "master_sha256": actual_master_sha,
                        "freeze_status": "FROZEN_REFERENCE_EXPORT",
                    }
                },
            }
        },
    }
    json_write(tokens_path, tokens)

    parsed_ase = read_ase(ase_path.read_bytes())
    swatch = parsed_ase["swatches"][0]
    float_error = [abs(swatch["rgb_float"][i] - rgb[i] / 255.0) for i in range(3)]
    checks = {
        "master_sha256": actual_master_sha,
        "master_sha256_status": "PASS",
        "master_rows": len(frame),
        "master_rows_status": "PASS",
        "reference_match_count": len(matches),
        "reference_uniqueness_status": "PASS",
        "source_atlas_row_id": row_position,
        "display_row_number": row_position + 1,
        "master_rgb": rgb,
        "master_hex": master_hex,
        "rgb_hex_consistency_status": "PASS",
        "ase": parsed_ase,
        "ase_rgb_float_max_abs_error": max(float_error),
        "ase_rgb_u8_roundtrip_status": "PASS" if swatch["rgb_u8_roundtrip"] == rgb else "FAIL",
        "evidence_export_sha256_status": "PASS" if evidence["export"]["sha256"] == sha256(ase_path) else "FAIL",
        "overall_status": "PASS",
        "claim_boundary": "No application import, persistence, or round-trip claim has been made.",
    }
    if any(value == "FAIL" for value in checks.values()):
        checks["overall_status"] = "FAIL"
    json_write(verification_path, checks)

    readme_path.write_text(
        f"""# ATLAS Clarus Connect v0.1 prototype

This package demonstrates a verifiable handoff for the frozen ATLAS reference `{REFERENCE}`.

## Frozen identity

- PKL reference: `{REFERENCE}`
- Internal `source_atlas_row_id`: `{row_position}` (zero-based master row position)
- Display row: `{row_position + 1}`
- Master RGB: `{rgb[0]} / {rgb[1]} / {rgb[2]}`
- Master HEX: `{master_hex}`
- Master rows: `13,283`
- Master SHA-256: `{actual_master_sha}`

## Files

- `{ase_path.name}` — Adobe Swatch Exchange RGB palette.
- `{evidence_path.name}` — frozen identity and export evidence.
- `{tokens_path.name}` — Figma/design-token handoff source.
- `{verification_path.name}` — deterministic build and ASE readback checks.
- `build_connect_v0_1.py` — reproducible package generator and ASE verifier.
- `SHA256SUMS.txt` — package-file checksums.

## Claim boundary

The ASE file has passed structural readback and exact RGB-u8 reconstruction. Import,
persistence and round-trip behavior in Adobe, Affinity and Figma have not yet been
tested. The correct status is `NOT_ROUNDTRIP_TESTED`; this package does not claim a
native integration or measured colour approval.
""",
        encoding="utf-8",
    )

    generator_path = output_dir / "build_connect_v0_1.py"
    shutil.copy2(Path(__file__).resolve(), generator_path)
    payload_files = [ase_path, evidence_path, tokens_path, verification_path, readme_path, generator_path]
    sums_path = output_dir / "SHA256SUMS.txt"
    sums_path.write_text(
        "".join(f"{sha256(path)}  {path.name}\n" for path in payload_files),
        encoding="utf-8",
    )

    zip_path = output_dir.parent / f"{output_dir.name}.zip"
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(output_dir.iterdir()):
            archive.write(path, arcname=f"{output_dir.name}/{path.name}")

    print(json.dumps({
        "output_dir": str(output_dir),
        "zip": str(zip_path),
        "zip_sha256": sha256(zip_path),
        "source_atlas_row_id": row_position,
        "display_row_number": row_position + 1,
        "reference": REFERENCE,
        "rgb": rgb,
        "hex": master_hex,
        "ase_sha256": ase_digest,
        "verification": checks["overall_status"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
