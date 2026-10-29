"""Build an isolated FOGRA58 fix over pinned RC34.8. No installer or deployment."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

HERE = Path(__file__).resolve().parent
BASE_SHA256 = 'ceac038f92a9c6f29e4a2421013f7c95a2db2266214b4fc6f6c6e5be06562273'
VERSION = '0.2.0-rc34.8-fogra58-profile-fix-preview'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def build(base, output):
    assert sha(base) == BASE_SHA256, 'Not the pinned RC34.8 base archive'
    dist = output / 'atlas-clarus-browser-bundle'
    assert not dist.exists(), 'Choose a fresh output directory'
    with zipfile.ZipFile(base) as z:
        assert z.testzip() is None
        assert all(n.startswith(dist.name + '/') and '..' not in Path(n).parts for n in z.namelist())
        z.extractall(output)
    before = {p.relative_to(dist).as_posix(): sha(p) for p in dist.rglob('*') if p.is_file()}
    index = dist / 'index.html'
    html = index.read_text()
    for name in ['print-ui.js']:
        asset = dist / 'assets' / name
        old, new = asset.read_text(), (HERE / 'textile' / name).read_text()
        assert html.count(old) == 1, 'Embedded source does not match asset'
        html = html.replace(old, new, 1)
        asset.write_text(new)
        (dist / 'docs/textile-handoff/source' / name).write_text(new)
    html = html.replace('0.2.0-rc34.8-coreldraw-xml', VERSION)
    index.write_text(html)
    manifest = dist / 'BUNDLE_MANIFEST.json'
    m = json.loads(manifest.read_text())
    m.update(version=VERSION, status='ISOLATED_CORRECTION_NOT_FOR_DEPLOYMENT', deployment_allowed=False,
             correction_base_archive_sha256=BASE_SHA256, physical_textile_qc='NOT_MEASURED')
    m.pop('owner_release_authorization', None)
    manifest.write_text(json.dumps(m, indent=2) + '\n')
    changed = sorted(n for n, digest in before.items() if sha(dist / n) != digest)
    assert changed == sorted(['index.html', 'BUNDLE_MANIFEST.json', 'assets/print-ui.js',
                              'docs/textile-handoff/source/print-ui.js']), changed
    (dist / 'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(dist).as_posix()}\n'
        for p in sorted(dist.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS.txt'))
    archive = output / 'ATLAS_Clarus_FOGRA58_Profile_Fix_Preview.zip'
    with zipfile.ZipFile(archive, 'w') as z:
        for p in sorted(dist.rglob('*')):
            if p.is_file():
                info = zipfile.ZipInfo(dist.name + '/' + p.relative_to(dist).as_posix(), (2026, 10, 29, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                z.writestr(info, p.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    info = dict(version=VERSION, base_archive_sha256=BASE_SHA256, archive_sha256=sha(archive),
                changed_base_files=changed + ['SHA256SUMS.txt'], unchanged_base_files=len(before)-5,
                master_and_engines_unchanged=True, deployment_allowed=False)
    (output / 'build-info.json').write_text(json.dumps(info, indent=2) + '\n')
    print(json.dumps(info, indent=2))


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--base', type=Path, required=True)
    p.add_argument('--output-dir', type=Path, required=True)
    args = p.parse_args()
    build(args.base, args.output_dir)
