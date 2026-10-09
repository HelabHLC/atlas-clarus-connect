"""Build the installable RC30.1 Colour Projects update for Browser Edition."""
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

VERSION = '0.1.15-beta10'
BUNDLE_VERSION = '0.2.0-rc30.1-colour-projects'
NAME = f'ATLAS_Clarus_Browser_Edition_v{VERSION}_RC30.1.zip'
BUNDLE_SHA256 = 'd5ebd533c76dd4c4dc4f86199ed7f47aa345399977029d218d1b1bc9773536a4'
BUNDLE_SIZE = 3970461
BASE = REPO/'downloads/wordpress/ATLAS_Clarus_Browser_Edition_v0.1.15-beta9_RC29.1.zip'
BASE_SHA256 = '5cde09b34bed7b02d30504f4c7fceba22ddd9c6aa8c57355f6b1f331fe6cb603'


def prepare_source(stage, bundle):
    assert bundle.stat().st_size == BUNDLE_SIZE
    assert hashlib.sha256(bundle.read_bytes()).hexdigest() == BUNDLE_SHA256
    assert hashlib.sha256(BASE.read_bytes()).hexdigest() == BASE_SHA256
    with zipfile.ZipFile(bundle) as z:
        manifest = json.loads(z.read('atlas-clarus-browser-bundle/BUNDLE_MANIFEST.json'))
    expected = json.loads((REPO/'browser-bundle/manifest-rc30.1.json').read_text())
    assert manifest == expected and manifest['deployment_allowed'] is True
    assert manifest['version'] == BUNDLE_VERSION
    # Reuse the exact shipped beta9 installer, including permissions and rollback.
    with zipfile.ZipFile(BASE) as z:
        assert z.testzip() is None
        prefix = 'atlas-clarus-browser-edition/'
        source = z.read(prefix+'atlas-clarus-browser-edition.php').decode('utf-8')
        index = z.read(prefix+'index.php')
    source = source.replace('0.1.15-beta9', VERSION)
    source = source.replace('0.2.0-rc29.1-colour-handoff', BUNDLE_VERSION)
    source = source.replace('RC29.1', 'RC30.1')
    source = replace_once(source, 'Public colour handoff pilot; provenance in companion JSON.',
                          'Colour Projects public pilot; portable projects and provenance in companion JSON.')
    source = re.sub(r'const BUNDLE_SIZE\s*=\s*\d+;', f'const BUNDLE_SIZE          = {BUNDLE_SIZE};', source, count=1)
    source = re.sub(r"const BUNDLE_SHA256\s*=\s*'[^']+';", f"const BUNDLE_SHA256        = '{BUNDLE_SHA256}';", source, count=1)
    def literal(v):
        if isinstance(v, bool):
            return 'true' if v else 'false'
        if isinstance(v, int):
            return str(v)
        assert isinstance(v, str)
        return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"
    block = '\n' + ''.join(f"            '{k}' => {literal(v)},\n" for k, v in manifest.items()
                            if not isinstance(v, (list, dict))) + '        '
    start = source.index('$expected = array(') + len('$expected = array(')
    end = source.index(');', start)
    source = source[:start] + block + source[end:]
    old = '<p><strong>Neu in RC30.1: Colour handoff.</strong> Die Herkunft reist in der begleitenden JSON-Datei mit: Originalwerte, Atlas-Zuordnung und Farbentscheidungen mit Verlauf. Öffentlicher Pilot; ein nativer Adobe-Rundlauf ist noch nicht getestet.</p>'
    source = replace_once(source, old, '<p><strong>Neu in RC30.1: Colour Projects.</strong> Projekte anlegen, Farben mit Herkunft sammeln, Änderungen begründen und Farbversionen auswählen. Das vollständige Projekt lässt sich als JSON speichern und wieder öffnen. Ein Übergabe-ZIP enthält Arbeitsfarben, ausgewählte Versionen und die begleitenden Herkunftsdaten. Öffentlicher Pilot; ein nativer Adobe-Rundlauf ist noch nicht getestet.</p>')
    source = source.replace('RC30.1 – öffentlicher Colour-handoff-Pilot:', 'RC30.1 – öffentlicher Colour-Projects-Pilot:')
    stage.mkdir(parents=True)
    (stage/'atlas-clarus-browser-edition.php').write_text(source, encoding='utf-8')
    (stage/'index.php').write_bytes(index)
    (stage/'readme.txt').write_text(f'''ATLAS Clarus Browser Edition {VERSION}
RC30.1 Colour Projects WordPress update, requested by the owner on 2026-10-09.

INSTALL THIS ZIP WITHOUT EXTRACTING IT through Plugins > Add New > Upload Plugin.
Replace the existing ATLAS Clarus Browser Edition; do not delete it first.
Then open Tools > ATLAS Clarus Browser Edition and select:
Mitgeliefertes RC30.1 prüfen und aktiv schalten
The plugin update alone keeps the currently served runtime. The explicit switch
validates the new runtime and keeps the previous one for rollback.

Full project JSON retains source palettes, decisions and project history.
Handover ZIPs add working/chosen ASE swatches with their provenance companions.
Each visitor's project data remain local to their browser; download backups.
Native Adobe application round trips and live IONOS acceptance: NOT_TESTED.
''', encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=ROOT/'build-projects')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='atlas-rc301-') as tmp:
        tmp = Path(tmp)
        subprocess.run([sys.executable, str(REPO/'browser-bundle/build_bundle.py'),
                        '--colour-projects', '--public-pilot', '--output-dir', str(tmp/'bundle')], check=True)
        bundle = tmp/'bundle'/f'ATLAS_Clarus_Browser_Bundle_v{BUNDLE_VERSION}.zip'
        prepare_source(tmp/'source', bundle)
        build(bundle, args.output_dir.resolve(), source=tmp/'source', archive_name=NAME)
