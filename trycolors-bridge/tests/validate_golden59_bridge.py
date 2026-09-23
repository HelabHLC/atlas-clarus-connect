#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
palette = json.loads((root / "golden-heavy-body-59-palette.json").read_text(encoding="utf-8"))
colors = palette["colors"]
assert palette["palette_id"] == "ATLAS_GOLDEN_HB_59_V0_1"
assert len(colors) == 59
assert len({row["paint_id"] for row in colors}) == 59
assert all(isinstance(row["paint_id"], int) and row["paint_id"] > 0 for row in colors)
assert all(row["mixing_data"] == "measured" for row in colors)
assert all(len(row["hex"]) == 7 and row["hex"].startswith("#") for row in colors)

php = (root / "atlas-clarus-trycolors-bridge.php").read_text(encoding="utf-8")
for required in (
    "'colors'=>$palette",
    "'maxColorsCount'=>3",
    "'maxDropsCount'=>20",
    "'mixerMode'=>'pro'",
    "'engine'=>'2025'",
    "ATLAS_GOLDEN_HB_59_V0_1",
    "Recipe computed by Trycolors",
):
    assert required in php, required
assert "array_column($palette, 'hex')" not in php
print("Golden-59 paint_id bridge contract: PASS")
