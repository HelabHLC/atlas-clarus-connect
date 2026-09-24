"""Archive/source-manifest preflight; PHP execution is covered separately in CI."""
from pathlib import Path, PurePosixPath
import hashlib
import io
import json
import re
import sys
import zipfile


def verify(root):
    source = (root / "atlas-clarus-browser-edition.php").read_text(encoding="utf-8")
    bundle = (root / "assets/bundle.zip").read_bytes()
    size = int(re.search(r"const BUNDLE_SIZE\s*=\s*(\d+)", source)[1])
    sha = re.search(r"const BUNDLE_SHA256\s*=\s*'([^']+)'", source)[1]
    version = re.search(r"const VERSION\s*=\s*'([^']+)'", source)[1]
    actual_size = len(bundle)
    actual_sha = hashlib.sha256(bundle).hexdigest()
    assert actual_size == size, f"Bundle size differs from pin: actual={actual_size} pinned={size}"
    assert actual_sha == sha, f"Bundle SHA differs from pin: actual={actual_sha} pinned={sha}"
    assert re.search(r"\* Version: (\S+)", source)[1] == version
    assert "Stable tag: " + version in (root / "readme.txt").read_text()
    with zipfile.ZipFile(io.BytesIO(bundle)) as z:
        assert z.testzip() is None
        names = z.namelist()
        assert len(names) == len(set(names))
        assert all(not n.startswith("/") and ".." not in PurePosixPath(n).parts for n in names)
        manifest_name = next(n for n in names if n.endswith("/BUNDLE_MANIFEST.json"))
        prefix = manifest_name.rsplit("/", 1)[0] + "/"
        assert all(n.startswith(prefix) for n in names)
        manifest = json.loads(z.read(manifest_name))
        block = source.split("$expected = array(", 1)[1].split(");", 1)[0]
        expected = {k: v[1:-1] if v.startswith("'") else int(v)
                    for k, v in re.findall(r"'([^']+)'\s*=>\s*('[^']*'|\d+)\s*,", block)}
        assert len(expected) == 35
        for k, v in expected.items():
            assert type(manifest.get(k)) is type(v) and manifest[k] == v, k
        assert manifest["print_paths"] == ["4C", "ECG"]
        assert manifest["print_exports"] == ["PARALLEL_PRINT_JSON", "READABLE_HTML_REPORT", "PROFILED_REFERENCE_JSON", "DEVICECMYK_REFERENCE_PDF", "DEVICEN_CMYKOGV_REFERENCE_PDF"]
        assert manifest["image_preview_paper_white_simulation"] is False
        assert manifest["image_preview_exports"] == ["BA_PNG", "PREVIEW_METADATA_JSON"]
        sampling = source.split("$expected_sampling = array(", 1)[1].split(");", 1)[0]
        assert manifest["sampling_modes"] == re.findall(r"'([^']+)'", sampling)
        checked = set()
        for line in z.read(prefix + "SHA256SUMS.txt").decode().splitlines():
            digest, name = line.split("  ", 1)
            assert name not in checked
            assert hashlib.sha256(z.read(prefix + name)).hexdigest() == digest, name
            checked.add(name)
        assert {prefix + name for name in checked} == set(names) - {prefix + "SHA256SUMS.txt"}
        assert re.search(r"const BUNDLE_VERSION\s*=\s*'v([^']+)'", source)[1] == manifest["version"]
        assert "$value !== $manifest[ $key ]" in source
        assert source.index("self::validate_manifest( $manifest )") < source.index(
            "update_option( self::OPTION_RUNTIME_PATH, $runtime")
        exit_block = source.split("private static function inject_canvas_exit_button", 1)[1].split(
            "public static function serve_runtime_file", 1)[0]
        assert "position:fixed" not in exit_block
        assert "stripos( $html, '</nav>' )" in exit_block
    return {
        "plugin_version": version, "status": "TEST_CANDIDATE_ACCEPTANCE_PENDING",
        "bundle_version": manifest["version"], "bundle_size": size, "bundle_sha256": sha,
        "archive_crc": "PASS", "embedded_file_sha256": "PASS",
        "embedded_checksums_verified": len(checked), "strict_scalar_manifest_fields": len(expected),
        "sampling_and_parallel_print_arrays": "PASS", "source_manifest_alignment": "PASS",
        "source_base_commit": "13715d6f9fc28cb84ae1bf6b131eec2e5a2a1570",
        "source_candidate": "RC24 offline CHSOS mixer pilot",
        "source_review": "https://github.com/HelabHLC/atlas-clarus-connect/pull/50",
        "wrapper_php_execution": "SEPARATE_CI_JOB_WORDPRESS_BROWSER_EDITION",
        "wordpress_ionos_integration": "ACCEPTANCE_PENDING",
        "visual_desktop_and_real_smartphone": "ACCEPTANCE_PENDING",
        "print_device_calculation": manifest["print_device_calculation"],
        "image_preview_engine": manifest["image_preview_engine"],
        "real_press_profile_acceptance": "PENDING_USER_PROFILES",
    }


if __name__ == "__main__":
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent
    print(json.dumps(verify(root), indent=2))
