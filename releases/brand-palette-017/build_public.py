"""Build the Browser Edition 0.1.7 public test from the released RC34.11 and repo sources."""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
PREFIX = 'atlas-clarus-browser-bundle'
BASE_SHA = '6158babb2a0271b71658c989c79f08ad690c5b782b2c0565e33c849a6c0d6bfb'
INSTALLER_SHA = '8316f5501d1a68e884dcd9366e24687cca30def66097f36a92f093dcde44b06b'
TAG = 'v0.2.0-brand-palette-0.1.7'
VERSION = '0.2.0-rc34.11-brand-palette-0.1.7'
BUNDLE = 'ATLAS_Clarus_Browser_Edition_Test_0.1.7_DE_EN.zip'
PLUGIN = 'ATLAS_Clarus_Browser_Test_0.1.7_IONOS_Installer.zip'
BASE_URL = 'https://github.com/HelabHLC/atlas-clarus-connect/releases/download/'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def require_file(path, expected):
    if digest(path.read_bytes()) != expected:
        raise ValueError(f'Unexpected SHA-256 for {path.name}')

def contents(path):
    with zipfile.ZipFile(path) as archive:
        if archive.testzip():
            raise ValueError(f'Invalid archive {path}')
        return {n: archive.read(n) for n in archive.namelist() if not n.endswith('/')}

def zip_files(path, files):
    with zipfile.ZipFile(path, 'w') as archive:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo(name, (2026, 11, 5, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)
    (path.parent / (path.name + '.sha256')).write_text(digest(path.read_bytes()) + '  ' + path.name + '\n')

def runtime(base):
    files = {n.removeprefix(PREFIX+'/'): b for n,b in contents(base).items()}
    raw = re.search(r'id="atlas-print-worker-source"[^>]*>(.*?)</script>', files['index.html'].decode(), re.S)[1]
    worker = json.loads(raw)
    multi = worker+'\n'+(REPO/'previews/multi-application/worker.inc.js').read_text()
    tokens = {'RAW_STARTUP':raw, 'JSON_MULTI':json.dumps(multi).replace('</',r'<\/'),
              'JSON_STARTUP':json.dumps(worker).replace('</',r'<\/'), 'STARTUP_WORKER':worker}
    for name, op in json.loads((HERE/'overlay.json').read_text()).items():
        data = (REPO/op['source']).read_bytes() if 'source' in op else files.get(name, b'')
        if 'edit_lines' in op:
            lines = data.decode().splitlines(keepends=True)
            for start, end, replacement in reversed(op['edit_lines']):
                lines[start:end] = [replacement]
            data = ''.join(lines).encode()
        elif 'template' in op:
            value = op['template']
            for key, replacement in tokens.items():
                value = value.replace('{{'+key+'}}', replacement)
            data = value.encode()
        if digest(data) != op['sha256']:
            raise ValueError('Runtime source or reconstruction mismatch: '+name)
        files[name] = data
    if any('profile-data/' in n or 'provider-notices/' in n or n.lower().endswith(('.icc','.icm')) for n in files):
        raise ValueError('Public runtime contains a profile payload')
    files['SHA256SUMS.txt'] = ''.join(digest(files[n])+'  '+n+'\n' for n in sorted(files) if n!='SHA256SUMS.txt').encode()
    return files

def installer(base, bundle, output):
    files = contents(base)
    key = 'atlas-clarus-browser-edition/atlas-clarus-browser-edition.php'
    php = files[key].decode()
    old_url = BASE_URL+'v0.2.0-rc34.11-colour-origin/ATLAS_Clarus_Browser_Bundle_v0.2.0-rc34.11-colour-origin.zip'
    def change(old,new,expected=1):
        nonlocal php
        if php.count(old)!=expected:
            raise ValueError('Unexpected installer source: '+old)
        php = php.replace(old,new)
    change(old_url,BASE_URL+TAG+'/'+BUNDLE)
    change(BASE_SHA,digest(bundle.read_bytes()))
    change('BUNDLE_SIZE = 19445859;',f'BUNDLE_SIZE = {bundle.stat().st_size};')
    change('0.1.20-beta1.1','0.1.21-beta1',2)
    change('0.2.0-rc34.11-colour-origin',VERSION,2)
    change("'status' => 'COLOUR_ORIGIN_PUBLIC_BETA',","'status' => 'BRAND_PALETTE_PUBLIC_TEST',\n            'logo_brand_palette_version' => '0.1.7',\n            'profile_delivery' => 'CATALOG_AND_LOCAL_IMPORT',\n            'bundled_output_profiles' => 0,")
    change("'entrypoint_packaging' => 'SELF_CONTAINED_SINGLE_FILE'","'entrypoint_packaging' => 'BROWSER_BUNDLE_WITH_RELATIVE_ASSETS'")
    change('if ( $is_index && $is_canvas ) {',"if ( 'index.html' === $asset && $is_canvas ) {")
    # Clarify the new release in admin and in the existing installation ability.
    php = php.replace('RC34.11','Browser-Testversion 0.1.7')
    start = php.index('<p><strong>Neu in Browser-Testversion')
    stop = php.index('<form method="post"',start)
    php = php[:start]+('<p><strong>Testversion 0.1.7:</strong> Logo laden, Farben prüfen und gemeinsame Markenfarben für mehrere Druckanwendungen berechnen. Ausgabeprofile lokal importieren. Das Paket wird vor der Umschaltung geprüft. Die vorherige Laufzeit steht zur Rückkehr bereit.</p>\n            ')+php[stop:]
    files[key] = php.encode()
    files['atlas-clarus-browser-edition/readme.txt'] = b'ATLAS Clarus Browser Edition / IONOS. Plugin 0.1.21-beta1 for public test 0.1.7. Install/update first, then explicitly activate the verified runtime. Existing runtime retained for rollback.\n'
    zip_files(output/PLUGIN,files)

def main():
    p = argparse.ArgumentParser()
    for n in ('base','installer','out'):
        p.add_argument('--'+n, type=Path, required=True)
    args = p.parse_args()
    require_file(args.base,BASE_SHA)
    require_file(args.installer,INSTALLER_SHA)
    args.out.mkdir(parents=True,exist_ok=True)
    files=runtime(args.base)
    bundle=args.out/BUNDLE
    zip_files(bundle,{PREFIX+'/'+n:b for n,b in files.items()})
    installer(args.installer,bundle,args.out)
    print(f'{len(files)-1} runtime files verified; archive SHA-256 {digest(bundle.read_bytes())}')

if __name__=='__main__':
    main()
