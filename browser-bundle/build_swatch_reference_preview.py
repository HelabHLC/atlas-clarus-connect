"""RC33.4.1: display immutable reference provenance on protected original cards."""
import argparse,json,shutil
from pathlib import Path
from build_rectangle_preview import build as base,VERSION as OLD
from build_colour_reduction import inline,once
from build_image_exchange_pilot import sha,zip_tree
HERE=Path(__file__).resolve().parent
VERSION='0.2.0-rc33.4.1-reference-label-preview'
def build(output):
    old=base(output)
    assert sha(old.read_bytes())=='4a368607cb6ffefd66da8fe2080c8c7427c0f8b2af499af96dd9c00c22da06ac'
    dist=output/'atlas-clarus-browser-bundle'
    ui=(HERE/'src/colour-reduction-reference-ui.js').read_text()
    html=once((dist/'index.html').read_text(),inline((HERE/'src/colour-reduction-region-ui.js').read_text()),inline(ui)).replace(OLD,VERSION)
    (dist/'index.html').write_text(html);(dist/'assets/colour-reduction-reference-ui.js').write_text(ui)
    m=json.loads((dist/'BUNDLE_MANIFEST.json').read_text());m.update(version=VERSION,status='ORIGINAL_SWATCH_REFERENCE_LABEL_PREVIEW',original_swatch_reference_display='HLC_ROW_REFERENCE_RGB_HEX')
    (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(m,indent=2)+'\n')
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
    archive=output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip';zip_tree(dist,archive);return archive
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=Path,default=HERE/'build-swatch-reference-preview');print(build(p.parse_args().output_dir.resolve()))
