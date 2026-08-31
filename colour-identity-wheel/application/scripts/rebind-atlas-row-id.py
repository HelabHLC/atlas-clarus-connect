#!/usr/bin/env python3
"""Rebind generated wheel records to the active master's zero-based atlas_row_id.

Usage: python3 scripts/rebind-atlas-row-id.py /path/to/colors.json
The supplied authority document must match the wheel manifest SHA-256 and count.
"""
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
atlas = root / "public" / "atlas"
authority = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
manifest = json.loads((atlas / "manifest.json").read_text(encoding="utf-8"))

if authority.get("master_sha256") != manifest.get("sourceSha256"):
    raise SystemExit("Master SHA-256 mismatch; identity rebinding blocked")
if authority.get("entry_count") != 13283 or len(authority.get("colors", [])) != 13283:
    raise SystemExit("Authority entry count mismatch; identity rebinding blocked")

by_reference = {item["ref"]: int(item["id"]) for item in authority["colors"]}
if len(by_reference) != 13283 or len(set(by_reference.values())) != 13283:
    raise SystemExit("Authority identities are not unique")

seen = set()
for path in sorted(atlas.glob("l[0-9][0-9][0-9].json")):
    records = json.loads(path.read_text(encoding="utf-8"))
    for record in records:
        reference = record["sample"]
        if reference not in by_reference:
            raise SystemExit(f"Unknown reference in wheel data: {reference}")
        record["id"] = by_reference[reference]
        seen.add(record["id"])
    records.sort(key=lambda item: (item["c"], item["h"], item["id"]))
    path.write_text(json.dumps(records, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")

if len(seen) != 13283:
    raise SystemExit(f"Expected 13283 unique atlas_row_id values, got {len(seen)}")

print("PASS: rebound 13283 wheel records to normative zero-based atlas_row_id")
