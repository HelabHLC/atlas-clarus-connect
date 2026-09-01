import hashlib
import json
import os
import subprocess
import time
from pathlib import Path

from .geometry import ensure_meshes


class RendererUnavailable(RuntimeError):
    pass


class RenderFailed(RuntimeError):
    pass


def canonical_sha256(value: object) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def render(material: Path, output: Path, scene: dict, timeout_seconds: int) -> tuple[bytes, str]:
    executable = Path(os.environ.get("MATERIALX_VIEW", "/opt/materialx/bin/MaterialXView"))
    if not executable.is_file() or not os.access(executable, os.X_OK):
        raise RendererUnavailable(f"MaterialXView executable is unavailable: {executable}")

    meshes = ensure_meshes(Path(os.environ.get("ATLAS_MESH_DIR", "/tmp/atlas-clarus-meshes")))
    template = str(scene.get("geometry", {}).get("template", "SPHERE")).upper()
    mesh = meshes.get(template, meshes["SPHERE"])
    angle = float(scene.get("view_angle_degrees", 30.0))
    command = [
        str(executable),
        "--material", str(material),
        "--mesh", str(mesh),
        "--meshRotation", f"0,{angle},0",
        "--screenWidth", "960",
        "--screenHeight", "600",
        "--screenColor", "0.09,0.13,0.18",
        "--captureFilename", str(output),
        "--refresh", "-1",
    ]
    prefix = os.environ.get("MATERIALX_DISPLAY_WRAPPER", "xvfb-run -a").split()
    process = subprocess.Popen(prefix + command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    deadline = time.monotonic() + timeout_seconds
    previous_size = -1
    stable_checks = 0
    try:
        while time.monotonic() < deadline:
            code = process.poll()
            if output.is_file() and output.stat().st_size > 8:
                size = output.stat().st_size
                stable_checks = stable_checks + 1 if size == previous_size else 0
                previous_size = size
                if stable_checks >= 2:
                    break
            if code is not None:
                break
            time.sleep(0.25)
        if not output.is_file():
            log = (process.stdout.read() if process.stdout else "")[-4000:]
            raise RenderFailed(f"MaterialXView produced no capture. {log}")
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
    data = output.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RenderFailed("MaterialXView output is not a valid PNG signature.")
    return data, canonical_sha256(scene)
