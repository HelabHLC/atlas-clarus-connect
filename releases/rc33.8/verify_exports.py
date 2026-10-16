"""Independent verification of actual RC33.8 browser PNG/ZIP downloads."""
import json,zipfile,io,hashlib,struct
from pathlib import Path
import numpy as np
from PIL import Image
D=Path('/tmp/rc338-acceptance');source=(Path(__file__).parent/'recovered/assets/atlas-data.js')
# Master asset is copied unchanged from the pinned base into the built runtime.
source=Path('/tmp/embedded338/atlas-clarus-browser-bundle/assets/atlas-data.js').read_text();data=json.loads(source[source.index('=')+1:].strip().rstrip(';'));by={c['id']:c for c in data['colors']}
base=None;nearest=None;palette=None;results={}
for name in ['baseline-32','nearest-corrected','nearest-cleaned','chosen-reference','original-mode']:
 z=zipfile.ZipFile(D/(name+'.zip'));assert z.testzip() is None;r=json.loads(z.read('reduction.json'));h,w=r['height'],r['width'];raw=z.read('input-rgba.bin');a=np.frombuffer(raw,dtype='u1').reshape(h,w,4);out=np.array(Image.open(io.BytesIO(z.read('reduced.png'))).convert('RGBA'));idx=np.frombuffer(z.read('output-palette-index.u16le'),dtype='<u2').reshape(h,w);pal=np.array([c['rgb'] for c in r['palette']],dtype='u1');visible=a[:,:,3]>0
 assert np.array_equal(pal[idx[visible]],out[:,:,:3][visible]);assert np.array_equal(a[:,:,3],out[:,:,3]);assert np.array_equal(a[~visible],out[~visible])
 assert hashlib.sha256(raw).hexdigest()==r['source']['input_rgba_sha256'];assert hashlib.sha256(out.tobytes()).hexdigest()==r['output_rgba_sha256']
 assert z.read('original.jpg')==(Path(__file__).parent/'fixtures/modern-facade-joel-salmi.jpg').read_bytes();assert hashlib.sha256(z.read('original.jpg')).hexdigest()==r['source']['file_sha256']
 for n,digest in json.loads(z.read('reduction-package-manifest.json'))['files'].items():assert hashlib.sha256(z.read(n)).hexdigest()==digest,n
 assert np.bincount(idx[visible],minlength=len(pal)).tolist()==[c['pixel_count'] for c in r['palette']]
 identity=z.read('input-atlas-row-id.u16le')
 if base is None:base=(raw,identity)
 assert (raw,identity)==base
 if name!='original-mode':assert all(c['atlas_row_id'] in r['library']['reference_ids'] for c in r['palette'])
 if name in ['nearest-corrected','nearest-cleaned','chosen-reference']:
  mask=np.frombuffer(z.read('protected-pixel-mask.u8'),dtype='u1').reshape(h,w);rect=[50,600,70,620] if name!='chosen-reference' else [30,570,100,640];expected=np.zeros((h,w),dtype='u1');x0,y0,x1,y1=rect;expected[y0:y1+1,x0:x1+1]=1;assert np.array_equal(mask,expected)
  if name=='nearest-corrected':
   nearest=out.copy();palette=pal.copy();ids=sorted(r['library']['reference_ids']);lib=np.array([by[i]['rgb'] for i in ids],dtype='i4');src=a[mask>0,:3].astype('i4');match=lib[np.argmin(np.sum((src[:,None,:]-lib[None,:,:])**2,axis=2),axis=1)];assert np.array_equal(out[mask>0,:3],match)
  if name=='nearest-cleaned':assert np.array_equal(out[mask>0],nearest[mask>0]);assert np.array_equal(pal,palette)
  if name=='chosen-reference':assert np.all(out[mask>0,:3]==np.array(by[r['reference_protection']['corrections'][0]['atlas_row_id']]['rgb']))
 if name=='original-mode':
  mask=np.frombuffer(z.read('protected-pixel-mask.u8'),dtype='u1').reshape(h,w);assert mask.sum()>0;assert np.array_equal(out[mask>0],a[mask>0])
 results[name]={'checks':'PASS','output_sha256':hashlib.sha256(out.tobytes()).hexdigest()}
(D/'export-verification.json').write_text(json.dumps(results,indent=2));print('PASS actual RC33.8 PNG/ZIP reconstruction, original bytes, full-master identities, both modes, corrections, protected cleanup, palette counts and every SHA-256')
