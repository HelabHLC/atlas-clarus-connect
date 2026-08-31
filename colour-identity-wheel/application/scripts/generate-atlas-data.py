#!/usr/bin/env python3
import csv
import json
import re
import sys
from pathlib import Path

source = Path(sys.argv[1])
out_dir = Path(__file__).resolve().parents[1] / "public" / "atlas"
out_dir.mkdir(parents=True, exist_ok=True)
pattern = re.compile(r"H(\d+)_L(\d+)_C(\d+)")
groups = {}

with source.open(newline="", encoding="utf-8-sig") as handle:
    for index, row in enumerate(csv.DictReader(handle), start=1):
        match = pattern.fullmatch(row["Sample"])
        if not match:
            continue
        hue, lightness, chroma = map(int, match.groups())
        spectrum = [round(float(row[f"R_{w}"]), 4) for w in range(380, 731, 10)]
        groups.setdefault(lightness, []).append({
            "id": index,
            "sample": row["Sample"],
            "h": hue,
            "l": lightness,
            "c": chroma,
            "lab": [round(float(row["L*"]), 3), round(float(row["a*"]), 3), round(float(row["b*"]), 3)],
            "lambda": round(float(row["λ*"]), 3),
            "rgb": [round(float(row["sRGB_R"]) * 255), round(float(row["sRGB_G"]) * 255), round(float(row["sRGB_B"]) * 255)],
            "hex": row["HEX"],
            "spectrum": spectrum,
        })

for lightness, records in groups.items():
    records.sort(key=lambda item: (item["c"], item["h"], item["id"]))
    (out_dir / f"l{lightness:03d}.json").write_text(
        json.dumps(records, separators=(",", ":"), ensure_ascii=False), encoding="utf-8"
    )

manifest = {
    "version": "arbe-lambda-masterPKL-v1.0.1",
    "count": sum(map(len, groups.values())),
    "levels": [{"l": level, "count": len(groups[level])} for level in sorted(groups)],
    "wavelengths": list(range(380, 731, 10)),
}
(out_dir / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")), encoding="utf-8")
print(json.dumps(manifest, indent=2))
