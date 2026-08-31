#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MASTER_SHA = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"

valid = json.loads((ROOT / "examples" / "valid-row-4912.json").read_text(encoding="utf-8"))
invalid = json.loads((ROOT / "examples" / "invalid-vectors.json").read_text(encoding="utf-8"))

q = valid["query"]
assert valid["expected_result"] == "VERIFIED"
assert q["atlas_row_id"] == "4912"
assert q["hlc"] == "H130_L060_C030"
assert q["master_sha256"] == MASTER_SHA
assert q["source"] == "hover-library"

ids = set()
for vector in invalid["vectors"]:
    assert vector["test_id"] not in ids
    ids.add(vector["test_id"])
    assert vector["expected_result"] == "REJECTED"
    assert ("mutation" in vector and "value" in vector) or "remove" in vector or ("duplicate" in vector and "value" in vector)

print(f"HANDOFF_VECTOR_VALIDATION=PASS valid=1 invalid={len(ids)}")
