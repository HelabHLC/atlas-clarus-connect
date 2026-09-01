#!/usr/bin/env python3
import argparse
import json
import pathlib
import re
import sys

SHA256 = re.compile(r"^[a-f0-9]{64}$")
MATERIAL_FORMATS = {"MATERIALX", "OPENPBR_JSON", "GLTF", "PBR_TEXTURE_SET", "AXF_ADAPTER", "OTHER"}

def validate(document):
    errors = []
    required = {"schema_version", "document_id", "document_status", "conformance_level", "identity", "assets", "material_selector", "identity_binding", "measurement_provenance", "render_results", "physical_comparison", "qc_conclusion"}
    errors.extend("missing property: " + key for key in sorted(required - set(document)))
    if errors:
        return errors
    if document["schema_version"] != "0.1":
        errors.append("schema_version must be 0.1")
    assets = document["assets"]
    ids = [asset.get("asset_id") for asset in assets]
    if len(ids) != len(set(ids)):
        errors.append("asset IDs must be unique")
    by_id = {asset.get("asset_id"): asset for asset in assets}
    for asset in assets:
        if not SHA256.fullmatch(str(asset.get("sha256", ""))):
            errors.append(f"{asset.get('asset_id')}: invalid SHA-256")
    selector = document["material_selector"]
    material = by_id.get(selector.get("asset_ref"))
    if not material or material.get("role") != "APPEARANCE_MATERIAL":
        errors.append("selector must resolve to an APPEARANCE_MATERIAL")
    elif material.get("format") not in MATERIAL_FORMATS:
        errors.append("unsupported appearance-material format declaration")
    binding = document["identity_binding"]
    if binding.get("identity_ref") != document["identity"].get("identity_id"):
        errors.append("identity_ref does not resolve")
    if binding.get("asset_ref") != selector.get("asset_ref") or binding.get("selector_ref") != selector.get("selector_id"):
        errors.append("binding asset or selector reference does not resolve")
    if binding.get("status") == "VERIFIED" and (document["identity"].get("status") != "VERIFIED" or not material or material.get("integrity_status") != "VERIFIED" or selector.get("resolution_status") != "RESOLVED"):
        errors.append("VERIFIED binding requires verified identity and bytes plus resolved selector")
    provenance = document["measurement_provenance"]
    if provenance.get("status") == "MEASURED" and (not provenance.get("evidence_refs") or not any(provenance.get(key) for key in ("organization", "device", "method"))):
        errors.append("MEASURED provenance requires evidence and method, device or organization")
    for render in document["render_results"]:
        if render.get("status") not in {"CALCULATED", "SIMULATED"}:
            errors.append("render status cannot claim physical measurement")
        output = by_id.get(render.get("output_asset_ref"))
        if not output or output.get("role") != "RENDER_RESULT":
            errors.append("render output reference does not resolve")
    physical = document["physical_comparison"]
    qc = document["qc_conclusion"]
    if physical.get("status") == "MEASURED" and not physical.get("evidence_refs"):
        errors.append("MEASURED physical comparison requires evidence")
    if qc.get("status") == "VERIFIED" and (physical.get("status") != "MEASURED" or not qc.get("evidence_refs")):
        errors.append("VERIFIED QC requires measured physical comparison and evidence")
    return errors

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("document")
    args = parser.parse_args()
    document = json.loads(pathlib.Path(args.document).read_text(encoding="utf-8"))
    errors = validate(document)
    if errors:
        print("Semantic validation: FAIL")
        for error in errors:
            print("- " + error)
        return 1
    print("Semantic validation: PASS")
    return 0

if __name__ == "__main__":
    sys.exit(main())
