from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parent
m=json.loads((root/'archive-manifest.json').read_text())
parts=[]
for part in m['parts']:
    data=(root/part['name']).read_bytes()
    assert hashlib.sha256(data).hexdigest()==part['sha256'], part['name']
    parts.append(data)
data=b''.join(parts)
assert hashlib.sha256(data).hexdigest()==m['sha256']
out=root/'dist'; out.mkdir(exist_ok=True)
archive=out/m['archive']; archive.write_bytes(data)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    z.extractall(out)
print(archive)

import runpy
runpy.run_path(str(root/'patch-v011.py'),run_name='__main__')

runpy.run_path(str(root/'patch-v012-en.py'),run_name='__main__')

runpy.run_path(str(root/'patch-v013.py'),run_name='__main__')

runpy.run_path(str(root/'patch-v014.py'),run_name='__main__')

runpy.run_path(str(root/'patch-v015.py'),run_name='__main__')
