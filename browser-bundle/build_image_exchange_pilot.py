#!/usr/bin/env python3
"""Build RC32.2 from the immutable RC32.1 payload plus the reviewed #75 UI.

Preserve all runtime/data bytes outside the explicitly checked change set.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import shutil
import tempfile
import zipfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
VERSION = '0.2.0-rc32.2-image-exchange'
BASE_VERSION = '0.2.0-rc32.1-colour-reference-card'
BASE_WRAPPER = ROOT/'downloads/wordpress/ATLAS_Clarus_Browser_Edition_v0.1.15-beta12_RC32.1.zip'
BASE_WRAPPER_SHA256 = '9c752ad30ccb304a01ae255fd0df0faa4606853d22a10e8a389f60dfb863d3fe'
BASE_BUNDLE_SHA256 = 'd61cc48bc38b9e3a71a54d93bf4147b9a3eaa1a94bab0d0a413a382a683eb616'
SOURCE_SHA256 = {
    'image-projects.js': '3b5b6e90abd28f52b5236ea0793ff6b9394cb0754f504951df2f0da6117e2c45',
    'image-projects-ui.js': '2995ae7b5e520de513d97a929346225d50c6ec476bdb3c07e6649c0a348396c8',
}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def base_bundle():
    assert sha(BASE_WRAPPER.read_bytes()) == BASE_WRAPPER_SHA256
    with zipfile.ZipFile(BASE_WRAPPER) as z:
        b = z.read('atlas-clarus-browser-edition/assets/bundle.zip')
    assert sha(b) == BASE_BUNDLE_SHA256
    return b

def zip_tree(source, archive):
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(source.rglob('*')):
            if p.is_file():
                info = zipfile.ZipInfo((Path(source.name)/p.relative_to(source)).as_posix(), (2026,1,1,0,0,0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                z.writestr(info, p.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    (archive.parent/(archive.name+'.sha256')).write_text(sha(archive.read_bytes())+'  '+archive.name+'\n')

def build(output):
    output.mkdir(parents=True, exist_ok=True)
    dist = output/'atlas-clarus-browser-bundle'
    if dist.exists(): shutil.rmtree(dist)
    with zipfile.ZipFile(io.BytesIO(base_bundle())) as z:
        assert z.testzip() is None
        z.extractall(output)
    for name, digest in SOURCE_SHA256.items():
        assert sha((HERE/'src'/name).read_bytes()) == digest, name
    # The strict verifier and all reference-card implementation bytes stay frozen.
    assert (dist/'assets/image-projects.js').read_bytes() == (HERE/'src/image-projects.js').read_bytes()
    assert (dist/'assets/colour-reference-card.js').read_bytes() == (HERE/'src/colour-reference-card.js').read_bytes()
    old_ui = (dist/'assets/image-projects-ui.js').read_text()
    new_ui = (HERE/'src/image-projects-ui.js').read_text()
    html = (dist/'index.html').read_text()
    inline = lambda s: '<script>'+s.replace('</script', '<\\/script')+'</script>'
    assert html.count(inline(old_ui)) == 1
    html = html.replace(inline(old_ui), inline(new_ui))
    section = re.compile(r'<section id="image-projects" class="view">[\s\S]*?</section>')
    assert len(section.findall(html)) == 1
    html = section.sub(lambda _: (HERE/'src/image-projects.html').read_text().strip(), html)
    assert BASE_VERSION in html
    (dist/'index.html').write_text(html.replace(BASE_VERSION, VERSION))
    (dist/'assets/image-projects-ui.js').write_text(new_ui)
    manifest = json.loads((dist/'BUNDLE_MANIFEST.json').read_text())
    manifest.update(version=VERSION, status='IMAGE_EXCHANGE_PUBLIC_PILOT',
                    image_exchange_policy='EXACT_SOURCE_PIXEL_MATCH',
                    image_exchange_helper='SEPARATE_LOCAL_DESKTOP_TOOL',
                    physical_apple_acceptance='NOT_TESTED')
    assert manifest == json.loads((HERE/'manifest-rc32.2.json').read_text())
    (dist/'BUNDLE_MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
    shutil.copyfile(HERE/'IMAGE_EXCHANGE_QUICKSTART.md', dist/'docs/IMAGE_EXCHANGE_QUICKSTART.md')
    (dist/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(dist).as_posix()}\n'
        for p in sorted(dist.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS.txt'))
    archive = output/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
    zip_tree(dist, archive)
    print(json.dumps({'archive':str(archive),'sha256':sha(archive.read_bytes()),'size':archive.stat().st_size}))
    return archive

def build_helper(bundle, output):
    with tempfile.TemporaryDirectory(prefix='atlas-exchange-helper-') as tmp:
        stage = Path(tmp)/'ATLAS_Clarus_Image_Exchange_RC32.2'
        payload = stage/'browser-bundle/build-source-binding'
        payload.mkdir(parents=True)
        with zipfile.ZipFile(bundle) as z: z.extractall(payload)
        for name in ['tools/image-project-exchange.cjs','tests/package.json','tests/package-lock.json']:
            dest = stage/'browser-bundle'/name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(HERE/name, dest)
        shutil.copyfile(HERE/'IMAGE_EXCHANGE_QUICKSTART.md',stage/'README.md')
        (stage/'SHA256SUMS.txt').write_text(''.join(f'{sha(p.read_bytes())}  {p.relative_to(stage).as_posix()}\n'
            for p in sorted(stage.rglob('*')) if p.is_file() and p != stage/'SHA256SUMS.txt'))
        archive = output/'ATLAS_Clarus_Image_Exchange_RC32.2.zip'
        zip_tree(stage, archive)
    print(json.dumps({'archive':str(archive),'sha256':sha(archive.read_bytes()),'size':archive.stat().st_size}))
    return archive

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output-dir',type=Path,default=HERE/'build-image-exchange')
    p.add_argument('--with-helper',action='store_true')
    args = p.parse_args()
    archive = build(args.output_dir.resolve())
    if args.with_helper: build_helper(archive,args.output_dir.resolve())
