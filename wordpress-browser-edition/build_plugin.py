"""Package the pinned RC28 WordPress candidate from an explicitly supplied archive."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import tempfile
import zipfile

from verify_package import verify

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
NAME = "ATLAS_Clarus_Browser_Edition_v0.1.15-beta8_RC28.zip"
BUNDLE = "ATLAS_Clarus_Browser_Bundle_v0.2.0-rc28-source-provenance.zip"
FILES = ("atlas-clarus-browser-edition.php", "index.php", "readme.txt")


def build(bundle, output):
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="atlas-wordpress-") as tmp:
        stage = Path(tmp) / "atlas-clarus-browser-edition"
        (stage / "assets").mkdir(parents=True)
        for name in FILES:
            shutil.copyfile(ROOT / name, stage / name)
        shutil.copyfile(bundle, stage / "assets/bundle.zip")
        report = verify(stage)
        target = output / NAME
        # Fixed metadata and ordering make the installable ZIP reproducible.
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for file in sorted(stage.rglob("*")):
                if not file.is_file():
                    continue
                stamp = (2026, 9, 25, 5, 6, 14) if file.name == 'bundle.zip' else (2026, 9, 25, 5, 9, 10)
                info = zipfile.ZipInfo(file.relative_to(Path(tmp)).as_posix(), stamp)
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
    if not args.bundle:
        parser.error('Pinned RC28 archive required: --bundle PATH. Do not use the current RC35 builder for the historical WordPress candidate.')
    bundle = args.bundle.resolve()
    if bundle.name != BUNDLE:
        parser.error(f'Expected historical RC28 archive named {BUNDLE}, got {bundle.name}')
    if not bundle.is_file():
        parser.error(f'Pinned RC28 archive does not exist: {bundle}')
    build(bundle, args.output_dir.resolve())
