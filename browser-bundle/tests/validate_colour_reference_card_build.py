"""Check opt-in integration/reproducibility and preserved default package identity."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
output = Path(os.environ.get('CARD_BUNDLE_OUTPUT', ROOT/'browser-bundle/build-colour-reference-card'))
version = '0.2.0-rc32-colour-reference-card'
cmd = ['python3', str(ROOT/'browser-bundle/build_colour_reference_card.py'), '--output-dir', str(output)]
subprocess.run(cmd, check=True)
archive = output/f'ATLAS_Clarus_Browser_Bundle_v{version}.zip'
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
subprocess.run(cmd, check=True, capture_output=True)
assert hashlib.sha256(archive.read_bytes()).hexdigest() == digest
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    prefix = 'atlas-clarus-browser-bundle/'
    for line in z.read(prefix+'SHA256SUMS.txt').decode().splitlines():
        expected, name = line.split('  ', 1)
        assert hashlib.sha256(z.read(prefix+name)).hexdigest() == expected, name
    manifest = json.loads(z.read(prefix+'BUNDLE_MANIFEST.json'))
    assert manifest['version'] == version and manifest['deployment_allowed'] is False
    html = z.read(prefix+'index.html').decode()
    assert 'id="ch-reference-card"' in html and 'id="colour-handoff"' in html
    assert 'id="colour-projects"' in html and 'id="image-projects"' in html
    assert '<script src=' not in html and '<link rel="stylesheet"' not in html
    for name in ['reference-card.js','palette-export.js','colour-handoff.js','image-projects.js']:
        assert z.read(prefix+'assets/'+name) == (ROOT/'browser-bundle/src'/name).read_bytes(), name
    assert z.read(prefix+'assets/clarus-handoff.js') == (ROOT/'browser-bundle/vendor/clarus-handoff/clarus-handoff.js').read_bytes()
with tempfile.TemporaryDirectory(prefix='atlas-card-legacy-') as tmp:
    subprocess.run(['python3',str(ROOT/'browser-bundle/build_bundle.py'),'--output-dir',tmp],check=True,capture_output=True)
    old = Path(tmp)/'ATLAS_Clarus_Browser_Bundle_v0.2.0-rc28-source-provenance.zip'
    assert hashlib.sha256(old.read_bytes()).hexdigest() == '79a7b9a3df20d0ba6e2620b1d16d39316cce5d2c8534b622d7260fe896da12d8'
report = {'status':'PASS','candidate_zip_sha256':digest,'reproducible':True,
          'legacy_rc28_byte_identical':True,'existing_modules_byte_identical':True,'self_contained':True}
evidence = Path(os.environ.get('CARD_TEST_OUTPUT','/tmp/atlas-colour-reference-card'))
evidence.mkdir(parents=True,exist_ok=True)
(evidence/'build-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
