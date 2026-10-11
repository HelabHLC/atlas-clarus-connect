#!/usr/bin/env python3
"""Package the reviewed RC32 card implementation as the distinct RC32.1 pilot.

The RC32 candidate and historical releases retain their original bytes. This
builder changes only the version label, deployment manifest and checksums.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zipfile

HERE = Path(__file__).resolve().parent
VERSION = '0.2.0-rc32.1-colour-reference-card'
CANDIDATE = '0.2.0-rc32-colour-reference-card'
CANDIDATE_SHA256 = 'beb52339521d7d5a354cd47ff33b0029d424e356bd110c2b158a8272e0dbe0ed'


def build(output):
    output.mkdir(parents=True, exist_ok=True)
    dist = output/'atlas-clarus-browser-bundle'
    with tempfile.TemporaryDirectory(prefix='atlas-card-pilot-') as tmp:
        subprocess.run([sys.executable, str(HERE/'build_colour_reference_card.py'), '--output-dir', tmp], check=True, capture_output=True)
        archive = Path(tmp)/f'ATLAS_Clarus_Browser_Bundle_v{CANDIDATE}.zip'
        assert hashlib.sha256(archive.read_bytes()).hexdigest() == CANDIDATE_SHA256, 'Reviewed RC32 candidate changed'
        if dist.exists():
            shutil.rmtree(dist)
        shutil.copytree(Path(tmp)/dist.name, dist)
    index = dist/'index.html'
    html = index.read_text()
    assert CANDIDATE in html
    index.write_text(html.replace(CANDIDATE, VERSION))
    manifest = json.loads((dist/'BUNDLE_MANIFEST.json').read_text())
    manifest.update(version=VERSION, status='COLOUR_REFERENCE_CARD_PUBLIC_PILOT', deployment_allowed=True)
    assert manifest == json.loads((HERE/'manifest-rc32.1.json').read_text())
    (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(manifest, indent=2)+'\n')
    digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{digest(p)}  {p.relative_to(dist).as_posix()}\n'
        for p in sorted(dist.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS.txt'))
    archive = output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(dist.rglob('*')):
            if p.is_file():
                info = zipfile.ZipInfo((Path(dist.name)/p.relative_to(dist)).as_posix(), (2026, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                z.writestr(info, p.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    print(json.dumps({'archive': str(archive), 'sha256': digest(archive), 'size': archive.stat().st_size}))
    return archive


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=HERE/'build-colour-reference-card-pilot')
    build(parser.parse_args().output_dir.resolve())
