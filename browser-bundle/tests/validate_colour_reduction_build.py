"""Verify a repeatable RC33 build and immutable reference/history boundaries."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

ROOT=Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory() as tmp:
    tmp=Path(tmp)
    for folder,script in [('base','build_image_exchange_pilot.py'),('one','build_colour_reduction.py'),('two','build_colour_reduction.py')]:
        subprocess.run([sys.executable,str(ROOT/'browser-bundle'/script),'--output-dir',str(tmp/folder)],check=True,capture_output=True)
    a=next((tmp/'one').glob('*.zip'));b=next((tmp/'two').glob('*.zip'))
    assert a.read_bytes()==b.read_bytes(),'non-deterministic archive'
    base=tmp/'base/atlas-clarus-browser-bundle';new=tmp/'one/atlas-clarus-browser-bundle'
    allowed={'index.html','BUNDLE_MANIFEST.json','SHA256SUMS.txt','assets/app.js','assets/image-projects-ui.js'}
    for old in base.rglob('*'):
        if old.is_file() and old.relative_to(base).as_posix() not in allowed:
            assert old.read_bytes()==(new/old.relative_to(base)).read_bytes(),old
    html=(new/'index.html').read_text()
    for name in ['image-projects-ui.js','colour-reduction.js','colour-reduction-loupe.js','colour-reduction-ui.js','app.js']:
        assert '<script>'+(new/'assets'/name).read_text().replace('</script','<\\/script')+'</script>' in html,name
    for line in (new/'SHA256SUMS.txt').read_text().splitlines():
        digest,name=line.split('  ',1)
        assert hashlib.sha256((new/name).read_bytes()).hexdigest()==digest,name
    m=json.loads((new/'BUNDLE_MANIFEST.json').read_text())
    assert m['colour_reduction_max_colours']==256 and m['deployment_allowed'] is False
    with zipfile.ZipFile(a) as z: assert z.testzip() is None
print('PASS: reproducible package, inline/assets agree, all hashes, reference/decoder/history bytes unchanged')
