"""Independent ZIP, SHA-256 and embedded ICC oracle for browser downloads."""
import hashlib
import io
import json
import sys
import zipfile
from pathlib import Path
from PIL import Image

fixtures, evidence = map(Path, sys.argv[1:])
oracle = json.loads((fixtures / 'oracle.json').read_text())
results = []
for name, expected in oracle.items():
    source = (fixtures / name).read_bytes()
    archive = (evidence / (name + '.zip')).read_bytes()
    assert archive == (evidence / (name + '.restored.zip')).read_bytes()
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        assert z.testzip() is None
        manifest = json.loads(z.read('manifest.json'))
        original = z.read(manifest['original']['path'])
        assert original == source
        for path, check in manifest['files'].items():
            data = z.read(path)
            assert len(data) == check['bytes']
            assert hashlib.sha256(data).hexdigest() == check['sha256']
        assert z.read('colour.clarus.json') == (evidence / (name + '.clarus.json')).read_bytes()
        with Image.open(io.BytesIO(original)) as retained, Image.open(io.BytesIO(source)) as before:
            profile = retained.info.get('icc_profile')
            assert profile == before.info.get('icc_profile')
            assert (hashlib.sha256(profile).hexdigest() if profile else None) == expected['icc_sha256']
        results.append({'image': name, 'original_byte_identical': True,
                        'embedded_icc_bytes': len(profile) if profile else 0})
result = {'status': 'PASS', 'independent_reader': 'Python zipfile + hashlib + Pillow', 'images': results}
(evidence / 'independent-verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
