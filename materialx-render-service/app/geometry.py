import math
from pathlib import Path


def _box() -> str:
    return """o FoldingCarton
v -1 -1 -0.55
v 1 -1 -0.55
v 1 1 -0.55
v -1 1 -0.55
v -1 -1 0.55
v 1 -1 0.55
v 1 1 0.55
v -1 1 0.55
vn 0 0 -1
vn 0 0 1
vn 0 -1 0
vn 1 0 0
vn 0 1 0
vn -1 0 0
f 1//1 4//1 3//1 2//1
f 5//2 6//2 7//2 8//2
f 1//3 2//3 6//3 5//3
f 2//4 3//4 7//4 6//4
f 3//5 4//5 8//5 7//5
f 4//6 1//6 5//6 8//6
"""


def _uv_shape(name: str, radius_fn, rings: int = 24, segments: int = 48) -> str:
    lines = [f"o {name}"]
    for ring in range(rings + 1):
        t = ring / rings
        y = -1.0 + 2.0 * t
        radius = max(0.001, radius_fn(y))
        for segment in range(segments):
            a = 2.0 * math.pi * segment / segments
            lines.append(f"v {radius * math.cos(a):.7f} {y:.7f} {radius * math.sin(a):.7f}")
    for ring in range(rings):
        for segment in range(segments):
            a = ring * segments + segment + 1
            b = ring * segments + (segment + 1) % segments + 1
            c = (ring + 1) * segments + (segment + 1) % segments + 1
            d = (ring + 1) * segments + segment + 1
            lines.append(f"f {a} {b} {c} {d}")
    return "\n".join(lines) + "\n"


def ensure_meshes(root: Path) -> dict[str, Path]:
    root.mkdir(parents=True, exist_ok=True)
    definitions = {
        "PACKAGE": _box(),
        "SPHERE": _uv_shape("MaterialSphere", lambda y: math.sqrt(max(0.0, 1.0 - y * y))),
        "BOTTLE": _uv_shape("Bottle", lambda y: 0.38 if y < 0.55 else max(0.18, 0.38 - (y - 0.55) * 0.45)),
        "CAN": _uv_shape("BeverageCan", lambda _y: 0.48),
        "PLATE": _uv_shape("MaterialPlate", lambda y: math.sqrt(max(0.0, 1.0 - y * y)) * 0.95, rings=4),
        "FABRIC": _box(),
    }
    result = {}
    for key, text in definitions.items():
        path = root / f"{key.lower()}.obj"
        if not path.exists():
            path.write_text(text, encoding="utf-8")
        result[key] = path
    return result
