"""Separate RC33.4 rectangle preview layered over pinned RC33.3."""
import argparse,json,shutil
from pathlib import Path
from build_original_rgb_preview import build as base,VERSION as OLD
from build_colour_reduction import inline,once
from build_image_exchange_pilot import sha,zip_tree
HERE=Path(__file__).resolve().parent
VERSION='0.2.0-rc33.4-rectangle-protection-preview'
def build(output):
    archive=base(output)
    assert sha(archive.read_bytes())=='785e7b66679faedc4e9018cb236d44367e71ad06b0ba4d45c78cf7b83cc778a6'
    dist=output/'atlas-clarus-browser-bundle'
    core=(HERE/'src/colour-reduction-region.js').read_text()
    ui=(HERE/'src/colour-reduction-region-ui.js').read_text()
    html=(dist/'index.html').read_text().replace(OLD,VERSION)
    html=once(html,(HERE/'src/colour-reduction-original.html').read_text(),(HERE/'src/colour-reduction-region.html').read_text())
    html=once(html,inline((HERE/'src/colour-reduction-original-ui.js').read_text()),inline(core)+inline(ui))
    start='<script type="application/json" id="atlas-reduction-worker-source">';a=html.index(start)+len(start);b=html.index('</script>',a)
    worker=json.loads(html[a:b]);worker=once(worker,'self.onmessage=e=>',core+'\nself.onmessage=e=>')
    html=html[:a]+json.dumps(worker).replace('<','\\u003c')+html[b:];(dist/'index.html').write_text(html)
    for name in ['colour-reduction-region.js','colour-reduction-region-ui.js']:shutil.copyfile(HERE/'src'/name,dist/'assets'/name)
    shutil.copyfile(HERE/'RECTANGLE_PREVIEW.md',dist/'docs/RECTANGLE_PREVIEW.md')
    m=json.loads((dist/'BUNDLE_MANIFEST.json').read_text());m.update(version=VERSION,status='EXACT_RECTANGLE_RGBA_OFFLINE_PREVIEW',deployment_allowed=False,
        colour_reduction_schema='atlas-clarus-colour-reduction/1.2',colour_reduction_method='ATLAS_RGB_WEIGHTED_MEDOIDS_WITH_PROTECTED_PIXELS_V1',rectangle_protection='INCLUSIVE_SOURCE_PIXEL_RECTANGLES',physical_acceptance='NOT_TESTED')
    (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(m,indent=2)+'\n')
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
    archive=output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip';zip_tree(dist,archive);return archive
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,default=HERE/'build-rectangle-preview');print(build(p.parse_args().output_dir.resolve()))
