#!/usr/bin/env python3
import hashlib
import json
import math
import sys
from pathlib import Path
from PIL import Image, ImageCms

root = Path(__file__).resolve().parents[1]
profile_path = Path(sys.argv[1])
atlas_dir = root / "public" / "atlas"
profiles_dir = root / "public" / "profiles"
profiles_dir.mkdir(parents=True, exist_ok=True)
installed_profile = profiles_dir / "sRGB.icc"
installed_profile.write_bytes(profile_path.read_bytes())

def delta_e_2000(lab1, lab2):
    L1, a1, b1 = lab1; L2, a2, b2 = lab2
    C1 = math.hypot(a1, b1); C2 = math.hypot(a2, b2); cbar = (C1 + C2) / 2
    G = .5 * (1 - math.sqrt(cbar ** 7 / (cbar ** 7 + 25 ** 7)))
    ap1 = (1 + G) * a1; ap2 = (1 + G) * a2
    cp1 = math.hypot(ap1, b1); cp2 = math.hypot(ap2, b2)
    hp1 = math.degrees(math.atan2(b1, ap1)) % 360 if cp1 else 0
    hp2 = math.degrees(math.atan2(b2, ap2)) % 360 if cp2 else 0
    dL = L2 - L1; dC = cp2 - cp1
    dh = hp2 - hp1
    if cp1 * cp2 == 0: dh = 0
    elif dh > 180: dh -= 360
    elif dh < -180: dh += 360
    dH = 2 * math.sqrt(cp1 * cp2) * math.sin(math.radians(dh / 2))
    Lbar = (L1 + L2) / 2; Cbar = (cp1 + cp2) / 2
    if cp1 * cp2 == 0: hbar = hp1 + hp2
    elif abs(hp1 - hp2) <= 180: hbar = (hp1 + hp2) / 2
    elif hp1 + hp2 < 360: hbar = (hp1 + hp2 + 360) / 2
    else: hbar = (hp1 + hp2 - 360) / 2
    T = 1 - .17 * math.cos(math.radians(hbar - 30)) + .24 * math.cos(math.radians(2 * hbar)) + .32 * math.cos(math.radians(3 * hbar + 6)) - .20 * math.cos(math.radians(4 * hbar - 63))
    Sl = 1 + .015 * (Lbar - 50) ** 2 / math.sqrt(20 + (Lbar - 50) ** 2)
    Sc = 1 + .045 * Cbar; Sh = 1 + .015 * Cbar * T
    Rt = -2 * math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)) * math.sin(math.radians(60 * math.exp(-((hbar - 275) / 25) ** 2)))
    return math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh))

lab_profile = ImageCms.createProfile("LAB", 5000)
rgb_profile = ImageCms.getOpenProfile(str(installed_profile))
to_rgb = ImageCms.buildTransformFromOpenProfiles(lab_profile, rgb_profile, "LAB", "RGB", renderingIntent=0)
to_lab = ImageCms.buildTransformFromOpenProfiles(rgb_profile, lab_profile, "RGB", "LAB", renderingIntent=0)

inside = mapped = 0
for path in sorted(atlas_dir.glob("l[0-9][0-9][0-9].json")):
    records = json.loads(path.read_text(encoding="utf-8"))
    lab_pixels = [(round(item["lab"][0] * 255 / 100), round(item["lab"][1] + 128), round(item["lab"][2] + 128)) for item in records]
    lab_image = Image.new("LAB", (len(records), 1)); lab_image.putdata(lab_pixels)
    rgb_image = ImageCms.applyTransform(lab_image, to_rgb)
    roundtrip = ImageCms.applyTransform(rgb_image, to_lab)
    for item, rgb, lab8 in zip(records, list(rgb_image.getdata()), list(roundtrip.getdata())):
        back_lab = [lab8[0] * 100 / 255, lab8[1] - 128, lab8[2] - 128]
        de = delta_e_2000(item["lab"], back_lab)
        status = "within-tolerance" if de <= 2.0 else "profile-mapped"
        inside += status == "within-tolerance"; mapped += status == "profile-mapped"
        item["icc"] = {"rgb": list(rgb), "hex": "#%02x%02x%02x" % rgb, "deltaE00": round(de, 3), "status": status}
    path.write_text(json.dumps(records, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")

profile_bytes = installed_profile.read_bytes()
metadata = {
    "id": "artifex-srgb-v2.1",
    "name": ImageCms.getProfileName(rgb_profile).strip(),
    "filename": "sRGB.icc",
    "iccVersion": "2.1",
    "profileClass": "display",
    "deviceSpace": "RGB",
    "pcs": "XYZ",
    "renderingIntent": "perceptual",
    "sha256": hashlib.sha256(profile_bytes).hexdigest(),
    "sizeBytes": len(profile_bytes),
    "roundTripToleranceDeltaE00": 2.0,
    "withinTolerance": inside,
    "profileMapped": mapped,
    "method": "CIELAB D50 → ICC sRGB → CIELAB D50 round trip via LittleCMS",
}
(profiles_dir / "sRGB-profile.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
print(json.dumps(metadata, indent=2))
