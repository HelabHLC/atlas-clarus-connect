"""Package RC33.5 as beta15 using the unchanged guarded beta12 installer."""
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

VERSION = '0.1.15-beta15'
BUNDLE_VERSION = '0.2.0-rc33.5-original-area-protection'
NAME = f'ATLAS_Clarus_Browser_Edition_v{VERSION}_RC33.5.zip'
BUNDLE_SHA256 = 'd209594b7bad339f587d82da1527eeca3429dd08256e76174f85e7894dc74e68'
BUNDLE_SIZE = 4072606
BASE = REPO/'downloads/wordpress/ATLAS_Clarus_Browser_Edition_v0.1.15-beta12_RC32.1.zip'
BASE_SHA256 = '9c752ad30ccb304a01ae255fd0df0faa4606853d22a10e8a389f60dfb863d3fe'


def prepare_source(stage, bundle):
    assert bundle.stat().st_size == BUNDLE_SIZE
    assert hashlib.sha256(bundle.read_bytes()).hexdigest() == BUNDLE_SHA256
    assert hashlib.sha256(BASE.read_bytes()).hexdigest() == BASE_SHA256
    with zipfile.ZipFile(bundle) as z:
        manifest = json.loads(z.read('atlas-clarus-browser-bundle/BUNDLE_MANIFEST.json'))
    assert manifest == json.loads((REPO/'browser-bundle/manifest-rc33.5.json').read_text())
    with zipfile.ZipFile(BASE) as z:
        assert z.testzip() is None
        source = z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode()
        index = z.read('atlas-clarus-browser-edition/index.php')
    source = source.replace('0.1.15-beta12',VERSION).replace('0.2.0-rc32.1-colour-reference-card',BUNDLE_VERSION).replace('RC32.1','RC33.5')
    source = source.replace('Colour Reference Card public pilot; printable cards with separate source decisions and Atlas references.',
                            'Colour Reduction public pilot; 1–256 palette colours, exact original RGB and rectangular area protection, separate immutable Atlas references and original-pixel magnifier, with Image Projects and reference cards retained.')
    source = re.sub(r'const BUNDLE_SIZE\s*=\s*\d+;',f'const BUNDLE_SIZE          = {BUNDLE_SIZE};',source,count=1)
    source = re.sub(r"const BUNDLE_SHA256\s*=\s*'[^']+';",f"const BUNDLE_SHA256        = '{BUNDLE_SHA256}';",source,count=1)
    def literal(v):
        if isinstance(v,bool): return 'true' if v else 'false'
        if isinstance(v,int): return str(v)
        return "'"+v.replace('\\','\\\\').replace("'","\\'")+"'"
    start = source.index('$expected = array(')+len('$expected = array(')
    end = source.index(');',start)
    source = source[:start]+'\n'+''.join(f"            '{k}' => {literal(v)},\n" for k,v in manifest.items() if not isinstance(v,(list,dict)))+'        '+source[end:]
    old = '<p><strong>Neu in RC33.5: Colour Reference Cards.</strong>'
    assert source.count(old)==1
    source = source.replace('öffentlicher Colour-Reference-Card-Pilot', 'öffentlicher Originalfarb- und Bereichsschutz-Pilot')
    source = source.replace(old, '<p><strong>Neu in RC33.5: Originalfarb- und Bereichsschutz.</strong> Colour Reduction begrenzt die Palette auf 1–256 Farben. Gewählte Original-RGB bleiben im ganzen Bild exakt erhalten; Rechteckbereiche schützen sämtliche enthaltenen Originalpixel einschließlich Alpha. Geschützte Farben belegen Palettenplätze; Konflikte werden ausdrücklich gemeldet. Die 11 × 11 Pixellupe untersucht das Original. Geschützte Originalfarben zeigen ihre ATLAS-Zuordnung getrennt mit HLC, Zeile und Referenz-RGB an. Original-RGB und Atlas-Referenz bleiben getrennt. RGB-Farbanzahl ist keine Druckfarbenanzahl. Image Projects behält die Hilfe zur sicheren browserübergreifenden Weitergabe. Der strenge Quellpixelvergleich bleibt bestehen. Der separate Desktop-Austauschhelfer läuft nicht innerhalb von WordPress oder der Android-App. Offene Bildprojekte vor dem Update als JSON oder ZIP sichern.</p><p><strong>Weiterhin enthalten: Colour Reference Cards.</strong>')
    stage.mkdir(parents=True)
    (stage/'atlas-clarus-browser-edition.php').write_text(source)
    (stage/'index.php').write_bytes(index)
    (stage/'readme.txt').write_text(f'''ATLAS Clarus Browser Edition {VERSION}
RC33.5 Colour Reduction public pilot: 1–256 palette colours, exact original RGB and rectangular area protection, separate Atlas reference labels, 11 × 11 original-pixel magnifier. Image Exchange and Colour Reference Cards retained.
Upload this ZIP without extracting it and replace ATLAS Clarus Browser Edition.
Then open Tools > ATLAS Clarus Browser Edition and select:
Mitgeliefertes RC33.5 prüfen und aktiv schalten
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
    p.add_argument('--output-dir',type=Path,default=ROOT/'build-protection-release')
    args = p.parse_args()
    with tempfile.TemporaryDirectory(prefix='atlas-rc332-') as tmp:
        tmp = Path(tmp)
        subprocess.run([sys.executable,str(REPO/'browser-bundle/build_protection_release.py'),'--output-dir',str(tmp/'bundle')],check=True)
        bundle = tmp/'bundle'/f'ATLAS_Clarus_Browser_Bundle_v{BUNDLE_VERSION}.zip'
        prepare_source(tmp/'source',bundle)
        build(bundle,args.output_dir.resolve(),source=tmp/'source',archive_name=NAME)
