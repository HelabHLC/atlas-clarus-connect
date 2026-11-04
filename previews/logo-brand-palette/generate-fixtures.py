"""Synthetic test logos; not user assets or production colour proofs."""
from pathlib import Path
import argparse
import json
from PIL import Image,ImageCms

p=argparse.ArgumentParser();p.add_argument('output',type=Path);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
colours=[(234,99,37),(24,74,61),(245,241,222),(38,89,150),(129,53,108),(60,130,99)]
image=Image.new('RGBA',(600,180));pixels=image.load()
for y in range(180):
 for x in range(600):pixels[x,y]=(*colours[x//100],255) if y<160 else (255,0,255,0 if y<170 else 128)
icc=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
image.save(a.output/'six-colour-logo.png',icc_profile=icc)
image.save(a.output/'six-colour-logo.webp',lossless=True,icc_profile=icc)
image.convert('RGB').save(a.output/'six-colour-logo.jpg',quality=98,icc_profile=icc)
Image.new('RGBA',(40,40),(100,110,120,128)).save(a.output/'partial-alpha.png')
Image.new('RGB',(40,40),(100,110,120)).save(a.output/'one-colour.png')
(a.output/'unsupported.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
(a.output/'expected.json').write_text(json.dumps({'colours':colours,'width':600,'height':180}))
print(a.output)
