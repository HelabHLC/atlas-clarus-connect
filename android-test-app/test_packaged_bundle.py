#!/usr/bin/env python3
"""Check beta.6 source binding and every prepared asset in the actual APK/AAB."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import zipfile

from test_release_identity import BUNDLE_VERSION, BUNDLE_SHA256, VERSION_NAME, VERSION_CODE, SOURCE_BINDING_SHA256

ASSETS = Path(__file__).resolve().parent / 'app/src/main/assets/bundle'


def check_package(path):
    prefix = 'base/assets/bundle/' if path.suffix == '.aab' else 'assets/bundle/'
    prepared = {p.relative_to(ASSETS).as_posix(): p for p in ASSETS.rglob('*') if p.is_file()}
    required = {'index.html', 'colour-id.html', 'colour-id-en.html', 'BUNDLE_MANIFEST.json',
                'ANDROID_CANDIDATE.json', 'assets/image-projects.js', 'assets/image-projects-ui.js',
                'assets/image-project-codecs.js', 'assets/colour-projects.js'}
    assert required <= prepared.keys(), 'Missing prepared Android assets'
    expected = {name: source.read_bytes() for name, source in prepared.items()}
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
        assert manifest['master_sha256'] == '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
        candidate = json.loads(archive.read(prefix + 'ANDROID_CANDIDATE.json'))
        assert candidate['version_name'] == VERSION_NAME and candidate['version_code'] == VERSION_CODE
        assert candidate['application_id'] == 'com.atlasclarus.connect'
        assert candidate['bundle_zip_sha256'] == BUNDLE_SHA256
        for name, digest in SOURCE_BINDING_SHA256.items():
            raw = archive.read(prefix + 'assets/' + name)
            assert hashlib.sha256(raw).hexdigest() == digest, f'Wrong source-binding module: {name}'
            embedded = raw.decode('utf-8').replace('</script', '<\\/script')
            assert ('<script>' + embedded + '</script>') in archive.read(prefix + 'index.html').decode('utf-8'), f'Wrong embedded source-binding module: {name}'
    print(f'PASS: {path.name}: {len(expected)} beta.6/Colour ID assets match; source binding and name-index expansion verified')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('Usage: test_packaged_bundle.py APK [AAB]')
    for argument in sys.argv[1:]:
        check_package(Path(argument))
