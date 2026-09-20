#!/usr/bin/env python3
"""Build the shared, identity-safe ATLAS colour-name search index."""
from __future__ import annotations

import hashlib
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "designer-layer/ATLAS_Clarus_Designer_Layer_Master_v0_1.json"
OUTPUT = ROOT / "name-search/atlas-name-search-index-v1.json.gz"
MASTER = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"

source_bytes = SOURCE.read_bytes()
source = json.loads(source_bytes)
assert source["schema"] == "ATLAS_CLARUS_DESIGNER_LAYER"
assert source["source_master"]["sha256"] == MASTER
assert len(source["records"]) == 13283

records = []
for expected_id, row in enumerate(source["records"]):
    assert row["atlas_row_id"] == expected_id
    assert row["reference"].startswith("H")
    records.append({
        "i": expected_id,
        "r": row["reference"],
        "d": row["designer_name_en"],
        "s": row["standard_name_en"],
        "f": row["colour_family"],
        "t": sorted(set(term.strip().lower() for term in row.get("search_terms_en", []) if term.strip())),
    })

document = {
    "schema": "ATLAS_CLARUS_NAME_SEARCH_INDEX",
    "schema_version": "1.0.0",
    "master_sha256": MASTER,
    "source_designer_layer_sha256": hashlib.sha256(source_bytes).hexdigest(),
    "entry_count": len(records),
    "identity_key": "atlas_row_id",
    "records": records,
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
payload = (json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
OUTPUT.write_bytes(gzip.compress(payload, compresslevel=9, mtime=0))
print(OUTPUT)
print(hashlib.sha256(OUTPUT.read_bytes()).hexdigest())
