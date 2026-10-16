"""Separate library reference reduction preview over immutable RC33.5.1."""
import argparse,json,shutil
from pathlib import Path
from build_decoded_boundary_preview import build as base,VERSION as OLD
from build_colour_reduction import inline,once
from build_image_exchange_pilot import sha,zip_tree
HERE=Path(__file__).resolve().parent
VERSION='0.2.0-rc33.7-region-correction-preview'
def build(output):
    base(output)
    dist=output/'atlas-clarus-browser-bundle'
    core=(HERE/'src/colour-reduction-library.js').read_text()
    ui=(HERE/'src/colour-reduction-library-ui.js').read_text()
    html=(dist/'index.html').read_text().replace(OLD,VERSION)
    html=once(html,(HERE/'src/colour-reduction-decoded-boundary.html').read_text(),(HERE/'src/colour-reduction-library.html').read_text())
    html=once(html,inline((HERE/'src/colour-reduction-reference-ui.js').read_text()),inline(core)+inline((HERE/'src/colour-reduction-cleanup.js').read_text())+inline(ui))
    anchor='window.ATLAS_COLOUR_REDUCTION_UI.init({colors,master:MASTER,download});'
    html=once(html,anchor,'window.ATLAS_COLOUR_REDUCTION_UI.init({colors,master:MASTER,download,libraryViews});')
    app=dist/'assets/app.js';app.write_text(once(app.read_text(),anchor,'window.ATLAS_COLOUR_REDUCTION_UI.init({colors,master:MASTER,download,libraryViews});'))
    start='<script type="application/json" id="atlas-reduction-worker-source">';a=html.index(start)+len(start);b=html.index('</script>',a)
    worker=json.loads(html[a:b]);worker=once(worker,'self.onmessage=e=>',core+'\nself.onmessage=e=>')
    html=html[:a]+json.dumps(worker).replace('<','\\u003c')+html[b:];(dist/'index.html').write_text(html)
    for name in ['colour-reduction-library.js','colour-reduction-library-ui.js','colour-reduction-cleanup.js']:shutil.copyfile(HERE/'src'/name,dist/'assets'/name)
    shutil.copyfile(HERE/'LIBRARY_REFERENCE_PREVIEW.md',dist/'docs/LIBRARY_REFERENCE_PREVIEW.md')
    shutil.copyfile(HERE/'REGION_CORRECTION_PREVIEW.md',dist/'docs/REGION_CORRECTION_PREVIEW.md')
    m=json.loads((dist/'BUNDLE_MANIFEST.json').read_text());m.update(version=VERSION,status='LIBRARY_REFERENCE_OFFLINE_PREVIEW',deployment_allowed=False,colour_reduction_schema='atlas-clarus-colour-reduction/1.3',colour_reduction_method='ATLAS_LIBRARY_RGB_WEIGHTED_MEDOIDS_WITH_REFERENCE_LOCKS_V1')
    (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(m,indent=2)+'\n')
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
    archive=output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip';zip_tree(dist,archive);return archive
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,default=HERE/'build-library-reference-preview');print(build(p.parse_args().output_dir.resolve()))
