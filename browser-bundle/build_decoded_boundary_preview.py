"""Text-only preview over pinned RC33.5; never rebuild a published package in place."""
import argparse,json
from pathlib import Path
from build_protection_release import build as base, VERSION as OLD
from build_colour_reduction import once
from build_image_exchange_pilot import sha,zip_tree
HERE=Path(__file__).resolve().parent
VERSION='0.2.0-rc33.5.1-decoded-boundary-preview'
def build(output):
    archive=base(output)
    assert sha(archive.read_bytes())=='d209594b7bad339f587d82da1527eeca3429dd08256e76174f85e7894dc74e68'
    dist=output/'atlas-clarus-browser-bundle'
    html=once((dist/'index.html').read_text(),(HERE/'src/colour-reduction-region.html').read_text(),(HERE/'src/colour-reduction-decoded-boundary.html').read_text())
    (dist/'index.html').write_text(html.replace(OLD,VERSION))
    m=json.loads((dist/'BUNDLE_MANIFEST.json').read_text())
    m.update(version=VERSION,status='DECODED_INPUT_BOUNDARY_TEXT_PREVIEW',deployment_allowed=False)
    (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(m,indent=2)+'\n')
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
    archive=output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip';zip_tree(dist,archive);return archive
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,default=HERE/'build-decoded-boundary-preview');print(build(p.parse_args().output_dir.resolve()))
