"""Build a separate offline preview; frozen RC33.1/RC33.2 builders stay unchanged."""
import argparse,json,shutil
from pathlib import Path
from build_colour_reduction_release import build as base,VERSION as OLD
from build_colour_reduction import inline,once
from build_image_exchange_pilot import sha,zip_tree
HERE=Path(__file__).resolve().parent
VERSION='0.2.0-rc33.3-original-rgb-preview'
def build(output):
    base(output)
    dist=output/'atlas-clarus-browser-bundle'
    core=(HERE/'src/colour-reduction-original.js').read_text()
    old_ui=(HERE/'src/colour-reduction-ui.js').read_text()
    ui=(HERE/'src/colour-reduction-original-ui.js').read_text()
    html=(dist/'index.html').read_text().replace(OLD,VERSION)
    html=once(html,(HERE/'src/colour-reduction.html').read_text(),(HERE/'src/colour-reduction-original.html').read_text())
    html=once(html,inline(old_ui),inline(core)+inline(ui))
    # Preserve the original worker and insert the extension before its handler.
    start='<script type="application/json" id="atlas-reduction-worker-source">'
    a=html.index(start)+len(start);b=html.index('</script>',a)
    worker=json.loads(html[a:b]);worker=once(worker,'self.onmessage=e=>',core+'\nself.onmessage=e=>')
    html=html[:a]+json.dumps(worker).replace('<','\\u003c')+html[b:]
    (dist/'index.html').write_text(html)
    for name in ['colour-reduction-original.js','colour-reduction-original-ui.js']:
        shutil.copyfile(HERE/'src'/name,dist/'assets'/name)
    manifest=json.loads((dist/'BUNDLE_MANIFEST.json').read_text())
    manifest.update(version=VERSION,status='EXACT_ORIGINAL_RGB_OFFLINE_PREVIEW',deployment_allowed=False,
        colour_reduction_schema='atlas-clarus-colour-reduction/1.1',colour_reduction_method='ATLAS_RGB_WEIGHTED_MEDOIDS_WITH_EXACT_ORIGINALS_V1',
        original_rgb_protection='ALL_VISIBLE_EXACT_RGB_MATCHES',physical_acceptance='NOT_TESTED')
    (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
    path=output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip';zip_tree(dist,path);return path
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,default=HERE/'build-original-preview');print(build(p.parse_args().output_dir.resolve()))
