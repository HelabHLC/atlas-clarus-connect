#!/usr/bin/env python3
"""Package the reproducible RC28 offline bundle for Android beta.5."""
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
EXPECTED_BUNDLE_VERSION = '0.2.0-rc28-source-provenance'
EXPECTED_ZIP_SHA256 = '79a7b9a3df20d0ba6e2620b1d16d39316cce5d2c8534b622d7260fe896da12d8'
COLOUR_ID_URL = ('https://arbe-lambda-star.com/wp-content/plugins/'
                 'atlas-clarus-colour-picker/assets/atlas-clarus-app-v5.3.3.html')
COLOUR_ID_SHA256 = '580d4447193a736ad47a04a876a7437f757b98491836f6a3e8abaa9714769bff'
MASTER_SHA256 = '8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4'
TARGET = HERE / 'app/src/main/assets/bundle'

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

with tempfile.TemporaryDirectory(prefix='atlas-android-bundle-') as tmp:
    output = Path(tmp)
    subprocess.run([sys.executable, str(ROOT / 'browser-bundle/build_bundle.py'),
                    '--output-dir', str(output)], check=True, stdout=subprocess.DEVNULL)
    archive = output / f'ATLAS_Clarus_Browser_Bundle_v{EXPECTED_BUNDLE_VERSION}.zip'
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != EXPECTED_ZIP_SHA256:
        raise SystemExit(f'Bundle checksum changed: {digest}; review the payload and allocate a new Android version before updating the pin.')
    source = output / 'atlas-clarus-browser-bundle'
    if TARGET.exists():
        shutil.rmtree(TARGET)
    shutil.copytree(source, TARGET)
    index = TARGET / 'index.html'
    index.write_text(add_bridge(index.read_text(encoding='utf-8')), encoding='utf-8')
    colour_html = add_bridge(colour_id_source())
    (TARGET / 'colour-id.html').write_text(localize(colour_html, 'de'), encoding='utf-8')
    (TARGET / 'colour-id-en.html').write_text(localize(colour_html, 'en'), encoding='utf-8')
    print(f'Android assets: {EXPECTED_BUNDLE_VERSION} {digest}; Colour ID v5.3.3 DE/EN {COLOUR_ID_SHA256}; 13,283 shared identities')
