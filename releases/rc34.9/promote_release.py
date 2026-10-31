"""Publish the tested QuarkXPress export using the existing guarded WP installer."""
import argparse
import hashlib
import json
import re
import shutil
import zipfile
from pathlib import Path

VERSION = '0.2.0-rc34.9-quarkxpress'
PLUGIN = '0.1.18-beta1'
CANDIDATE_SHA = '5c814e2b4ffa0e6c897799c3f993b1dd3196b19cc8a96b5f6b56e6b84a0ab279'
BASE_PLUGIN_SHA = '1eaa519d00a7852450ac44af1e4c36b916f2f1e48c2df1bdf369df7f84d52c9f'
BASE_BUNDLE_SHA = 'ceac038f92a9c6f29e4a2421013f7c95a2db2266214b4fc6f6c6e5be06562273'
PREFIX = 'atlas-clarus-browser-bundle'
BUNDLE_NAME = f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
PLUGIN_NAME = f'ATLAS_Clarus_Browser_Edition_v{PLUGIN}_RC34.9.zip'
AUTHORIZATION = '2026-10-31_USER_REQUESTED_BROWSER_EDITION_IONOS_UPDATE'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def once(s, old, new):
    assert s.count(old) == 1, (old[:100], s.count(old))
    return s.replace(old, new, 1)


def literal(v):
    if type(v) is bool:
        return 'true' if v else 'false'
    if type(v) is int:
        return str(v)
    return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"


def zip_tree(root, dest):
    with zipfile.ZipFile(dest, 'w') as z:
        for p in sorted(root.rglob('*')):
            if p.is_file():
                info = zipfile.ZipInfo(root.name + '/' + p.relative_to(root).as_posix(), (2026, 10, 31, 0, 0, 0))
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
    m.update(version=VERSION, status='QUARKXPRESS_XTG_PUBLIC_BETA', deployment_allowed=True,
             owner_release_authorization=AUTHORIZATION)
    assert m['quarkxpress_xtg']['native_quarkxpress_validation'] == 'NOT_TESTED'
    manifest.write_text(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
    index = root / 'index.html'
    h = index.read_text().replace(VERSION + '-preview', VERSION)
    h = once(h, '>QuarkXPress XTG</button>', '>QuarkXPress XTG · Beta</button>')
    h = once(h, '>QuarkXPress XPress Tags</option>', '>QuarkXPress XPress Tags · Beta</option>')
    h = h.replace('QuarkXPress XTG: import into a text box', 'QuarkXPress XTG beta (native import pending): import into a text box')
    index.write_text(h)
    guide = root / 'docs/QUARKXPRESS.html'
    guide.write_text(guide.read_text().replace('RC34.9 · XPress-Tags-Export · Testfassung', 'RC34.9 · XPress-Tags-Export · Öffentliche Beta'))
    changed = {n.removeprefix(PREFIX + '/') for n, b in before.items() if (out / n).read_bytes() != b}
    assert changed == {'index.html', 'BUNDLE_MANIFEST.json', 'docs/QUARKXPRESS.html'}, changed
    sums = root / 'SHA256SUMS.txt'
    sums.write_text(''.join(sha(p) + '  ' + p.relative_to(root).as_posix() + '\n'
                           for p in sorted(root.rglob('*')) if p.is_file() and p != sums))
    bundle = out / BUNDLE_NAME
    zip_tree(root, bundle)

    with zipfile.ZipFile(base_plugin) as z:
        php = z.read('atlas-clarus-browser-edition/atlas-clarus-browser-edition.php').decode()
        wp_index = z.read('atlas-clarus-browser-edition/index.php')
    php = php.replace('0.1.17-beta2', PLUGIN).replace('0.2.0-rc34.8-coreldraw-xml', VERSION).replace('RC34.8', 'RC34.9')
    php = re.sub(r'const BUNDLE_SIZE = \d+;', f'const BUNDLE_SIZE = {bundle.stat().st_size};', php)
    php = re.sub(r"const BUNDLE_SHA256 = '[0-9a-f]{64}';", f"const BUNDLE_SHA256 = '{sha(bundle)}';", php)
    a = php.index('$expected = array(') + len('$expected = array(')
    b = php.index(');', a)
    php = php[:a] + '\n' + ''.join(f"            '{k}' => {literal(v)},\n" for k, v in m.items() if type(v) in (bool, int, str)) + '        ' + php[b:]
    php = once(php, "array( 'ASE', 'CORELDRAW_XML', 'GPL', 'FIGMA_TOKENS_JSON', 'CSS', 'CLARUS_JSON' )",
               "array( 'ASE', 'CORELDRAW_XML', 'QUARKXPRESS_XTG', 'GPL', 'FIGMA_TOKENS_JSON', 'CSS', 'CLARUS_JSON' )")
    anchor = "        $expected_sampling = array( 'PIXEL_RGB', 'AREA_MEAN_RGB_5_X_5', 'AREA_MEAN_RGB_11_X_11', 'AREA_MEAN_RGB_21_X_21' );"
    quark = "array(\n" + ''.join(f"            '{k}' => {literal(v)},\n" for k, v in m['quarkxpress_xtg'].items()) + '        )'
    php = once(php, anchor, "        if ( " + quark + " !== ( $manifest['quarkxpress_xtg'] ?? array() ) ) {\n            return new WP_Error( 'atlas_manifest', 'Bundle-Identität ungültig: Feld quarkxpress_xtg.' );\n        }\n" + anchor)
    php = once(php, '<h2>RC34.9 · CorelDRAW XML</h2>',
               '<h2>RC34.9 · QuarkXPress XTG</h2><p>Neuer Beta-Export in My Palettes und Colour Reduction. Import über einen Textrahmen mit Interpret XPress Tags. RGB-Quellprofil sRGB verwenden. Nativer QuarkXPress-Import noch nicht bestätigt.</p><h2>CorelDRAW XML</h2>')
    stage = out / 'plugin-source/atlas-clarus-browser-edition'
    (stage / 'assets').mkdir(parents=True)
    (stage / 'atlas-clarus-browser-edition.php').write_text(php)
    (stage / 'index.php').write_bytes(wp_index)
    (stage / 'readme.txt').write_text(f'ATLAS Clarus Browser Edition {PLUGIN} / RC34.9\nQuarkXPress XTG public beta. Explicit validated activation retains the previous runtime for rollback. No native QuarkXPress acceptance claimed.\n')
    shutil.copyfile(bundle, stage / 'assets/bundle.zip')
    plugin = out / PLUGIN_NAME
    zip_tree(stage, plugin)
    info = dict(plugin_version=PLUGIN, bundle_version=VERSION, bundle=bundle.name, bundle_sha256=sha(bundle),
                bundle_size=bundle.stat().st_size, plugin=plugin.name, plugin_sha256=sha(plugin),
                plugin_size=plugin.stat().st_size, previous_runtime_sha256=BASE_BUNDLE_SHA,
                candidate_sha256=CANDIDATE_SHA, native_quarkxpress_import='NOT_TESTED', deployment_allowed=True)
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
