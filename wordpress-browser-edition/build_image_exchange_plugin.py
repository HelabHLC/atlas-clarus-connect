"""Package RC32.2 as beta13 using the unchanged guarded beta12 installer."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile
from build_plugin import build, ROOT, REPO

VERSION = '0.1.15-beta13'
BUNDLE_VERSION = '0.2.0-rc32.2-image-exchange'
NAME = f'ATLAS_Clarus_Browser_Edition_v{VERSION}_RC32.2.zip'
BUNDLE_SHA256 = 'e2475f407ac77318662275f9a3c0ae006fc62135d1a87d7c5a64659a5c083f79'
BUNDLE_SIZE = 4011545
BASE = REPO/'downloads/wordpress/ATLAS_Clarus_Browser_Edition_v0.1.15-beta12_RC32.1.zip'
BASE_SHA256 = '9c752ad30ccb304a01ae255fd0df0faa4606853d22a10e8a389f60dfb863d3fe'


def prepare_source(stage, bundle):
    assert bundle.stat().st_size == BUNDLE_SIZE
    assert hashlib.sha256(bundle.read_bytes()).hexdigest() == BUNDLE_SHA256
    assert hashlib.sha256(BASE.read_bytes()).hexdigest() == BASE_SHA256
    with zipfile.ZipFile(bundle) as z:
        manifest = json.loads(z.read('atlas-clarus-browser-bundle/BUNDLE_MANIFEST.json'))
    assert manifest == json.loads((REPO/'browser-bundle/manifest-rc32.2.json').read_text())
    with zipfile.ZipFile(BASE) as z:
        assert z.testzip() is None
        source = z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode()
        index = z.read('atlas-clarus-browser-edition/index.php')
    source = source.replace('0.1.15-beta12',VERSION).replace('0.2.0-rc32.1-colour-reference-card',BUNDLE_VERSION).replace('RC32.1','RC32.2')
    source = source.replace('Colour Reference Card public pilot; printable cards with separate source decisions and Atlas references.',
                            'Image Exchange public pilot; strict source verification and explicit cross-browser handover guidance, with reference cards retained.')
    source = re.sub(r'const BUNDLE_SIZE\s*=\s*\d+;',f'const BUNDLE_SIZE          = {BUNDLE_SIZE};',source,count=1)
    source = re.sub(r"const BUNDLE_SHA256\s*=\s*'[^']+';",f"const BUNDLE_SHA256        = '{BUNDLE_SHA256}';",source,count=1)
    def literal(v):
        if isinstance(v,bool): return 'true' if v else 'false'
        if isinstance(v,int): return str(v)
        return "'"+v.replace('\\','\\\\').replace("'","\\'")+"'"
    start = source.index('$expected = array(')+len('$expected = array(')
    end = source.index(');',start)
    source = source[:start]+'\n'+''.join(f"            '{k}' => {literal(v)},\n" for k,v in manifest.items() if not isinstance(v,(list,dict)))+'        '+source[end:]
    old = '<p><strong>Neu in RC32.2: Colour Reference Cards.</strong>'
    assert source.count(old)==1
    source = source.replace(old, '<p><strong>Neu in RC32.2: Hilfe zur sicheren Bildprojekt-Weitergabe.</strong> Image Projects erklärt jetzt browserabhängige Ablehnungen und den Weg über eine exakt passende Desktop-Engine. Der strenge Quellpixelvergleich bleibt bestehen. Der separate Desktop-Austauschhelfer läuft nicht innerhalb von WordPress oder der Android-App. Offene Bildprojekte vor dem Update als JSON oder ZIP sichern.</p><p><strong>Weiterhin enthalten: Colour Reference Cards.</strong>')
    stage.mkdir(parents=True)
    (stage/'atlas-clarus-browser-edition.php').write_text(source)
    (stage/'index.php').write_bytes(index)
    (stage/'readme.txt').write_text(f'''ATLAS Clarus Browser Edition {VERSION}
RC32.2 Image Exchange public pilot, with Colour Reference Cards retained.
Upload this ZIP without extracting it and replace ATLAS Clarus Browser Edition.
Then open Tools > ATLAS Clarus Browser Edition and select:
Mitgeliefertes RC32.2 prüfen und aktiv schalten
Updating the plugin alone preserves the active runtime. The guarded switch keeps
that runtime for rollback. Public URLs, shortcodes and storage keys are unchanged.

Before closing/updating, export open Image Projects as JSON/ZIP: no autosave.
The exact source/pixel check is unchanged. A valid project may be rejected when
another engine decodes ICC/alpha differently. Keep the unchanged complete file.
The separate ATLAS Clarus Image Exchange RC32.2 desktop package checks installed
engines and opens only a fully verified project. It cannot run on a phone or
inside WordPress. It does not add tolerance, rewrite pixels or flatten history.
Colour Reference Cards, original RGB, Atlas references and full history remain.
Physical Apple/Android device acceptance and live activation: NOT_TESTED.
''')

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output-dir',type=Path,default=ROOT/'build-image-exchange')
    args = p.parse_args()
    with tempfile.TemporaryDirectory(prefix='atlas-rc322-') as tmp:
        tmp = Path(tmp)
        subprocess.run([sys.executable,str(REPO/'browser-bundle/build_image_exchange_pilot.py'),'--output-dir',str(tmp/'bundle')],check=True)
        bundle = tmp/'bundle'/f'ATLAS_Clarus_Browser_Bundle_v{BUNDLE_VERSION}.zip'
        prepare_source(tmp/'source',bundle)
        build(bundle,args.output_dir.resolve(),source=tmp/'source',archive_name=NAME)
