"""Prepare a clean, pinned ArtCraft checkout; never edit an installed app."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent


def run(root, *args):
    return subprocess.check_output(list(args), cwd=root, text=True).strip()


def prepare(root):
    root = root.resolve()
    manifest = json.loads((HERE / "build-manifest.json").read_text())
    if run(root, "git", "rev-parse", "HEAD") != manifest["upstream_commit"]:
        raise SystemExit("Refusing to modify a different ArtCraft revision.")
    if run(root, "git", "status", "--porcelain"):
        raise SystemExit("Use a fresh checkout; this one contains local changes.")
    for name, expected in manifest["patches"].items():
        actual = hashlib.sha256((HERE / name).read_bytes()).hexdigest()
        if actual != expected:
            raise SystemExit(f"Patch checksum mismatch: {name}")
    patches = [str(HERE / name) for name in manifest["patches"]]
    subprocess.run(["git", "apply", "--check", *patches], cwd=root, check=True)
    subprocess.run(["git", "apply", *patches], cwd=root, check=True)
    config = json.loads((root / "crates/desktop/artcraft/tauri.conf.json").read_text())
    if config["identifier"] != manifest["identifier"] or config["productName"] != manifest["product_name"]:
        raise SystemExit("Pilot application identity was not applied.")
    native = (root / "crates/desktop/artcraft/src/core/state/data_dir/app_data_root.rs").read_text()
    if 'const DEFAULT_DATA_DIR : &str = "Artcraft-ATLAS-Pilot";' not in native:
        raise SystemExit("Separate native data directory was not applied.")
    csv = root / "frontend/libs/components/moodboard/src/lib/clarus/reference-rgb.csv"
    if hashlib.sha256(csv.read_bytes()).hexdigest() != manifest["reference_csv_sha256"]:
        raise SystemExit("Pinned reference projection changed.")
    # The extractor and dependency locks must retain their upstream bytes.
    for name in ["frontend/libs/components/moodboard/src/lib/boards/palette.ts",
                 "Cargo.lock", "frontend/package-lock.json"]:
        if run(root, "git", "diff", "HEAD", "--", name):
            raise SystemExit(f"Unexpected change to {name}")
    print(json.dumps({
        "status": "PASS", "upstream_commit": manifest["upstream_commit"],
        "identifier": config["identifier"], "data_directory": manifest["data_directory_name"],
        "scope": "Source preparation only; native runtime acceptance is separate.",
    }, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkout", type=Path)
    args = parser.parse_args()
    prepare(args.checkout)
