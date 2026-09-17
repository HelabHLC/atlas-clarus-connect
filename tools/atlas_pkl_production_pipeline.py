#!/usr/bin/env python3
"""ATLAS Clarus: source RGB -> PKL Full Reference -> 4C/ECG previews.

Identity assignment is RGB-only. Lab and Delta E are deliberately not used.
The two output images are ICC screen previews derived from the same PKL PNG.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

import numpy as np
from PIL import Image, ImageCms, ImageDraw, ImageFont
from scipy.spatial import cKDTree


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def walk(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def as_rgb(row: dict[str, Any]) -> tuple[int, int, int] | None:
    for key in ("master_rgb", "rgb", "RGB", "srgb", "sRGB"):
        value = row.get(key)
        if isinstance(value, (list, tuple)) and len(value) >= 3:
            try:
                rgb = tuple(int(round(float(v))) for v in value[:3])
                if all(0 <= v <= 255 for v in rgb):
                    return rgb  # type: ignore[return-value]
            except (TypeError, ValueError):
                pass
        if isinstance(value, dict):
            try:
                rgb = tuple(int(round(float(value[k]))) for k in ("r", "g", "b"))
                if all(0 <= v <= 255 for v in rgb):
                    return rgb  # type: ignore[return-value]
            except (KeyError, TypeError, ValueError):
                pass
    for keys in (("R", "G", "B"), ("r", "g", "b")):
        try:
            rgb = tuple(int(round(float(row[k]))) for k in keys)
            if all(0 <= v <= 255 for v in rgb):
                return rgb  # type: ignore[return-value]
        except (KeyError, TypeError, ValueError):
            pass
    return None


def load_master(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    records: list[dict[str, Any]] = []
    seen_objects: set[int] = set()
    for row in walk(data):
        marker = id(row)
        if marker in seen_objects:
            continue
        seen_objects.add(marker)
        rgb = as_rgb(row)
        if rgb is None:
            continue
        row_id = next((row[k] for k in ("atlas_row_id", "row_id", "id") if k in row), None)
        if row_id is None:
            continue
        ref = next((row[k] for k in ("PKL", "pkl", "HLC", "hlc", "reference") if k in row), None)
        records.append({"atlas_row_id": row_id, "pkl_reference": ref, "rgb": rgb})
    if not records:
        raise ValueError("No master rows with atlas_row_id and RGB were found")
    return records


def row_key(value: Any) -> tuple[int, Any]:
    try:
        return (0, int(value))
    except (TypeError, ValueError):
        return (1, str(value))


def make_palette(records: list[dict[str, Any]]):
    # RGB collisions resolve deterministically to the smallest atlas_row_id.
    by_rgb: dict[tuple[int, int, int], dict[str, Any]] = {}
    collisions = 0
    for record in records:
        rgb = record["rgb"]
        if rgb in by_rgb:
            collisions += 1
            if row_key(record["atlas_row_id"]) < row_key(by_rgb[rgb]["atlas_row_id"]):
                by_rgb[rgb] = record
        else:
            by_rgb[rgb] = record
    ordered = sorted(by_rgb.values(), key=lambda r: (r["rgb"], row_key(r["atlas_row_id"])))
    colors = np.asarray([r["rgb"] for r in ordered], dtype=np.int16)
    return ordered, colors, collisions


def bind_to_pkl(source: Image.Image, records: list[dict[str, Any]]):
    palette_records, palette, collisions = make_palette(records)
    source_rgb = np.asarray(source.convert("RGB"), dtype=np.uint8)
    shape = source_rgb.shape
    unique, inverse, counts = np.unique(source_rgb.reshape(-1, 3), axis=0, return_inverse=True, return_counts=True)
    tree = cKDTree(palette.astype(np.float64))
    distances, nearest = tree.query(unique.astype(np.float64), k=1)

    selected = np.empty(len(unique), dtype=np.int64)
    tie_count = 0
    max_ties = 1
    for i, (pixel, distance, fallback) in enumerate(zip(unique, distances, nearest)):
        candidates = tree.query_ball_point(pixel.astype(np.float64), r=float(distance) + 1e-10)
        exact = []
        for index in candidates:
            delta = palette[index].astype(np.int32) - pixel.astype(np.int32)
            exact.append((int(delta @ delta), row_key(palette_records[index]["atlas_row_id"]), index))
        if not exact:
            selected[i] = int(fallback)
            continue
        minimum = min(x[0] for x in exact)
        tied = [x for x in exact if x[0] == minimum]
        tied.sort()
        selected[i] = tied[0][2]
        if len(tied) > 1:
            tie_count += int(counts[i])
            max_ties = max(max_ties, len(tied))

    mapped_indices = selected[inverse]
    mapped = palette[mapped_indices].astype(np.uint8).reshape(shape)
    used = Counter(mapped_indices.tolist())
    assignments = [
        {
            "atlas_row_id": palette_records[index]["atlas_row_id"],
            "pkl_reference": palette_records[index]["pkl_reference"],
            "master_rgb": list(palette_records[index]["rgb"]),
            "pixel_count": int(count),
        }
        for index, count in sorted(used.items(), key=lambda item: row_key(palette_records[item[0]]["atlas_row_id"]))
    ]
    stats = {
        "source_unique_rgb": int(len(unique)),
        "master_rows": int(len(records)),
        "master_unique_rgb": int(len(palette_records)),
        "master_rgb_collisions": int(collisions),
        "assigned_master_rows": int(len(used)),
        "tie_pixels": int(tie_count),
        "maximum_tie_multiplicity": int(max_ties),
    }
    return Image.fromarray(mapped, mode="RGB"), assignments, stats, {tuple(x) for x in palette.tolist()}


def icc_preview(pkl_image: Image.Image, profile_path: Path) -> Image.Image:
    srgb = ImageCms.createProfile("sRGB")
    proof = ImageCms.getOpenProfile(str(profile_path))
    flags = ImageCms.Flags.SOFTPROOFING | ImageCms.Flags.BLACKPOINTCOMPENSATION
    transform = ImageCms.buildProofTransformFromOpenProfiles(
        srgb, srgb, proof, "RGB", "RGB",
        renderingIntent=ImageCms.Intent.ABSOLUTE_COLORIMETRIC,
        proofRenderingIntent=ImageCms.Intent.ABSOLUTE_COLORIMETRIC,
        flags=flags,
    )
    return ImageCms.applyTransform(pkl_image.convert("RGB"), transform)


def font(size: int, bold: bool = False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)


def comparison(pkl: Image.Image, four: Image.Image, ecg: Image.Image, destination: Path):
    width, height = 2048, 1152
    canvas = Image.new("RGB", (width, height), (9, 14, 18))
    draw = ImageDraw.Draw(canvas)
    lime, white, muted = (145, 255, 78), (242, 244, 245), (188, 195, 201)
    title = "ATLAS CLARUS · ONE SOURCE, ONE PKL IDENTITY, TWO PRODUCTION PREVIEWS"
    box = draw.textbbox((0, 0), title, font=font(37, True))
    draw.text(((width-(box[2]-box[0]))/2, 24), title, font=font(37, True), fill=white)
    panel = 596
    xs = (74, 726, 1378)
    labels = ("PKL FULL REFERENCE", "4C · ICC PREVIEW", "ECG · ICC PREVIEW")
    for x, image, label in zip(xs, (pkl, four, ecg), labels):
        fitted = image.copy()
        fitted.thumbnail((panel, panel), Image.Resampling.LANCZOS)
        tile = Image.new("RGB", (panel, panel), (255, 255, 255))
        tile.paste(fitted, ((panel-fitted.width)//2, (panel-fitted.height)//2))
        canvas.paste(tile, (x, 150))
        b = draw.textbbox((0, 0), label, font=font(30, True))
        draw.text((x+(panel-(b[2]-b[0]))/2, 98), label, font=font(30, True), fill=lime)
    footer = "Browser-sRGB source → PKL Full Reference → 4C preview / ECG preview"
    b = draw.textbbox((0, 0), footer, font=font(31, True))
    draw.text(((width-(b[2]-b[0]))/2, 810), footer, font=font(31, True), fill=lime)
    note = "Both ICC previews derive from the same verified PKL reference · screen previews · not a measured print result"
    b = draw.textbbox((0, 0), note, font=font(20))
    draw.text(((width-(b[2]-b[0]))/2, 862), note, font=font(20), fill=muted)
    canvas.save(destination, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--master", type=Path, required=True)
    parser.add_argument("--expected-master-sha256", required=True)
    parser.add_argument("--profile-4c", type=Path, required=True)
    parser.add_argument("--profile-ecg", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    expected = args.expected_master_sha256.lower().strip()
    actual = sha256(args.master)
    if actual != expected:
        raise SystemExit(f"MASTER_SHA256_MISMATCH expected={expected} actual={actual}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    records = load_master(args.master)
    source = Image.open(args.source).convert("RGB")
    pkl, assignments, stats, valid_rgb = bind_to_pkl(source, records)

    pkl_path = args.output_dir / "01_PKL_Full_Reference.png"
    four_path = args.output_dir / "02_4C_ICC_Preview.png"
    ecg_path = args.output_dir / "03_ECG_ICC_Preview.png"
    comparison_path = args.output_dir / "04_ATLAS_Clarus_PKL_4C_ECG_Comparison.png"
    evidence_path = args.output_dir / "05_ATLAS_Clarus_PKL_Production_Evidence.json"
    pkl.save(pkl_path, optimize=True)

    reopen = np.asarray(Image.open(pkl_path).convert("RGB"), dtype=np.uint8)
    output_colors = {tuple(x) for x in np.unique(reopen.reshape(-1, 3), axis=0).tolist()}
    foreign = sorted(output_colors - valid_rgb)
    if foreign:
        raise SystemExit(f"FOREIGN_COLORS_DETECTED count={len(foreign)}")

    four = icc_preview(pkl, args.profile_4c)
    ecg = icc_preview(pkl, args.profile_ecg)
    four.save(four_path, optimize=True)
    ecg.save(ecg_path, optimize=True)
    comparison(pkl, four, ecg, comparison_path)

    evidence = {
        "schema": "ATLAS_CLARUS_PKL_PRODUCTION_EVIDENCE_v1",
        "status": "VERIFIED_COMPUTATIONAL_PREVIEW",
        "identity_method": "RGB_ONLY_NEAREST_MASTER_WITH_DETERMINISTIC_ROW_ID_TIEBREAK",
        "lab_or_delta_e_used_for_identity": False,
        "source_sha256": sha256(args.source),
        "master_sha256": actual,
        "profiles": {
            "4c": {"filename": args.profile_4c.name, "sha256": sha256(args.profile_4c)},
            "ecg": {"filename": args.profile_ecg.name, "sha256": sha256(args.profile_ecg)},
        },
        "outputs": {
            p.name: sha256(p) for p in (pkl_path, four_path, ecg_path, comparison_path)
        },
        "verification": {
            "foreign_colors": len(foreign),
            "lossless_reopen_checked": True,
            "icc_previews_share_same_pkl_source": True,
            "physical_print_verified": False,
            **stats,
        },
        "assignments": assignments,
    }
    evidence_path.write_text(json.dumps(evidence, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "output_dir": str(args.output_dir), "foreign_colors": 0}))


if __name__ == "__main__":
    main()
