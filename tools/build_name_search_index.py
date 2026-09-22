#!/usr/bin/env python3
"""Build the shared, identity-safe ATLAS colour-name search index."""
from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DESIGNER_SOURCE = ROOT / "designer-layer/ATLAS_Clarus_Designer_Layer_Master_v0_1.json"
TONE_SOURCE = ROOT / "designer-layer/ATLAS_Clarus_Tone_System_v0_1.json"
OUTPUT = ROOT / "name-search/atlas-name-search-index-v1.json.gz"
COPIES = (ROOT / "hover-library/data/atlas-name-search-index-v1.json.gz", ROOT / "appearance-pixel-simulator/assets/name-search/atlas-name-search-index-v1.json.gz", ROOT / "colour-identity-wheel/application/public/atlas/name-search-index-v1.json.gz")
MASTER = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"

designer_bytes = DESIGNER_SOURCE.read_bytes()
designer = json.loads(designer_bytes)
tone_bytes = TONE_SOURCE.read_bytes()
tone = json.loads(tone_bytes)
assert designer["schema"] == "ATLAS_CLARUS_DESIGNER_LAYER" and tone["schema"] == "ATLAS_CLARUS_TONE_SYSTEM"
assert designer["source_master"]["sha256"] == tone["master_sha256"] == MASTER
assert len(designer["records"]) == len(tone["records"]) == 13283

records = []
for expected_id, (source_row, tone_row) in enumerate(zip(designer["records"], tone["records"])):
    assert source_row["atlas_row_id"] == tone_row["i"] == expected_id and source_row["reference"] == tone_row["r"]
    terms = source_row.get("search_terms_en", []) + [source_row["designer_name_en"], source_row["standard_name_en"], source_row["colour_family"], tone_row["n"], tone_row["f"], tone_row["t"]]
    records.append({"i": expected_id, "r": source_row["reference"], "d": tone_row["n"], "s": source_row["standard_name_en"], "f": tone_row["f"], "t": sorted({term.strip().lower() for term in terms if term and term.strip()})})

document = {"schema": "ATLAS_CLARUS_NAME_SEARCH_INDEX", "schema_version": "1.1.0", "master_sha256": MASTER, "source_designer_layer_sha256": hashlib.sha256(designer_bytes).hexdigest(), "source_tone_system_sha256": hashlib.sha256(tone_bytes).hexdigest(), "entry_count": len(records), "identity_key": "atlas_row_id", "records": records}
payload = (json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
compressed = gzip.compress(payload, compresslevel=9, mtime=0)
for path in (OUTPUT, *COPIES):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(compressed)
    print(path)
print(hashlib.sha256(compressed).hexdigest())
