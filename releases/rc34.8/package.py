"""Add CorelDRAW XML to the exact deployed RC34.7 release without rebuilding textile code."""
import argparse, hashlib, io, json, re, shutil, subprocess, sys, urllib.request, zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
VERSION = '0.2.0-rc34.8-coreldraw-xml'
PLUGIN = '0.1.17-beta2'
BASE_VERSION = '0.2.0-rc34.7-textile-conversion'
BASE_BUNDLE_SHA = 'edf96b0acc1a3db33253fd4923c3d9238548d151683bcde5c29e676d706659d9'
BASE_PLUGIN_SHA = '96f180f10710b674fec21e293b517ea908f19bddbec643413c5d4a7a5461ec06'
BASE_PLUGIN = 'ATLAS_Clarus_Browser_Edition_v0.1.16-beta4_RC34.7.zip'
sha = lambda b: hashlib.sha256(b).hexdigest()

def zip_tree(root, dest):
    with zipfile.ZipFile(dest, 'w') as z:
        for p in sorted(root.rglob('*')):
            if p.is_file():
                info = zipfile.ZipInfo(root.name+'/'+p.relative_to(root).as_posix(), (2026,10,28,0,0,0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                z.writestr(info, p.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)

def package(base, out):
    out.mkdir(parents=True, exist_ok=True)
    if not base.exists():
        base.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve('https://github.com/HelabHLC/atlas-clarus-connect/releases/download/v'+BASE_VERSION+'/'+BASE_PLUGIN, base)
    assert sha(base.read_bytes()) == BASE_PLUGIN_SHA
    with zipfile.ZipFile(base) as z:
        assert z.testzip() is None
        z.extractall(out/'plugin-source')
        original = z.read('atlas-clarus-browser-edition/assets/bundle.zip')
    assert sha(original) == BASE_BUNDLE_SHA
    with zipfile.ZipFile(io.BytesIO(original)) as z:
        assert z.testzip() is None
        z.extractall(out)
        original_files = {n:z.read(n) for n in z.namelist()}
    dist = out/'atlas-clarus-browser-bundle'
    subprocess.run([sys.executable, str(HERE/'add_coreldraw.py'), str(dist)], check=True)
    shutil.copyfile(HERE/'CORELDRAW_XML.md',dist/'docs/CORELDRAW_XML.md')
    changed = {str(Path(n).relative_to(dist.name)) for n,b in original_files.items() if (out/n).read_bytes()!=b}
    assert changed == {'index.html','BUNDLE_MANIFEST.json','assets/app.js','assets/palette-export.js','assets/reduction-job-ui.js','docs/README.html'}, changed
    # All numerical engines, textile modules, WASM, master and reference data are byte-identical.
    (dist/'SHA256SUMS.txt').write_text(''.join(sha(p.read_bytes())+'  '+p.relative_to(dist).as_posix()+'\n' for p in sorted(dist.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.txt'))
    bundle = out/f'ATLAS_Clarus_Browser_Bundle_v{VERSION}.zip'
    zip_tree(dist,bundle)
    plugin_root = out/'plugin-source/atlas-clarus-browser-edition'
    php_path = plugin_root/'atlas-clarus-browser-edition.php'
    php = php_path.read_text().replace('0.1.16-beta4',PLUGIN).replace(BASE_VERSION,VERSION).replace('RC34.7','RC34.8')
    php = php.replace("'TEXTILE_CONVERSION_PUBLIC_BETA'", "'CORELDRAW_XML_PUBLIC_BETA'").replace("'2026-10-26_USER_APPROVED'", "'2026-10-28_USER_REQUESTED_HOMEPAGE_IONOS_UPDATE'")
    php = re.sub(r'const BUNDLE_SIZE = \d+;',f'const BUNDLE_SIZE = {bundle.stat().st_size};',php)
    php = re.sub(r"const BUNDLE_SHA256 = '[0-9a-f]{64}';",f"const BUNDLE_SHA256 = '{sha(bundle.read_bytes())}';",php)
    anchor = "        $expected_sampling = array( 'PIXEL_RGB', 'AREA_MEAN_RGB_5_X_5', 'AREA_MEAN_RGB_11_X_11', 'AREA_MEAN_RGB_21_X_21' );"
    assert php.count(anchor)==1
    php = php.replace(anchor,"        if ( array( 'ASE', 'CORELDRAW_XML', 'GPL', 'FIGMA_TOKENS_JSON', 'CSS', 'CLARUS_JSON' ) !== ( $manifest['palette_exports'] ?? array() ) ) {\n            return new WP_Error( 'atlas_manifest', 'Bundle-Identität ungültig: Feld palette_exports.' );\n        }\n"+anchor)
    php = php.replace('<h2>RC34.8 · Textile RGB / FOGRA58</h2>', '<h2>RC34.8 · CorelDRAW XML</h2><p>Palettenexport in My Palettes und Colour Reduction mit exakten sRGB-Werten und vorhandenen Farbnamen. Vollständige Reduktionsjobs enthalten palette.xml. Alle Textilfunktionen aus RC34.7 bleiben enthalten.</p><h2>Textile RGB / FOGRA58</h2>')
    php_path.write_text(php)
    shutil.copyfile(bundle,plugin_root/'assets/bundle.zip')
    (plugin_root/'readme.txt').write_text(f'ATLAS Clarus Browser Edition {PLUGIN} / RC34.8\nCorelDRAW XML export on top of the exact RC34.7 textile release. Guarded explicit activation preserves the previous runtime. Master and textile engines unchanged.\n')
    plugin = out/f'ATLAS_Clarus_Browser_Edition_v{PLUGIN}_RC34.8.zip'
    zip_tree(plugin_root,plugin)
    info = dict(plugin_version=PLUGIN,bundle_version=VERSION,bundle_sha256=sha(bundle.read_bytes()),bundle_size=bundle.stat().st_size,plugin_sha256=sha(plugin.read_bytes()),plugin_size=plugin.stat().st_size,previous_runtime_sha256=BASE_BUNDLE_SHA)
    (out/'release-info.json').write_text(json.dumps(info,indent=2)+'\n')
    shutil.copyfile(dist/'BUNDLE_MANIFEST.json',out/'BUNDLE_MANIFEST.json')
    for p in [bundle,plugin]: (out/(p.name+'.sha256')).write_text(sha(p.read_bytes())+'  '+p.name+'\n')
    print(json.dumps(info,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',type=Path,default=Path('/tmp')/BASE_PLUGIN)
    parser.add_argument('--output-dir',type=Path,default=Path('release348'))
    args=parser.parse_args()
    package(args.base,args.output_dir)
