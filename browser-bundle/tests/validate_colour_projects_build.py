"""Reproduce RC30 and protect the three existing bundle release identities."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
VERSION = '0.2.0-rc30-colour-projects'
with tempfile.TemporaryDirectory(prefix='atlas-projects-') as tmp:
    cmd = ['python3', str(ROOT/'browser-bundle/build_bundle.py'), '--output-dir', tmp]
    subprocess.run(cmd+['--colour-projects'], check=True, capture_output=True)
    archive = Path(tmp)/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    subprocess.run(cmd+['--colour-projects'], check=True, capture_output=True)
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == digest
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        prefix = 'atlas-clarus-browser-bundle/'
        manifest = json.loads(z.read(prefix+'BUNDLE_MANIFEST.json'))
        assert manifest['version'] == VERSION
        assert manifest['colour_projects_schema'] == 'atlas-clarus-colour-project/1.0'
        assert manifest['deployment_allowed'] is False
        assert manifest['native_adobe_validation'] == 'NOT_TESTED'
        for line in z.read(prefix+'SHA256SUMS.txt').decode().splitlines():
            expected, name = line.split('  ', 1)
            assert hashlib.sha256(z.read(prefix+name)).hexdigest() == expected, name
        html = z.read(prefix+'index.html').decode()
        assert 'id="colour-projects"' in html
        assert 'ATLAS_COLOUR_HANDOFF_UI.readCurrent=' in html
        assert 'ATLAS_COLOUR_PROJECTS_UI.init({colors' in html
        assert '<script src=' not in html and '<link rel="stylesheet"' not in html
        core = z.read(prefix+'assets/clarus-handoff.js')
        assert hashlib.sha256(core).hexdigest() == manifest['colour_handoff_shared_core_sha256']
    for flags, version, expected in [
        ([], '0.2.0-rc28-source-provenance', '79a7b9a3df20d0ba6e2620b1d16d39316cce5d2c8534b622d7260fe896da12d8'),
        (['--colour-handoff'], '0.2.0-rc29-colour-handoff', '70ef9c51a63ac9b6aa83a37250abda2ec03c6fbb512a2c9300cfba39a96c1729'),
        (['--colour-handoff', '--public-pilot'], '0.2.0-rc29.1-colour-handoff', '827ce6725ad7f0769c56ccf8583e1e82378306f9030c583cc5d593818f564dd9'),
    ]:
        subprocess.run(cmd+flags, check=True, capture_output=True)
        old = Path(tmp)/f'ATLAS_Clarus_Browser_Bundle_v{version}.zip'
        assert hashlib.sha256(old.read_bytes()).hexdigest() == expected, version
    print(json.dumps({'status': 'PASS', 'reproducible_rc30_sha256': digest, 'rc28_rc29_rc29_1_pins': 'UNCHANGED'}))
