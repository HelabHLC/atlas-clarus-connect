"""Build the RC31.1 image-editing pilot as an installable Browser Edition update."""
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

VERSION = '0.1.15-beta11'
BUNDLE_VERSION = '0.2.0-rc31.1-image-projects'
NAME = f'ATLAS_Clarus_Browser_Edition_v{VERSION}_RC31.1.zip'
BUNDLE_SHA256 = 'fa538dd5b6f717f7c948a0cb11ecfff814678f114d2b9d3436148f8ed1861b3f'
BUNDLE_SIZE = 3995891
BASE = REPO/'downloads/wordpress/ATLAS_Clarus_Browser_Edition_v0.1.15-beta10_RC30.1.zip'
BASE_SHA256 = 'e9c68334d9bbb2a376fea6f14c0c2a82e70c85ea1da119de7b8b704e4a3b33d5'


def prepare_source(stage, bundle):
    assert bundle.stat().st_size == BUNDLE_SIZE
    assert hashlib.sha256(bundle.read_bytes()).hexdigest() == BUNDLE_SHA256
    assert hashlib.sha256(BASE.read_bytes()).hexdigest() == BASE_SHA256
    with zipfile.ZipFile(bundle) as z:
        manifest = json.loads(z.read('atlas-clarus-browser-bundle/BUNDLE_MANIFEST.json'))
    assert manifest == json.loads((REPO/'browser-bundle/manifest-rc31.1.json').read_text())
    assert manifest['deployment_allowed'] is True and manifest['version'] == BUNDLE_VERSION
    with zipfile.ZipFile(BASE) as z:
        assert z.testzip() is None
        source = z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode('utf-8')
        index = z.read('atlas-clarus-browser-edition/index.php')
    source = source.replace('0.1.15-beta10', VERSION).replace('0.2.0-rc30.1-colour-projects', BUNDLE_VERSION).replace('RC30.1', 'RC31.1')
    source = replace_once(source, 'Colour Projects public pilot; portable projects and provenance in companion JSON.',
                          'Image Projects public pilot; reversible image edits with embedded originals and history.')
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
    old = '<p><strong>Neu in RC31.1: Colour Projects.</strong> Projekte anlegen, Farben mit Herkunft sammeln, Änderungen begründen und Farbversionen auswählen. Das vollständige Projekt lässt sich als JSON speichern und wieder öffnen. Ein Übergabe-ZIP enthält Arbeitsfarben, ausgewählte Versionen und die begleitenden Herkunftsdaten. Öffentlicher Pilot; ein nativer Adobe-Rundlauf ist noch nicht getestet.</p>'
    source = replace_once(source, old, '<p><strong>Neu in RC31.1: Image Projects.</strong> Unter Colour Projects finden Sie jetzt die Bildbearbeitung: PNG/JPEG laden, ausgewählte Farben oder Rechtecke umfärben oder transparent machen und Änderungen zurücknehmen. Originaldatei, Ausgangspixel und vollständiger Verlauf bleiben im Bildprojekt-JSON erhalten. Das Übergabe-ZIP lässt sich beim Kollegen wieder öffnen. Arbeit vor dem Schließen herunterladen; keine automatische Speicherung.</p>')
    source = source.replace('öffentlicher Colour-Projects-Pilot:', 'öffentlicher Image-Projects-Pilot:')
    stage.mkdir(parents=True)
    (stage/'atlas-clarus-browser-edition.php').write_text(source, encoding='utf-8')
    (stage/'index.php').write_bytes(index)
    (stage/'readme.txt').write_text(f'''ATLAS Clarus Browser Edition {VERSION}
RC31.1 Image Projects: recolour, make transparent, undo/redo with retained history.
Upload this ZIP without extracting it and replace ATLAS Clarus Browser Edition.
Then open Tools > ATLAS Clarus Browser Edition and select:
Mitgeliefertes RC31.1 prüfen und aktiv schalten
The plugin update alone keeps the currently served runtime. The guarded switch
keeps the previous runtime for rollback. Other ATLAS plugins are not replaced.

Open Colour Projects > Open Image Projects. PNG/JPEG up to 8 MiB / 4,194,304 pixels.
Click a colour or drag a rectangle. Recolour or make transparent with a note.
Undo and redo retain all earlier steps. Download the complete ZIP or image-project
JSON before closing the tab. A colleague can reopen either file and continue.
The JSON embeds the original file, frozen sRGB pixels and exact changed-pixel masks.
Existing Colour Projects palettes remain separate and can be attached as snapshots.
Live IONOS activation, native Adobe round trips and physical output: NOT_TESTED.
''', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=ROOT/'build-images')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='atlas-rc311-') as tmp:
        tmp = Path(tmp)
        subprocess.run([sys.executable, str(REPO/'browser-bundle/build_bundle.py'), '--image-projects', '--public-pilot', '--output-dir', str(tmp/'bundle')], check=True)
        bundle = tmp/'bundle'/f'ATLAS_Clarus_Browser_Bundle_v{BUNDLE_VERSION}.zip'
        prepare_source(tmp/'source', bundle)
        build(bundle, args.output_dir.resolve(), source=tmp/'source', archive_name=NAME)
