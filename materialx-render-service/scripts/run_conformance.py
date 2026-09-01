#!/usr/bin/env python3
import argparse
import base64
import hashlib
import json
import urllib.request
from pathlib import Path

MASTER_SHA = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("material", type=Path)
    parser.add_argument("selector")
    parser.add_argument("output", type=Path)
    parser.add_argument("--endpoint", default="http://127.0.0.1:8080/v1/render")
    parser.add_argument("--token", default="ci-conformance-token")
    args = parser.parse_args()
    material = args.material.read_bytes()
    material_sha = hashlib.sha256(material).hexdigest()
    payload = {
        "connector_contract": "ATLAS_CLARUS_RENDERER_CONNECTOR_v0.1",
        "identity": {"identity_id": "atlas-colour-4665", "atlas_row": 4665, "reference_code": "H125_L075_C080", "master_sha256": MASTER_SHA, "status": "VERIFIED"},
        "display_proxy": {"master_hex": "#76CD27", "master_rgb_u8": [118, 205, 39], "source": "VERIFIED_MASTER_PROJECTION"},
        "asset": {"asset_id": "conformance-material", "uri": args.material.name, "sha256": material_sha, "media_type": "application/xml", "format": "MATERIALX", "content_base64": base64.b64encode(material).decode("ascii")},
        "material_selector": {"selector_type": "MATERIAL_ID", "value": args.selector},
        "scene": {"scene_id": "conformance-sphere-v0.4.0", "illumination": "CIE D50 / MaterialXView default environment", "view_angle_degrees": 30, "gloss_proxy_GU": 70, "camera": "MaterialXView conformance camera", "geometry": {"template": "SPHERE", "status": "BUILT_IN"}},
    }
    request = urllib.request.Request(args.endpoint, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json", "Authorization": f"Bearer {args.token}"}, method="POST")
    with urllib.request.urlopen(request, timeout=90) as response:
        result = json.load(response)
    png = base64.b64decode(result.pop("output_base64"), validate=True)
    output_sha = hashlib.sha256(png).hexdigest()
    if not png.startswith(b"\x89PNG\r\n\x1a\n") or output_sha != result["output_sha256"]:
        raise SystemExit("PNG signature or output SHA-256 verification failed")
    if result["status"] != "CALCULATED" or result["evidence_class"] != "EXTERNAL_RENDERER_OUTPUT":
        raise SystemExit("Unexpected renderer evidence status")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(png)
    args.output.with_suffix(".json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"PASS {args.material.name} {len(png)} bytes SHA-256 {output_sha}")


if __name__ == "__main__":
    main()
