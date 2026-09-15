"""Build the installable WordPress candidate from the pinned RC22 bundle."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import zipfile

from verify_package import verify

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
NAME = "ATLAS_Clarus_Browser_Edition_v0.1.14-beta1_RC22.zip"
BUNDLE = "ATLAS_Clarus_Browser_Bundle_v0.2.0-rc22-parallel-image-preview.zip"
FILES = ("atlas-clarus-browser-edition.php", "index.php", "readme.txt",
         "IONOS_RC22_ABNAHME.md", "verify_package.py")


def build(bundle, output):
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="atlas-wordpress-") as tmp:
        stage = Path(tmp) / "atlas-clarus-browser-edition"
        (stage / "assets").mkdir(parents=True)
        for name in FILES:
            shutil.copyfile(ROOT / name, stage / name)
        shutil.copyfile(bundle, stage / "assets/bundle.zip")
        report = verify(stage)
        (stage / "PACKAGE_VALIDATION.json").write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8")
        target = output / NAME
        # Fixed metadata and ordering make the installable ZIP reproducible.
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for file in sorted(stage.rglob("*")):
                if not file.is_file():
                    continue
                info = zipfile.ZipInfo(file.relative_to(Path(tmp)).as_posix(), (2026, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, file.read_bytes(), compresslevel=9)
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        (output / (NAME + ".sha256")).write_text(digest + "  " + NAME + "\n")
        print(json.dumps({"path": str(target), "size": target.stat().st_size, "sha256": digest,
                          "preflight": report}, indent=2))
        return target


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", type=Path)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "build")
    args = parser.parse_args()
    if args.bundle:
        build(args.bundle.resolve(), args.output_dir.resolve())
    else:
        with tempfile.TemporaryDirectory(prefix="atlas-rc22-") as tmp:
            subprocess.run([sys.executable, str(REPO / "browser-bundle/build_bundle.py"),
                            "--output-dir", tmp], check=True)
            build(Path(tmp) / BUNDLE, args.output_dir.resolve())