#!/usr/bin/env python3
"""Package the reviewed RC34.1 Tool Exchange payload for Android beta.10.

The exact public pilot is rebuilt offline and pinned before adding the unchanged
Android adapter. Existing releases, storage contracts and master remain frozen.
"""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from urllib.request import urlopen
from build_colour_id_locale import localize

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
EXPECTED_BUNDLE_VERSION = '0.2.0-rc34.1-mixing-recipe-preview'
EXPECTED_ZIP_SHA256 = 'c703ccc4145f67b6bb39ad7d69e16fc3b34b38b89cdfc2f760aef3a135bab2a5'
BUNDLE_BUILDER = 'build_tool_exchange_preview.py'
REFERENCE_CARD_SHA256 = {
    'colour-reference-card.js': '32dff3a94ed98099aaae8b93365e94b66ba4262112564b91757304afe687e2e2',
}
SOURCE_BINDING_COMMIT = '9b0f2c9799879da65f0f8f02b702595b1336ae24'
SOURCE_BINDING_SHA256 = {
    'image-projects.js': '3b5b6e90abd28f52b5236ea0793ff6b9394cb0754f504951df2f0da6117e2c45',
    'image-projects-ui.js': '2995ae7b5e520de513d97a929346225d50c6ec476bdb3c07e6649c0a348396c8',
}
COLOUR_ID_URL = ('https://arbe-lambda-star.com/wp-content/plugins/'
                 'atlas-clarus-colour-picker/assets/atlas-clarus-app-v5.3.3.html')
COLOUR_ID_SHA256 = '580d4447193a736ad47a04a876a7437f757b98491836f6a3e8abaa9714769bff'
MASTER_SHA256 = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
TARGET = HERE / 'app/src/main/assets/bundle'


BUILD_SOURCE_BINDING_SHA256 = {'image-projects.js': '3b5b6e90abd28f52b5236ea0793ff6b9394cb0754f504951df2f0da6117e2c45',
    'image-projects-ui.js': '648bb3f2486a8cb6cd1a054a6c512fc241bcbe2ffe0c4551fdf9b117b21c6082'}

def verify_source_binding(directory, built=False):
    for name, expected in {**(BUILD_SOURCE_BINDING_SHA256 if built else SOURCE_BINDING_SHA256), **REFERENCE_CARD_SHA256}.items():
        actual = hashlib.sha256((directory / name).read_bytes()).hexdigest()
        if actual != expected:
            raise SystemExit(f'Reviewed implementation changed: {name}; review before repinning')


def add_bridge(html):
    marker = '</head>'
    if html.find(marker) < 0 or html.find(marker) > html.find('<body'):
        raise SystemExit('Expected an HTML head before the body for Android export bridge')
    bridge = (HERE / 'android-export.js').read_text(encoding='utf-8')
    return html.replace(marker, '<script>\n' + bridge + '\n</script>\n' + marker, 1)


def colour_id_source():
    local = os.environ.get('ATLAS_COLOUR_ID_SOURCE')
    if local:
        raw = Path(local).read_bytes()
    else:
        with urlopen(COLOUR_ID_URL, timeout=45) as response:
            raw = response.read()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != COLOUR_ID_SHA256:
        raise SystemExit(f'Colour ID source checksum changed: {digest}')
    html = raw.decode('utf-8')
    marker = 'const ATLAS='
    start = html.index(marker) + len(marker)
    rows = json.loads(html[start:html.index(';', start)])
    master = json.loads((ROOT / 'hover-library/data/colors.json').read_text(encoding='utf-8'))
    if master['master_sha256'] != MASTER_SHA256 or len(rows) != 13283 or len(master['colors']) != 13283:
        raise SystemExit('Colour ID and Bundle master identity/count mismatch')
    fields = ((0, 'id'), (1, 'ref'), (2, 'rgb'), (3, 'hex'), (4, 'lab'))
    for row, colour in zip(rows, master['colors']):
        if any(row[column] != colour[key] for column, key in fields):
            raise SystemExit(f'Colour ID diverges from Bundle master at {colour["id"]}')
    if html.count('class="tabbtn') != 14 or MASTER_SHA256 not in html:
        raise SystemExit('Colour ID tab count or master provenance mismatch')
    return html


verify_source_binding(ROOT / 'browser-bundle/src')
with tempfile.TemporaryDirectory(prefix='atlas-android-bundle-') as tmp:
    output = Path(tmp)
    subprocess.run([sys.executable, str(ROOT / 'browser-bundle' / BUNDLE_BUILDER),
                    '--output-dir', str(output)],
                   check=True, stdout=subprocess.DEVNULL)
    archive = output / f'ATLAS_Clarus_Browser_Bundle_v{EXPECTED_BUNDLE_VERSION}.zip'
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != EXPECTED_ZIP_SHA256:
        raise SystemExit(f'Bundle checksum changed: {digest}; review the payload and allocate a new Android version before updating the pin.')
    source = output / 'atlas-clarus-browser-bundle'
    verify_source_binding(source / 'assets', built=True)
    # Prepare and validate everything before replacing the generated asset tree.
    index = source / 'index.html'
    index.write_text(add_bridge(index.read_text(encoding='utf-8')), encoding='utf-8')
    colour_html = add_bridge(colour_id_source())
    (source / 'colour-id.html').write_text(localize(colour_html, 'de'), encoding='utf-8')
    (source / 'colour-id-en.html').write_text(localize(colour_html, 'en'), encoding='utf-8')
    (source / 'ANDROID_CANDIDATE.json').write_text(json.dumps({
        'version_name': '0.4.0-beta.10', 'version_code': 10,
        'application_id': 'com.atlasclarus.connect',
        'bundle_version': EXPECTED_BUNDLE_VERSION, 'bundle_zip_sha256': digest,
        'source_binding_commit': SOURCE_BINDING_COMMIT,
        'exchange_ui_commit': '57b132b46044344588ce2c5f6a3d86389ce9070c',
        'source_binding_sha256': SOURCE_BINDING_SHA256,
        'built_source_binding_sha256': BUILD_SOURCE_BINDING_SHA256,
        'reference_card_sha256': REFERENCE_CARD_SHA256,
        'master_sha256': MASTER_SHA256,
        'candidate_status': 'INTERNAL_TEST_ONLY',
        'native_export_max_bytes': 64 * 1024 * 1024,
        'tool_exchange_scope': 'Bundle tools; standalone Mixing Atlas recipe search is not embedded',
        'device_acceptance': 'NOT_TESTED', 'play_submission': 'NOT_PERFORMED',
        'note': 'Build-time candidate record, not a device acceptance or authorship certificate.'
    }, indent=2) + '\n', encoding='utf-8')
    if TARGET.exists():
        shutil.rmtree(TARGET)
    shutil.copytree(source, TARGET)
    print(f'Android beta.10 assets: {EXPECTED_BUNDLE_VERSION} {digest}; source binding {SOURCE_BINDING_COMMIT}; Colour ID v5.3.3 DE/EN; 13,283 shared identities')
