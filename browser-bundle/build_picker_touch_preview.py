"""Isolated touch fix preview. Does not repin or modify released packages."""
import argparse, hashlib, json
from pathlib import Path
from build_reference_libraries_release import build as release_build
from build_image_exchange_pilot import zip_tree
HERE=Path(__file__).resolve().parent
def build(out):
    release_build(out)
    dist=out/'atlas-clarus-browser-bundle'
    code=(HERE/'src/picker-touch.js').read_text()
    (dist/'assets/picker-touch.js').write_text(code)
    p=dist/'index.html';html=p.read_text();assert '</body>' in html
    head,tail=html.rsplit('</body>',1);html=head+'<script>'+code+'</script></body>'+tail
    html=html.replace('Image ready. Move the loupe over the image and click its marked centre pixel.','Image ready. Mouse: move and click. Touch: press and drag on the image; release to select the marked centre pixel.')
    p.write_text(html)
    p=dist/'BUNDLE_MANIFEST.json';m=json.loads(p.read_text());m.update(version='0.2.0-rc34.4-picker-touch-preview',status='TOUCH_FIX_PREVIEW',deployment_allowed=False,physical_android_acceptance='NOT_TESTED');p.write_text(json.dumps(m,indent=2)+'\n')
    digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{digest(p)}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
    target=out/'ATLAS_Clarus_Picker_Touch_Preview.zip';zip_tree(dist,target)
    print(json.dumps({'archive':str(target),'sha256':digest(target)}))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output-dir',type=Path,required=True);build(parser.parse_args().output_dir.resolve())
