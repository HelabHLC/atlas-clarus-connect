#!/usr/bin/env python3
"""Check RC28 identity and every prepared asset in the actual APK/AAB."""
import gzip
import json
from pathlib import Path
import sys
import zipfile

from test_release_identity import BUNDLE_VERSION

ASSETS = Path(__file__).resolve().parent / 'app/src/main/assets/bundle'


def check_package(path):
    prefix = 'base/assets/bundle/' if path.suffix == '.aab' else 'assets/bundle/'
    prepared = {p.relative_to(ASSETS).as_posix(): p for p in ASSETS.rglob('*') if p.is_file()}
    required = {'index.html', 'colour-id.html', 'colour-id-en.html', 'BUNDLE_MANIFEST.json'}
    assert required <= prepared.keys(), 'Missing prepared Android assets'
    expected = {name: source.read_bytes() for name, source in prepared.items()}
    # Android's asset packaging expands this precompressed JSON and drops .gz.
    # Whitelist only this observed representation change; compare all decoded
    # bytes and still reject any missing, extra or altered asset.
    gzip_name = 'assets/name-search-index-v030.json.gz'
    assert gzip_name[:-3] not in expected, 'Ambiguous compressed/uncompressed index'
    expected[gzip_name[:-3]] = gzip.decompress(expected.pop(gzip_name))
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None, f'Corrupt package: {path}'
        packed = {n[len(prefix):] for n in archive.namelist() if n.startswith(prefix) and not n.endswith('/')}
        missing = sorted(expected.keys() - packed)
        extra = sorted(packed - expected.keys())
        assert not missing and not extra, f'Packaged asset set differs: {path}; missing={missing}; extra={extra}'
        for name, content in expected.items():
            assert archive.read(prefix + name) == content, f'Packaged asset differs: {name}'
        manifest = json.loads(archive.read(prefix + 'BUNDLE_MANIFEST.json'))
        assert manifest['version'] == BUNDLE_VERSION
        assert manifest['palette_json_version'] == '1.2'
        assert manifest['source_authentication'] == 'NOT_SIGNED'
        assert manifest['source_provenance_live_acceptance'] == 'NOT_TESTED'
        assert manifest['master_sha256'] == '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
    print(f'PASS: {path.name}: {len(expected)} RC28/Colour ID assets match; name-index gzip expansion verified')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('Usage: test_packaged_bundle.py APK [AAB]')
    for argument in sys.argv[1:]:
        check_package(Path(argument))
