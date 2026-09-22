#!/usr/bin/env python3
"""Build ATLAS Clarus Tone System v0.1 without changing the Designer Layer."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "designer-layer/ATLAS_Clarus_Designer_Layer_Master_v0_1.json"
OUTPUT = ROOT / "designer-layer/ATLAS_Clarus_Tone_System_v0_1.json"
MASTER = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"
REFERENCE = re.compile(r"^H(\d{3})_L(\d{3})_C(\d{3})$")

FAMILY_NAMES = [
    "Garden Rose", "Camellia Rose", "Cherry Red", "Garnet Red", "Poppy Red", "Ember Red",
    "Flame Red", "Kiln Orange", "Persimmon Orange", "Mandarin Orange", "Apricot Orange", "Marigold Orange",
    "Saffron Gold", "Honey Gold", "Harvest Amber", "Wheat Gold", "Sunflower Yellow", "Solar Yellow",
    "Citron Yellow", "Grove Olive", "Linden Yellow", "Chartreuse Leaf", "Lime Leaf", "Bud Green",
    "Sprout Green", "Meadow Green", "Fern Green", "Orchard Green", "Clover Green", "Forest Green",
    "Laurel Green", "Jade Green", "Emerald Green", "Juniper Green", "Mint Green", "Bay Green",
    "Estuary Teal", "Lagoon Teal", "Reef Turquoise", "Cove Turquoise", "Glacier Cyan", "Tide Cyan",
    "Arctic Cyan", "Bay Cyan", "Horizon Cyan", "Coast Blue", "Fjord Blue", "Marine Blue",
    "Harbour Blue", "Horizon Blue", "Cornflower Blue", "Cobalt Blue", "Sapphire Blue", "Evening Blue",
    "Twilight Blue", "Iris Blue", "Iris Violet", "Bellflower Violet", "Wisteria Violet", "Aster Violet",
    "Heather Violet", "Crocus Violet", "Amethyst Purple", "Orchid Purple", "Mallow Purple", "Plum Purple",
    "Dahlia Magenta", "Fuchsia Magenta", "Cyclamen Magenta", "Peony Magenta", "Hibiscus Rose", "Petal Rose",
]
FAMILIES = {5 * (index + 1): name for index, name in enumerate(FAMILY_NAMES)}
TONES = {
    "light": ((5, 10, "Mist"), (15, 30, "Pale"), (35, 55, "Light"), (60, 110, "Bright")),
    "middle": ((5, 10, "Smoky"), (15, 30, "Soft"), (35, 55, "Clear"), (60, 110, "Vivid")),
    "dark": ((5, 10, "Shadow"), (15, 30, "Muted"), (35, 55, "Deep"), (60, 110, "Intense")),
}


def tone_name(lightness: int, chroma: int) -> str:
    band = "light" if lightness >= 75 else "middle" if lightness >= 50 else "dark"
    for minimum, maximum, name in TONES[band]:
        if minimum <= chroma <= maximum:
            return name
    raise ValueError(f"No tone for L{lightness}/C{chroma}")


source = json.loads(SOURCE.read_text(encoding="utf-8"))
assert source["schema"] == "ATLAS_CLARUS_DESIGNER_LAYER"
assert source["source_master"]["sha256"] == MASTER
assert len(source["records"]) == 13283

records = []
phrases: set[str] = set()
chromatic = neutral = 0
for expected_id, source_row in enumerate(source["records"]):
    assert source_row["atlas_row_id"] == expected_id
    match = REFERENCE.fullmatch(source_row["reference"])
    assert match
    hue, lightness, chroma = map(int, match.groups())
    if chroma == 0:
        assert hue == 0
        family, tone = "Neutral", None
        name = f"ATLAS Neutral {lightness}"
        neutral += 1
    else:
        family = FAMILIES[hue]
        tone = tone_name(lightness, chroma)
        name = f"ATLAS {tone} {family}"
        phrases.add(f"{tone} {family}")
        chromatic += 1
    records.append({"i": expected_id, "r": source_row["reference"], "n": name, "f": family, "t": tone})

assert chromatic == 13264 and neutral == 19 and len(phrases) == 798
document = {
    "schema": "ATLAS_CLARUS_TONE_SYSTEM", "schema_version": "0.1.0", "status": "RELEASE_CANDIDATE",
    "date": "2026-09-21", "master_sha256": MASTER, "identity_key": "atlas_row_id",
    "entry_count": len(records), "family_count": len(FAMILIES),
    "tone_terms": ["Mist", "Pale", "Light", "Bright", "Smoky", "Soft", "Clear", "Vivid", "Shadow", "Muted", "Deep", "Intense"],
    "display_pattern_chromatic": "ATLAS {tone} {family}", "display_pattern_neutral": "ATLAS Neutral {L}",
    "iscc_nbs_role": "METADATA_ONLY", "records": records,
}
OUTPUT.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"Created {OUTPUT}")
print(f"chromatic={chromatic} neutral={neutral} phrases={len(phrases)}")
