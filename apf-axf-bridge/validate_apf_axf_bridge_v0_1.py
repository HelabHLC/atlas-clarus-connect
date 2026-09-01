#!/usr/bin/env python3
import argparse, json, pathlib, re, sys

SHA = re.compile(r"^[a-f0-9]{64}$")

def fail(errors, message): errors.append(message)

def semantic_validate(doc):
    errors = []
    required = {"schema_version","document_id","document_status","conformance_level","identity","assets","material_selector","identity_binding","measurement_provenance","render_results","physical_comparison","qc_conclusion"}
    for key in sorted(required - set(doc)): fail(errors, f"missing required property: {key}")
    if errors: return errors
    if doc["schema_version"] != "0.1": fail(errors, "schema_version must be 0.1")
    assets = doc["assets"]
    ids = [a.get("asset_id") for a in assets]
    if len(ids) != len(set(ids)): fail(errors, "asset_id values must be unique")
    by_id = {a.get("asset_id"): a for a in assets}
    for a in assets:
        if not SHA.fullmatch(str(a.get("sha256",""))): fail(errors, f"{a.get('asset_id')}: invalid sha256")
        if a.get("role") == "APPEARANCE_MATERIAL":
            if (a.get("media_type"), a.get("format"), a.get("file_extension"), a.get("media_type_status")) != ("application/octet-stream","AXF",".axf","UNREGISTERED_FALLBACK"):
                fail(errors, f"{a.get('asset_id')}: invalid AxF media declaration")
    selector = doc["material_selector"]
    selected = by_id.get(selector.get("asset_ref"))
    if not selected or selected.get("role") != "APPEARANCE_MATERIAL": fail(errors, "selector asset_ref must resolve to APPEARANCE_MATERIAL")
    binding = doc["identity_binding"]
    if binding.get("identity_ref") != doc["identity"].get("identity_id"): fail(errors, "binding identity_ref does not resolve")
    if binding.get("asset_ref") != selector.get("asset_ref"): fail(errors, "binding asset_ref differs from selector asset_ref")
    if binding.get("selector_ref") != selector.get("selector_id"): fail(errors, "binding selector_ref does not resolve")
    if binding.get("status") == "VERIFIED":
        if doc["identity"].get("status") != "VERIFIED": fail(errors, "VERIFIED binding requires VERIFIED identity")
        if not selected or selected.get("integrity_status") != "VERIFIED": fail(errors, "VERIFIED binding requires VERIFIED AxF bytes")
        if selector.get("resolution_status") != "RESOLVED": fail(errors, "VERIFIED binding requires RESOLVED selector")
    prov = doc["measurement_provenance"]
    if prov.get("status") == "MEASURED":
        if not prov.get("evidence_refs"): fail(errors, "MEASURED provenance requires evidence_refs")
        if not any(prov.get(k) for k in ("organization","device","method")): fail(errors, "MEASURED provenance requires organization, device or method")
    for ref in prov.get("evidence_refs", []):
        if ref not in by_id or by_id[ref].get("role") != "MEASUREMENT_EVIDENCE": fail(errors, f"measurement evidence_ref does not resolve by role: {ref}")
    render_ids = set()
    for r in doc["render_results"]:
        rid = r.get("render_id")
        if rid in render_ids: fail(errors, f"duplicate render_id: {rid}")
        render_ids.add(rid)
        if r.get("binding_ref") != binding.get("binding_id"): fail(errors, f"{rid}: binding_ref does not resolve")
        out = by_id.get(r.get("output_asset_ref"))
        if not out or out.get("role") != "RENDER_RESULT": fail(errors, f"{rid}: output_asset_ref must resolve to RENDER_RESULT")
        if r.get("status") not in ("CALCULATED","SIMULATED"): fail(errors, f"{rid}: render status cannot represent measurement")
    physical = doc["physical_comparison"]
    if physical.get("status") == "MEASURED" and not physical.get("evidence_refs"): fail(errors, "MEASURED physical comparison requires evidence")
    for ref in physical.get("evidence_refs", []):
        if ref not in by_id or by_id[ref].get("role") not in ("MEASUREMENT_EVIDENCE","QC_EVIDENCE"): fail(errors, f"physical evidence_ref does not resolve by role: {ref}")
    qc = doc["qc_conclusion"]
    if qc.get("status") == "VERIFIED":
        if physical.get("status") != "MEASURED": fail(errors, "VERIFIED QC requires MEASURED physical comparison")
        if not qc.get("evidence_refs"): fail(errors, "VERIFIED QC requires evidence_refs")
    level = doc["conformance_level"]
    if level in ("APF-AXF-RENDERED","APF-AXF-QC") and not doc["render_results"]: fail(errors, f"{level} requires a render result")
    if level in ("APF-AXF-MEASURED","APF-AXF-QC") and prov.get("status") != "MEASURED": fail(errors, f"{level} requires MEASURED provenance")
    if level == "APF-AXF-QC" and qc.get("status") != "VERIFIED": fail(errors, "APF-AXF-QC requires VERIFIED QC")
    return errors

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("document")
    ap.add_argument("--schema", default=str(pathlib.Path(__file__).parent / "schemas/apf-axf-bridge-v0.1.schema.json"))
    args = ap.parse_args()
    doc = json.loads(pathlib.Path(args.document).read_text(encoding="utf-8"))
    schema = json.loads(pathlib.Path(args.schema).read_text(encoding="utf-8"))
    try:
        import jsonschema
        jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker()).validate(doc)
        print("JSON Schema: PASS")
    except ImportError:
        print("JSON Schema: SKIPPED (install jsonschema); semantic validation continues")
    except Exception as exc:
        print(f"JSON Schema: FAIL: {exc}")
        return 1
    errors = semantic_validate(doc)
    if errors:
        print("Semantic validation: FAIL")
        for error in errors: print(f"- {error}")
        return 1
    print("Semantic validation: PASS")
    return 0

if __name__ == "__main__":
    sys.exit(main())
