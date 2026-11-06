#!/usr/bin/env python3
"""PhotoCraft × ATLAS Clarus control-bridge pilot 0.1.

Reads one point from PhotoCraft through its authenticated loopback control
channel without modifying PhotoCraft core or the original document. The pilot
duplicates the visible composite, converts the scratch duplicate to PhotoCraft's
built-in sRGB profile, samples one point, closes the scratch document, verifies
the original revision, and binds the resulting 8-bit sRGB value to the frozen
ATLAS Clarus master.

The output is deliberately NOT Clarus palette JSON 1.2. That schema currently
defines browser-decoded source provenance; PhotoCraft provenance is kept
separate instead of being mislabeled.
"""
from __future__ import annotations

import argparse
import json
import math
import socket
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

MASTER_SHA256 = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"
MASTER_ROWS = 13283
PILOT_FORMAT = "ATLAS_CLARUS_PHOTOCRAFT_OBSERVATION"
PILOT_VERSION = "0.1"
WORKFLOW = "ATLAS Clarus PhotoCraft Pilot 0.1"
SOURCE_REPRESENTATION = "PHOTOCRAFT_COMPOSITE_CONVERTED_TO_SRGB_U8"
MAX_REQUEST_BYTES = 1024 * 1024
MAX_REPLY_BYTES = 8 * 1024 * 1024
ALPHA_THRESHOLD = 128


class PilotError(RuntimeError):
    pass


@dataclass(frozen=True)
class MasterRow:
    id: int
    ref: str
    rgb: tuple[int, int, int]
    hex: str
    lab: tuple[float, float, float] | None


def rgb_hex(rgb: tuple[int, int, int]) -> str:
    return "#" + "".join(f"{v:02X}" for v in rgb)


def load_master(path: Path) -> list[MasterRow]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PilotError(f"cannot read ATLAS master view: {exc}") from exc
    if not isinstance(data, dict):
        raise PilotError("ATLAS master view must be a JSON object")
    if data.get("master_sha256") != MASTER_SHA256:
        raise PilotError("ATLAS master SHA-256 mismatch")
    colors = data.get("colors")
    if data.get("entry_count") != MASTER_ROWS or not isinstance(colors, list) or len(colors) != MASTER_ROWS:
        raise PilotError("ATLAS master row count mismatch")

    rows: list[MasterRow] = []
    seen: set[int] = set()
    for raw in colors:
        if not isinstance(raw, dict):
            raise PilotError("ATLAS master contains a non-object row")
        row_id = raw.get("id")
        ref = raw.get("ref")
        rgb = raw.get("rgb")
        if (
            not isinstance(row_id, int)
            or isinstance(row_id, bool)
            or row_id < 0
            or row_id in seen
            or not isinstance(ref, str)
            or not ref
            or not isinstance(rgb, list)
            or len(rgb) != 3
            or any(not isinstance(v, int) or isinstance(v, bool) or not 0 <= v <= 255 for v in rgb)
        ):
            raise PilotError("ATLAS master contains an invalid identity row")
        rgb_t = (rgb[0], rgb[1], rgb[2])
        expected_hex = rgb_hex(rgb_t)
        stored_hex = str(raw.get("hex", expected_hex)).upper()
        if stored_hex != expected_hex:
            raise PilotError(f"ATLAS master HEX/RGB mismatch at row {row_id}")
        lab_raw = raw.get("lab")
        lab = None
        if (
            isinstance(lab_raw, list)
            and len(lab_raw) == 3
            and all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(float(v)) for v in lab_raw)
        ):
            lab = tuple(float(v) for v in lab_raw)
        rows.append(MasterRow(row_id, ref, rgb_t, expected_hex, lab))
        seen.add(row_id)

    if len(seen) != MASTER_ROWS:
        raise PilotError("ATLAS master atlas_row_id values are not unique")
    return rows


def distance_squared(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return sum((x - y) ** 2 for x, y in zip(a, b))


def nearest(rgb: tuple[int, int, int], rows: list[MasterRow]) -> tuple[MasterRow, int]:
    best: MasterRow | None = None
    best_d = 1 << 62
    for row in rows:
        d = distance_squared(rgb, row.rgb)
        if d < best_d or (d == best_d and (best is None or row.id < best.id)):
            best, best_d = row, d
    if best is None:
        raise PilotError("ATLAS master is empty")
    return best, best_d


def quantize_u8(value: float) -> int:
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(float(value)):
        raise PilotError("PhotoCraft returned a non-finite channel")
    # JavaScript Math.round semantics on the non-negative [0,1] channel domain.
    value = max(0.0, min(1.0, float(value)))
    return int(math.floor(value * 255.0 + 0.5))


class ControlClient:
    """Minimal client for PhotoCraft's authenticated JSON-lines control server."""

    def __init__(self, host: str, port: int, token: str, timeout: float = 30.0):
        if host not in {"127.0.0.1", "localhost", "::1"}:
            raise PilotError("pilot 0.1 only connects to a loopback PhotoCraft control server")
        token = token.strip()
        if len(token) != 64 or any(ch not in "0123456789abcdefABCDEF" for ch in token):
            raise PilotError("PhotoCraft control token must be 64 hexadecimal characters")
        self._sock = socket.create_connection((host, port), timeout=timeout)
        self._sock.settimeout(timeout)
        self._file = self._sock.makefile("rwb")
        self._next_id = 1
        self._request("auth", {"token": token}, request_id="auth")

    def close(self) -> None:
        try:
            self._file.close()
        finally:
            self._sock.close()

    def __enter__(self) -> "ControlClient":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    def _request(self, method: str, params: dict[str, Any], request_id: int | str | None = None) -> Any:
        rid = self._next_id if request_id is None else request_id
        if request_id is None:
            self._next_id += 1
        wire = (json.dumps({"id": rid, "method": method, "params": params}, separators=(",", ":")) + "\n").encode("utf-8")
        if len(wire) > MAX_REQUEST_BYTES:
            raise PilotError("PhotoCraft control request exceeds 1 MiB")
        self._file.write(wire)
        self._file.flush()
        line = self._file.readline(MAX_REPLY_BYTES + 1)
        if not line:
            raise PilotError("PhotoCraft control connection closed")
        if len(line) > MAX_REPLY_BYTES:
            raise PilotError("PhotoCraft control reply exceeds 8 MiB")
        try:
            response = json.loads(line)
        except json.JSONDecodeError as exc:
            raise PilotError("PhotoCraft returned invalid JSON") from exc
        if response.get("id") != rid:
            raise PilotError("PhotoCraft reply id does not match the request")
        if response.get("ok") is not True:
            raise PilotError(str(response.get("error", "PhotoCraft command failed")))
        return response.get("result")

    def call(self, method: str, params: dict[str, Any] | None = None) -> Any:
        return self._request(method, params or {})

    def engine(self, command: str, params: dict[str, Any] | None = None) -> Any:
        return self.call("engine.execute", {"command": command, "params": params or {}})


def capture_point(client: Any, rows: list[MasterRow], x: int, y: int) -> dict[str, Any]:
    """Capture one composite point without changing the original PhotoCraft document."""
    if not isinstance(x, int) or isinstance(x, bool) or not isinstance(y, int) or isinstance(y, bool):
        raise PilotError("x and y must be integer document coordinates")

    # Desktop PhotoCraft's live control channel exposes engine.execute and ui.*.
    # The headless-only convenience methods session.list/doc.inspect are deliberately
    # not used here (PhotoCraft 0.8.2 desktop correctly rejects them as unknown).
    original = client.engine("document.inspect", {})
    if not isinstance(original, dict):
        raise PilotError("PhotoCraft document inspection failed")
    width, height = original.get("width"), original.get("height")
    if not isinstance(width, int) or not isinstance(height, int) or not (0 <= x < width and 0 <= y < height):
        raise PilotError(f"sample coordinate {x},{y} is outside the {width}x{height} document")
    original_revision = original.get("revision")
    if not isinstance(original_revision, int):
        raise PilotError("PhotoCraft did not report the original document revision")
    original_profile = client.engine("edit.profileInfo", {})

    scratch_index: int | None = None
    scratch_inspect: dict[str, Any] | None = None
    scratch_profile: dict[str, Any] | None = None
    conversion: Any = None
    sample: Any = None

    try:
        duplicate = client.engine("image.duplicate", {"name": "ATLAS Clarus Pilot Scratch", "mergedOnly": True})
        scratch_index = duplicate.get("document") if isinstance(duplicate, dict) else None
        if not isinstance(scratch_index, int):
            raise PilotError("PhotoCraft did not return the scratch document index")

        conversion = client.engine("edit.convertToProfile", {"profile": "srgb", "intent": "relative", "bpc": True})
        scratch_inspect = client.engine("document.inspect", {})
        scratch_profile = client.engine("edit.profileInfo", {})
        sample = client.engine(
            "document.sampleColor",
            {"x": x + 0.5, "y": y + 0.5, "size": 1, "sampleLayer": "all"},
        )
    finally:
        if scratch_index is not None:
            try:
                client.engine("file.close", {"document": scratch_index})
            except Exception as close_exc:
                raise PilotError(f"scratch document could not be closed: {close_exc}") from close_exc

    original_after = client.engine("document.inspect", {})
    if (
        not isinstance(original_after, dict)
        or original_after.get("revision") != original_revision
        or original_after.get("name") != original.get("name")
        or original_after.get("width") != width
        or original_after.get("height") != height
    ):
        raise PilotError("original PhotoCraft document identity or revision changed during the pilot")

    if not isinstance(scratch_inspect, dict) or scratch_inspect.get("mode") != "Rgb":
        raise PilotError("scratch document was not converted to RGB")
    scratch_profile_record = scratch_profile.get("profile") if isinstance(scratch_profile, dict) else None
    if not isinstance(scratch_profile_record, dict) or scratch_profile_record.get("colorSpace") != "Rgb":
        raise PilotError("scratch document profile is not RGB")
    if not isinstance(sample, list) or len(sample) < 4:
        raise PilotError("PhotoCraft returned an invalid RGBA sample")

    rgba_u8 = tuple(quantize_u8(float(v)) for v in sample[:4])
    if rgba_u8[3] < ALPHA_THRESHOLD:
        raise PilotError(f"sample alpha {rgba_u8[3]} is below the pilot threshold {ALPHA_THRESHOLD}")

    source_rgb = (rgba_u8[0], rgba_u8[1], rgba_u8[2])
    row, d2 = nearest(source_rgb, rows)
    original_profile_record = original_profile.get("profile") if isinstance(original_profile, dict) else None

    return {
        "format": PILOT_FORMAT,
        "version": PILOT_VERSION,
        "workflow": WORKFLOW,
        "master_sha256": MASTER_SHA256,
        "master_rows": MASTER_ROWS,
        "freeze_status": "FROZEN",
        "computational_status": "COMPUTATIONAL_ONLY",
        "measured_qc_status": "NOT_MEASURED",
        "signature_status": "NOT_SIGNED",
        "source": {
            "representation": SOURCE_REPRESENTATION,
            "color_space": "sRGB",
            "bits_per_channel": 8,
            "source_rgb": list(source_rgb),
            "source_hex": rgb_hex(source_rgb),
            "source_alpha_u8": rgba_u8[3],
        },
        "photocraft": {
            "original_document": {
                "name": str(original.get("name", "")),
                "width": width,
                "height": height,
                "mode": original.get("mode"),
                "depth": original.get("depth"),
                "revision": original_revision,
                "profile": original_profile_record,
                "path_recorded": False,
            },
            "scratch_normalization": {
                "duplicate": {"mergedOnly": True},
                "convert_to_profile": {"profile": "srgb", "intent": "relative", "bpc": True},
                "conversion_result": conversion,
                "mode_after": scratch_inspect.get("mode"),
                "depth_after": scratch_inspect.get("depth"),
                "profile_after": scratch_profile_record,
                "original_revision_unchanged": True,
            },
        },
        "sampling": {
            "mode": "PIXEL_RGB",
            "sample_layer": "all",
            "requested_size": 1,
            "centre": [x, y],
            "control_coordinate": [x + 0.5, y + 0.5],
            "rgba_float_after_srgb_conversion": [float(v) for v in sample[:4]],
            "alpha_threshold_u8": ALPHA_THRESHOLD,
            "rounding": "MATH_ROUND_PER_CHANNEL",
        },
        "assignment": {
            "metric": "RGB_SQUARED_DISTANCE",
            "tie_break": "LOWER_ATLAS_ROW_ID",
            "distance_squared": d2,
            "atlas_row_id": row.id,
            "reference": row.ref,
            "reference_rgb": list(row.rgb),
            "reference_hex": row.hex,
            "reference_lab": list(row.lab) if row.lab is not None else None,
        },
        "boundary": {
            "clarus_palette_json_1_2": False,
            "reason": (
                "Clarus JSON 1.2 currently defines BROWSER_DECODED_SRGB source provenance; "
                "this PhotoCraft observation is kept separate rather than mislabeled."
            ),
            "physical_measurement": False,
            "production_approval": False,
        },
    }


def build_parser() -> argparse.ArgumentParser:
    here = Path(__file__).resolve()
    default_master = here.parents[2] / "hover-library" / "data" / "colors.json"
    parser = argparse.ArgumentParser(description="Capture one PhotoCraft point and resolve its ATLAS Clarus reference.")
    parser.add_argument("--host", default="127.0.0.1", help="PhotoCraft control host (loopback only)")
    parser.add_argument("--port", type=int, default=7878, help="PhotoCraft control port")
    parser.add_argument("--token-file", type=Path, required=True, help="PhotoCraft control token file")
    parser.add_argument("--master", type=Path, default=default_master, help="ATLAS master view colors.json")
    parser.add_argument("--x", type=int, required=True, help="zero-based document pixel x")
    parser.add_argument("--y", type=int, required=True, help="zero-based document pixel y")
    parser.add_argument("--output", type=Path, help="write observation JSON here; otherwise stdout")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        token = args.token_file.read_text(encoding="utf-8").strip()
        rows = load_master(args.master)
        with ControlClient(args.host, args.port, token) as client:
            record = capture_point(client, rows, args.x, args.y)
        encoded = json.dumps(record, indent=2, ensure_ascii=False) + "\n"
        if args.output:
            args.output.write_text(encoded, encoding="utf-8")
            print(args.output)
        else:
            print(encoded, end="")
        return 0
    except (OSError, PilotError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
