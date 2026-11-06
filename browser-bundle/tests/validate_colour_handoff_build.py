"""Reproduce and inspect the opt-in RC29 artifact without changing RC28 pins."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
VERSION = '0.2.0-rc29-colour-handoff'
with tempfile.TemporaryDirectory(prefix='atlas-handoff-') as tmp:
    output = Path(tmp)
    cmd = ['python3', str(ROOT/'browser-bundle/build_bundle.py'), '--colour-handoff', '--output-dir', tmp]
    subprocess.run(cmd, check=True, capture_output=True)
    archive = output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    subprocess.run(cmd, check=True, capture_output=True)
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == digest
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        prefix = 'atlas-clarus-browser-bundle/'
        manifest = json.loads(z.read(prefix+'BUNDLE_MANIFEST.json'))
        assert manifest['version'] == VERSION
        assert manifest['status'] == 'COLOUR_HANDOFF_CANDIDATE'
        assert manifest['native_adobe_validation'] == 'NOT_TESTED'
        assert manifest['deployment_allowed'] is False
        for line in z.read(prefix+'SHA256SUMS.txt').decode().splitlines():
            expected, name = line.split('  ', 1)
            assert hashlib.sha256(z.read(prefix+name)).hexdigest() == expected, name
        core = z.read(prefix+'assets/clarus-handoff.js')
        assert core == (ROOT/'browser-bundle/vendor/clarus-handoff/clarus-handoff.js').read_bytes()
        assert hashlib.sha256(core).hexdigest() == manifest['colour_handoff_shared_core_sha256']
        assert b'MIT License' in z.read(prefix+'docs/COLOUR_HANDOFF_LICENSE.txt')
        html = z.read(prefix+'index.html').decode()
        assert 'id="colour-handoff"' in html and 'id="ch-export"' in html
        assert 'ATLAS_COLOUR_HANDOFF_UI.init({colors' in html
        assert '<script src=' not in html and '<link rel="stylesheet"' not in html
        assert html.index('root.ClarusHandoff=api') < html.index('root.ATLAS_COLOUR_HANDOFF =') < html.index('ATLAS_COLOUR_HANDOFF_UI.init({colors')
        assert 'assets/colour-handoff' not in html
        assert VERSION in html
    print(json.dumps({'status':'PASS','version':VERSION,'reproducible_zip_sha256':digest,'checksums':'PASS','self_contained':True}))
