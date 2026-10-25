from pathlib import Path
import csv,hashlib,json,math,base64,re
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1];assets=root/'assets'
hash_=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for line in (assets/'SHA256SUMS.txt').read_text().splitlines():
 expected,name=line.split(maxsplit=1)
 if (assets/name).exists():assert hash_(assets/name)==expected,name
projection=json.loads((assets/'reference-projection.json').read_text());assert len(projection)==13283
by_id={row['atlas_row_id']:row for row in projection};mapping={}
with (assets/'ATLAS-Mapping.csv').open() as f:
 for row in csv.DictReader(f):
  ref=by_id[int(row['atlas_row_id'])]
  rgb=tuple(int(row[k]) for k in ('reference_r','reference_g','reference_b'))
  assert rgb==tuple(ref['rgb']) and row['atlas_ref']==ref['atlas_ref']
  key=sum(int(row[k])<<shift for k,shift in [('source_r',16),('source_g',8),('source_b',0)])
  assert key not in mapping
  mapping[key]=rgb
original=np.asarray(Image.open(assets/'Pfauenfeder-Original.png').convert('RGBA'));reference=np.asarray(Image.open(assets/'Pfauenfeder-ATLAS-Reference.png').convert('RGBA'))
assert original.shape==reference.shape and np.array_equal(original[:,:,3],reference[:,:,3])
visible=original[:,:,3]>0;source=original[:,:,:3][visible].astype(np.uint32);target=reference[:,:,:3][visible]
keys=(source[:,0]<<16)|(source[:,1]<<8)|source[:,2];unique,inverse=np.unique(keys,return_inverse=True)
assert len(unique)==len(mapping)==254913
expected=np.array([mapping[int(k)] for k in unique],dtype=np.uint8)[inverse]
assert np.array_equal(expected,target)
html=(root/'dist/index.html').read_text();data=json.loads(re.search(r'<script id="atlas-data" type="application/json">(.*?)</script>',html,re.S).group(1))
for name,key in [('Pfauenfeder-Original.png','original'),('Pfauenfeder-ATLAS-Reference.png','reference')]:
 assert base64.b64decode(data[key].split(',')[1])==(assets/name).read_bytes()
materials=data['materials']['materials'];silk=materials[0]
assert math.isclose(silk['gsm'],78.22875258526936) and silk['fabric_ids']==[3,4] and silk['sample_count']==4
assert math.isclose(silk['bending_strip_EI_lbf_in2'],.00925)
assert all(m['stretch_status']=='ASSUMED_NOT_MEASURED' for m in materials)
assert data['referenceProvenance']['original_pkl_rehashed'] is False
assert not re.search(r'<(?:script|link)[^>]+(?:src|href)=["\']https?://',html)
print('PASS: baseline hashes, all 254913 source-RGB mapping rows and visible mapped pixels, 13283 projection rows, alpha, embedded original/reference bytes, material mean, source-status and offline scripts')
