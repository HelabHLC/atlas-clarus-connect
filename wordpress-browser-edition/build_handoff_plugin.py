"""Build the owner-authorized RC29.1 public pilot without changing RC28 pins."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

from build_plugin import build, ROOT, REPO

VERSION = '0.1.15-beta9'
BUNDLE_VERSION = '0.2.0-rc29.1-colour-handoff'
NAME = f'ATLAS_Clarus_Browser_Edition_v{VERSION}_RC29.1.zip'
BUNDLE_SHA256 = '827ce6725ad7f0769c56ccf8583e1e82378306f9030c583cc5d593818f564dd9'
BUNDLE_SIZE = 3946953


def replace_once(source, old, new):
    assert source.count(old) == 1, f'Wrapper integration point changed: {old[:70]}'
    return source.replace(old, new, 1)


def prepare_source(stage, bundle):
    assert bundle.stat().st_size == BUNDLE_SIZE
    assert hashlib.sha256(bundle.read_bytes()).hexdigest() == BUNDLE_SHA256
    with zipfile.ZipFile(bundle) as z:
        manifest = json.loads(z.read('atlas-clarus-browser-bundle/BUNDLE_MANIFEST.json'))
    expected = json.loads((REPO/'browser-bundle/manifest-rc29.1.json').read_text())
    assert manifest == expected and manifest['deployment_allowed'] is True
    assert manifest['version'] == BUNDLE_VERSION
    source = (ROOT/'atlas-clarus-browser-edition.php').read_text()
    source = source.replace('0.1.15-beta8', VERSION)
    source = source.replace('0.2.0-rc28-source-provenance', BUNDLE_VERSION)
    source = source.replace('RC27', 'RC29.1').replace('RC28', 'RC29.1')
    source = source.replace('Staging beta.', 'Public colour handoff pilot; provenance in companion JSON.')
    source = re.sub(r'const BUNDLE_SIZE\s*=\s*\d+;', f'const BUNDLE_SIZE          = {bundle.stat().st_size};', source, count=1)
    digest = hashlib.sha256(bundle.read_bytes()).hexdigest()
    source = re.sub(r"const BUNDLE_SHA256\s*=\s*'[^']+';", f"const BUNDLE_SHA256        = '{digest}';", source, count=1)
    scalars = {k: v for k, v in manifest.items() if not isinstance(v, (list, dict))}
    def php_literal(v):
        if isinstance(v, bool):
            return 'true' if v else 'false'
        if isinstance(v, int):
            return str(v)
        assert isinstance(v, str)
        return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"
    block = '\n' + ''.join(f"            '{k}' => {php_literal(v)},\n" for k, v in scalars.items()) + '        '
    start = source.index('$expected = array(') + len('$expected = array(')
    end = source.index(');', start)
    source = source[:start] + block + source[end:]
    hook = "    public static function boot() {\n"
    source = replace_once(source, hook, hook + "        if ( function_exists( 'wp_register_ability' ) ) {\n            add_action( 'wp_abilities_api_categories_init', array( __CLASS__, 'register_ability_category' ) );\n            add_action( 'wp_abilities_api_init', array( __CLASS__, 'register_install_ability' ) );\n        }\n")
    source = replace_once(source, '    private static function validate_manifest( $manifest ) {',
                          (ROOT/'handoff-abilities.php.inc').read_text() + '\n    private static function validate_manifest( $manifest ) {')
    old = '<p><strong>Neu in RC29.1: ATLAS-Namensschicht v0.3.0.</strong> Alle 13.283 Namen folgen der abgeschlossenen Prüfung der gespeicherten sRGB-Farben. HLC-Adresse und PKL-Identität bleiben unverändert. Die vorhandene Druckvorbereitung behält dieselben unabhängigen 4C- und ECG-Wege und ICC-Bildvorschauen.</p>'
    source = replace_once(source, old, '<p><strong>Neu in RC29.1: Colour handoff.</strong> Die Herkunft reist in der begleitenden JSON-Datei mit: Originalwerte, Atlas-Zuordnung und Farbentscheidungen mit Verlauf. Öffentlicher Pilot; ein nativer Adobe-Rundlauf ist noch nicht getestet.</p>')
    source = source.replace('RC29.1 – geprüfte Namensschicht:', 'RC29.1 – öffentlicher Colour-handoff-Pilot:')
    stage.mkdir(parents=True)
    (stage/'atlas-clarus-browser-edition.php').write_text(source)
    shutil.copyfile(ROOT/'index.php', stage/'index.php')
    (stage/'readme.txt').write_text(f'''ATLAS Clarus Browser Edition {VERSION}
RC29.1 public website pilot, authorized by the owner on 2026-10-08.
Original values, source and decision history travel in the companion JSON.
Native Adobe round trips: NOT_TESTED. Not embedded automatically in Adobe documents.
Update alone preserves the current runtime. Use Tools > ATLAS Clarus Browser Edition
to validate and switch; the previous runtime remains available for rollback.
WordPress 6.9+ also exposes atlas-clarus/install-browser-bundle to authenticated
administrators (manage_options). It accepts only the embedded ZIP SHA-256 and
expected current runtime SHA-256, then runs the same guarded installer.
No arbitrary URL, path or executable code is accepted by this ability.
''')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=ROOT/'build-handoff')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='atlas-rc291-') as tmp:
        tmp = Path(tmp)
        subprocess.run([sys.executable, str(REPO/'browser-bundle/build_bundle.py'),
                        '--colour-handoff', '--public-pilot', '--output-dir', str(tmp/'bundle')], check=True)
        bundle = tmp/'bundle'/f'ATLAS_Clarus_Browser_Bundle_v{BUNDLE_VERSION}.zip'
        prepare_source(tmp/'source', bundle)
        build(bundle, args.output_dir.resolve(), source=tmp/'source', archive_name=NAME)
