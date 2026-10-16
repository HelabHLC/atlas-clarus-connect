"""Independent pixel checks on files actually downloaded by the UI browser test."""
import zipfile,json,hashlib,io,struct
from pathlib import Path
from PIL import Image

def read(name):
 z=zipfile.ZipFile('/tmp/atlas-correction-'+name+'.zip');assert z.testzip() is None
 r=json.loads(z.read('reduction.json'));raw=z.read('input-rgba.bin');out=Image.open(io.BytesIO(z.read('reduced.png'))).convert('RGBA').tobytes()
 assert z.read('original.png')==Path('/tmp/atlas-correction-source.png').read_bytes()
 assert hashlib.sha256(raw).hexdigest()==r['source']['input_rgba_sha256']
 assert hashlib.sha256(out).hexdigest()==r['output_rgba_sha256']
 for n,h in json.loads(z.read('reduction-package-manifest.json'))['files'].items():assert hashlib.sha256(z.read(n)).hexdigest()==h
 indices=struct.unpack('<128H',z.read('output-palette-index.u16le'));rebuilt=bytearray(raw)
 for p,j in enumerate(indices):
  if raw[p*4+3]:rebuilt[p*4:p*4+3]=bytes(r['palette'][j]['rgb'])
 assert rebuilt==out
 assert all(out[i]==raw[i] for i in range(3,len(raw),4));assert out[-4:]==raw[-4:]
 return z,r,raw,out
base=read('baseline');library=read('library');clean=read('library-cleanup');original=read('original');retained=read('conflict-retained')
for item in [library,clean,original,retained]:
 z,r,raw,out=item
 assert z.read('input-atlas-row-id.u16le')==base[0].read('input-atlas-row-id.u16le')
 assert r['post_corrections'][0]['rectangle']==[0,0,2,1]
 before=Image.open(io.BytesIO(z.read('before-last-correction.png'))).convert('RGBA').tobytes()
 assert hashlib.sha256(before).hexdigest()==r['correction_before_rgba_sha256']
 mask=z.read('protected-pixel-mask.u8');assert sum(mask)==6
 assert r['used_rgb_colours']<=32
for item in [library,clean]:
 z,r,raw,out=item;allowed=set(r['library']['reference_ids']);assert all(c['atlas_row_id'] in allowed for c in r['palette'])
 bindings={tuple(b['source_rgb']):b for b in r['reference_protection']['source_bindings']}
 indices=struct.unpack('<128H',z.read('output-palette-index.u16le'))
 for p,b in enumerate(z.read('protected-pixel-mask.u8')):
  if b:assert r['palette'][indices[p]]['atlas_row_id']==bindings[tuple(raw[p*4:p*4+3])]['atlas_row_id']
for y in range(2):
 for x in range(3):
  i=(y*16+x)*4;assert original[2][i:i+4]==original[3][i:i+4];assert library[3][i:i+4]==clean[3][i:i+4]
assert original[3]==retained[3]
assert original[1]==retained[1]
assert Image.open('/tmp/atlas-correction-direct.png').convert('RGBA').tobytes()==original[3]
print('PASS actual PNG/ZIP pixels, original bytes, unchanged assignments, protection in both modes, cleanup, conflict rollback, palette indices and all SHA-256 checksums')
