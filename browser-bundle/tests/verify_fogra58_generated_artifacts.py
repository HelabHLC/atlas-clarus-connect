"""Read back DOM/WASM-generated files. This does NOT validate browser downloads."""
import hashlib
import json
import os
from pathlib import Path
from PIL import Image
from pypdf import PdfReader
from verify_fogra58_downloads import native_roundtrip

folder=Path('tmp/textile-conversion')
profile=Path(os.environ['TEXTILE_PROFILE']).read_bytes()
sha=lambda b:hashlib.sha256(b).hexdigest()
profile_hash=sha(profile)
master=json.loads(Path('hover-library/data/colors.json').read_text())
data=json.loads((folder/'ui-reference.json').read_text());p=data['production'];r=data['reference']
assert r['atlas_row_id']==4665 and r['atlas_address']=='H125_L075_C080' and r['master_rgb']==[118,205,39]
assert data['identity_change']=='NONE' and data['master_sha256']==master['master_sha256']
rgb16,_=native_roundtrip(profile,r['master_rgb'],p['rendering_intent'],p['black_point_compensation'])
assert rgb16==[25943,64883,4455]==p['transform']['rgb16']
assert p['profile']['sha256']==profile_hash
reader=PdfReader(folder/'ui-reference.pdf',strict=True);assert len(reader.pages)==1
page=reader.pages[0];space=page['/Resources']['/ColorSpace']['/CS1'];assert str(space[0])=='/ICCBased'
embedded=space[1].get_object();assert embedded['/N']==3 and embedded.get_data()==profile
text=page.extract_text()
for value in [r['atlas_address'],'row 4665','25943 / 64883 / 4455',profile_hash,data['master_sha256'],
              p['printing_condition'],p['substrate'],p['rendering_intent'],'BPC: Off']:assert value in text,value
assert (' '.join(f'{v/65535:.8f}' for v in rgb16)+' scn') in page.get_contents().get_data().decode()
meta=json.loads((folder/'ui-preview.json').read_text());calc=meta['calculation']
assert meta['profile']['sha256']==profile_hash and meta['pkl_reference']['master_sha256']==master['master_sha256']
assert meta['printing_condition']==p['printing_condition'] and meta['substrate']==p['substrate']
assert calc['forward_intent']==p['rendering_intent'] and calc['forward_bpc']==p['black_point_compensation']
source=[[55,121,26],[171,52,205],[18,52,86],[255,204,0]]
nearest=[min(master['colors'],key=lambda c:(sum((a-b)**2 for a,b in zip(rgb,c['rgb'])),c['id'])) for rgb in source]
pkl=[c['rgb'] for c in nearest]
output=[native_roundtrip(profile,rgb,calc['forward_intent'],calc['forward_bpc'])[1] for rgb in pkl]
rgba=lambda rows:bytes(v for rgb in rows for v in rgb+[255])
assert meta['source']['rgba_sha256']==sha(rgba(source))
assert meta['pkl_reference']['rgba_sha256']==sha(rgba(pkl))
assert meta['output_rgba_sha256']==sha(rgba(output))
expected=sorted([dict(atlas_row_id=c['id'],reference=c['ref'],master_rgb=c['rgb'],pixel_count=1) for c in nearest],key=lambda c:c['atlas_row_id'])
assert meta['pkl_reference']['assignments']==expected
png=folder/'ui-before-after.png'
with Image.open(png) as im:im.verify()
with Image.open(png) as im:
 im.load();assert im.size==(1032,680);im=im.convert('RGB')
 for i in range(4):
  x=24+(80 if i%2==0 else 400);y=100+(80 if i//2==0 else 400)
  assert im.getpixel((x,y))==tuple(pkl[i])
  assert im.getpixel((x+504,y))==tuple(output[i])
result=dict(status='PASS',execution='JSDOM + real LittleCMS WASM + native canvas',actual_browser_download='NOT_VERIFIED',
            independent_readers=['pypdf','Pillow','native LittleCMS'],reference=r,profile_sha256=profile_hash,rgb16=rgb16,
            profile_bytes_embedded_unchanged=True,pdf_settings_match_json=True,png_decoded=True,
            png_size=[1032,680],preview_settings_match_reference=True,source_pkl_output_pixel_hashes_verified=True,
            physical_textile='NOT_MEASURED',production_approval='NOT_PROVIDED')
(folder/'independent-generated-readback.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
