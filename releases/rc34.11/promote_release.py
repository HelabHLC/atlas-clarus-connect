"""Promote the reviewed colour-origin preview and build its guarded WP installer."""
import argparse
import hashlib
import json
import re
import shutil
import zipfile
from pathlib import Path

VERSION = '0.2.0-rc34.11-colour-origin'
PLUGIN = '0.1.20-beta1'
CANDIDATE_SHA = '402426727adeeb989933727703080eb798abc5b43ef7ded355d6dfed08ccf327'
BASE_PLUGIN_SHA = '2f3944f4a6222dea8fcfbf450b1ef6a2d34b3c259dae46074e78915bd9c818c4'
BASE_BUNDLE_SHA = '82a284f37fa149e4a376798efff9ebdc710bf1bd664f73ed19a981970ee1bd90'
PREFIX = 'atlas-clarus-browser-bundle'
BUNDLE_NAME = f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
PLUGIN_NAME = f'ATLAS_Clarus_Browser_Edition_v{PLUGIN}_RC34.11.zip'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def once(text, old, new):
    assert text.count(old) == 1, (old[:100], text.count(old))
    return text.replace(old, new, 1)


def literal(value):
    if type(value) is bool:
        return 'true' if value else 'false'
    if type(value) is int:
        return str(value)
    if type(value) is list:
        return 'array( ' + ', '.join(map(literal, value)) + ' )'
    if type(value) is dict:
        return 'array( ' + ', '.join(literal(k) + ' => ' + literal(v) for k, v in value.items()) + ' )'
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def zip_tree(root, dest):
    with zipfile.ZipFile(dest, 'w') as z:
        for p in sorted(root.rglob('*')):
            if p.is_file():
                info = zipfile.ZipInfo(root.name + '/' + p.relative_to(root).as_posix(), (2026, 11, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                z.writestr(info, p.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)


def build(candidate, base_plugin, out):
    assert sha(candidate) == CANDIDATE_SHA, 'Unverified preview input'
    assert sha(base_plugin) == BASE_PLUGIN_SHA, 'Unverified WordPress input'
    out.mkdir(parents=True, exist_ok=True)
    root = out / PREFIX
    assert not root.exists(), 'Use a clean output directory'
    with zipfile.ZipFile(candidate) as z:
        assert z.testzip() is None
        z.extractall(out)
        before = {n: z.read(n) for n in z.namelist()}
    manifest = root / 'BUNDLE_MANIFEST.json'
    m = json.loads(manifest.read_text())
    assert m['version'] == VERSION + '-preview'
    m.update(version=VERSION, status='COLOUR_ORIGIN_PUBLIC_BETA', deployment_allowed=True,
             owner_release_authorization='2026-11-01_USER_REQUESTED_BROWSER_EDITION_IONOS_UPDATE')
    manifest.write_text(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
    index = root / 'index.html'
    index.write_text(index.read_text().replace(VERSION + '-preview', VERSION))
    guide = root / 'docs/COLOUR_ORIGIN.html'
    guide.write_text(once(guide.read_text(),
        'RC34.11 · Entwicklungsvorschau auf Basis der veröffentlichten RC34.10.',
        'RC34.11 · Öffentliche Beta · Farbherkunft in Image Picker, Hover und Paletten.'))
    changed = {n.removeprefix(PREFIX + '/') for n, b in before.items() if (out / n).read_bytes() != b}
    assert changed == {'index.html', 'BUNDLE_MANIFEST.json', 'docs/COLOUR_ORIGIN.html'}, changed
    sums = root / 'SHA256SUMS.txt'
    sums.write_text(''.join(sha(p) + '  ' + p.relative_to(root).as_posix() + '\n'
                           for p in sorted(root.rglob('*')) if p.is_file() and p != sums))
    bundle = out / BUNDLE_NAME
    zip_tree(root, bundle)
    with zipfile.ZipFile(base_plugin) as z:
        php = z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode()
        wp_index = z.read('atlas-clarus-browser-edition/index.php')
    php = php.replace('0.1.19-beta1', PLUGIN).replace('0.2.0-rc34.10-quarkxpress-source-zip', VERSION).replace('RC34.10', 'RC34.11')
    php = re.sub(r'const BUNDLE_SIZE = \d+;', f'const BUNDLE_SIZE = {bundle.stat().st_size};', php)
    php = re.sub(r"const BUNDLE_SHA256 = '[0-9a-f]{64}';", f"const BUNDLE_SHA256 = '{sha(bundle)}';", php)
    a = php.index('$expected = array(') + len('$expected = array(')
    b = php.index(');', a)
    php = php[:a] + '\n' + ''.join(f"            '{k}' => {literal(v)},\n" for k, v in m.items() if type(v) in (bool, int, str)) + '        ' + php[b:]
    anchor = "        $expected_sampling = array( 'PIXEL_RGB', 'AREA_MEAN_RGB_5_X_5', 'AREA_MEAN_RGB_11_X_11', 'AREA_MEAN_RGB_21_X_21' );"
    php = once(php, anchor, '        if ( ' + literal(m['colour_origin']) + " !== ( $manifest['colour_origin'] ?? array() ) ) {\n            return new WP_Error( 'atlas_manifest', 'Bundle-Identität ungültig: Feld colour_origin.' );\n        }\n" + anchor)
    php = once(php, '<h2>RC34.11 · QuarkXPress ZIP</h2>', '<h2>RC34.11 · Farbherkunft</h2><p>Image Picker, Hover und Paletten zeigen Dateiprofil, Browserverarbeitung, Source Colour und ATLAS-Referenz getrennt. PNG/JPEG/WebP-Metadaten bleiben im Clarus JSON und QuarkXPress ZIP erhalten. Originalbild aufbewahren; Browserumrechnung und Druckgenauigkeit werden nicht bestätigt.</p><h2>QuarkXPress ZIP</h2>')
    stage = out / 'plugin-source/atlas-clarus-browser-edition'
    (stage / 'assets').mkdir(parents=True)
    (stage / 'atlas-clarus-browser-edition.php').write_text(php)
    (stage / 'index.php').write_bytes(wp_index)
    (stage / 'readme.txt').write_text(f'ATLAS Clarus Browser Edition {PLUGIN} / RC34.11\nColour origin public beta. Explicit validated activation retains the previous runtime for rollback. Source RGB/reference identity unchanged. Keep original image files.\n')
    shutil.copyfile(bundle, stage / 'assets/bundle.zip')
    plugin = out / PLUGIN_NAME
    zip_tree(stage, plugin)
    info = dict(plugin_version=PLUGIN, bundle_version=VERSION, bundle=bundle.name, bundle_sha256=sha(bundle),
                bundle_size=bundle.stat().st_size, plugin=plugin.name, plugin_sha256=sha(plugin),
                plugin_size=plugin.stat().st_size, previous_runtime_sha256=BASE_BUNDLE_SHA,
                candidate_sha256=CANDIDATE_SHA, deployment_allowed=True)
    (out / 'release-info.json').write_text(json.dumps(info, indent=2) + '\n')
    shutil.copyfile(manifest, out / 'BUNDLE_MANIFEST.json')
    for p in [bundle, plugin]:
        (out / (p.name + '.sha256')).write_text(sha(p) + '  ' + p.name + '\n')
    print(json.dumps(info, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--base-plugin', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    build(args.candidate, args.base_plugin, args.output_dir)
