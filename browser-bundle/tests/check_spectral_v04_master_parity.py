#!/usr/bin/env python3
"""Verify browser-master identity against Spectral Image Profile standalone HTML."""
import argparse, json, re
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument("browser_colors", type=Path)
p.add_argument("spectral_html", type=Path)
args = p.parse_args()
browser = json.loads(args.browser_colors.read_text(encoding="utf-8"))
html = args.spectral_html.read_text(encoding="utf-8")
match = re.search(r"const MASTER=(\[.*?\]);", html, flags=re.S)
if not match:
    raise SystemExit("FAIL: standalone spectral MASTER array not found")
spectral = json.loads(match.group(1))
rows = browser["colors"]
if browser["entry_count"] != 13283 or len(rows) != 13283 or len(spectral) != 13283:
    raise SystemExit("FAIL: expected 13,283 entries in both masters")
for index, (b, s) in enumerate(zip(rows, spectral)):
    if b["id"] != index or b["ref"] != s[0] or b["rgb"] != s[1]:
        raise SystemExit(f"FAIL: master identity/RGB mismatch at row {index}")
    if len(s[2]) != 36 or any(not isinstance(v, (int, float)) or not 0 <= v <= 1 for v in s[2]):
        raise SystemExit(f"FAIL: invalid 36-point spectrum at row {index}")
print("PASS: 13,283 ordered references, identical RGB; 36 bounded spectral values each")
