"""Build the RC32.1 colour-reference-card pilot as an installable Browser Edition update."""
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
from build_handoff_plugin import replace_once

VERSION = '0.1.15-beta12'
BUNDLE_VERSION = '0.2.0-rc32.1-colour-reference-card'
NAME = f'ATLAS_Clarus_Browser_Edition_v{VERSION}_RC32.1.zip'
BUNDLE_SHA256 = 'd61cc48bc38b9e3a71a54d93bf4147b9a3eaa1a94bab0d0a413a382a683eb616'
BUNDLE_SIZE = 4009778
BASE = REPO/'downloads/wordpress/ATLAS_Clarus_Browser_Edition_v0.1.15-beta11_RC31.1.zip'
BASE_SHA256 = '8ec7cdcd296cd179ff24a84a344bc3d6c2e989273c0d31977d6ac5518079e3bd'


def prepare_source(stage, bundle):
    assert bundle.stat().st_size == BUNDLE_SIZE
    assert hashlib.sha256(bundle.read_bytes()).hexdigest() == BUNDLE_SHA256
    assert hashlib.sha256(BASE.read_bytes()).hexdigest() == BASE_SHA256
    with zipfile.ZipFile(bundle) as z:
        manifest = json.loads(z.read('atlas-clarus-browser-bundle/BUNDLE_MANIFEST.json'))
    assert manifest == json.loads((REPO/'browser-bundle/manifest-rc32.1.json').read_text())
    assert manifest['deployment_allowed'] is True and manifest['version'] == BUNDLE_VERSION
    with zipfile.ZipFile(BASE) as z:
        assert z.testzip() is None
        source = z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode('utf-8')
        index = z.read('atlas-clarus-browser-edition/index.php')
    source = source.replace('0.1.15-beta11', VERSION).replace('0.2.0-rc31.1-image-projects', BUNDLE_VERSION).replace('RC31.1', 'RC32.1')
    source = replace_once(source, 'Image Projects public pilot; reversible image edits with embedded originals and history.',
                          'Colour Reference Card public pilot; printable cards with separate source decisions and Atlas references.')
    source = re.sub(r'const BUNDLE_SIZE\s*=\s*\d+;', f'const BUNDLE_SIZE          = {BUNDLE_SIZE};', source, count=1)
    source = re.sub(r"const BUNDLE_SHA256\s*=\s*'[^']+';", f"const BUNDLE_SHA256        = '{BUNDLE_SHA256}';", source, count=1)
    def literal(v):
        if isinstance(v, bool):
            return 'true' if v else 'false'
        if isinstance(v, int):
            return str(v)
        assert isinstance(v, str)
        return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"
    start = source.index('$expected = array(') + len('$expected = array(')
    end = source.index(');', start)
    source = source[:start] + '\n' + ''.join(f"            '{k}' => {literal(v)},\n" for k, v in manifest.items() if not isinstance(v, (list, dict))) + '        ' + source[end:]
    old = '<p><strong>Neu in RC32.1: Image Projects.</strong> Unter Colour Projects finden Sie jetzt die Bildbearbeitung: PNG/JPEG laden, ausgewählte Farben oder Rechtecke umfärben oder transparent machen und Änderungen zurücknehmen. Originaldatei, Ausgangspixel und vollständiger Verlauf bleiben im Bildprojekt-JSON erhalten. Das Übergabe-ZIP lässt sich beim Kollegen wieder öffnen. Arbeit vor dem Schließen herunterladen; keine automatische Speicherung.</p>'
    source = replace_once(source, old, '<p><strong>Neu in RC32.1: Colour Reference Cards.</strong> Im Colour Handoff erzeugt „Download colour reference card ZIP“ druckbare HTML-Karten und vollständige JSON-Begleitdaten. Originalfarben, ATLAS-Referenzen, Herkunft sowie Entscheidungs- und Revisionskennungen bleiben getrennt sichtbar. HTML öffnen und über den Druckdialog als PDF speichern. Fehlende Herkunft bleibt ausdrücklich UNKNOWN.</p>')
    source = source.replace('öffentlicher Image-Projects-Pilot:', 'öffentlicher Colour-Reference-Card-Pilot:')
    stage.mkdir(parents=True)
    (stage/'atlas-clarus-browser-edition.php').write_text(source, encoding='utf-8')
    (stage/'index.php').write_bytes(index)
    (stage/'readme.txt').write_text(f'''ATLAS Clarus Browser Edition {VERSION}
RC32.1 Colour Reference Card public pilot.
Upload this ZIP without extracting it and replace ATLAS Clarus Browser Edition.
Then open Tools > ATLAS Clarus Browser Edition and select:
Mitgeliefertes RC32.1 prüfen und aktiv schalten
The plugin update alone preserves the active runtime. The guarded switch keeps
that runtime for rollback. Existing public URLs and shortcodes remain unchanged.

Open Colour Handoff, import decision JSON or use a palette snapshot, then choose
Download colour reference card ZIP. Open the HTML and use Print / Save as PDF.
Keep palette.clarus.json, reference-card.json and card-manifest.json together.
Original source RGB/HEX, reference RGB/HLC/row, master checksum, decision IDs,
revision IDs and available provenance remain distinct. Unknown stays UNKNOWN.
Checksums verify content integrity; they do not authenticate authorship.
Native Adobe, physical output and real-device mobile acceptance: NOT_TESTED.
''', encoding='utf-8')



if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=ROOT/'build-reference-card')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='atlas-rc321-') as tmp:
        tmp = Path(tmp)
        subprocess.run([sys.executable, str(REPO/'browser-bundle/build_colour_reference_card_pilot.py'), '--output-dir', str(tmp/'bundle')], check=True)
        bundle = tmp/'bundle'/f'ATLAS_Clarus_Browser_Bundle_v{BUNDLE_VERSION}.zip'
        prepare_source(tmp/'source', bundle)
        build(bundle, args.output_dir.resolve(), source=tmp/'source', archive_name=NAME)
