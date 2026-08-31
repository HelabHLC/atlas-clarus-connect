#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
atlas = root / "public" / "atlas"
records = []
for path in sorted(atlas.glob("l[0-9][0-9][0-9].json")):
    for item in json.loads(path.read_text(encoding="utf-8")):
        keys = ("id", "sample", "h", "l", "c", "lab", "lambda", "rgb", "hex", "icc")
        records.append({key: item[key] for key in keys if key in item})
(atlas / "search-index.json").write_text(json.dumps(records, separators=(",", ":")), encoding="utf-8")
print(f"indexed {len(records)} references")
