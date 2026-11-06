import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import photocraft_atlas_bridge as bridge


class FakeClient:
    def __init__(self):
        self.calls = []
        self.scratch_open = False

    def call(self, method, params=None):
        self.calls.append((method, params or {}))
        raise AssertionError((method, params))

    def engine(self, command, params=None):
        params = params or {}
        self.calls.append(("engine:" + command, params))
        if command == "document.inspect":
            if self.scratch_open:
                return {"name": "ATLAS Clarus Pilot Scratch", "width": 20, "height": 20, "mode": "Rgb", "depth": 8, "revision": 2}
            return {"name": "Original", "width": 20, "height": 20, "mode": "Rgb", "depth": 8, "revision": 7}
        if command == "edit.profileInfo":
            return {"profile": {"description": "sRGB IEC61966-2.1", "colorSpace": "Rgb", "embedded": True}}
        if command == "image.duplicate":
            self.scratch_open = True
            return {"document": 1}
        if command == "edit.convertToProfile":
            return {"profile": "sRGB IEC61966-2.1", "mode": "Rgb", "intent": "relative", "bpc": True}
        if command == "document.sampleColor":
            return [61 / 255.0, 123 / 255.0, 25 / 255.0, 1.0]
        if command == "file.close":
            self.scratch_open = False
            return None
        raise AssertionError((command, params))


class BridgeTests(unittest.TestCase):
    def test_nearest_tie_uses_lower_row(self):
        rows = [
            bridge.MasterRow(9, "high", (10, 10, 10), "#0A0A0A", None),
            bridge.MasterRow(2, "low", (12, 10, 10), "#0C0A0A", None),
        ]
        row, d2 = bridge.nearest((11, 10, 10), rows)
        self.assertEqual((row.id, d2), (2, 1))

    def test_math_round_quantization(self):
        self.assertEqual(bridge.quantize_u8(0.5 / 255.0), 1)
        self.assertEqual(bridge.quantize_u8(254.5 / 255.0), 255)
        self.assertEqual(bridge.quantize_u8(-1), 0)
        self.assertEqual(bridge.quantize_u8(2), 255)

    def test_capture_uses_scratch_and_preserves_original(self):
        rows = [bridge.MasterRow(4966, "H130_L045_C055", (55, 121, 26), "#37791A", (45.0, 0.0, 0.0))]
        client = FakeClient()
        record = bridge.capture_point(client, rows, 2, 3)
        self.assertEqual(record["source"]["source_rgb"], [61, 123, 25])
        self.assertEqual(record["assignment"]["atlas_row_id"], 4966)
        self.assertEqual(record["assignment"]["distance_squared"], 41)
        self.assertEqual(record["source"]["representation"], bridge.SOURCE_REPRESENTATION)
        self.assertTrue(record["photocraft"]["scratch_normalization"]["original_revision_unchanged"])
        self.assertFalse(record["boundary"]["clarus_palette_json_1_2"])
        self.assertFalse(client.scratch_open)
        commands = [name for name, _ in client.calls]
        self.assertIn("engine:image.duplicate", commands)
        self.assertIn("engine:edit.convertToProfile", commands)
        self.assertIn("engine:document.sampleColor", commands)
        self.assertIn("engine:file.close", commands)

    def test_known_master_examples(self):
        master = HERE.parents[1] / "hover-library" / "data" / "colors.json"
        rows = bridge.load_master(master)
        examples = [
            ((61, 123, 25), 4966, "H130_L045_C055", (55, 121, 26), 41),
            ((225, 192, 25), 3259, "H090_L080_C075", (226, 196, 35), 117),
            ((236, 214, 30), 3446, "H095_L085_C080", (230, 215, 31), 38),
        ]
        for rgb, row_id, ref, reference_rgb, d2 in examples:
            row, got = bridge.nearest(rgb, rows)
            self.assertEqual((row.id, row.ref, row.rgb, got), (row_id, ref, reference_rgb, d2))


if __name__ == "__main__":
    unittest.main()
