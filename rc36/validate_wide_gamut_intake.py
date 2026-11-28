#!/usr/bin/env python3
"""Read-only intake gate for a locally supplied, private wide-gamut archive.

This checks integrity and candidate structure, not redistribution rights,
physical printability, measured spectra or ICC accuracy. No data are
copied into the repository or emitted by this script.
"""
import argparse
import collections
import hashlib
import json
import math
import re
import zipfile
from pathlib import Path


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--sha256", required=True, help="Independently recorded archive hash")
    args = parser.parse_args()
    require(re.fullmatch(r"[0-9a-fA-F]{64}", args.sha256), "Invalid SHA-256")
    require(hashlib.sha256(args.archive.read_bytes()).hexdigest() == args.sha256.lower(), "Archive SHA-256 mismatch")
    with zipfile.ZipFile(args.archive) as z:
        require(len(z.namelist()) == len(set(z.namelist())), "Duplicate ZIP members")
        require(z.testzip() is None, "Archive CRC mismatch")
        checks = [line.split(None, 1) for line in z.read("SHA256SUMS.txt").decode().splitlines() if line.strip()]
        names = [name.strip() for _, name in checks]
        require(len(names) == len(set(names)), "Duplicate checksum entries")
        require(set(names) == set(z.namelist()) - {"SHA256SUMS.txt"}, "Incomplete checksum coverage")
        for digest, name in checks:
            require(hashlib.sha256(z.read(name.strip())).hexdigest() == digest.lower(), "Member hash mismatch: " + name)
        doc = json.loads(z.read("spectral_candidates.json"))
    rows = doc["rows"]
    require(len(rows) == 8965, "Unexpected source count")
    require(len({r["address"] for r in rows}) == len(rows), "Duplicate source addresses")
    counts = collections.Counter(r["status"] for r in rows)
    require(counts == {"SYNTHETIC_REFERENCE_CANDIDATE": 6832, "DIGITAL_ONLY_OUTSIDE_BOUNDED_REFLECTANCE_MODEL": 2132, "IDEAL_BLACK_EE_UNDEFINED": 1}, "Unexpected candidate partition")
    candidates = [r for r in rows if r["status"] == "SYNTHETIC_REFERENCE_CANDIDATE"]
    keys = [r["address6"] for r in candidates]
    require(all(isinstance(k, str) and k for k in keys) and len(set(keys)) == len(keys), "Invalid or duplicate six-value keys")
    for r in candidates:
        require(r["physical_measurement"] is False and r["print_approval"] is False and r["feasible"] is True and r["black"] is False, "Invalid evidence classification")
        require(re.fullmatch(r"H\d{3}_L\d{3}_C\d{3}", r["address"]), "Invalid HLC address")
        require(len(r["reflectance"]) == 36 and all(math.isfinite(x) and 0 <= x <= 1 for x in r["reflectance"]), "Invalid reflectance")
        require(len(r["lab_d50"]) == 3 and all(math.isfinite(x) for x in r["lab_d50"]), "Invalid Lab target")
    p3 = sum("display-p3" in r["libraries"] for r in candidates)
    prophoto_only = sum("display-p3" not in r["libraries"] and "prophoto-rgb" in r["libraries"] for r in candidates)
    require((p3, prophoto_only) == (3237, 3595), "Unexpected library partition")
    print(json.dumps({"status": "STRUCTURAL_INTAKE_PASS", "checked_members": len(checks), "synthetic_candidates": len(candidates), "display_p3": p3, "prophoto_only": prophoto_only, "master_disjointness": "NOT_CHECKED", "distribution_rights": "NOT_CHECKED", "physical_printability": "NOT_CHECKED", "icc_gate": "SEPARATE"}, indent=2))


if __name__ == "__main__":
    main()
