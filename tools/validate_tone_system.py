#!/usr/bin/env python3
"""Validate ATLAS Clarus Tone System v0.1 and identity preservation."""
from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MASTER = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"
DESIGNER_SHA256 = "c7736a98bbaf6ddd8c50942ef11ab45200b43736f9e1ebf7480988b03a8293d2"
DESIGNER = ROOT / "designer-layer/ATLAS_Clarus_Designer_Layer_Master_v0_1.json"
TONE = ROOT / "designer-layer/ATLAS_Clarus_Tone_System_v0_1.json"
INDEX_COPIES = [ROOT / "name-search/atlas-name-search-index-v1.json.gz", ROOT / "hover-library/data/atlas-name-search-index-v1.json.gz", ROOT / "appearance-pixel-simulator/assets/name-search/atlas-name-search-index-v1.json.gz", ROOT / "colour-identity-wheel/application/public/atlas/name-search-index-v1.json.gz"]

designer_bytes = DESIGNER.read_bytes(); designer = json.loads(designer_bytes)
tone_bytes = TONE.read_bytes(); tone = json.loads(tone_bytes)
assert hashlib.sha256(designer_bytes).hexdigest() == DESIGNER_SHA256
assert designer["source_master"]["sha256"] == tone["master_sha256"] == MASTER
assert tone["iscc_nbs_role"] == "METADATA_ONLY"
assert len(designer["records"]) == len(tone["records"]) == 13283
assert len(tone["tone_terms"]) == 12 and tone["family_count"] == 72

phrases: set[str] = set(); references: set[str] = set(); neutral = 0
for expected_id, (metadata, row) in enumerate(zip(designer["records"], tone["records"])):
    assert metadata["atlas_row_id"] == row["i"] == expected_id
    assert metadata["reference"] == row["r"] and row["r"] not in references
    references.add(row["r"])
    assert not ({"lab", "rgb", "hex", "master_rgb"} & row.keys())
    if row["t"] is None:
        neutral += 1; lightness = int(row["r"].split("_")[1][1:])
        assert row["n"] == f"ATLAS Neutral {lightness}" and row["f"] == "Neutral"
    else:
        assert row["n"] == f"ATLAS {row['t']} {row['f']}"; phrases.add(f"{row['t']} {row['f']}")
    assert metadata["standard_name_en"] and metadata["standard_name_number"]

assert len(references) == 13283 and neutral == 19 and len(phrases) == 798
deep = next(row for row in tone["records"] if row["r"] == "H150_L035_C035")
assert deep["n"] == "ATLAS Deep Forest Green"
payloads = [path.read_bytes() for path in INDEX_COPIES]
assert len({hashlib.sha256(payload).hexdigest() for payload in payloads}) == 1
index = json.loads(gzip.decompress(payloads[0]))
assert index["master_sha256"] == MASTER and index["entry_count"] == 13283
assert index["source_designer_layer_sha256"] == hashlib.sha256(designer_bytes).hexdigest()
assert index["source_tone_system_sha256"] == hashlib.sha256(tone_bytes).hexdigest()
for expected_id, row in enumerate(index["records"]):
    assert row["i"] == expected_id and row["r"] == tone["records"][expected_id]["r"] and row["d"] == tone["records"][expected_id]["n"]

print("PASS: 13,283 identities; 13,264 chromatic; 19 neutral; 798 tone-family phrases")
print("PASS: Tone System is separate; released ISCC-NBS Designer Layer remains metadata")
print("PASS: four deterministic Name Search Index copies are byte-identical")
