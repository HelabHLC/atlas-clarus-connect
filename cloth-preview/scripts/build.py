#!/usr/bin/env python3
"""Build a self-contained offline HTML. No runtime requests, no colour reassignment."""
from pathlib import Path
import argparse,base64,hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--reference-package',type=Path);args=p.parse_args()
if args.reference_package:
    package=args.reference_package
    for line in (package/'SHA256SUMS.txt').read_text().splitlines():
        expected,name=line.split(maxsplit=1)
        assert hashlib.sha256((package/name).read_bytes()).hexdigest()==expected, f'Checksum mismatch: {name}'
    for name in ['Pfauenfeder-Original.png','Pfauenfeder-ATLAS-Reference.png','reference-evidence.json','reference-projection.json','ATLAS-Mapping.csv','SHA256SUMS.txt']:
        shutil.copyfile(package/name,ROOT/'assets'/name)
assets=ROOT/'assets'
original=(assets/'Pfauenfeder-Original.png').read_bytes();reference=(assets/'Pfauenfeder-ATLAS-Reference.png').read_bytes()
sha=lambda b:hashlib.sha256(b).hexdigest()
data={'materials':json.loads((ROOT/'data/materials.json').read_text()),
      'original':'data:image/png;base64,'+base64.b64encode(original).decode(),
      'reference':'data:image/png;base64,'+base64.b64encode(reference).decode(),
      'originalSha256':sha(original),'referenceSha256':sha(reference),
      'referenceEvidence':json.loads((assets/'reference-evidence.json').read_text()),
      'referenceProvenance':{'package':'ATLAS-Clarus-CLO-Referenzdaten-0.2.zip',
        'mapping_csv_sha256':sha((assets/'ATLAS-Mapping.csv').read_bytes()),
        'projection_sha256':sha((assets/'reference-projection.json').read_bytes()),
        'original_pkl_rehashed':False,'assignment_recomputed':False,'physical_print':'NOT_TESTED','clo_import':'NOT_TESTED'}}
html=(ROOT/'src/index.template.html').read_text()
html=html.replace('__ATLAS_DATA__',json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c'))
html=html.replace('__SHA256__',(ROOT/'src/sha256.js').read_text())
for marker,name in [('__SOLVER__','solver.js'),('__RENDERER__','renderer.js'),('__APP__','app.js')]:
    html=html.replace(marker,(ROOT/'src'/name).read_text().replace('</script','<\\/script'))
out=ROOT/'dist';out.mkdir(exist_ok=True)
(out/'index.html').write_text(html)
print(json.dumps({'output':str(out/'index.html'),'bytes':len(html.encode()),'original_sha256':data['originalSha256'],'reference_sha256':data['referenceSha256']},indent=2))
