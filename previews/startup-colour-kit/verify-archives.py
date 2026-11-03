"""Independently check original-image and embedded-ICC retention in fixture ZIPs."""
import hashlib
import io
import json
import sys
import zipfile
from pathlib import Path
from PIL import Image

root=Path(sys.argv[1]);originals=Path(sys.argv[2]);results=[]
for p in sorted(root.glob('image-*.zip')):
    with zipfile.ZipFile(p) as archive:
        assert archive.testzip() is None
        manifest=json.loads(archive.read('manifest.json'));original=manifest['original']
        raw=archive.read(original['path']);assert raw==(originals/original['name']).read_bytes()
        for name,record in manifest['files'].items():
            payload=archive.read(name)
            assert len(payload)==record['bytes'] and hashlib.sha256(payload).hexdigest()==record['sha256']
        icc=Image.open(io.BytesIO(raw)).info.get('icc_profile')
        results.append({'image':original['name'],'original_bytes_identical':True,'icc_sha256':hashlib.sha256(icc).hexdigest() if icc else None})
assert len(results)==8
(root/'independent-archives.json').write_text(json.dumps({'status':'PASS','files':results},indent=2)+'\n')
print('PASS: 8 original images and embedded ICC profiles independently verified')
