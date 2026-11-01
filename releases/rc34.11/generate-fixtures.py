"""Create tiny source images with Pillow/LittleCMS, independently of JS metadata code."""
import hashlib
import json
import struct
import sys
from pathlib import Path
from PIL import Image, ImageCms, PngImagePlugin

out=Path(sys.argv[1]); out.mkdir(parents=True,exist_ok=True)
profile=bytearray(ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes())
profile[24:36]=struct.pack('>6H',2026,11,1,0,0,0)
profile=bytes(profile)
(out/'source-srgb.icc').write_bytes(profile)
image=Image.new('RGB',(2,1)); image.putdata([(61,123,25),(60,123,25)])
image.save(out/'untagged.png')
info=PngImagePlugin.PngInfo(); info.add(b'sRGB',b'\0')
image.save(out/'declared-srgb.png',pnginfo=info)
for extension in ['png','jpg','webp']:
    image.save(out/('profiled.'+extension),icc_profile=profile)
image.save(out/'uninspected.gif')
image.save(out/'untagged.jpg')
image.save(out/'untagged.webp')
oracle={}
for p in out.iterdir():
    if p.suffix not in ['.png','.jpg','.webp','.gif']:continue
    with Image.open(p) as im:
        icc=im.info.get('icc_profile')
        oracle[p.name]={'file_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
            'icc_sha256':hashlib.sha256(icc).hexdigest() if icc else None,
            'icc_bytes':len(icc) if icc else None,'png_srgb':im.info.get('srgb'),
            'pixels':list(im.convert('RGB').getdata())}
(out/'oracle.json').write_text(json.dumps(oracle,indent=2)+'\n')
print('Pillow oracle:',len(oracle),'images')
