#!/usr/bin/env python3
"""Independent ICC roundtrip reference via Pillow/ImageCms (system LittleCMS).

Usage: python open-dcm/independent_icc_reference.py PSOcoated_v3.icc 232 104 42
Produces JSON; refuses wrong catalog-pinned bytes. Requires Pillow.
This is a separate LittleCMS binding, not an independent colour science engine.
"""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image, ImageCms

EXPECTED_SHA256 = "c30ad2c01e8f93135ec7682c535e0a81bc2d177c301e196376c5f5838b5c8e86"
EXPECTED_SIZE = 2195228

def run(path, rgb, intent=1, bpc=False):
    data = Path(path).read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if len(data) != EXPECTED_SIZE or digest != EXPECTED_SHA256:
        raise ValueError("PSOcoated_v3.icc does not match the pinned ATLAS catalog")
    if len(rgb) != 3 or any(v < 0 or v > 255 for v in rgb):
        raise ValueError("Expected 3 sRGB8 values")
    if not 0 <= intent <= 3:
        raise ValueError("Invalid rendering intent")
    src = ImageCms.createProfile("sRGB")
    dst = ImageCms.getOpenProfile(str(path))
    flags = int(ImageCms.Flags.BLACKPOINTCOMPENSATION) if bpc else 0
    image = Image.new("RGB", (1, 1), tuple(rgb))
    forward = ImageCms.buildTransformFromOpenProfiles(src, dst, "RGB", "CMYK", renderingIntent=intent, flags=flags)
    backward = ImageCms.buildTransformFromOpenProfiles(dst, src, "CMYK", "RGB", renderingIntent=1, flags=0)
    separated = ImageCms.applyTransform(image, forward)
    returned = ImageCms.applyTransform(separated, backward)
    return {
        "profile_sha256": digest, "profile_bytes": len(data),
        "source_rgb8": list(rgb), "device_cmyk8": list(separated.getpixel((0,0))),
        "returned_rgb8": list(returned.getpixel((0,0))),
        "forward_intent": intent, "forward_bpc": bpc,
        "return_intent": 1, "return_bpc": False,
        "engine": "Pillow ImageCms / system LittleCMS",
        "note": "Independent binding, shared LittleCMS family; 8-bit CMYK quantization may differ from browser device16"
    }

if __name__ == "__main__":
    if len(sys.argv) not in (5, 6, 7):
        raise SystemExit("Usage: script ICC R G B [intent 0..3] [bpc true|false]")
    p = Path(sys.argv[1])
    rgb = [int(v) for v in sys.argv[2:5]]
    intent = int(sys.argv[5]) if len(sys.argv) >= 6 else 1
    bpc = sys.argv[6].lower() == "true" if len(sys.argv) >= 7 else False
    print(json.dumps(run(p, rgb, intent, bpc), indent=2))
