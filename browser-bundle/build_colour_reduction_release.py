"""Promote the immutable RC33.1 preview to the separately versioned RC33.2 pilot.
Only the visible version, manifest and checksum list change; runtime modules stay exact.
"""
import argparse
import json
from pathlib import Path
import shutil
import tempfile
from build_colour_reduction import build as build_preview, VERSION as PREVIEW_VERSION
from build_image_exchange_pilot import sha, zip_tree
HERE = Path(__file__).resolve().parent
VERSION = '0.2.0-rc33.2-colour-reduction-update'
PREVIEW_SHA256 = '2df593619196cdf4b808e8f2199a28e1fb7aaf7a65cc5db6e5056e632174b1e5'
def build(output):
    output.mkdir(parents=True, exist_ok=True)
    dist = output/'atlas-clarus-browser-bundle'
    with tempfile.TemporaryDirectory(prefix='atlas-rc332-preview-') as tmp:
        preview = build_preview(Path(tmp))
        assert sha(preview.read_bytes()) == PREVIEW_SHA256
        if dist.exists(): shutil.rmtree(dist)
        shutil.copytree(Path(tmp)/dist.name, dist)
    html = (dist/'index.html').read_text()
    assert PREVIEW_VERSION in html
    (dist/'index.html').write_text(html.replace(PREVIEW_VERSION, VERSION))
    manifest = json.loads((dist/'BUNDLE_MANIFEST.json').read_text())
    manifest.update(version=VERSION, status='COLOUR_REDUCTION_PUBLIC_PILOT', deployment_allowed=True)
    assert manifest == json.loads((HERE/'manifest-rc33.2.json').read_text())
    (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(manifest, indent=2)+'\n')
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n'
        for p in sorted(dist.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS.txt'))
    archive = output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
    zip_tree(dist, archive)
    print(json.dumps({'archive':str(archive),'sha256':sha(archive.read_bytes()),'size':archive.stat().st_size}))
    return archive
if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output-dir',type=Path,default=HERE/'build-colour-reduction-release')
    build(p.parse_args().output_dir.resolve())
