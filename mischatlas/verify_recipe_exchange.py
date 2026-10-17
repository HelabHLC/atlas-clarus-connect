"""Independent stdlib verification of the Node-produced exchange and recipe bytes."""
import base64,hashlib,json,zipfile
from pathlib import Path
root=Path(__file__).resolve().parent/'dist/recipe-exchange-test'
sha=lambda b:hashlib.sha256(b).hexdigest()
expected=json.loads((root/'expected.json').read_text())
for key,name in [('original','original.json'),('snapshot','snapshot.json'),('reexport','reexport.json'),('exchange','exchange.zip')]:
    assert sha((root/name).read_bytes())==expected[key],name
assert (root/'snapshot.json').read_bytes()==(root/'reexport.json').read_bytes()
snapshot=json.loads((root/'snapshot.json').read_bytes())
assert base64.b64decode(snapshot['original']['bytes_base64'],validate=True)==(root/'original.json').read_bytes()
assert snapshot['original']['sha256']==expected['original']
assert snapshot['record']==json.loads((root/'original.json').read_bytes())
with zipfile.ZipFile(root/'exchange.zip') as z:
    assert z.testzip() is None
    manifest=json.loads(z.read('exchange.json'))
    assert len(manifest['documents'])==1
    d=manifest['documents'][0];payload=z.read('payloads/'+d['id']+'.bin')
    assert payload==(root/'snapshot.json').read_bytes()
    assert sha(payload)==d['sha256']==expected['snapshot']
    assert d['kind']=='MIXING_RECIPE'
print(json.dumps({'status':'PASS','independent_python_sha256':True,'zip_crc':True,'source_exact':True,'reexport_exact':True,'digests':expected},indent=2))
