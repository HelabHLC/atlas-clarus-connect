"""Build a local QuarkXPress preview from the immutable RC34.8 release ZIP."""
import argparse
import hashlib
import json
import shutil
import subprocess
import zipfile
from pathlib import Path

from add_quarkxpress import update, VERSION

HERE = Path(__file__).resolve().parent
BASE_SHA = 'ceac038f92a9c6f29e4a2421013f7c95a2db2266214b4fc6f6c6e5be06562273'
PREFIX = 'atlas-clarus-browser-bundle'
CHANGED = {'index.html', 'BUNDLE_MANIFEST.json', 'assets/app.js', 'assets/reduction-job-ui.js', 'docs/README.html', 'SHA256SUMS.txt'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def package(base, out):
    assert digest(base.read_bytes()) == BASE_SHA, 'RC34.8 input SHA-256 mismatch'
    out.mkdir(parents=True, exist_ok=True)
    root = out / PREFIX
    if root.exists():
        raise FileExistsError('Use a new output directory; existing builds are not overwritten.')
    with zipfile.ZipFile(base) as z:
        assert z.testzip() is None
        for n in z.namelist():
            assert n.startswith(PREFIX + '/') and '..' not in Path(n).parts
        before = {n.removeprefix(PREFIX + '/'): z.read(n) for n in z.namelist() if not n.endswith('/')}
        z.extractall(out)
    update(root)
    shutil.copyfile(HERE / 'QUARKXPRESS.html', root / 'docs/QUARKXPRESS.html')
    changed = {p for p, b in before.items() if (root / p).read_bytes() != b}
    assert changed == CHANGED - {'SHA256SUMS.txt'}, changed
    subprocess.run(['node', str(HERE / 'samples.cjs'), str(root)], check=True)
    sums = root / 'SHA256SUMS.txt'
    sums.write_text(''.join(digest(p.read_bytes()) + '  ' + p.relative_to(root).as_posix() + '\n'
                   for p in sorted(root.rglob('*')) if p.is_file() and p != sums))
    name = 'ATLAS_Clarus_Browser_Bundle_RC34.9_QuarkXPress_Test.zip'
    target = out / name
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(root.rglob('*')):
            if p.is_file():
                info = zipfile.ZipInfo(PREFIX + '/' + p.relative_to(root).as_posix(), (2026, 10, 30, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                z.writestr(info, p.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    info = dict(version=VERSION, bundle=target.name, bundle_sha256=digest(target.read_bytes()),
                bytes=target.stat().st_size, base_sha256=BASE_SHA,
                changed_existing_files=sorted(CHANGED), native_quarkxpress_import='NOT_TESTED', deployment_allowed=False)
    (out / 'release-info.json').write_text(json.dumps(info, indent=2) + '\n')
    print(json.dumps(info, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', required=True, type=Path)
    parser.add_argument('--output-dir', required=True, type=Path)
    args = parser.parse_args()
    package(args.base, args.output_dir)
