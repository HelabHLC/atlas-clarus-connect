"""Generate synthetic decoding fixtures; read/extract the unchanged RC31.1 baseline."""
import hashlib
from io import BytesIO
import json
from pathlib import Path
import struct
import sys
import zipfile
from PIL import Image, ImageCms

root = Path(__file__).resolve().parents[2]
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
# Make our own linear RGB profile from LCMS's sRGB primaries/whitepoint.
# Replacing the shared TRC with gamma=1 makes profile handling observable.
profile = bytearray(ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes())
profile[24:36] = struct.pack('>6H', 2026, 1, 1, 0, 0, 0)
profile[84:100] = bytes(16)  # no stale ICC profile ID
for i in range(struct.unpack_from('>I', profile, 128)[0]):
    tag, offset, size = struct.unpack_from('>4sII', profile, 132 + 12*i)
    if tag in (b'rTRC', b'gTRC', b'bTRC'):
        assert size >= 16
        profile[offset:offset+size] = b'para' + bytes(8) + struct.pack('>I', 65536) + bytes(size-16)
ImageCms.ImageCmsProfile(BytesIO(profile))  # parse the generated profile
im = Image.new('RGB', (256, 256))
im.putdata([((x*3+y)%256, (x+y*5)%256, (x*7+y*11)%256) for y in range(256) for x in range(256)])
im.save(out/'opaque.png')
im.save(out/'linear-icc.png', icc_profile=bytes(profile))
im.save(out/'plain.jpg', quality=91, subsampling=2)
im.save(out/'linear-icc.jpg', quality=91, subsampling=2, icc_profile=bytes(profile))
im.save(out/'progressive.jpg', quality=91, progressive=True)
alpha = im.convert('RGBA')
alpha.putalpha(Image.frombytes('L', im.size, bytes((x+y)%256 for y in range(256) for x in range(256))))
alpha.save(out/'alpha.png')
# Non-square image and all EXIF transformations, including mirrors and rotations.
small = im.crop((0, 0, 31, 19))
for orientation in range(1, 9):
    exif = Image.Exif()
    exif[274] = orientation
    small.save(out/f'exif-{orientation}.jpg', quality=92, exif=exif)
release = root/'downloads/browser-bundle/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc31.1-image-projects.zip'
assert hashlib.sha256(release.read_bytes()).hexdigest() == 'fa538dd5b6f717f7c948a0cb11ecfff814678f114d2b9d3436148f8ed1861b3f'
with zipfile.ZipFile(release) as z:
    z.extractall(out/'legacy')
manifest = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.iterdir()) if p.suffix in ('.png', '.jpg')}
(out/'fixtures-sha256.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps({'status': 'PASS', 'synthetic_fixtures': len(manifest), 'pixels_per_large_fixture': 65536, 'release_sha256': hashlib.sha256(release.read_bytes()).hexdigest()}))
